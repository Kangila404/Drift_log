import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { OCEAN_SURFACE_Y } from '../OceanWater'
import IncheonBridge from './IncheonBridge'
import IncheonHarbor from './IncheonHarbor'

function MooringBuoy({ playing }: { playing: boolean }) {
  const buoy = useRef<THREE.Group>(null)
  const elapsed = useRef(0)
  useFrame((_, delta) => {
    if (playing) elapsed.current += Math.min(delta, .05)
    if (!buoy.current) return
    buoy.current.position.y = 4.3 + Math.sin(elapsed.current * .7) * .055
    buoy.current.rotation.z = -.18 + Math.sin(elapsed.current * .5) * .035
  })
  return <group ref={buoy} name="Incheon drifting mooring buoy" position={[-2, 4.3, 18]} rotation={[0, 0, -.18]}>
    <mesh><cylinderGeometry args={[.45, .56, .38, 12]} /><meshStandardMaterial color="#40596e" roughness={1} /></mesh>
    <mesh position={[0, .41, 0]}><cylinderGeometry args={[.12, .2, .6, 8]} /><meshStandardMaterial color="#566a7b" roughness={1} /></mesh>
    <mesh position={[0, .82, 0]}><torusGeometry args={[.16, .045, 5, 12]} /><meshStandardMaterial color="#3d5268" roughness={1} /></mesh>
  </group>
}

export default function IncheonCity({ playing = true }: { playing?: boolean }) {
  return <group name="Incheon city geometry" position={[-4, OCEAN_SURFACE_Y - 4.25, 0]}>
    <group position={[-5.5, 0, 0]}><IncheonHarbor /></group>
    <IncheonBridge />
    <MooringBuoy playing={playing} />
  </group>
}
