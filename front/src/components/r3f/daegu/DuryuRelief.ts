import * as THREE from 'three'
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js'
import type { CityBuilder, CityGeometryBatch } from '../city/CityGeometry'
import { layoutPoint } from './Placement'

const reliefNoise = new ImprovedNoise()

// Broad interlocking shoulders, with a low urban saddle in front of the park.
export function groundHeight(x: number, z: number) {
  const ridgeLine = -91 - 13 * Math.sin(x * .035) - 5 * Math.sin(x * .11 + .8)
  const rear = Math.exp(-Math.pow((z - ridgeLine) / 20, 2))
  const skyline = 16.4 + 2.8 * Math.sin(x * .043 + .7) + 1.6 * Math.sin(x * .095 - 1)
  const middleLine = -58 + 8 * Math.sin(x * .055 + .7)
  const middle = (6.8 + 2 * Math.sin(x * .069 - 1)) * Math.exp(-Math.pow((z - middleLine) / 15, 2))
  const park = 7.3 * Math.exp(-Math.pow((x - 23 + .13 * (z + 34)) / 27, 2) - Math.pow((z + 39) / 24, 2))
  const left = 3.5 * Math.exp(-Math.pow((x + 34) / 35, 2) - Math.pow((z + 31) / 26, 2))
  const gully = 1.3 * Math.exp(-Math.pow((x - 5 - .15 * z - 2 * Math.sin(z * .08)) / 8, 2))
    * Math.exp(-Math.pow((z + 42) / 30, 2))
  const edge = Math.max(0, Math.min(1, (140 - Math.abs(x)) / 28))
  const folds = (reliefNoise.noise(x * .055, z * .062, 4.7) * 3.7
    + reliefNoise.noise(x * .14, z * .15, 8.1) * 1.3
    + reliefNoise.noise(x * .33, z * .31, 2.3) * .5) * Math.exp(-Math.pow((z + 65) / 41, 2))
  const natural = -1.5 + (rear * skyline + middle + park + left - gully + folds) * edge
  const padDistance = Math.hypot((x - 23) / 5.2, (z + 34) / 3.8)
  const blend = THREE.MathUtils.smoothstep(padDistance, .85, 1.6)
  return THREE.MathUtils.lerp(6.7, natural, blend)
}

export function buildDuryuRelief(kit: CityBuilder, portrait = false) {
  const positions: number[] = [], colors: number[] = [], indices: number[] = []
  const nx = 150, nz = 76
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const x = -140 + i * 280 / nx, z = 9 - j * 130 / nz, y = groundHeight(x, z)
    positions.push(...layoutPoint(x, y, z, portrait))
    const grain = reliefNoise.noise(x * .23, z * .21, 6.4) * .1
    const distance = Math.max(0, Math.min(1, (-z - 32) / 75))
    const color = new THREE.Color('#617982').lerp(new THREE.Color('#30455e'), distance)
    const dx = (groundHeight(x + .7, z) - groundHeight(x - .7, z)) / 1.4
    const dz = (groundHeight(x, z + .7) - groundHeight(x, z - .7)) / 1.4
    const exposure = new THREE.Vector3(-dx, 1, -dz).normalize().dot(new THREE.Vector3(-.65, .6, .46).normalize())
    color.multiplyScalar(.64 + exposure * .38 + grain + reliefNoise.noise(x * .075, z * .06, 2.7) * .12)
    colors.push(color.r, color.g, color.b)
  }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1
    indices.push(a, b, c, b, d, c)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  kit.add('faded', geometry)
}

export function prepareDuryuRelief(batches: CityGeometryBatch[]) {
  for (const { material } of batches) {
    material.color.set('#ffffff')
    material.vertexColors = true
    material.roughness = 1
  }
}
