import { useEffect, useLayoutEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import type { ScenePreset } from '../../../constants/scenePreset'
import { resolveScene } from '../../../constants/scenePreset'
import { buildSeoulModeledCity } from '../seoul/SeoulModeledGeometry'
import { createSeoulModeledMaterial, updateSeoulModeledMaterial } from '../seoul/SeoulModeledMaterial'

const NIGHT = resolveScene({ weatherId: 1, abnormalType: null, timeOfDay: 'night' })

export default function SeoulCity({ preset = NIGHT, eclipseCoverage = 0 }: { preset?: ScenePreset; eclipseCoverage?: number }) {
  const { size, invalidate } = useThree()
  const geometry = useMemo(() => buildSeoulModeledCity(size.width, size.height), [size.width, size.height])
  const materials = useMemo(() => ({
    architecture: createSeoulModeledMaterial('architecture'), terrain: createSeoulModeledMaterial('terrain'),
    metal: createSeoulModeledMaterial('metal'),
  }), [])
  useEffect(() => () => geometry.forEach(part => part.geometry.dispose()), [geometry])
  useEffect(() => () => Object.values(materials).forEach(material => material.dispose()), [materials])
  useLayoutEffect(() => {
    Object.values(materials).forEach(material => updateSeoulModeledMaterial(material, preset, eclipseCoverage))
    invalidate()
  }, [materials, preset, eclipseCoverage, invalidate])
  return <group name="Seoul city geometry" userData={{ artSource: 'modeled-geometry', imageTextures: 0 }}>
    {geometry.map(part => <mesh key={part.name} name={part.name} geometry={part.geometry} material={materials[part.kind]} />)}
  </group>
}
