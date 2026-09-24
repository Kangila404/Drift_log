import { useMemo } from 'react'
import { useLoader, useThree } from '@react-three/fiber'
import { FileLoader } from 'three'
import { OCEAN_SURFACE_Y } from '../OceanWater'
import CityGeometry from '../city/CityGeometry'
import { createCityOcclusion } from '../city/CityOcclusion'
import { buildHarborLandmark, buildHarborQuarter, HARBOR_PARCELS } from '../pohang/HarborQuarter'
import { buildCoastalShoulder, prepareCoastalShoulder } from '../pohang/CoastalShoulder'
import { prepareHarborSurfaces } from '../pohang/HarborSurfaces'
import lighthouseDesktop from '../pohang/baked/lighthouse-desktop.bin?url'
import lighthousePortrait from '../pohang/baked/lighthouse-portrait.bin?url'
import harborDesktop from '../pohang/baked/harbor-desktop.bin?url'
import harborPortrait from '../pohang/baked/harbor-portrait.bin?url'

const LIGHTHOUSE = { concrete: '#b9c6cb', trim: '#d1d9d8', edge: '#91a5ab', steel: '#70949e', glass: '#304858', glazing: '#718b96' }
const HARBOR = { concrete: '#a8b9be', faded: '#8daab1', edge: '#75858b', trim: '#a1b2b9', rust: '#85848e', paint: '#637f77', steel: '#587e8b', glass: '#263d4a', glazing: '#567480' }

export default function PohangCity() {
  const { size } = useThree()
  const portrait = size.width / size.height < .9
  const data = useLoader(FileLoader, [lighthouseDesktop, harborDesktop, lighthousePortrait, harborPortrait],
    loader => loader.setResponseType('arraybuffer')) as ArrayBuffer[]
  const lighthouse = data[portrait ? 2 : 0], harbor = data[portrait ? 3 : 1]
  const shading = useMemo(() => ({ lighthouse: createCityOcclusion(lighthouse, .4), harbor: (batches: Parameters<typeof prepareHarborSurfaces>[0]) => {
    createCityOcclusion(harbor, .46)(batches)
    prepareHarborSurfaces(batches)
  } }), [lighthouse, harbor])
  const builders = useMemo(() => ({
    lighthouse: (kit: Parameters<typeof buildHarborLandmark>[0]) => buildHarborLandmark(kit, portrait),
    harbor: (kit: Parameters<typeof buildHarborQuarter>[0]) => buildHarborQuarter(kit, portrait),
    terrain: (kit: Parameters<typeof buildCoastalShoulder>[0]) => buildCoastalShoulder(kit, portrait),
  }), [portrait])
  return <group name="Pohang city geometry" position={[0, OCEAN_SURFACE_Y - 4.25, 0]}
    userData={{ artSource: 'modeled-geometry', imageTextures: 0, architecturalParcels: HARBOR_PARCELS.length }}>
    <CityGeometry name="Pohang low coastal shoulder" build={builders.terrain} prepare={prepareCoastalShoulder} weatheringStrength={0} />
    <CityGeometry name="Pohang Homigot Lighthouse landmark" build={builders.lighthouse} palette={LIGHTHOUSE} prepare={shading.lighthouse} weatheringStrength={.32} />
    <CityGeometry name="Pohang sheltered harbor quarter" build={builders.harbor} palette={HARBOR} prepare={shading.harbor} weatheringStrength={.58} />
  </group>
}
