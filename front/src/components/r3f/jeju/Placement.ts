import * as THREE from 'three'
import type { CityBuilder } from '../city/CityGeometry'

export function jejuPoint(x: number, y: number, z: number, portrait = false): [number, number, number] {
  if (!portrait) return [x, y, z]
  const exposed = y - 4.25
  // Keep the low village legible without stretching the broad landmark into a tower.
  const rearShift = 6 * THREE.MathUtils.smoothstep(-z, 34, 60)
  const courtReach = THREE.MathUtils.smoothstep(z, 0, 38)
  return [x * (.5 - .13 * courtReach) - rearShift,
    4.25 + Math.min(exposed, 5.75) * .85 + Math.max(exposed - 5.75, 0) * .55,
    z * .74 + 13 * courtReach]
}

export function placeJeju(kit: CityBuilder, build: (kit: CityBuilder) => void,
  at: [number, number, number], yaw: number, scale: [number, number, number]) {
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
