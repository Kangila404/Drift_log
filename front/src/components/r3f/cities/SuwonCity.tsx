import { useMemo } from 'react'
import { useLoader, useThree } from '@react-three/fiber'
import { FileLoader } from 'three'
import { OCEAN_SURFACE_Y } from '../OceanWater'
import CityGeometry from '../city/CityGeometry'
import { createCityOcclusion } from '../city/CityOcclusion'
import { buildSuwonLandmark, buildSuwonNeighborhood, SUWON_PARCELS } from '../suwon/InlandNeighborhood'
import { buildSuwonTerrain, prepareSuwonTerrain } from '../suwon/InlandTerrain'
import { prepareSuwonArchitecture } from '../suwon/SuwonSurfaces'
import gateDesktop from '../suwon/baked/gate-desktop.bin?url'
import gatePortrait from '../suwon/baked/gate-portrait.bin?url'
import townDesktop from '../suwon/baked/town-desktop.bin?url'
import townPortrait from '../suwon/baked/town-portrait.bin?url'

const GATE = { concrete: '#acbab8', edge: '#788e98', faded: '#829a9a', trim: '#aebfbc', steel: '#527273', paint: '#527b76', dark: '#263d49', rust: '#717e7d' }
const TOWN = { concrete: '#bcc2bd', faded: '#a2b1b0', edge: '#667e86', trim: '#a4b9b6', steel: '#4d6e77', paint: '#5f8276', glass: '#233e4b', glazing: '#546a7c', rust: '#85838b' }
const TERRAIN = { concrete: '#426267', faded: '#45616f' }

export default function SuwonCity() {
  const { size } = useThree()
  const portrait = size.width / size.height < .9
  const [gate, town] = useLoader(FileLoader, portrait ? [gatePortrait, townPortrait] : [gateDesktop, townDesktop], loader => loader.setResponseType('arraybuffer')) as ArrayBuffer[]
  const shading = useMemo(() => ({ gate: createCityOcclusion(gate, .39), town: (batches: Parameters<typeof prepareSuwonArchitecture>[0]) => {
    createCityOcclusion(town, .42)(batches)
    prepareSuwonArchitecture(batches)
  } }), [gate, town])
  const builders = useMemo(() => ({
    gate: (kit: Parameters<typeof buildSuwonLandmark>[0]) => buildSuwonLandmark(kit, portrait),
    town: (kit: Parameters<typeof buildSuwonNeighborhood>[0]) => buildSuwonNeighborhood(kit, portrait),
    terrain: (kit: Parameters<typeof buildSuwonTerrain>[0]) => buildSuwonTerrain(kit, portrait),
  }), [portrait])
  return <group name="Suwon city geometry" position={[0, OCEAN_SURFACE_Y - 4.25, 0]} userData={{ artSource: 'modeled-geometry', imageTextures: 0, architecturalParcels: SUWON_PARCELS.length, terrain: 'inland-foothills' }}>
    <CityGeometry name="Suwon inland foothills" build={builders.terrain} palette={TERRAIN} prepare={prepareSuwonTerrain} weatheringStrength={0} />
    <CityGeometry name="Suwon Hwaseomun landmark" build={builders.gate} palette={GATE} prepare={shading.gate} weatheringStrength={.63} />
    <CityGeometry name="Suwon drowned fortress neighborhood" build={builders.town} palette={TOWN} prepare={shading.town} weatheringStrength={.78} />
  </group>
}
