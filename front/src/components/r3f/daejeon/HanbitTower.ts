import * as THREE from 'three'
import type { CityBuilder, CityFinish } from '../city/CityGeometry'
import type { CitySurface } from '../city/CitySurfaces'

type Profile = ReadonlyArray<readonly [radius: number, height: number]>
const TAU = Math.PI * 2

// Dimensions follow the official tower photograph; the generated plaza only
// establishes context. Local ground is 0, shared water is 4.25, and tip is 29.
export function buildHanbitTower(kit: CityBuilder) {
  const lathe = (
    finish: CityFinish,
    profile: Profile,
    segments = 96,
    start = 0,
    sweep = TAU,
    surface: CitySurface = 'sheet',
  ) => {
    const geometry = new THREE.LatheGeometry(
      profile.map(([radius, height]) => new THREE.Vector2(radius, height)),
      segments, start, sweep,
    )
    geometry.normalizeNormals()
    kit.add(finish, geometry, surface)
  }

  const shaftHeight = 12.3
  const slitHalfAngle = 0.105
  const shaftRadius = (height: number) => {
    const t = height / shaftHeight
    return 2.46 - 0.91 * t + 0.13 * t * t
  }
  const shaftSweep = TAU - slitHalfAngle * 2

  // A continuous backing closes shallow course joints. The lift opening is
  // absent from the stone shell, with actual returns to the recessed glazing.
  lathe('edge', [
    [shaftRadius(0) - 0.025, 0],
    [shaftRadius(6) - 0.025, 6],
    [shaftRadius(shaftHeight) - 0.025, shaftHeight],
  ], 72, slitHalfAngle, shaftSweep, 'masonry')

  const courses = 20
  for (let course = 0; course < courses; course++) {
    const bottom = course * shaftHeight / courses
    const top = (course + 1) * shaftHeight / courses
    lathe('concrete', [
      [shaftRadius(bottom) - 0.018, bottom],
      [shaftRadius(bottom + 0.018), bottom + 0.018],
      [shaftRadius(top - 0.018), top - 0.018],
      [shaftRadius(top) - 0.018, top],
    ], 72, slitHalfAngle, shaftSweep, 'masonry')
  }

  const slitProfile: [number, number][] = [0, 6, shaftHeight].map(height =>
    [shaftRadius(height) - 0.17, height],
  )
  lathe('glass', slitProfile, 8, -slitHalfAngle, slitHalfAngle * 2)

  for (const side of [-1, 1]) {
    const angle = slitHalfAngle * side
    const positions: number[] = []
    for (const height of [0, 6, shaftHeight]) {
      for (const depth of [0, 0.17]) {
        const radius = shaftRadius(height) - depth
        positions.push(Math.sin(angle) * radius, height, Math.cos(angle) * radius)
      }
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    const indices = [0, 1, 2, 1, 3, 2, 2, 3, 4, 3, 5, 4]
    if (side === 1) {
      for (let i = 0; i < indices.length; i += 3) {
        [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]]
      }
    }
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    kit.add('edge', geometry, 'masonry')
  }

  for (let height = 0.85; height < shaftHeight; height += 0.82) {
    const radius = shaftRadius(height) - 0.145
    kit.box('steel', [2 * radius * Math.sin(slitHalfAngle), 0.035, 0.04],
      [0, height, radius * Math.cos(slitHalfAngle)])
  }

  // The gallery has a load-bearing underside and rolled outer edges, with
  // the glazing inset behind both lips rather than applied to an opaque drum.
  lathe('faded', [
    [1.66, 11.98], [1.87, 12.05], [2.46, 12.16],
    [3.65, 12.46], [4.36, 12.72], [4.58, 12.87],
    [4.65, 12.98], [4.65, 13.05], [4.59, 13.12], [4.40, 13.14],
  ])
  lathe('glass', [[4.40, 13.07], [4.44, 13.32], [4.44, 13.83], [4.36, 14.09]])
  lathe('trim', [
    [4.36, 14.03], [4.53, 14.04], [4.62, 14.10], [4.65, 14.17],
    [4.61, 14.24], [4.45, 14.32], [3.66, 14.45],
    [2.32, 14.58], [1.53, 14.65],
  ])

  for (let rib = 0; rib < 32; rib++) {
    const angle = rib * TAU / 32
    const point = (radius: number, height: number) => new THREE.Vector3(
      Math.sin(angle) * radius, height, Math.cos(angle) * radius,
    )
    const curve = new THREE.CubicBezierCurve3(
      point(4.40, 12.84), point(5.00, 13.10),
      point(5.00, 14.06), point(4.41, 14.31),
    )
    const geometry = new THREE.TubeGeometry(curve, 8, 0.06, 6, false)
    geometry.normalizeNormals()
    kit.add('faded', geometry, 'sheet')
  }

  const cone: Profile = [
    [1.53, 14.59], [1.43, 15.95], [0.94, 21.15],
    [0.27, 27.15], [0.025, 28.85],
  ]
  const coneRadius = (height: number) => {
    for (let i = 1; i < cone.length; i++) {
      const [r0, y0] = cone[i - 1]
      const [r1, y1] = cone[i]
      if (height <= y1) return THREE.MathUtils.lerp(r0, r1, (height - y0) / (y1 - y0))
    }
    return cone[cone.length - 1][0]
  }
  // A single shell folds into each seam; no backing or overlaid band can
  // intersect its tessellated faces or produce depth-buffer stippling.
  const coneSection = (finish: CityFinish, profile: Profile) => {
    const positions: number[] = []
    const indices: number[] = []
    const panelAngle = TAU / 12
    const offsets = [0, 0.006, ...Array.from({ length: 7 }, (_, i) =>
      (i + 1) * panelAngle / 8), panelAngle - 0.006, panelAngle]
    for (let panel = 0; panel < 12; panel++) {
      const first = positions.length / 3
      for (const [radius, height] of profile) {
        for (let sample = 0; sample < offsets.length; sample++) {
          const angle = panel * panelAngle + offsets[sample]
          const recessed = sample === 0 || sample === offsets.length - 1
          const r = radius * (recessed ? 0.975 : 1)
          positions.push(Math.sin(angle) * r, height, Math.cos(angle) * r)
        }
      }
      for (let row = 0; row < profile.length - 1; row++) {
        for (let column = 0; column < offsets.length - 1; column++) {
          const a = first + row * offsets.length + column
          const b = a + 1
          const c = a + offsets.length
          indices.push(a, b, c, b, c + 1, c)
        }
      }
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    kit.add(finish, geometry, 'sheet')
  }
  const bandBottom: readonly [number, number] = [coneRadius(18.55), 18.55]
  const bandTop: readonly [number, number] = [coneRadius(18.72), 18.72]
  coneSection('concrete', [cone[0], cone[1], bandBottom])
  coneSection('glazing', [bandBottom, bandTop])
  coneSection('concrete', [bandTop, ...cone.slice(2)])
  const tipPositions: number[] = []
  for (let segment = 0; segment < 16; segment++) {
    const angle = segment * TAU / 16
    const next = (segment + 1) * TAU / 16
    tipPositions.push(
      Math.sin(angle) * 0.025, 28.85, Math.cos(angle) * 0.025,
      Math.sin(next) * 0.025, 28.85, Math.cos(next) * 0.025,
      0, 29, 0,
    )
  }
  const tip = new THREE.BufferGeometry()
  tip.setAttribute('position', new THREE.Float32BufferAttribute(tipPositions, 3))
  tip.computeVertexNormals()
  kit.add('steel', tip, 'sheet')
}
