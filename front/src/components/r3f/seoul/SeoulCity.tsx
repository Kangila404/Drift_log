import Palace, { PalaceRoof } from './Palace'
import { DriftingTimber, SeoulLandscape } from './SeoulEnvironment'
import { OCEAN_SURFACE_Y } from '../OceanWater'

export const SEOUL_WATER_OFFSET = OCEAN_SURFACE_Y - 4.25

// This component owns city solids only. The host owns the canvas, atmosphere and sea.
export default function SeoulCity({ playing = true }: { playing?: boolean }) {
  return <group name="Seoul city geometry" position={[0, SEOUL_WATER_OFFSET, 0]}>
    <SeoulLandscape />
    <Palace />
    {[-1, 1].map(side => <group key={side} position={[side * 25.5, side === 1 ? -1.15 : -.45, -3]} rotation={[0, side * .04, side === 1 ? -.09 : .025]}>
      <mesh position={[0, 2.3, 0]}><boxGeometry args={[4.8, 2.8, 4.6]} /><meshStandardMaterial color="#74859e" roughness={.94} /></mesh>
      {[-1.8, 1.8].flatMap(x => [-1.4, 1.4].map(z => <mesh key={`${x},${z}`} position={[x, 4.65, z]}><cylinderGeometry args={[.14, .17, 2, 8]} /><meshStandardMaterial color="#505368" roughness={.9} /></mesh>))}
      <group position={[0, 5.6, 0]}><PalaceRoof width={6.2} depth={4.9} rise={1.3} /></group>
    </group>)}
    <group position={[-17, 3.9, 9]} rotation={[.09, -.5, -.23]}><PalaceRoof width={3.7} depth={2.8} rise={.7} /></group>
    <DriftingTimber playing={playing} />
  </group>
}
