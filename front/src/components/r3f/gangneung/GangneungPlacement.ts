import * as THREE from 'three'
import type { CityBuilder } from '../city/CityGeometry'

type Point = [number, number, number]

export function placeGangneung(kit: CityBuilder, at: Point, yaw: number, scale: number, build: (local: CityBuilder) => void) {
  const matrix = new THREE.Matrix4().compose(new THREE.Vector3(...at),
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), new THREE.Vector3(scale, scale, scale))
  const add: CityBuilder['add'] = (finish, geometry, surface) => kit.add(finish, geometry.applyMatrix4(matrix), surface)
  build({ add,
    box: (finish, size, p, rotation = [0, 0, 0], surface) => add(finish,
      new THREE.BoxGeometry(...size).applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...rotation))).translate(...p), surface),
    beam: (finish, a, b, width, depth = width, surface) => {
      const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), delta = end.clone().sub(start)
      add(finish, new THREE.BoxGeometry(width, delta.length(), depth)
        .applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()))
        .translate(...start.add(end).multiplyScalar(.5).toArray()), surface)
    },
  })
}
