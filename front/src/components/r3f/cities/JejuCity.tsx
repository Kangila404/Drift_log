import { OCEAN_SURFACE_Y } from '../OceanWater'
import { useMemo } from 'react'
import { useLoader } from '@react-three/fiber'
import { FileLoader } from 'three'
import CityGeometry from '../city/CityGeometry'
import { createCityOcclusion } from '../city/CityOcclusion'
import { buildCoastalVillage, COASTAL_PARCELS } from '../jeju/CoastalVillage'
import { prepareCoastalMaterials } from '../jeju/CoastalMaterials'
import { JEJU_BERTH } from '../jeju/CoastalWaterfront'
import contactData from '../jeju/baked/coastal-village.bin?url'

export default function JejuCity() {
  const data = useLoader(FileLoader, contactData, loader => loader.setResponseType('arraybuffer')) as ArrayBuffer
  const prepare = useMemo(() => (batches: Parameters<typeof prepareCoastalMaterials>[0]) => {
    prepareCoastalMaterials(batches)
    createCityOcclusion(data, .65)(batches)
  }, [data])
  return <group name="Jeju city geometry" position={[0, OCEAN_SURFACE_Y - 4.25, 0]}
    userData={{ artSource: 'modeled-geometry', imageTextures: 0, architecturalParcels: COASTAL_PARCELS.length, berth: JEJU_BERTH, terrain: 'distant-layered-ridges' }}>
    <CityGeometry name="Jeju drowned coastal village landmark" build={buildCoastalVillage} prepare={prepare} weatheringStrength={.65} />
  </group>
}
