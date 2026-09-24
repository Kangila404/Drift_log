import { useMemo } from 'react'
import { useLoader, useThree } from '@react-three/fiber'
import { FileLoader } from 'three'
import { OCEAN_SURFACE_Y } from '../OceanWater'
import CityGeometry from '../city/CityGeometry'
import { createCityOcclusion } from '../city/CityOcclusion'
import { buildGangneungCoast, buildGangneungLandmark } from '../gangneung/HeadlandTerrace'
import { buildGangneungQuarter } from '../gangneung/CoastalQuarter'
import coastDesktop from '../gangneung/baked/coast-desktop.bin?url'
import coastPortrait from '../gangneung/baked/coast-portrait.bin?url'
import hotelDesktop from '../gangneung/baked/hotel-desktop.bin?url'
import hotelPortrait from '../gangneung/baked/hotel-portrait.bin?url'
import quarterDesktop from '../gangneung/baked/quarter-desktop.bin?url'
import quarterPortrait from '../gangneung/baked/quarter-portrait.bin?url'

const COAST = { concrete: '#899c9f', edge: '#667f86', faded: '#586d77', steel: '#526e79', glass: '#233e4b', glazing: '#3e626c' }
const HOTEL = { concrete: '#b2bfbe', edge: '#81999f', faded: '#8babad', trim: '#b4c3c3', steel: '#526f7c', paint: '#628787', glass: '#466573', glazing: '#61858c' }
const QUARTER = { concrete: '#a0b0b1', edge: '#70898e', faded: '#7e999c', trim: '#b0bfbd', paint: '#5f8a86', steel: '#506b7a', glass: '#2f4d5b', glazing: '#577a85' }

export default function GangneungCity() {
  const { size } = useThree()
  const portrait = size.width / size.height < .9
  const [coast, hotel, quarter] = useLoader(FileLoader, portrait ? [coastPortrait, hotelPortrait, quarterPortrait] : [coastDesktop, hotelDesktop, quarterDesktop], loader => loader.setResponseType('arraybuffer')) as ArrayBuffer[]
  const shading = useMemo(() => ({ coast: createCityOcclusion(coast, .4), hotel: createCityOcclusion(hotel, .36), quarter: createCityOcclusion(quarter, .44) }), [coast, hotel, quarter])
  const builders = useMemo(() => ({
    coast: (kit: Parameters<typeof buildGangneungCoast>[0]) => buildGangneungCoast(kit, portrait),
    hotel: (kit: Parameters<typeof buildGangneungLandmark>[0]) => buildGangneungLandmark(kit, portrait),
    quarter: (kit: Parameters<typeof buildGangneungQuarter>[0]) => buildGangneungQuarter(kit, portrait),
  }), [portrait])
  return <group name="Gangneung city geometry" position={[0, OCEAN_SURFACE_Y - 4.25, 0]} userData={{ artSource: 'modeled-geometry', imageTextures: 0 }}>
    <CityGeometry name="Gangneung drowned arrival terrace" build={builders.coast} palette={COAST} prepare={shading.coast} weatheringStrength={.6} />
    <CityGeometry name="Gangneung Sun Cruise landmark" build={builders.hotel} palette={HOTEL} prepare={shading.hotel} weatheringStrength={.3} />
    <CityGeometry name="Gangneung drowned coastal quarter" build={builders.quarter} palette={QUARTER} prepare={shading.quarter} weatheringStrength={.48} />
  </group>
}
