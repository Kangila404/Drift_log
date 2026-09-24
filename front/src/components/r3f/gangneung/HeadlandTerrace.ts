import * as THREE from 'three'
import type { CityBuilder, CityFinish } from '../city/CityGeometry'
import type { CitySurface } from '../city/CitySurfaces'
import { buildSunCruiseHotel } from './SunCruiseHotel'
import { placeGangneung as place } from './GangneungPlacement'

type Point = [number, number, number]

function mass(kit: CityBuilder, finish: CityFinish, size: Point, at: Point, surface: CitySurface = 'masonry') {
  kit.add(finish, new THREE.BoxGeometry(...size,
    Math.max(1, Math.ceil(size[0] / 1.4)), Math.max(1, Math.ceil(size[1] / 1.2)), Math.max(1, Math.ceil(size[2] / 1.4)))
    .translate(...at), surface)
}

function terraceOutline(front: number, rear: number) {
  const s = new THREE.Shape()
  // Shape Y is reversed so extrusion becomes a horizontal X/Z footprint.
  s.moveTo(-25, -front + 3)
  s.bezierCurveTo(-25, -front, -20, -front - .7, -13, -front)
  s.lineTo(12, -front)
  s.bezierCurveTo(19, -front, 24, -front + 3, 24, -front + 6)
  s.lineTo(20, -rear)
  s.lineTo(-18, -rear - 2)
  s.lineTo(-28, -rear - 6)
  s.quadraticCurveTo(-29, -rear - 9, -25, -front + 3)
  s.closePath()
  return s
}

function slab(kit: CityBuilder, finish: CityFinish, outline: THREE.Shape, y: number, thickness: number) {
  kit.add(finish, new THREE.ExtrudeGeometry(outline, { depth: thickness, bevelEnabled: false, curveSegments: 36 })
    .rotateX(-Math.PI / 2).translate(0, y, 0), 'masonry')
}

// A real rising deck, not a stack of step-shaped terrain strips.
function arrivalRamp(kit: CityBuilder, portrait: boolean) {
  const curve = portrait
    ? new THREE.CubicBezierCurve3(new THREE.Vector3(-10, 2.4, 18),
      new THREE.Vector3(-20, 3.3, 17), new THREE.Vector3(-25, 7.6, 10), new THREE.Vector3(-20, 7.93, 5))
    : new THREE.CubicBezierCurve3(new THREE.Vector3(-17, 2.4, 22),
      new THREE.Vector3(-29, 3.3, 18), new THREE.Vector3(-30, 7.6, 9), new THREE.Vector3(-20, 7.93, 5))
  const points = curve.getPoints(72)
  const strip = (side: number, width: number, rise: number, thickness: number, finish: CityFinish) => {
    const vertices: number[] = [], indices: number[] = []
    points.forEach((p, i) => {
      const tangent = curve.getTangent(i / (points.length - 1))
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize()
      for (const [offset, drop] of [[side - width / 2, 0], [side + width / 2, 0], [side - width / 2, -thickness], [side + width / 2, -thickness]]) {
        vertices.push(p.x + normal.x * offset, p.y + rise + drop, p.z + normal.z * offset)
      }
      if (i === 0) return
      const a = (i - 1) * 4, b = i * 4
      indices.push(a, b, a + 1, a + 1, b, b + 1,
        a + 2, a + 3, b + 2, a + 3, b + 3, b + 2,
        a, a + 2, b, b, a + 2, b + 2,
        a + 1, b + 1, a + 3, b + 1, b + 3, a + 3)
    })
    indices.push(0, 1, 2, 1, 3, 2)
    const e = (points.length - 1) * 4
    indices.push(e, e + 2, e + 1, e + 1, e + 2, e + 3)
    for (let i = 0; i < indices.length; i += 3) [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]]
    const geometry = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    kit.add(finish, geometry, 'masonry')
  }
  const width = portrait ? 3.4 : 4.7
  strip(0, width, 0, .4, 'concrete')
  strip(-width / 2 + .11, .22, .76, .76, 'edge')
  strip(width / 2 - .11, .22, .76, .76, 'edge')
  // Only the high end needs visible support; the low end disappears into water.
  for (const t of [.43, .72, .94]) {
    const p = curve.getPoint(t)
    mass(kit, 'concrete', [.65, p.y - 1.7, 2.8], [p.x, (p.y + 1.7) / 2 - .2, p.z])
  }
}

function arrivalGallery(kit: CityBuilder) {
  // An open, water-entered facade underneath the wide surviving public terrace.
  mass(kit, 'concrete', [30, .46, 7], [1, 6.85, 7.5])
  mass(kit, 'faded', [29.6, .1, 6.7], [1, 7.13, 7.5], 'sheet')
  mass(kit, 'edge', [29, 4.65, .52], [1, 4.32, 4.4])
  mass(kit, 'concrete', [.65, 4.65, 6.8], [-13.2, 4.32, 7.35])
  mass(kit, 'concrete', [.65, 4.65, 6.8], [15.2, 4.32, 7.35])
  for (const x of [-12.6, -6.8, -.5, 6.3, 14.6]) {
    mass(kit, 'concrete', [.5, 4.45, .75], [x, 4.35, 10.35])
    mass(kit, 'edge', [.65, .22, 1], [x, 6.52, 10.35])
  }
  for (const [x, width, missing] of [[-9.7, 5.25, 0], [-3.65, 5.75, 0], [2.9, 6.25, 1], [10.45, 7.75, 1]]) {
    if (!missing) {
      kit.box('glass', [width, 3.75, .06], [x, 4.48, 8.65])
      kit.box('glazing', [width * .31, 3.69, .02], [x - width * .2, 4.48, 8.7])
    }
    for (const sign of [-1, 1]) {
      kit.box('steel', [.075, 3.9, .12], [x + sign * width / 2, 4.5, 8.75])
      kit.box('steel', [width, .085, .14], [x, 4.5 + sign * 1.95, 8.75])
    }
  }
  mass(kit, 'edge', [10, .2, 3.2], [10, 5.45, 6.1])
  mass(kit, 'concrete', [.4, 4.5, 3.8], [-3.8, 4.2, 6.45])
  // Visible occupied-land access up to the hotel's base, deliberately off axis.
  for (let i = 0; i < 6; i++) mass(kit, 'concrete', [5, .18, .5], [-9.5, 7.13 + i * .145, 8.3 - i * .45])
  for (const x of [-12.1, -6.9]) kit.beam('steel', [x, 7.92, 8.5], [x, 8.62, 5.9], .07)
}

function buildHeadland(kit: CityBuilder, portrait: boolean) {
  // The inland return makes the hotel permanent architecture, not a ship on a stand.
  slab(kit, 'edge', terraceOutline(3.4, -12), 1.5, 6.3)
  slab(kit, 'concrete', terraceOutline(6.2, -12.2), 7.72, .28)
  arrivalGallery(kit)
  arrivalRamp(kit, portrait)
  mass(kit, 'faded', [10.5, 2.6, 8], [-20.5, 6.3, -8.5])
  mass(kit, 'concrete', [11.1, .27, 8.6], [-20.5, 7.75, -8.5])
  // Keep the inland connection in portrait too, with its return folded behind the hotel.
  const returnWall = new THREE.Shape()
  returnWall.moveTo(-27, 8)
  if (portrait) {
    returnWall.lineTo(-29, 15)
    returnWall.quadraticCurveTo(-31, 22, -28, 29)
  } else {
    returnWall.lineTo(-38, 15)
    returnWall.quadraticCurveTo(-46, 18, -45, 29)
  }
  returnWall.lineTo(-15, 31); returnWall.lineTo(-15, 10); returnWall.closePath()
  slab(kit, 'faded', returnWall, 1.2, 5.5)
  slab(kit, 'edge', returnWall, 6.7, .3)
}

function layout(kit: CityBuilder, portrait: boolean, build: (local: CityBuilder) => void) {
  place(kit, portrait ? [1, 2.2, -50] : [0, 0, -40], portrait ? -.75 : -.38, portrait ? .65 : 1, build)
}

export function buildGangneungCoast(kit: CityBuilder, portrait = false) {
  layout(kit, portrait, local => buildHeadland(local, portrait))
}

export function buildGangneungLandmark(kit: CityBuilder, portrait = false) {
  layout(kit, portrait, local => place(local, [0, 8, 0], 0, 1, buildSunCruiseHotel))
}
