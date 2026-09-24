import * as THREE from 'three'
import type { CityBuilder } from '../city/CityGeometry'

export function harborPoint(x: number, y: number, z: number, portrait: boolean): [number, number, number] {
  return portrait ? [x * .45, 4.25 + (y - 4.25) * .85, z * .68] : [x, y, z]
}

export function placeHarbor(kit: CityBuilder, build: (kit: CityBuilder) => void, at: [number, number, number], yaw: number, scale: [number, number, number]) {
  const matrix = new THREE.Matrix4().compose(new THREE.Vector3(...at),
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), new THREE.Vector3(...scale))
  const add: CityBuilder['add'] = (finish, geometry, surface) => kit.add(finish, geometry.applyMatrix4(matrix), surface)
  build({ add,
    box: (finish, size, position, rotation = [0, 0, 0], surface) => {
      const geometry = new THREE.BoxGeometry(...size)
      geometry.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...rotation))).translate(...position)
      add(finish, geometry, surface)
    },
    beam: (finish, from, to, width, depth = width, surface) => {
      const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), delta = b.clone().sub(a)
      const geometry = new THREE.BoxGeometry(width, delta.length(), depth)
      geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()))
      geometry.translate(...a.add(b).multiplyScalar(.5).toArray())
      add(finish, geometry, surface)
    },
  })
}
