import { useMemo } from 'react'
import { useLoader, useThree } from '@react-three/fiber'
import { FileLoader } from 'three'
import { OCEAN_SURFACE_Y } from '../OceanWater'
import CityGeometry from '../city/CityGeometry'
import { createCityOcclusion } from '../city/CityOcclusion'
import { buildBusanLandmark, buildBusanNeighborhood } from '../busan/HarborNeighborhood'
import towerDesktop from '../busan/baked/tower-desktop.bin?url'
import towerPortrait from '../busan/baked/tower-portrait.bin?url'
import townDesktop from '../busan/baked/town-desktop.bin?url'
import townPortrait from '../busan/baked/town-portrait.bin?url'

const TOWER = { concrete: '#b6c1bf', edge: '#778f99', faded: '#819c9f', trim: '#b5c6c7', glass: '#3a5868', steel: '#6c929d' }
const TOWN = { concrete: '#a5b3b2', faded: '#899fa1', edge: '#708990', trim: '#b4bfba', steel: '#537c80', paint: '#5c8886', glass: '#2b4859', glazing: '#577786' }

export default function BusanCity() {
  const { size } = useThree()
  const portrait = size.width / size.height < .9
  const [tower, town] = useLoader(FileLoader, portrait ? [towerPortrait, townPortrait] : [towerDesktop, townDesktop], loader => loader.setResponseType('arraybuffer')) as ArrayBuffer[]
  const shading = useMemo(() => ({ tower: createCityOcclusion(tower, .35), town: createCityOcclusion(town, .43) }), [tower, town])
  const builders = useMemo(() => ({
    tower: (kit: Parameters<typeof buildBusanLandmark>[0]) => buildBusanLandmark(kit, portrait),
    town: (kit: Parameters<typeof buildBusanNeighborhood>[0]) => buildBusanNeighborhood(kit, portrait),
  }), [portrait])
  return <group name="Busan city geometry" position={[0, OCEAN_SURFACE_Y - 4.25, 0]} userData={{ artSource: 'modeled-geometry', imageTextures: 0 }}>
    <CityGeometry name="Busan Yongdusan Tower landmark" build={builders.tower} palette={TOWER} prepare={shading.tower} weatheringStrength={.25} />
    <CityGeometry name="Busan drowned Nampo neighborhood" build={builders.town} palette={TOWN} prepare={shading.town} weatheringStrength={.42} />
  </group>
}
