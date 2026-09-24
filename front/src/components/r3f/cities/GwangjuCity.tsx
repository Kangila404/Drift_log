import { useMemo } from 'react'
import { useLoader, useThree } from '@react-three/fiber'
import { FileLoader } from 'three'
import { OCEAN_SURFACE_Y } from '../OceanWater'
import CityGeometry from '../city/CityGeometry'
import { createCityOcclusion } from '../city/CityOcclusion'
import { buildCivicLandmark, buildCivicQuarter, CIVIC_PARCELS } from '../gwangju/CivicQuarter'
import { buildMudeungRelief, prepareMudeungRelief } from '../gwangju/MudeungRelief'
import { prepareCivicSurfaces } from '../gwangju/CivicSurfaces'
import officeDesktop from '../gwangju/baked/office-desktop.bin?url'
import officePortrait from '../gwangju/baked/office-portrait.bin?url'
import quarterDesktop from '../gwangju/baked/quarter-desktop.bin?url'
import quarterPortrait from '../gwangju/baked/quarter-portrait.bin?url'

const OFFICE = { concrete: '#bdc6c4', trim: '#afc1c3', edge: '#6e8791', steel: '#637c87', glass: '#294550', glazing: '#526b7b', rust: '#797780' }
const QUARTER = { concrete: '#b3bfbc', faded: '#9cabb1', trim: '#a7babe', edge: '#6e838d', rust: '#85808b', steel: '#4d7078', paint: '#607e77', glass: '#243e4c', glazing: '#566d80' }
const TERRAIN = { faded: '#456574' }

export default function GwangjuCity() {
  const { size } = useThree()
  const portrait = size.width / size.height < .9
  // Keep both layouts resident so a viewport change does not suspend the city.
  const data = useLoader(FileLoader, [officeDesktop, quarterDesktop, officePortrait, quarterPortrait],
    loader => loader.setResponseType('arraybuffer')) as ArrayBuffer[]
  const office = data[portrait ? 2 : 0], quarter = data[portrait ? 3 : 1]
  const shading = useMemo(() => ({ office: createCityOcclusion(office, .41), quarter: (batches: Parameters<typeof prepareCivicSurfaces>[0]) => {
    createCityOcclusion(quarter, .44)(batches)
    prepareCivicSurfaces(batches)
  } }), [office, quarter])
  const builders = useMemo(() => ({
    office: (kit: Parameters<typeof buildCivicLandmark>[0]) => buildCivicLandmark(kit, portrait),
    quarter: (kit: Parameters<typeof buildCivicQuarter>[0]) => buildCivicQuarter(kit, portrait),
    terrain: (kit: Parameters<typeof buildMudeungRelief>[0]) => buildMudeungRelief(kit, portrait),
  }), [portrait])
  return <group name="Gwangju city geometry" position={[0, OCEAN_SURFACE_Y - 4.25, 0]}
    userData={{ artSource: 'modeled-geometry', imageTextures: 0, architecturalParcels: CIVIC_PARCELS.length }}>
    <CityGeometry name="Gwangju Mudeung foothills" build={builders.terrain} palette={TERRAIN} prepare={prepareMudeungRelief} weatheringStrength={0} />
    <CityGeometry name="Gwangju Provincial Office landmark" build={builders.office} palette={OFFICE} prepare={shading.office} weatheringStrength={.45} />
    <CityGeometry name="Gwangju drowned civic quarter" build={builders.quarter} palette={QUARTER} prepare={shading.quarter} weatheringStrength={.7} />
  </group>
}
