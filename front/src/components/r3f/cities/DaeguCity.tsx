import { useMemo } from 'react'
import { useLoader, useThree } from '@react-three/fiber'
import { FileLoader } from 'three'
import { OCEAN_SURFACE_Y } from '../OceanWater'
import CityGeometry from '../city/CityGeometry'
import { createCityOcclusion } from '../city/CityOcclusion'
import { buildDuryuLandmark, buildMarketQuarter, MARKET_PARCELS } from '../daegu/MarketQuarter'
import { buildDuryuRelief, prepareDuryuRelief } from '../daegu/DuryuRelief'
import { prepareMarketSurfaces } from '../daegu/MarketSurfaces'
import towerDesktop from '../daegu/baked/tower-desktop.bin?url'
import towerPortrait from '../daegu/baked/tower-portrait.bin?url'
import quarterDesktop from '../daegu/baked/quarter-desktop.bin?url'
import quarterPortrait from '../daegu/baked/quarter-portrait.bin?url'

const TOWER = { concrete: '#b7c5c8', edge: '#738997', trim: '#b2c5cc', steel: '#6b8996', glass: '#314856', glazing: '#547482' }
const QUARTER = { concrete: '#acb9be', faded: '#8fabb0', edge: '#75868f', trim: '#a4b6bd', rust: '#85818a', paint: '#70847e', steel: '#597d88', glass: '#2b414e', glazing: '#526c7f' }

export default function DaeguCity() {
  const { size } = useThree()
  const portrait = size.width / size.height < .9
  const data = useLoader(FileLoader, [towerDesktop, quarterDesktop, towerPortrait, quarterPortrait],
    loader => loader.setResponseType('arraybuffer')) as ArrayBuffer[]
  const tower = data[portrait ? 2 : 0], quarter = data[portrait ? 3 : 1]
  const shading = useMemo(() => ({ tower: createCityOcclusion(tower, .43), quarter: (batches: Parameters<typeof prepareMarketSurfaces>[0]) => {
    createCityOcclusion(quarter, .48)(batches)
    prepareMarketSurfaces(batches)
  } }), [tower, quarter])
  const builders = useMemo(() => ({
    tower: (kit: Parameters<typeof buildDuryuLandmark>[0]) => buildDuryuLandmark(kit, portrait),
    quarter: (kit: Parameters<typeof buildMarketQuarter>[0]) => buildMarketQuarter(kit, portrait),
    terrain: (kit: Parameters<typeof buildDuryuRelief>[0]) => buildDuryuRelief(kit, portrait),
  }), [portrait])
  return <group name="Daegu city geometry" position={[0, OCEAN_SURFACE_Y - 4.25, 0]}
    userData={{ artSource: 'modeled-geometry', imageTextures: 0, architecturalParcels: MARKET_PARCELS.length }}>
    <CityGeometry name="Daegu Duryu foothills" build={builders.terrain} prepare={prepareDuryuRelief} weatheringStrength={0} />
    <CityGeometry name="Daegu 83 Tower landmark" build={builders.tower} palette={TOWER} prepare={shading.tower} weatheringStrength={.35} />
    <CityGeometry name="Daegu drowned textile quarter" build={builders.quarter} palette={QUARTER} prepare={shading.quarter} weatheringStrength={.58} />
  </group>
}
