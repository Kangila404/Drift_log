import * as THREE from 'three'
import type { CityBuilder } from '../city/CityGeometry'
import { buildCoastalHome } from './CoastalHomes'
import { buildCoastalWaterfront } from './CoastalWaterfront'
import { buildCoastalRidges } from './CoastalRidges'
import { buildCoastalMarker } from './CoastalMarker'

export const COASTAL_PARCELS = [
  { kind: 'stone', x: -12, z: 3, base: 1.55, yaw: .12 },
  { kind: 'hip', x: 7, z: -15, base: 1.6, yaw: -.1 },
  { kind: 'thatch', x: -13, z: -14, base: 1.8, yaw: .16 },
  { kind: 'flat', x: -10, z: -53, base: 1.45, yaw: .02 },
  { kind: 'workshop', x: 25, z: -25, base: 1.5, yaw: -.15 },
  { kind: 'stone', x: 16, z: -34, base: 1.7, yaw: -.28 },
  { kind: 'hip', x: -15, z: -32, base: 1.75, yaw: .24 },
  { kind: 'thatch', x: 2, z: -51, base: 1.85, yaw: -.16 },
] as const

function parcelBuilder(kit: CityBuilder, parcel: typeof COASTAL_PARCELS[number]): CityBuilder {
  const transform = new THREE.Matrix4().makeRotationY(parcel.yaw)
  transform.setPosition(parcel.x, parcel.base, parcel.z)
  const add: CityBuilder['add'] = (finish, geometry, surface) => kit.add(finish, geometry.applyMatrix4(transform), surface)
  return {
    add,
    box(finish, size, position, rotation = [0, 0, 0], surface) {
      const geometry = new THREE.BoxGeometry(...size)
      geometry.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...rotation))).translate(...position)
      add(finish, geometry, surface)
    },
    beam(finish, from, to, width, depth = width, surface) {
      const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), direction = b.clone().sub(a)
      const geometry = new THREE.BoxGeometry(width, direction.length(), depth)
      geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()))
      geometry.translate(...a.add(b).multiplyScalar(.5).toArray())
      add(finish, geometry, surface)
    },
  }
}

export function buildCoastalVillage(kit: CityBuilder) {
  buildCoastalRidges(kit)
  buildCoastalWaterfront(kit)
  buildCoastalMarker({ ...kit, add: (finish, geometry, surface) => kit.add(finish, geometry.scale(1, .84, 1).rotateY(.2).translate(-4.9, 3.45, 0), surface) })
  for (const parcel of COASTAL_PARCELS) buildCoastalHome(parcelBuilder(kit, parcel), parcel.kind)
}
