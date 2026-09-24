import * as THREE from 'three'
import type { CityBuilder, CityFinish } from '../city/CityGeometry'
import { buildTileRoof, createTileRoofProfile } from './SuwonRoof'

const springY = 5.1, archRadius = 2.5

function archStone(kit: CityBuilder, start: number, end: number, z: number) {
  const shape = new THREE.Shape()
  shape.absarc(0, springY, 3.08, start, end, false)
  shape.absarc(0, springY, archRadius, end, start, true)
  shape.closePath()
  kit.add('faded', new THREE.ExtrudeGeometry(shape, {
    depth: .11, bevelEnabled: false, curveSegments: 2,
  }).translate(0, 0, z), 'masonry')
}

function buildGateBody(kit: CityBuilder) {
  // The arch is a notch in the entire six-unit extrusion, open down to the base.
  const contour = new THREE.Shape()
  contour.moveTo(-9.5, 0)
  contour.lineTo(-archRadius, 0)
  contour.lineTo(-archRadius, springY)
  contour.absarc(0, springY, archRadius, Math.PI, 0, true)
  contour.lineTo(archRadius, 0)
  contour.lineTo(9.5, 0)
  contour.lineTo(9.5, 9)
  contour.lineTo(-9.5, 9)
  contour.closePath()
  const body = new THREE.ExtrudeGeometry(contour, {
    depth: 6, bevelEnabled: false, curveSegments: 24,
  }).translate(0, 0, -3)
  for (const group of body.groups) {
    const geometry = new THREE.BufferGeometry()
    for (const name of ['position', 'normal']) {
      const attribute = body.getAttribute(name)
      geometry.setAttribute(name, new THREE.Float32BufferAttribute(
        attribute.array.slice(group.start * 3, (group.start + group.count) * 3), 3))
    }
    kit.add(group.materialIndex === 0 ? 'concrete' : 'edge', geometry, 'masonry')
  }
  body.dispose()

  for (const side of [-1, 1]) {
    const z = side * 3.013
    for (let row = 5; row < 10; row++) {
      const y = .46 + row * .84
      const exclusion = y < springY ? 3.1 : y < 8.2 ? Math.sqrt(Math.max(0, 3.1 ** 2 - (y - springY) ** 2)) + .08 : 0
      for (const direction of [-1, 1]) {
        const length = 9.5 - exclusion
        kit.box('edge', [length, .018, .022], [direction * (exclusion + length / 2), y, z], [0, 0, 0], 'masonry')
      }
      for (let column = 0; column < 9; column++) {
        const x = -8.7 + column * 2.08 + (row % 2) * .84
        if (Math.abs(x) > 9.35 || (Math.abs(x) < 3.18 && y < 8.28)) continue
        kit.box('edge', [.018, .79, .022], [x, y + .41, z], [0, 0, 0], 'masonry')
      }
    }
    for (let i = 0; i < 18; i++) {
      archStone(kit, i / 18 * Math.PI + .004, (i + 1) / 18 * Math.PI - .004, side > 0 ? 2.985 : -3.095)
    }
    for (const x of [-2.79, 2.79]) {
      for (let i = 5; i < 6; i++) {
        kit.box('faded', [.56, .82, .11], [x, .43 + i * .85, side * 3.035], [0, 0, 0], 'masonry')
      }
    }
  }
  for (const side of [-1, 1]) {
    for (let i = 5; i < 10; i++) {
      kit.box('edge', [.022, .018, 6], [side * 9.507, i * .84 + .46, 0], [0, 0, 0], 'masonry')
    }
  }
}

function arcMasonry(kit: CityBuilder, inner: number, outer: number, from: number, to: number, y: number, height: number, finish: CityFinish) {
  const shape = new THREE.Shape(), steps = Math.max(2, Math.ceil((to - from) * 20))
  for (let i = 0; i <= steps; i++) {
    const angle = from + (to - from) * i / steps
    const x = 1 + outer * Math.cos(angle), z = .65 + outer * Math.sin(angle)
    if (i === 0) shape.moveTo(x, z)
    else shape.lineTo(x, z)
  }
  for (let i = steps; i >= 0; i--) {
    const angle = from + (to - from) * i / steps
    shape.lineTo(1 + inner * Math.cos(angle), .65 + inner * Math.sin(angle))
  }
  shape.closePath()
  kit.add(finish, new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false })
    .rotateX(Math.PI / 2).translate(0, y + height, 0), 'masonry')
}

function buildOngseong(kit: CityBuilder) {
  // The left end overlaps the gate flank; the right end stops obliquely in water.
  const from = Math.PI * .34, to = Math.PI, inner = 10.4, outer = 13
  arcMasonry(kit, inner, outer, from, to, 0, 5.65, 'concrete')
  arcMasonry(kit, inner - .035, outer + .035, from, to, 5.65, .15, 'faded')
  for (let i = 0; i < 14; i++) {
    const a = from + (to - from) * i / 14
    const b = a + (to - from) / 14 * .72
    arcMasonry(kit, outer - .63, outer, a, b, 5.8, .32, 'edge')
  }
  for (const y of [4.38, 4.96, 5.54]) {
    arcMasonry(kit, outer, outer + .014, from, to, y, .018, 'edge')
    arcMasonry(kit, inner - .014, inner, from, to, y, .018, 'edge')
  }
  for (let i = 0; i < 22; i++) {
    const angle = from + (to - from) * (i + .4) / 22
    for (const radius of [inner - .006, outer + .006]) {
      kit.box('edge', [.022, .54, .018], [1 + radius * Math.cos(angle), 4.67, .65 + radius * Math.sin(angle)],
        [0, Math.PI / 2 - angle, 0], 'masonry')
    }
  }
}

function buildPavilion(kit: CityBuilder) {
  const posts: [number, number][] = []
  for (const x of [-7.5, -2.5, 2.5, 7.5]) {
    for (const z of [-2.32, 2.32]) posts.push([x, z])
  }
  posts.push([-7.5, 0], [7.5, 0])
  for (const [x, z] of posts) {
    kit.box('faded', [.75, .17, .75], [x, 9.085, z], [0, 0, 0], 'masonry')
    kit.add('rust', new THREE.CylinderGeometry(.22, .28, 2.65, 12).translate(x, 10.475, z), 'timber')
    kit.box('paint', [.66, .24, .66], [x, 11.72, z], [0, 0, 0], 'timber')
    kit.box('faded', [1.12, .18, .45], [x, 11.94, z], [0, 0, 0], 'timber')
    kit.box('paint', [.42, .22, 1.38], [x, 12.11, z], [0, 0, 0], 'timber')
    for (const direction of [-1, 1]) {
      kit.beam('paint', [x, 11.22, z], [x + direction * .79, 11.83, z], .17, .21, 'timber')
    }
  }
  for (const z of [-2.32, 2.32]) {
    kit.box('paint', [16.4, .34, .34], [0, 11.63, z], [0, 0, 0], 'timber')
    kit.box('faded', [17.1, .22, .44], [0, 12.17, z], [0, 0, 0], 'timber')
    kit.box('paint', [15.8, .19, .21], [0, 9.68, z], [0, 0, 0], 'timber')
  }
  for (const x of [-7.5, -2.5, 2.5, 7.5]) {
    kit.box('paint', [.32, .34, 5.5], [x, 11.7, 0], [0, 0, 0], 'timber')
  }
  const roof = { width: 21, depth: 11, eaveY: 12.5, ridgeY: 15.5 }
  const profile = createTileRoofProfile(roof)
  for (const z of [-2.75, 0, 2.75]) {
    const t = 1 - Math.abs(z) / 5.5, y = profile.soffit(0, t)[1] - .26
    kit.box('rust', [16.6, .3, .34], [0, y, z], [0, 0, 0], 'timber')
    for (const x of [-7.5, -2.5, 2.5, 7.5]) {
      kit.beam('paint', [x, 11.72, z], [x, y, z], .27, .27, 'timber')
    }
  }
  for (let i = 0; i < 15; i++) {
    const x = -7.65 + i * 15.3 / 14
    for (const side of [-1, 1]) {
      for (let j = 0; j < 4; j++) {
        const a = profile.soffit(x / profile.halfSpan(j / 4), j / 4, side)
        const b = profile.soffit(x / profile.halfSpan((j + 1) / 4), (j + 1) / 4, side)
        a[1] -= .07; b[1] -= .07
        kit.beam('rust', a, b, .18, .23, 'timber')
      }
    }
  }
  for (const side of [-1, 1]) {
    for (const u of [-1, -.5, 0, .5, 1]) {
      for (let j = 0; j < 3; j++) {
        const endpoint = (t: number): [number, number, number] => [
          side * profile.halfSpan(t),
          profile.height(t) + profile.lift * Math.pow(u, 8) * Math.pow(1 - t, 3) - .25,
          u * 5.5 * (1 - t),
        ]
        kit.beam('rust', endpoint(j / 6), endpoint((j + 1) / 6), .2, .23, 'timber')
      }
    }
  }
  buildTileRoof(kit, roof)
}

export function buildHwaseomunGate(kit: CityBuilder) {
  buildGateBody(kit)
  buildOngseong(kit)
  buildPavilion(kit)
}
