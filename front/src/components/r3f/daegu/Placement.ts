import * as THREE from 'three'
import type { CityBuilder } from '../city/CityGeometry'

export function place(kit: CityBuilder, build: (kit: CityBuilder) => void,
  at: [number, number, number], yaw = 0, scale: [number, number, number] = [1, 1, 1]) {
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
      const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), direction = b.clone().sub(a)
      const geometry = new THREE.BoxGeometry(width, direction.length(), depth)
      geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()))
      geometry.translate(...a.add(b).multiplyScalar(.5).toArray())
      add(finish, geometry, surface)
    },
  })
}

export function layoutPoint(x: number, y: number, z: number, portrait: boolean): [number, number, number] {
  return portrait ? [x * .43, 4.25 + (y - 4.25) * .82, z * .64] : [x, y, z]
}
