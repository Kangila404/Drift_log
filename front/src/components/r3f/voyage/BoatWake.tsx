import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { oceanWaveShader, type OceanSurfaceState } from '../OceanWaves'
import { OCEAN_GRID_SEGMENTS, OCEAN_SURFACE_Y } from '../OceanWater'
import { advanceWakeTrail, createWakeTrail, type WakePose } from './WakeTrail'
import { createWakeSheets, updateWakeSheets } from './WakeGeometry'

const waterVertex = /* glsl */ `
  uniform float uTime, uWaveScale, uWaveSpeed, uWind;
  attribute float strength, crest;
  varying vec2 vUv;
  varying vec3 vWorld, vNormal;
  varying float vStrength, vCrest;
  ${oceanWaveShader}
  vec3 surface(vec2 p) { return oceanSwell(p, uTime * uWaveSpeed, uWind) * uWaveScale; }
  // Match the actual foreground ocean triangles, not a separate analytic plane.
  vec3 renderedSurface(vec2 p) {
    float grid = ${120 / OCEAN_GRID_SEGMENTS};
    vec2 cell = floor(p / grid) * grid, f = (p - cell) / grid;
    vec3 a, b, c;
    if (f.x + f.y <= 1.0) {
      a = surface(cell); b = surface(cell + vec2(grid, 0)); c = surface(cell + vec2(0, grid));
      return a * (1.0-f.x-f.y) + b*f.x + c*f.y;
    }
    a = surface(cell + vec2(grid)); b = surface(cell + vec2(0, grid)); c = surface(cell + vec2(grid, 0));
    return a * (f.x+f.y-1.0) + b*(1.0-f.x) + c*(1.0-f.y);
  }
  void main() {
    vec3 p = position, sea = renderedSurface(p.xz);
    p.y += ${OCEAN_SURFACE_Y} + sea.x + .012;
    vec3 n = normal.y < 0.0 ? -normal : normal;
    vNormal = normalize(vec3(n.x - sea.y*n.y, n.y, n.z - sea.z*n.y));
    vWorld = p; vUv = uv; vStrength = strength; vCrest = crest;
    gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
  }
`
const noiseShader = /* glsl */ `
  float hash(vec2 p) { vec3 q=fract(vec3(p.xyx)*.1031); q+=dot(q,q.yzx+33.33); return fract((q.x+q.y)*q.z); }
  float noise(vec2 p) {
    vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
  }
`

function waterMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true,
    uniforms: {
      uTime: { value: 0 }, uWaveScale: { value: 0 }, uWaveSpeed: { value: 0 }, uWind: { value: 0 },
      uNearColor: { value: new THREE.Color(.03, .07, .1) },
      uSkyColor: { value: new THREE.Color('#0e2a44') },
      uCelestialPosition: { value: new THREE.Vector3(0, 8.4, -20) },
    },
    vertexShader: waterVertex,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vWorld, vNormal;
      varying float vStrength, vCrest;
      uniform vec3 uNearColor, uSkyColor, uCelestialPosition;
      ${noiseShader}
      void main() {
        vec3 n=normalize(vNormal), view=normalize(cameraPosition-vWorld);
        float facing=max(0.0,dot(n,view));
        float fresnel=.03+.97*pow(1.0-facing,4.0);
        vec3 sky=uSkyColor;
        #ifdef TONE_MAPPING
          sky=toneMapping(sky);
        #endif
        sky=linearToOutputTexel(vec4(sky,1.0)).rgb;
        vec3 reflected=reflect(-view,n);
        float skyFacing=smoothstep(-.08,.58,reflected.y);
        vec3 environment=mix(uNearColor*.3,sky*.82,skyFacing);
        vec3 water=mix(uNearColor*.7,environment,.28+fresnel*.72);
        vec3 halfLight=normalize(view+normalize(uCelestialPosition-vWorld));
        water += vec3(.16,.20,.21)*pow(max(dot(n,halfLight),0.0),40.0)*vStrength;

        // Break only the raised lips. The body of the water has no foam texture.
        vec2 flow=vUv*vec2(4.5,7.0);
        float breakup=noise(flow)+.3*noise(flow*2.13+8.0);
        float lip=smoothstep(.14,.6,vCrest);
        float breaking=smoothstep(.47,.72,breakup)*lip;
        vec2 fine=flow*5.0;
        float filtered=1.0-smoothstep(.25,.9,max(fwidth(fine.x),fwidth(fine.y)));
        float bubbles=mix(.72,smoothstep(.23,.62,noise(fine)),filtered);
        float foam=breaking*(.45+.55*bubbles);
        vec3 foamColor=mix(vec3(.36,.46,.49),vec3(.62,.70,.72),bubbles);
        float waterAlpha=smoothstep(.0,.18,vStrength)*.96;
        float foamAlpha=foam*.87;
        float alpha=waterAlpha+foamAlpha*(1.0-waterAlpha);
        if(alpha<.005) discard;
        vec3 color=mix(water,foamColor,foamAlpha/max(alpha,.001));
        gl_FragColor=vec4(color,alpha);
      }
    `,
  })
}

function createBoatWake() {
  const group = new THREE.Group(); group.name = 'Boat surface wake'
  const material = waterMaterial(), trail = createWakeTrail(), sheets = createWakeSheets()
  sheets.shoulders.forEach((sheet, i) => {
    const mesh = new THREE.Mesh(sheet.geometry, material)
    mesh.name = i ? 'Starboard displaced water' : 'Port displaced water'
    mesh.frustumCulled = false; group.add(mesh)
  })
  const stern = new THREE.Mesh(sheets.stern.geometry, material)
  stern.name = 'Breaking stern water'; stern.frustumCulled = false; group.add(stern)

  const count = 64, particles = new THREE.BufferGeometry()
  const positions = new Float32Array(count * 3), strengths = new Float32Array(count)
  particles.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage))
  particles.setAttribute('strength', new THREE.BufferAttribute(strengths, 1).setUsage(THREE.DynamicDrawUsage))
  particles.setAttribute('crest', new THREE.BufferAttribute(new Float32Array(count), 1))
  particles.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
  particles.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2))
  const sprayMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { ...material.uniforms, uPixelRatio: { value: 1 } },
    vertexShader: waterVertex.replace('uniform float uTime,', 'uniform float uPixelRatio; uniform float uTime,').replace(
      'gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);',
      'vec4 eye=viewMatrix*vec4(p,1.0); gl_Position=projectionMatrix*eye; gl_PointSize=clamp(36.0/max(1.0,-eye.z),1.15,2.6)*uPixelRatio;'),
    fragmentShader: `varying float vStrength;
      void main() {
        float d=length(gl_PointCoord-.5), a=(1.0-smoothstep(.1,.5,d))*vStrength;
        if(a<.015) discard; gl_FragColor=vec4(.55,.66,.69,a*.65);
      }`,
  })
  const spray = new THREE.Points(particles, sprayMaterial)
  spray.name = 'Low bow spray'; spray.frustumCulled = false; group.add(spray)
  const drops = Array.from({ length: count }, (_, i) => ({ x: 0, z: 0, vx: 0, vz: 0, age: 9, life: .32 + (i % 7) * .025, lift: .12 + (i % 5) * .032, power: 0 }))
  let phase = 0, cursor = 0, emission = 0, bowSide = -1, sternSide = 1
  return {
    group, trail,
    update(pose: WakePose, water: OceanSurfaceState, delta: number, playing: boolean, reducedMotion: boolean, ocean: THREE.ShaderMaterial, pixelRatio: number) {
      for (const key of Object.keys(material.uniforms)) {
        if (!ocean.uniforms[key]) continue
        material.uniforms[key].value = ocean.uniforms[key].value
      }
      sprayMaterial.uniforms.uPixelRatio.value = pixelRatio
      const dt = playing ? Math.min(.05, Math.max(0, delta)) : 0
      phase += dt
      advanceWakeTrail(trail, pose, dt)
      updateWakeSheets(sheets, trail, pose, phase)
      const c = Math.cos(pose.heading), s = Math.sin(pose.heading)
      emission += dt * pose.speed * (reducedMotion ? 0 : 26)
      while (emission >= 1) {
        emission--
        const drop = drops[cursor % count]
        const bow = cursor % 4 === 0
        const side = bow ? (bowSide *= -1) : (sternSide *= -1)
        const z = bow ? -2.6 : 3.5 + (cursor % 7) * .07
        const x = side * (bow ? 1.3 : 1.7)
        drop.x = pose.x + c*x + s*z; drop.z = -4 + c*z - s*x
        drop.vx = c*side*(.4 + (cursor % 5)*.08) + s*.7
        drop.vz = c*.7 - s*side*.5
        drop.age = 0; drop.power = pose.speed; cursor++
      }
      drops.forEach((drop, i) => {
        drop.age += dt
        if (drop.age >= drop.life || reducedMotion) { strengths[i] = 0; return }
        drop.x += drop.vx*dt; drop.z += drop.vz*dt
        const t = drop.age/drop.life
        positions.set([drop.x, .07 + 4*t*(1-t)*drop.lift, drop.z], i*3)
        strengths[i] = Math.sin(t*Math.PI)*drop.power
      })
      particles.attributes.position.needsUpdate = true; particles.attributes.strength.needsUpdate = true
      group.userData.wake = { samples: trail.points.length, speed: pose.speed, x: pose.x, heading: pose.heading, time: phase, seaTime: water.time }
    },
    dispose() {
      for (const sheet of [...sheets.shoulders, sheets.stern]) sheet.geometry.dispose()
      particles.dispose(); material.dispose(); sprayMaterial.dispose()
    },
  }
}

export default function BoatWake({ pose, playing = true }: { pose: { current: WakePose }; playing?: boolean }) {
  const wake = useMemo(() => createBoatWake(), [])
  const reducedMotion = useRef(false)
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => { reducedMotion.current = query.matches }
    update(); query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  useEffect(() => () => wake.dispose(), [wake])
  useFrame(({ scene, gl }, delta) => {
    const water = scene.userData.oceanSurface as OceanSurfaceState | undefined
    const ocean = scene.getObjectByName('Shared ocean surface') as THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial> | undefined
    if (!water || !ocean) return
    wake.update(pose.current, water, delta, playing, reducedMotion.current, ocean.material, gl.getPixelRatio())
    Object.assign(gl.domElement.dataset, { wakeSamples: String(wake.trail.points.length), boatX: pose.current.x.toFixed(3), boatHeading: pose.current.heading.toFixed(4), boatSpeed: pose.current.speed.toFixed(3) })
  }, -.5)
  return <primitive object={wake.group} dispose={null} />
}
