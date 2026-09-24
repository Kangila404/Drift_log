import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { BoatColors } from '../../../stores/boatStore'
import { buildVoyagerAnchor, buildVoyagerFurledSails, buildVoyagerGaff, buildVoyagerGeometry, buildVoyagerJib, buildVoyagerSail, VOYAGER_ANCHOR_POINT, VOYAGER_ANCHOR_RAISED, VOYAGER_ANCHOR_LOWERED, VOYAGER_DRAFT, type VoyagerFinish } from './VoyagerGeometry'

export interface VoyagerModelProps {
  colors: BoatColors
  rust: number
  daylight?: boolean
  sailing?: boolean
  playing?: boolean
}

function palette(colors: BoatColors): Record<VoyagerFinish, string> {
  return {
    hull: colors.hull, keel: '#17272c', rim: '#8c9fa5', deck: '#647674',
    cabin: '#637f8d', roof: '#a0adb1', wood: '#747b70', metal: '#7d827c', rope: '#969c94',
    glass: '#172e3a', light: colors.lamp, canvas: colors.sail, seam: colors.sail, patch: colors.sail,
  }
}

function materials() {
  return Object.fromEntries(Object.entries(palette({ hull: '#405868', sail: '#d9d4c6', lamp: '#ffc47c' })).map(([finish, color]) => {
    const cloth = ['canvas', 'seam', 'patch'].includes(finish)
    const material = new THREE.MeshPhysicalMaterial({ color, roughness: cloth ? .92 : finish === 'glass' ? .18 : finish === 'hull' ? .36 : finish === 'metal' ? .42 : .74,
      metalness: finish === 'metal' ? .32 : .03, side: cloth ? THREE.DoubleSide : THREE.FrontSide,
      sheen: finish === 'canvas' ? .45 : 0, sheenRoughness: .8, sheenColor: new THREE.Color('#c9d2d4'),
      clearcoat: finish === 'hull' ? .16 : 0, clearcoatRoughness: .6 })
    material.userData.wear = { value: 0 }
    if (!['light', 'glass', 'rope', 'seam'].includes(finish)) {
      material.onBeforeCompile = shader => {
        shader.uniforms.voyagerWear = material.userData.wear
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', '#include <common>\nvarying vec3 vVoyagerPosition;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvVoyagerPosition = position;')
        shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
          varying vec3 vVoyagerPosition;
          uniform float voyagerWear;
          float voyagerHash(vec3 p) { return fract(sin(dot(p, vec3(12.9898,78.233,39.425))) * 43758.5453); }
          float voyagerNoise(vec3 p) {
            vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
            return mix(mix(mix(voyagerHash(i),voyagerHash(i+vec3(1,0,0)),f.x),mix(voyagerHash(i+vec3(0,1,0)),voyagerHash(i+vec3(1,1,0)),f.x),f.y),
              mix(mix(voyagerHash(i+vec3(0,0,1)),voyagerHash(i+vec3(1,0,1)),f.x),mix(voyagerHash(i+vec3(0,1,1)),voyagerHash(i+vec3(1,1,1)),f.x),f.y),f.z);
          }
        `).replace('#include <map_fragment>', `#include <map_fragment>
          vec3 p = vVoyagerPosition;
          float grain = voyagerNoise(p * ${cloth ? '95.0' : '45.0'});
          float detailAA = 1.0 - smoothstep(.35, 1.2, length(fwidth(p * 45.0)));
          diffuseColor.rgb *= 1.0 + (grain - .5) * .08 * detailAA;
          ${finish === 'wood' || finish === 'deck' ? `
            float fiber = voyagerNoise(p * vec3(72.0, 48.0, 2.2));
            diffuseColor.rgb *= .9 + fiber * .18;
          ` : ''}
          ${finish === 'cabin' ? 'diffuseColor.rgb *= .82 + .18 * smoothstep(.32, .49, p.y);' : ''}
          ${cloth ? `
            float panel = voyagerNoise(p * vec3(7.0, 2.0, 4.0));
            diffuseColor.rgb *= .95 + .07 * panel;
          ` : ''}
          float salt = smoothstep(.51, .7, voyagerNoise(p * vec3(5.0, 2.5, 5.0)));
          float streak = smoothstep(.55, .72, voyagerNoise(p * vec3(18.0, 1.8, 12.0)));
          float wet = 1.0 - smoothstep(-.21, -.06, p.y);
          diffuseColor.rgb *= 1.0 - ${cloth ? '0.0' : '.25'} * wet;
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(.52,.72,.66), salt * voyagerWear * ${cloth ? '.18' : '.5'});
          diffuseColor.rgb += salt * voyagerWear * .025;
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.14,.2,.21), salt * streak * voyagerWear * ${cloth ? '.08' : '.6'});
        `).replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
          roughnessFactor = clamp(roughnessFactor + (voyagerNoise(vVoyagerPosition * vec3(32.0, 17.0, 3.0)) - .5) * .13, .18, 1.0);
        `).replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          float reliefAA = 1.0 - smoothstep(.2, 1.1, length(fwidth(vVoyagerPosition * 65.0)));
          float relief = voyagerNoise(vVoyagerPosition * ${cloth ? 'vec3(65.0, 90.0, 65.0)' : finish === 'wood' || finish === 'deck' ? 'vec3(75.0, 40.0, 2.5)' : 'vec3(38.0)'}) * ${cloth ? '.00065' : finish === 'wood' || finish === 'deck' ? '.0015' : '.0003'} * reliefAA;
          vec3 surfaceX = dFdx(-vViewPosition), surfaceY = dFdy(-vViewPosition);
          vec3 r1 = cross(surfaceY, normal), r2 = cross(normal, surfaceX);
          float determinant = dot(surfaceX, r1);
          normal = normalize(abs(determinant) * normal - sign(determinant) * (dFdx(relief) * r1 + dFdy(relief) * r2));
        `)
      }
      material.customProgramCacheKey = () => `voyager-surface-v2:${finish}`
    }
    return [finish, material]
  })) as Record<VoyagerFinish, THREE.MeshPhysicalMaterial>
}

export default function VoyagerModel({ colors, rust, daylight = false, sailing = true, playing = true }: VoyagerModelProps) {
  const hull = useMemo(() => buildVoyagerGeometry(), [])
  const sail = useMemo(() => buildVoyagerSail(), [])
  const jib = useMemo(() => buildVoyagerJib(), [])
  const anchor = useMemo(() => buildVoyagerAnchor(), [])
  const furled = useMemo(() => buildVoyagerFurledSails(), [])
  const gaff = useMemo(() => buildVoyagerGaff(), [])
  const finishes = useMemo(() => materials(), [])
  const anchorMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#849697', roughness: .65, metalness: .22, emissive: '#50616c', emissiveIntensity: .12 }), [])
  const chainGeometry = useMemo(() => new THREE.TorusGeometry(.024, .006, 5, 8), [])
  const halyardGeometry = useMemo(() => new THREE.CylinderGeometry(.008, .008, 1, 6), [])
  const halyard = useRef<THREE.Mesh>(null)
  const sailGroup = useRef<THREE.Group>(null), jibGroup = useRef<THREE.Group>(null)
  const anchorGroup = useRef<THREE.Group>(null), chain = useRef<THREE.InstancedMesh>(null)
  const furledGroup = useRef<THREE.Group>(null)
  const gaffGroup = useRef<THREE.Group>(null)
  const deployed = useRef(sailing ? 1 : 0)
  const anchorLift = useRef(sailing ? 1 : 0)
  const windTime = useRef(0)
  const scratch = useMemo(() => ({ matrix: new THREE.Matrix4(), position: new THREE.Vector3(), rotation: new THREE.Quaternion(), scale: new THREE.Vector3(.72, 1, 1), up: new THREE.Vector3(0, 1, 0), direction: new THREE.Vector3() }), [])
  // Three.js owns mutable GPU resources; keep their identities across rust updates.
  useEffect(() => {
    for (const [finish, color] of Object.entries(palette(colors))) {
      const material = finishes[finish as VoyagerFinish]
      material.color.set(color)
      if (finish === 'patch') material.color.multiplyScalar(.96)
      if (finish === 'seam') material.color.multiplyScalar(.97)
      // eslint-disable-next-line react-hooks/immutability
      material.userData.wear.value = THREE.MathUtils.clamp(rust, 0, 1)
      if (finish === 'light') {
        material.color.multiplyScalar(.68)
        material.emissive.set(color)
        material.emissiveIntensity = daylight ? .08 : .48
      }
    }
  }, [colors, rust, daylight, finishes])
  useEffect(() => () => { for (const batch of [...hull, ...sail, ...jib, ...anchor, ...furled, ...gaff]) batch.geometry.dispose() }, [hull, sail, jib, anchor, furled, gaff])
  useEffect(() => () => Object.values(finishes).forEach(material => material.dispose()), [finishes])
  useEffect(() => () => chainGeometry.dispose(), [chainGeometry])
  useEffect(() => () => anchorMaterial.dispose(), [anchorMaterial])
  useEffect(() => () => halyardGeometry.dispose(), [halyardGeometry])
  useFrame(({ invalidate }, delta) => {
    const target = sailing ? 1 : 0
    const difference = target - deployed.current
    if (Math.abs(difference) > .0001) {
      deployed.current += difference * (1 - Math.exp(-Math.min(delta, .25) * 6))
      invalidate()
    } else deployed.current = target
    const f = deployed.current
    if (playing && sailing) windTime.current += Math.min(delta, .05)
    for (const group of [sailGroup.current, jibGroup.current]) if (group) {
      group.visible = f > .045
      group.userData.deployed = f
      for (const object of group.children) {
        const mesh = object as THREE.Mesh
        if (mesh.morphTargetInfluences) {
          mesh.morphTargetInfluences[0] = 1 - f
          mesh.morphTargetInfluences[1] = (.5 + .5 * Math.sin(windTime.current * 1.4)) * f
        }
      }
    }
    if (furledGroup.current) furledGroup.current.visible = f <= .045
    if (gaffGroup.current) {
      gaffGroup.current.position.y = 1.52 + f * 1.46
      scratch.direction.set(.64, .02 + f * .53, 2.11).normalize()
      gaffGroup.current.quaternion.setFromUnitVectors(scratch.up, scratch.direction)
      if (halyard.current) {
        scratch.position.copy(scratch.direction).multiplyScalar(Math.hypot(.64, .55, 2.11)).add(gaffGroup.current.position)
        scratch.direction.set(0, 3.8, -.98).sub(scratch.position)
        halyard.current.scale.y = scratch.direction.length()
        halyard.current.quaternion.setFromUnitVectors(scratch.up, scratch.direction.normalize())
        halyard.current.position.set(scratch.position.x * .5, (scratch.position.y + 3.8) * .5, (scratch.position.z - .98) * .5)
      }
    }
    anchorLift.current += (target - anchorLift.current) * (1 - Math.exp(-Math.min(delta, .25) * 8))
    if (Math.abs(anchorLift.current - target) < .0001) anchorLift.current = target
    else invalidate()
    const eyeY = VOYAGER_ANCHOR_LOWERED + (VOYAGER_ANCHOR_RAISED - VOYAGER_ANCHOR_LOWERED) * anchorLift.current
    if (anchorGroup.current) anchorGroup.current.position.y = eyeY
    if (chain.current) {
      const length = VOYAGER_ANCHOR_POINT[1] - eyeY - .027
      const count = Math.ceil(length / .043)
      chain.current.count = count
      for (let i = 0; i < count; i++) {
        scratch.position.set(VOYAGER_ANCHOR_POINT[0], VOYAGER_ANCHOR_POINT[1] - (i + .5) * length / count, VOYAGER_ANCHOR_POINT[2])
        scratch.rotation.setFromAxisAngle(scratch.up, i % 2 * Math.PI / 2)
        chain.current.setMatrixAt(i, scratch.matrix.compose(scratch.position, scratch.rotation, scratch.scale))
      }
      chain.current.instanceMatrix.needsUpdate = true
    }
  })
  const meshes = (batches: typeof hull) => batches.map(({ finish, geometry }) => <mesh key={finish} args={[geometry, finishes[finish]]} />)
  return <group name="Voyager boat model" position={[0, -VOYAGER_DRAFT, 0]} userData={{ artSource: 'modeled-geometry', imageTextures: 0 }} dispose={null}>
    {meshes(hull)}
    <group ref={sailGroup} name="Voyager mainsail" position={[0, 1.45, 0]}>{meshes(sail)}</group>
    <group ref={jibGroup} name="Voyager foresail" position={[0, .79, 0]}>{meshes(jib)}</group>
    <group ref={gaffGroup} name="Voyager rigid gaff" position={[0, 2.98, -.98]}>{meshes(gaff)}</group>
    <group ref={furledGroup} name="Voyager furled canvas" visible={!sailing}>{meshes(furled)}</group>
    <mesh ref={halyard} name="Voyager gaff halyard" args={[halyardGeometry, finishes.rope]} />
    <group ref={anchorGroup} name="Voyager anchor" position={[VOYAGER_ANCHOR_POINT[0], sailing ? VOYAGER_ANCHOR_RAISED : VOYAGER_ANCHOR_LOWERED, VOYAGER_ANCHOR_POINT[2]]} scale={1.2}>
      {anchor.map(({ finish, geometry }) => <mesh key={finish} args={[geometry, anchorMaterial]} />)}
    </group>
    <instancedMesh ref={chain} name="Voyager stern anchor chain" args={[chainGeometry, finishes.rim, 32]} frustumCulled={false} />
    <pointLight position={[.65, .79, 1.74]} color={colors.lamp} intensity={daylight ? .12 : .65} distance={3.5} decay={2} />
  </group>
}
