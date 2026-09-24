import { useLayoutEffect, useRef } from 'react'
import type { Group, Mesh, MeshStandardMaterial } from 'three'
import { createPalaceModel, createPalaceRoofModel } from './PalaceModel'

function disposeModel(model: Group) {
  model.traverse(object => {
    const mesh = object as Mesh
    if (!mesh.isMesh) return
    mesh.geometry.dispose()
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    materials.forEach(material => {
      (material as MeshStandardMaterial).map?.dispose()
      material.dispose()
    })
  })
}

/** Eave midpoint at Y=0. Use a parent group for placement or a partially submerged tilt. */
export function PalaceRoof({ width, depth, rise }: { width: number; depth: number; rise: number }) {
  const host = useRef<Group>(null)
  useLayoutEffect(() => {
    const parent = host.current
    if (!parent) return
    const model = createPalaceRoofModel({ width, depth, rise })
    parent.add(model)
    return () => {
      parent.remove(model)
      disposeModel(model)
    }
  }, [width, depth, rise])
  return <group ref={host} name="Palace tiled roof" />
}

/** Front is +Z; the surrounding scene supplies water at Y=1 and all lighting. */
export default function Palace() {
  const host = useRef<Group>(null)

  useLayoutEffect(() => {
    const parent = host.current
    if (!parent) return
    const model = createPalaceModel()
    parent.add(model)
    return () => {
      parent.remove(model)
      disposeModel(model)
    }
  }, [])

  return <group ref={host} name="Seoul flooded palace gate" />
}
