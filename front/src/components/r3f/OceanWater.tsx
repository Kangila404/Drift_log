import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Reflector } from 'three/examples/jsm/objects/Reflector.js'
import type { ScenePreset } from '../../constants/scenePreset'
import { getWeatherAtmosphere } from '../../constants/weatherAtmosphere'
import { oceanWaveShader, type OceanSurfaceState } from './OceanWaves'

const oceanVertexShader = `
  varying vec3 vWorldPosition;
  varying vec2 vSlope;
  varying float vWaveHeight;
  varying float vViewDepth;
  varying vec4 vReflection;
  uniform mat4 textureMatrix;

  uniform float uTime;
  uniform float uWaveScale;
  uniform float uWaveSpeed;

  uniform float uWind;
  ${oceanWaveShader}

  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vReflection = textureMatrix * vec4(position, 1.0);
    vec2 p = world.xz;
    float t = uTime * uWaveSpeed;

    vec3 swell = oceanSwell(p, t, uWind);
    vWaveHeight = swell.x;

    float fadeT = clamp((p.y + 200.0) / 180.0, 0.0, 1.0);
    float fade = fadeT * fadeT * (3.0 - 2.0 * fadeT);
    float fadeSlope = fade > 0.3 ? 6.0 * fadeT * (1.0 - fadeT) / 180.0 : 0.0;
    fade = max(fade, 0.3);
    world.y += swell.x * uWaveScale * fade;
    vSlope = (swell.yz * fade + vec2(0.0, swell.x * fadeSlope)) * uWaveScale;
    vWorldPosition = world.xyz;
    vec4 viewPosition = viewMatrix * world;
    vViewDepth = -viewPosition.z;
    gl_Position = projectionMatrix * viewPosition;
  }
`

const oceanFragmentShader = `
  varying vec3 vWorldPosition;
  varying vec2 vSlope;
  varying float vWaveHeight;
  varying float vViewDepth;
  varying vec4 vReflection;
  uniform sampler2D tReflection;
  uniform float uReflectionStrength;

  uniform float uTime;
  uniform float uWaveSpeed;
  uniform float uRippleScale;
  uniform float uRain;
  uniform float uWind;
  uniform float uFoam;
  uniform vec3 uSkyColor;
  uniform vec3 uNearColor;
  uniform vec3 uFarColor;
  uniform vec3 uMoonColor;
  uniform float uMoonStrength;
  uniform float uMoonWash;
  uniform vec3 uCelestialPosition;
  uniform vec3 uFogColor;
  uniform float uFogDensity;
  uniform float uHaze;

  float hash(vec2 p) {
    vec3 q = fract(vec3(p.xyx) * 0.1031);
    q += dot(q, q.yzx + 33.33);
    return fract((q.x + q.y) * q.z);
  }

  // Value noise plus analytic derivatives: no textures or finite differences.
  vec3 noiseSlope(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    vec2 du = 6.0 * f * (1.0 - f);
    float crossTerm = a - b - c + d;
    return vec3(a + (b - a) * u.x + (c - a) * u.y + crossTerm * u.x * u.y,
      du * (vec2(b - a, c - a) + crossTerm * u.yx));
  }

  void main() {
    vec2 p = vWorldPosition.xz;
    float t = uTime * uWaveSpeed;
    float distanceToEye = length(cameraPosition.xz - p);
    float depth = smoothstep(15.0, 130.0, distanceToEye);
    vec3 color = mix(uNearColor, uFarColor, depth);
    float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
    color = mix(color, vec3(luminance), 0.18) * 0.78;

    vec2 frequencyA = vec2(0.48, 1.1);
    vec2 frequencyB = vec2(0.83, 0.57);
    vec3 rippleA = noiseSlope(p * frequencyA + vec2(t * 0.13, -t * 0.19));
    vec3 rippleB = noiseSlope(p * frequencyB + vec2(-t * 0.09, t * 0.15) + 19.7);
    // Fade subpixel detail before the horizon to limit shimmer on phone screens.
    float footprint = max(length(dFdx(p)), length(dFdy(p)));
    float detail = (1.0 - smoothstep(0.35, 1.5, footprint)) * (1.0 - depth * 0.75);
    vec2 rippleSlope = (rippleA.yz * frequencyA * 0.065 + rippleB.yz * frequencyB * 0.04);
    vec2 slope = vSlope + rippleSlope * uRippleScale * detail;
    // Rain breaks up reflections with short travelling surface capillaries.
    if (uRain > 0.0) {
      vec3 rainRipples = noiseSlope(p * vec2(3.1, 4.7) + vec2(t * .75, -t * 1.1));
      slope += rainRipples.yz * .027 * uRain * (1.0 - smoothstep(.16, .6, footprint));
    }
    slope += (rippleA.yz * .05 + rippleB.yz * .035) * uWind * detail;
    vec3 normal = normalize(vec3(-slope.x, 1.0, -slope.y));
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    float facing = clamp(dot(normal, viewDirection), 0.0, 1.0);
    float fresnel = 0.02 + 0.98 * pow(1.0 - facing, 5.0);
    float swellLight = clamp(dot(normal.xz, vec2(-0.8, 0.6)) * 1.6, -0.2, 0.24);
    color *= 0.92 + swellLight;
    color = mix(color, uFarColor * 0.82, fresnel * 0.32);
    vec3 skyReflection = uSkyColor;
    #ifdef TONE_MAPPING
      skyReflection = toneMapping(skyReflection);
    #endif
    skyReflection = linearToOutputTexel(vec4(skyReflection, 1.0)).rgb;
    float windTexture = mix(1.0, .65 + rippleA.x * .25 + rippleB.x * .2, detail * uWind);
    color = mix(color, skyReflection * .55 * windTexture, fresnel * (.12 + uWind * .22));
    // Local sky-facing shoulders reveal wave groups without a continuous crest stripe.
    float shoulder = pow(smoothstep(.012, .18, dot(-vSlope, vec2(-.65, .76))), 1.8);
    float exposure = noiseSlope(p * vec2(.11, .16) + vec2(t * .025, -t * .037)).x;
    float raised = .35 + .65 * smoothstep(-.1, .25, vWaveHeight);
    color += vec3(.1, .135, .16) * shoulder * (.15 + smoothstep(.3, .7, exposure) * .85) * raised * uWind * (1.0 - depth * .6);
    if (uReflectionStrength > 0.0 && vReflection.w > 0.0) {
      vec2 reflectedUv = vReflection.xy / vReflection.w;
      reflectedUv += slope * vec2(.045, .023) * (1.0 - depth * .65);
      float blur = .0015 + .005 * (1.0 - depth);
      vec3 reflected = texture2D(tReflection, clamp(reflectedUv, .001, .999)).rgb * .5;
      reflected += texture2D(tReflection, clamp(reflectedUv + vec2(blur, blur * .4), .001, .999)).rgb * .25;
      reflected += texture2D(tReflection, clamp(reflectedUv - vec2(blur, blur * .4), .001, .999)).rgb * .25;
      #ifdef TONE_MAPPING
        reflected = toneMapping(reflected);
      #endif
      reflected = linearToOutputTexel(vec4(reflected, 1.0)).rgb;
      float weight = uReflectionStrength * (.25 + fresnel * .75) * (1.0 - uWind * .65);
      color = mix(color, reflected * .64, weight);
    }

    // A broad celestial lobe catches irregular slopes instead of painted stripes.
    vec3 lightDirection = normalize(uCelestialPosition - vWorldPosition);
    vec3 halfDirection = normalize(viewDirection + lightDirection);
    float specular = pow(max(dot(normal, halfDirection), 0.0), 96.0);
    float patches = smoothstep(0.3, 0.77, rippleA.x * 0.6 + rippleB.x * 0.4);
    float broken = mix(0.24, 0.12 + patches * 0.88, detail * min(uRippleScale, 1.0));
    color += uMoonColor * specular * broken * (0.3 + fresnel * 0.7) * uMoonStrength;
    // A soft, broken sheen lifts moonlit water without a mirror pass or hard stripe.
    float moonSheen = pow(max(dot(normal, halfDirection), 0.0), 20.0);
    color += uMoonColor * moonSheen * (0.25 + patches * 0.75) * (0.35 + fresnel * 0.65) * uMoonWash;
    // Sparse caps on locally raised, disturbed water, not periodic sine bands.
    float crest = smoothstep(.08, .25, vWaveHeight) * smoothstep(.035, .1, length(vSlope));
    float breakup = smoothstep(.56, .74, rippleA.x * .6 + rippleB.x * .4);
    color += vec3(.14, .17, .18) * crest * breakup * uFoam * detail;

    float fogDepth = max(vViewDepth, 0.0) * uFogDensity;
    vec3 displayFog = uFogColor;
    #ifdef TONE_MAPPING
      displayFog = toneMapping(displayFog);
    #endif
    displayFog = linearToOutputTexel(vec4(displayFog, 1.0)).rgb;
    color = mix(color, displayFog, (1.0 - exp(-fogDepth * fogDepth)) * uHaze);

    gl_FragColor = vec4(color, 1.0);
  }
`

const DEFAULT = {
  waterNear: [0.025, 0.15, 0.235] as [number, number, number],
  waterFar: [0.012, 0.055, 0.105] as [number, number, number],
  waveScale: 1.0,
  waveSpeed: 1.0,
  moonColor: '#fffde8',
  showMoon: true,
}

interface OceanWaterProps {
  preset?: ScenePreset
  playing?: boolean
  waveStrength?: number
  celestialPosition?: [number, number, number]
  moonlightStrength?: number
  reflectArchitecture?: boolean
  reflectionRevision?: number
}

export const OCEAN_SURFACE_Y = -2.7
export const OCEAN_GRID_SEGMENTS = 128

function createOceanGrid() {
  const geometry = new THREE.PlaneGeometry(900, 900, OCEAN_GRID_SEGMENTS, OCEAN_GRID_SEGMENTS)
  const positions = geometry.attributes.position
  // Resolve wind crests across the visible foreground, then stretch the far field.
  const stretch = (value: number) => {
    const u = value / 450, a = Math.abs(u), outer = Math.max(0, a - .8)
    return Math.sign(u) * (a * 60 + 9750 * outer * outer)
  }
  for (let i = 0; i < positions.count; i++) {
    positions.setXY(i, stretch(positions.getX(i)), stretch(positions.getY(i)))
  }
  geometry.computeBoundingSphere()
  return geometry
}

export default function OceanWater({ preset, playing = true, waveStrength = 1, celestialPosition = [0, 8.4, -20], moonlightStrength = 0, reflectArchitecture = false, reflectionRevision = 0 }: OceanWaterProps) {
  const get = useThree(state => state.get)
  const geometry = useMemo(() => createOceanGrid(), [])
  const surfaceState = useRef<OceanSurfaceState>({ time: 0, scale: 1, speed: 1, wind: 0 })
  useEffect(() => {
    const scene = get().scene
    const state = surfaceState.current
    scene.userData.oceanSurface = state
    return () => {
      if (scene.userData.oceanSurface === state) delete scene.userData.oceanSurface
    }
  }, [get])
  useEffect(() => () => geometry.dispose(), [geometry])
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const surfaceRef = useRef<THREE.Mesh>(null)
  const reflection = useRef<Reflector | null>(null)
  const capture = useRef({ position: new THREE.Vector3(Infinity, 0, 0), rotation: new THREE.Quaternion(), projection: new THREE.Matrix4(), dirty: true, count: 0, geometryRevision: -1 })

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    textureMatrix: { value: new THREE.Matrix4() },
    tReflection: { value: null as THREE.Texture | null },
    uReflectionStrength: { value: 0 },
    uWaveScale: { value: DEFAULT.waveScale },
    uWaveSpeed: { value: DEFAULT.waveSpeed },
    uRippleScale: { value: 1 },
    uRain: { value: 0 }, uWind: { value: 0 }, uFoam: { value: 0 }, uSkyColor: { value: new THREE.Color() },
    uNearColor: { value: new THREE.Color(...DEFAULT.waterNear) },
    uFarColor: { value: new THREE.Color(...DEFAULT.waterFar) },
    uMoonColor: { value: new THREE.Color(DEFAULT.moonColor) },
    uMoonStrength: { value: 0.12 },
    uMoonWash: { value: 0 },
    uCelestialPosition: { value: new THREE.Vector3(0, 8.4, -20) },
    uFogColor: { value: new THREE.Color('#07111d') },
    uFogDensity: { value: 0.012 },
    uHaze: { value: 0 },
  }), [])

  useEffect(() => {
    if (!reflectArchitecture) return
    // Capture only when the camera or atmosphere changes. Ripples remain per-frame.
    const geometry = new THREE.BufferGeometry()
    const mirror = new Reflector(geometry, { textureWidth: 384, textureHeight: 384, multisample: 0, clipBias: .003 })
    reflection.current = mirror
    capture.current.dirty = true
    capture.current.count = 0
    return () => {
      reflection.current = null
      mirror.dispose(); geometry.dispose()
    }
  }, [reflectArchitecture])
  useEffect(() => { capture.current.dirty = true }, [preset?.fogColor, preset?.fogDensity, preset?.ambientIntensity, preset?.skyTop, preset?.skyBottom, preset?.effects, preset?.moonColor, preset?.celestialBody, preset?.showMoon, reflectionRevision])

  useFrame(({ gl, scene, camera }) => {
    const mirror = reflection.current, surface = surfaceRef.current, material = materialRef.current, previous = capture.current
    if (!material) return
    if (!mirror || !surface) {
      material.uniforms.uReflectionStrength.value = 0
      material.uniforms.tReflection.value = null
      if (import.meta.env.DEV) gl.domElement.dataset.reflectionCaptures = '0'
      return
    }
    material.uniforms.textureMatrix.value = (mirror.material as THREE.ShaderMaterial).uniforms.textureMatrix.value
    material.uniforms.tReflection.value = mirror.getRenderTarget().texture
    material.uniforms.uReflectionStrength.value = .48
    const geometryRevision = scene.userData.cityGeometryRevision ?? 0
    if (!previous.dirty && previous.geometryRevision === geometryRevision && previous.position.distanceToSquared(camera.position) < .0025 && previous.rotation.angleTo(camera.quaternion) < .001 && previous.projection.equals(camera.projectionMatrix)) return
    scene.updateMatrixWorld()
    camera.updateMatrixWorld()
    mirror.matrixWorld.copy(surface.matrixWorld)
    surface.visible = false
    try {
      const updateReflection = mirror.onBeforeRender as (renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) => void
      updateReflection(gl, scene, camera)
      previous.count++
      if (import.meta.env.DEV) {
        gl.domElement.dataset.reflectionCaptures = String(previous.count)
        gl.domElement.dataset.reflectionTriangles = String(gl.info.render.triangles)
        gl.domElement.dataset.reflectionDrawCalls = String(gl.info.render.calls)
      }
    } finally { surface.visible = true }
    previous.position.copy(camera.position); previous.rotation.copy(camera.quaternion); previous.projection.copy(camera.projectionMatrix); previous.dirty = false
    previous.geometryRevision = geometryRevision
  })

  useFrame((_, delta) => {
    const mat = materialRef.current
    if (!mat) return

    const waterNear = preset?.waterNear ?? DEFAULT.waterNear
    const waterFar = preset?.waterFar ?? DEFAULT.waterFar
    const waveScale = preset?.waveScale ?? DEFAULT.waveScale
    const waveSpeed = preset?.waveSpeed ?? DEFAULT.waveSpeed
    const moonColor = preset?.moonColor ?? DEFAULT.moonColor
    const showMoon = preset?.showMoon ?? DEFAULT.showMoon
    const atmosphere = getWeatherAtmosphere(preset?.effects)

    mat.uniforms.uCelestialPosition.value.set(...celestialPosition)

    if (playing) mat.uniforms.uTime.value += THREE.MathUtils.clamp(delta, 0, .05)
    mat.uniforms.uWaveScale.value = waveScale * waveStrength
    mat.uniforms.uWaveSpeed.value = waveSpeed
    // Sheltered water retains fine ripples while its long swells are reduced.
    mat.uniforms.uRippleScale.value = Math.sqrt(Math.max(0, waveScale * waveStrength))
    mat.uniforms.uRain.value = atmosphere.rain
    mat.uniforms.uWind.value = atmosphere.wind
    mat.uniforms.uFoam.value = atmosphere.foam * Math.sqrt(waveStrength)
    mat.uniforms.uSkyColor.value.set(preset?.skyBottom ?? '#0e2a44')
    mat.uniforms.uNearColor.value.setRGB(...waterNear)
    mat.uniforms.uFarColor.value.setRGB(...waterFar)
    mat.uniforms.uMoonColor.value.set(moonColor)
    mat.uniforms.uMoonStrength.value = showMoon ? (preset?.celestialBody === 'eclipse' ? 0.035 : 0.12) * atmosphere.transmission : 0.0
    mat.uniforms.uMoonWash.value = showMoon && preset?.celestialBody === 'moon' ? moonlightStrength * atmosphere.transmission : 0
    // Fog uses the sky's output transform; water retains the service's display palette.
    mat.uniforms.uFogColor.value.set(preset?.fogColor ?? '#07111d')
    mat.uniforms.uFogDensity.value = preset?.fogDensity ?? 0.012
    mat.uniforms.uHaze.value = atmosphere.haze
    surfaceState.current.time = mat.uniforms.uTime.value
    surfaceState.current.scale = waveScale * waveStrength
    surfaceState.current.speed = waveSpeed
    surfaceState.current.wind = atmosphere.wind
  }, -2)

  return (
    <mesh ref={surfaceRef} geometry={geometry} name="Shared ocean surface" position={[0, OCEAN_SURFACE_Y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={oceanVertexShader}
        fragmentShader={oceanFragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  )
}
