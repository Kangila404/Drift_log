import { useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { addCityWeathering } from './CityMaterials'
import { setCitySurface, type CitySurface } from './CitySurfaces'

const finishes = {
  concrete: '#7a8b9f', edge: '#56687c', steel: '#405368', dark: '#18283b',
  glass: '#263b4e', glazing: '#455f77', paint: '#344b5d', faded: '#586e79', rust: '#4e4e5e', cable: '#465c75', trim: '#91a3b3',
}
export type CityFinish = keyof typeof finishes
type Point = [number, number, number]
export interface CityBuilder {
  box: (finish: CityFinish, size: Point, position: Point, rotation?: Point, surface?: CitySurface) => void
  beam: (finish: CityFinish, from: Point, to: Point, width: number, depth?: number, surface?: CitySurface) => void
  add: (finish: CityFinish, geometry: THREE.BufferGeometry, surface?: CitySurface) => void
}
export interface CityGeometryBatch { finish: CityFinish; geometry: THREE.BufferGeometry; material: THREE.MeshStandardMaterial }

export default function CityGeometry({ build, name, palette, prepare, weatheringStrength = 1 }: { build: (kit: CityBuilder) => void; name: string; palette?: Partial<Record<CityFinish, string>>; prepare?: (batches: CityGeometryBatch[]) => void; weatheringStrength?: number }) {
  const { scene, invalidate } = useThree()
  const batches = useMemo(() => {
    const groups = new Map<CityFinish, THREE.BufferGeometry[]>()
    const add: CityBuilder['add'] = (finish, source, surface) => {
      const geometry = source.index ? source.toNonIndexed() : source
      if (geometry !== source) source.dispose()
      geometry.deleteAttribute('uv')
      setCitySurface(geometry, surface)
      if (!groups.has(finish)) groups.set(finish, [])
      groups.get(finish)!.push(geometry)
    }
    const box: CityBuilder['box'] = (finish, size, position, rotation = [0, 0, 0], surface) => {
      const geometry = new THREE.BoxGeometry(...size)
      geometry.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...rotation)))
      geometry.translate(...position)
      add(finish, geometry, surface)
    }
    const beam: CityBuilder['beam'] = (finish, from, to, width, depth = width, surface) => {
      const start = new THREE.Vector3(...from), end = new THREE.Vector3(...to)
      const direction = end.clone().sub(start)
      const geometry = new THREE.BoxGeometry(width, direction.length(), depth)
      geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()))
      geometry.translate(...start.add(end).multiplyScalar(.5).toArray())
      add(finish, geometry, surface)
    }
    build({ add, box, beam })
    const result = [...groups].map(([finish, pieces]) => {
      const geometry = mergeGeometries(pieces)!
      pieces.forEach(piece => piece.dispose())
      const material = new THREE.MeshStandardMaterial({ color: palette?.[finish] ?? finishes[finish], roughness: 1, metalness: 0 })
      if (!['dark', 'glass', 'glazing', 'cable'].includes(finish)) addCityWeathering(material, weatheringStrength)
      return { finish, geometry, material }
    })
    try { prepare?.(result) } catch (error) {
      result.forEach(({ geometry, material }) => { geometry.dispose(); material.dispose() })
      throw error
    }
    return result
  }, [build, palette, prepare, weatheringStrength])
  useEffect(() => {
    // Async geometry and responsive replacements invalidate the cached water image.
    const changed = () => {
      // eslint-disable-next-line react-hooks/immutability -- Three's scene is an imperative external object, not React state.
      scene.userData.cityGeometryRevision = (scene.userData.cityGeometryRevision ?? 0) + 1
      invalidate()
    }
    changed()
    return () => {
      batches.forEach(({ geometry, material }) => { geometry.dispose(); material.dispose() })
      changed()
    }
  }, [batches, scene, invalidate])
  return <group name={name}>{batches.map(({ finish, geometry, material }) =>
    <mesh key={finish} geometry={geometry} material={material} />
  )}</group>
}
