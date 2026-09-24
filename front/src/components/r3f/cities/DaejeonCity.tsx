import { useMemo } from 'react'
import { useLoader, useThree } from '@react-three/fiber'
import { FileLoader } from 'three'
import { OCEAN_SURFACE_Y } from '../OceanWater'
import CityGeometry from '../city/CityGeometry'
import { createCityOcclusion } from '../city/CityOcclusion'
import { buildExpoNeighborhood, buildExpoLandmark } from '../daejeon/ExpoPlaza'
import { buildDaejeonDistantRidges, prepareDaejeonDistantRidges } from '../daejeon/DistantRidges'
import plazaDesktop from '../daejeon/baked/plaza-desktop.bin?url'
import plazaPortrait from '../daejeon/baked/plaza-portrait.bin?url'
import towerDesktop from '../daejeon/baked/tower-desktop.bin?url'
import towerPortrait from '../daejeon/baked/tower-portrait.bin?url'

const GALLERY = { concrete: '#99a8aa', edge: '#637d87', faded: '#718d90', paint: '#5f8b87', steel: '#4d6877', trim: '#a5b7b9', glass: '#243e50', glazing: '#385d6b' }
const TOWER = { concrete: '#b7c0bc', edge: '#6d8590', faded: '#72939c', trim: '#b1c6c9', steel: '#627d90', glass: '#253e52', glazing: '#375365' }
const TERRAIN = { faded: '#536d76' }

export default function DaejeonCity() {
  const { size } = useThree()
  const portrait = size.width / size.height < .9
  const [plaza, tower] = useLoader(FileLoader, portrait ? [plazaPortrait, towerPortrait] : [plazaDesktop, towerDesktop], loader => loader.setResponseType('arraybuffer')) as ArrayBuffer[]
  const shading = useMemo(() => ({ plaza: createCityOcclusion(plaza, .4), tower: createCityOcclusion(tower, .38) }), [plaza, tower])
  const builders = useMemo(() => ({
    terrain: (kit: Parameters<typeof buildDaejeonDistantRidges>[0]) => buildDaejeonDistantRidges(kit, portrait),
    plaza: (kit: Parameters<typeof buildExpoNeighborhood>[0]) => buildExpoNeighborhood(kit, portrait),
    tower: (kit: Parameters<typeof buildExpoLandmark>[0]) => buildExpoLandmark(kit, portrait),
  }), [portrait])
  return <group name="Daejeon city geometry" position={[0, OCEAN_SURFACE_Y - 4.25, 0]} userData={{ artSource: 'modeled-geometry', imageTextures: 0 }}>
    <CityGeometry name="Daejeon distant inland ridges" build={builders.terrain} palette={TERRAIN} prepare={prepareDaejeonDistantRidges} weatheringStrength={0} />
    <CityGeometry name="Daejeon drowned Expo galleries" build={builders.plaza} palette={GALLERY} prepare={shading.plaza} />
    <CityGeometry name="Daejeon Hanbit Tower landmark" build={builders.tower} palette={TOWER} prepare={shading.tower} />
  </group>
}
