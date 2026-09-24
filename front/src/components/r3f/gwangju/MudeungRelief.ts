import * as THREE from 'three'
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js'
import type { CityBuilder, CityGeometryBatch } from '../city/CityGeometry'

const noise = new ImprovedNoise()
type Ridge = { width: number; points: THREE.Vector3[] }
const ridge = (width: number, points: number[][]): Ridge => ({ width,
  points: new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), false, 'centripetal').getPoints(90),
})
// The main crest branches toward the plain. Coordinates compress the geography,
// but ridges share watersheds rather than forming disconnected conical props.
const ridges = [
  ridge(25, [[-190, 12, -139], [-125, 17, -151], [-97, 15, -144], [-64, 19, -134], [-30, 16, -149], [34, 22, -145], [57, 27, -130], [67, 28.6, -132], [73, 30, -135], [82, 28.8, -137], [91, 28.3, -135], [108, 24, -139], [175, 12, -157]]),
  ridge(24, [[73, 29, -135], [56, 13.5, -117], [28, 12, -100], [18, 8, -80], [-1, 3, -49]]),
  ridge(18, [[35, 21, -144], [7, 16, -121], [-5, 11, -104], [-30, 6, -83], [-40, 1, -62]]),
  ridge(22, [[-66, 16, -137], [-91, 11, -114], [-108, 6, -90], [-133, 1, -78]]),
  ridge(21, [[111, 21, -143], [124, 15, -121], [101, 9, -91], [120, 1, -65]]),
]
// Low land reaches behind the rear parcels; its distance follows each layout.
const desktopRidges = [...ridges, ridge(23, [[105, 13, -117], [80, 10, -85], [26, 7, -69], [-2, 6, -53], [-17, 0, -34]])]
const portraitRidges = [...ridges, ridge(23, [[74, 11, -115], [64, 8, -82], [49, 8, -53], [42, 6.5, -33], [26, 0, -17]])]
const valleys = [
  ridge(8, [[29, 2, -141], [25, 6, -123], [12, 7, -109], [15, 4, -88], [24, 0, -56]]),
  ridge(9, [[93, 2, -140], [87, 8, -120], [79, 8, -101], [78, 4, -76], [67, 0, -50]]),
  ridge(7, [[-43, 1, -140], [-49, 6, -122], [-66, 5, -109], [-78, 0, -75]]),
  ridge(7, [[25, 2, -124], [45, 5.5, -114], [63, 5.5, -114], [82, 2, -119]]),
]
export const reliefWidth = (portrait: boolean) => portrait ? .55 : 1

export function reliefHeight(x: number, z: number, portrait = false) {
  const wx = x + noise.noise(x * .023, z * .021, 4) * 6
  const wz = z + noise.noise(x * .027, z * .025, 13) * 5
  let height = 0
  for (const crest of portrait ? portraitRidges : desktopRidges) {
    let nearest = Infinity, peak = 0
    for (const p of crest.points) {
      const distance = (wx - p.x) ** 2 + (wz - p.z) ** 2
      if (distance < nearest) { nearest = distance; peak = p.y }
    }
    height = Math.max(height, peak * Math.exp(-nearest / crest.width ** 2))
  }
  let incision = 0
  for (const valley of valleys) {
    let nearest = Infinity, depth = 0
    for (const p of valley.points) {
      const distance = (wx - p.x) ** 2 + (wz - p.z) ** 2
      if (distance < nearest) { nearest = distance; depth = p.y }
    }
    const width = valley.width * (1 + THREE.MathUtils.smoothstep(wz, -120, -75) * .7)
    incision = Math.max(incision, depth * Math.exp(-nearest / width ** 2))
  }
  height -= incision * THREE.MathUtils.smoothstep(height, 3, 12)
  const relief = noise.noise(x * .075, z * .063, 5) * 2.3
    + noise.noise(x * .16, z * .14, 11) * .85 + noise.noise(x * .35, z * .29, 2) * .3
  return -1.7 + height + relief * THREE.MathUtils.smoothstep(height, 1, 10)
}

export function buildMudeungRelief(kit: CityBuilder, portrait = false) {
  const sx = reliefWidth(portrait), columns = 150, rows = 70
  const positions: number[] = [], colors: number[] = [], indices: number[] = []
  const heights = new Float32Array((columns + 1) * (rows + 1))
  for (let j = 0; j <= rows; j++) for (let i = 0; i <= columns; i++) {
    heights[j * (columns + 1) + i] = reliefHeight(-195 + i * 2.6, -196 + j * 2.5, portrait)
  }
  const sample = (i: number, j: number) => heights[Math.max(0, Math.min(rows, j)) * (columns + 1) + Math.max(0, Math.min(columns, i))]
  for (let j = 0; j <= rows; j++) {
    const z = -196 + j * 2.5
    for (let i = 0; i <= columns; i++) {
      const x = -195 + i * 2.6, y = sample(i, j)
      positions.push((x - (portrait ? 65 : 30)) * sx, y, z)
      const slopeX = (sample(i + 1, j) - sample(i - 1, j)) * 1.5 / 5.2
      const slopeZ = (sample(i, j + 1) - sample(i, j - 1)) * 1.5 / 5
      const folds = noise.noise(x * .15, z * .12, 18)
      const shade = THREE.MathUtils.clamp(.79 + folds * .22 - Math.max(0, slopeX - slopeZ) * .1, .44, 1)
      const higher = THREE.MathUtils.smoothstep(y, 16, 28)
      colors.push(shade - higher * .03, shade, shade + .025)
    }
  }
  for (let j = 0; j < rows; j++) for (let i = 0; i < columns; i++) {
    const a = j * (columns + 1) + i, b = a + 1, c = a + columns + 1, d = c + 1
    if (Math.max(positions[a * 3 + 1], positions[b * 3 + 1], positions[c * 3 + 1], positions[d * 3 + 1]) < 3.7) continue
    indices.push(a, c, b, b, c, d)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  kit.add('faded', geometry, 'foliage')
}

export function prepareMudeungRelief(batches: CityGeometryBatch[]) {
  for (const { material } of batches) {
    material.vertexColors = true
    const previous = material.onBeforeCompile, key = material.customProgramCacheKey()
    material.onBeforeCompile = (shader, renderer) => {
      previous.call(material, shader, renderer)
      shader.fragmentShader = shader.fragmentShader.replace('float cityRelief =', `
        float groundGrain = cityNoise(vCityPosition * .65) * .6 + cityNoise(vCityPosition * 1.7) * .4;
        diffuseColor.rgb *= .86 + groundGrain * .26;
        float cityRelief = (groundGrain - .5) * .24 +`)
    }
    material.customProgramCacheKey = () => `${key}:mudeung-folds-v1`
  }
}
