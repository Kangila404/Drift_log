import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { shadeSeoulGeometry, type SeoulSurface } from './SeoulSurface'

type V3 = [number, number, number]
type V2 = [number, number]
type Assembly = ReturnType<typeof assembly>
export interface SeoulBatch { surface: SeoulSurface; geometry: THREE.BufferGeometry }
export const PALACE_PLACEMENT = { position: [2, -.2, -21] as V3, yaw: -.62, scale: .8 }

function assembly(groups: Map<SeoulSurface, THREE.BufferGeometry[]>, at: V3 = [0, 0, 0], yaw = 0, scale = 1) {
  const matrix = new THREE.Matrix4().makeRotationY(yaw).scale(new THREE.Vector3(scale, scale, scale)).setPosition(...at)
  let serial = 1
  const add = (surface: SeoulSurface, source: THREE.BufferGeometry, shade = 1, variation?: (x: number, y: number, z: number) => number) => {
    shadeSeoulGeometry(source, surface, serial++)
    const colors = source.getAttribute('color')
    const p = source.getAttribute('position')
    for (let i = 0; i < colors.count; i++) {
      const value = shade * (variation?.(p.getX(i), p.getY(i), p.getZ(i)) ?? 1)
      colors.setXYZ(i, Math.min(1, colors.getX(i) * value), Math.min(1, colors.getY(i) * value), Math.min(1, colors.getZ(i) * value))
    }
    const geometry = source.index ? source.toNonIndexed() : source
    if (geometry !== source) source.dispose()
    geometry.applyMatrix4(matrix)
    if (!groups.has(surface)) groups.set(surface, [])
    groups.get(surface)!.push(geometry)
  }
  const box = (surface: SeoulSurface, size: V3, position: V3, radius = .035, shade = 1, rotate: V3 = [0, 0, 0]) => {
    const geometry = radius > 0 && Math.min(...size) > .16 ? new RoundedBoxGeometry(...size, 1, Math.min(radius, ...size.map(v => v * .15))) : new THREE.BoxGeometry(...size)
    geometry.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...rotate))).translate(...position)
    add(surface, geometry, shade)
  }
  const path = (surface: SeoulSurface, points: V3[], radius: number, segments = 16, shade = 1) => {
    add(surface, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), segments, radius, 6, false), shade)
  }
  return { add, box, path }
}

// Separate lofted roof planes meet at a short ridge, with a gently lifting eave.
function tiledRoof(kit: Assembly, at: V3, width: number, depth: number, rise: number, damaged = false) {
  const hip = depth * .43, ridgeHalf = width / 2 - hip
  const panels: THREE.BufferGeometry[] = []
  const patch = (point: (u: number, v: number) => V3, columns: number, rows: number, reverse: boolean, torn = false) => {
    const positions: number[] = [], uv: number[] = [], indices: number[] = []
    for (let j = 0; j <= rows; j++) for (let i = 0; i <= columns; i++) {
      const u = i / columns, v = j / rows, p = point(u, v)
      positions.push(p[0] + at[0], p[1] + at[1], p[2] + at[2]); uv.push(u * width * .35, v * depth * .35)
    }
    for (let j = 0; j < rows; j++) for (let i = 0; i < columns; i++) {
      if (torn && i > columns * .68 && i < columns * .87 && j > rows * .57 + Math.sin(i) * .6) continue
      const a = j * (columns + 1) + i, b = a + 1, c = a + columns + 1, d = c + 1
      indices.push(...(reverse ? [a, c, b, b, c, d] : [a, b, c, b, d, c]))
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    g.setIndex(indices); g.computeVertexNormals(); panels.push(g)
  }
  const profile = (v: number) => rise * (1 - v) ** 2.15 + .14 * v ** 8
  // Raised tile courses catch grazing light without thousands of separate meshes.
  const courses = (point: (u: number, v: number) => V3, count: number, torn: boolean) => {
    const p: number[] = [], uv: number[] = []
    for (let i = 1; i < count; i++) for (let j = 1; j < 8; j++) {
      const u = i / count, v0 = j / 8, v1 = (j + 1) / 8
      if (torn && u > .67 && u < .9 && v1 > .55) continue
      const vertex = (v: number, side: number): V3 => {
        const value = point(u + side * .11 / width, v)
        return [value[0] + at[0], value[1] + at[1] + (side === 0 ? .045 : .01), value[2] + at[2]]
      }
      for (const side of [-1, 1]) {
        const a = vertex(v0, side), b = vertex(v1, side), c = vertex(v0, 0), d = vertex(v1, 0)
        const vertices = [a, b, c, c, b, d]
        // Winding follows the sampled roof's upward normal.
        const normal = new THREE.Vector3().subVectors(new THREE.Vector3(...b), new THREE.Vector3(...a)).cross(new THREE.Vector3().subVectors(new THREE.Vector3(...c), new THREE.Vector3(...a)))
        if (normal.y < 0) { [vertices[1], vertices[2]] = [vertices[2], vertices[1]]; [vertices[4], vertices[5]] = [vertices[5], vertices[4]] }
        vertices.forEach(value => { p.push(...value); uv.push(value[0] * .35, value[2] * .35) })
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals()
    kit.add('tile', g, .8)
  }
  const large = width > 20
  for (const sign of [-1, 1]) {
    const longFace = (u: number, v: number): V3 => [(u * 2 - 1) * (ridgeHalf + hip * v), profile(v) + .35 * (u * 2 - 1) ** 10 * v ** 5, sign * depth / 2 * v]
    patch(longFace, large ? 48 : 28, large ? 16 : 12, sign > 0, damaged && sign > 0)
    courses(longFace, Math.round(width / .42), damaged && sign > 0)
    patch((u, v) => [sign * (ridgeHalf + hip * v), profile(v) + .35 * (u * 2 - 1) ** 10 * v ** 5, (u * 2 - 1) * depth / 2 * v], large ? 20 : 12, large ? 16 : 12, sign < 0)
  }
  const joined = mergeGeometries(panels)!
  panels.forEach(g => g.dispose())
  const skin = mergeVertices(joined, .0001)
  joined.dispose(); skin.computeVertexNormals()
  const underside = skin.clone().translate(0, -.24, 0), indices = Array.from(underside.index!.array)
  for (let i = 0; i < indices.length; i += 3) [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]]
  underside.setIndex(indices); underside.computeVertexNormals()
  kit.add('timber', underside, .63); kit.add('tile', skin)
  for (const side of [-1, 1]) {
    const edge = Array.from({ length: 25 }, (_, i) => {
      const u = i / 12 - 1
      return [at[0] + u * width / 2, at[1] + .07 + .35 * u ** 10, at[2] + side * depth / 2] as V3
    })
    kit.path('tile', edge, .11, 24, .87)
    kit.path('timber', edge.map(([x, y, z]) => [x, y - .2, z]), .105, 24, .76)
    kit.path('tile', Array.from({ length: 17 }, (_, i) => {
      const v = i / 8 - 1
      return [at[0] + side * width / 2, at[1] + .07 + .35 * v ** 10, at[2] + v * depth / 2] as V3
    }), .105, 16)
  }
  kit.path('stone', [[at[0] - ridgeHalf, at[1] + rise + .1, at[2]], [at[0], at[1] + rise + .14, at[2]], [at[0] + ridgeHalf, at[1] + rise + .1, at[2]]], .13, 18, .84)
  if (damaged) for (const x of [.23, .34]) kit.path('timber', [[at[0] + width * x, at[1] + .75, at[2] + depth * .27], [at[0] + width * x + .12, at[1] - .2, at[2] + depth * .48]], .075, 4, .8)
}

function wall(kit: Assembly, surface: SeoulSurface, at: V3, width: number, height: number, openings: { x: number; y: number; w: number; h: number }[], depth = .38) {
  const outline = new THREE.Shape([new THREE.Vector2(-width / 2, 0), new THREE.Vector2(width / 2, 0), new THREE.Vector2(width / 2, height), new THREE.Vector2(-width / 2, height)])
  for (const o of openings) {
    const x = o.x, y = o.y, w = o.w / 2, h = o.h / 2
    outline.holes.push(new THREE.Path([new THREE.Vector2(x - w, y - h), new THREE.Vector2(x - w, y + h), new THREE.Vector2(x + w, y + h), new THREE.Vector2(x + w, y - h)]))
    kit.box('glass', [o.w, o.h, .05], [at[0] + x, at[1] + y, at[2] - depth - .16], 0, .63)
    kit.box('stone', [o.w + .25, .12, depth + .22], [at[0] + x, at[1] + y - h, at[2] - depth / 2], .018)
    kit.box('timber', [.07, o.h, .13], [at[0] + x + o.w * .06, at[1] + y, at[2] - depth * .55], .009, .9)
  }
  const shell = new THREE.ExtrudeGeometry(outline, { depth, bevelEnabled: true, bevelSegments: 2, bevelSize: .035, bevelThickness: .025, steps: 1 })
  shell.translate(at[0], at[1], at[2] - depth); kit.add(surface, shell)
}

function pavilion(kit: Assembly) {
  kit.box('stone', [20.2, .42, 10.4], [0, 5.2, 0], .07, .78)
  kit.box('timber', [19.5, .32, 9.7], [0, 5.62, 0], .035, .74)
  for (const x of [-8.7, -5.8, -2.9, 0, 2.9, 5.8, 8.7]) for (const z of [-4, 0, 4]) {
    kit.add('stone', new THREE.CylinderGeometry(.27, .35, 4.2, 10).translate(x, 3, z), .91)
    kit.add('timber', new THREE.CylinderGeometry(.22, .29, 4.65, 12).translate(x, 8, z), z < 1 ? .58 : .9)
    kit.box('timber', [.88, .23, .78], [x, 10.12, z], .05, .73)
    kit.box('timber', [.52, .22, 1.14], [x, 10.36, z], .04, .76)
  }
  for (const z of [-4, 4]) {
    kit.box('timber', [18.3, .42, .4], [0, 9.98, z], .045, .64)
    kit.box('timber', [18.8, .23, .4], [0, 10.58, z], .04, .76)
    for (let bay = -3; bay < 3; bay++) {
      const x = bay * 2.9 + 1.45
      if (z < 0) kit.box('timber', [2.62, 2.45, .18], [x, 7.82, z], .025, .55)
      else {
        kit.box('timber', [2.53, .16, .14], [x, 6.65, z + .16], .02, .9)
        for (let bar = 0; bar < 5; bar++) kit.box('timber', [.045, .84, .075], [x - .93 + bar * .46, 6.18, z + .16], .004, .79)
      }
    }
  }
  // Open front and recessed side screens keep the pavilion from becoming a solid black box.
  for (const x of [-8.7, 8.7]) {
    kit.box('timber', [.25, .4, 8.3], [x, 10, 0], .035, .67)
    for (const z of [-2.5, .4]) kit.box('timber', [.14, 2.6, 2.35], [x, 7.8, z], .02, .65)
  }
  tiledRoof(kit, [0, 10.83, 0], 24.2, 13.2, 3.85)
  for (const x of [-7.3, 5.5]) kit.box('timber', [2.1, .09, 1.5], [x, 5.94, 3.1], .02, .7, [0, .12, .06])
}

function courtyardHome(kit: Assembly, width: number, depth: number, floor: number, broken = false) {
  const eave = floor + 3.25
  kit.box('stone', [width + .3, 3.3, depth + .25], [0, floor - 1.6, 0], .035, .77)
  kit.box('plaster', [width, 3.1, .45], [0, floor + 1.48, -depth / 2], .045, .75)
  for (const x of [-width / 2, width / 2]) kit.box('plaster', [.36, 3.1, depth], [x, floor + 1.48, 0], .045, .85)
  const bays = Math.round(width / 2.25)
  for (let i = 0; i < bays; i++) {
    const x = (i + .5) * width / bays - width / 2
    kit.box('timber', [.17, 3.25, .2], [x - width / bays / 2, floor + 1.6, depth / 2], .025, .81)
    if (broken && i === bays - 2) continue
    const w = width / bays - .22
    kit.box('timber', [w, 2.6, .17], [x, floor + 1.3, depth / 2 - .36], .025, .76)
    kit.box('glass', [w - .22, 1.95, .05], [x, floor + 1.42, depth / 2 - .245], 0, .76)
    for (let bar = -2; bar <= 2; bar++) kit.box('timber', [.035, 1.92, .065], [x + bar * w / 6, floor + 1.42, depth / 2 - .19], .004, .82)
    kit.box('timber', [w, .07, .08], [x, floor + 1.1, depth / 2 - .17], .009, .8)
  }
  kit.box('timber', [width + .25, .24, .4], [0, eave - .04, depth / 2], .025, .66)
  kit.box('stone', [width + .45, .22, 1.25], [0, floor, depth / 2 + .45], .035, .88)
  tiledRoof(kit, [0, eave, 0], width + 2.2, depth + 1.75, 2, broken)
  if (broken) {
    const cloth = new THREE.PlaneGeometry(1.2, 2.05, 9, 12), p = cloth.getAttribute('position')
    for (let i = 0; i < p.count; i++) p.setZ(i, .15 * Math.sin(p.getX(i) * 8) * (.65 - p.getY(i) * .22))
    cloth.computeVertexNormals(); cloth.translate(.1, floor + 1.52, depth / 2 - .16); kit.add('plaster', cloth, .69)
  }
}

function brickCorner(kit: Assembly) {
  kit.box('plaster', [9, 11.6, .6], [0, 7.3, -4.5], .055, .74)
  for (const x of [-4.3, 4.3]) kit.box('stone', [.5, 11.6, 9], [x, 7.3, 0], .05, .87)
  for (const y of [4.65, 8.3, 12.85]) kit.box('stone', [9, .24, 9], [0, y, 0], .035, .76)
  wall(kit, 'plaster', [-.8, 1.5, 4.5], 7.3, 11.3, [
    { x: -1.85, y: 8.85, w: 1.5, h: 2.1 }, { x: .6, y: 8.85, w: 1.8, h: 2.1 },
    { x: -1.8, y: 5.4, w: 1.6, h: 2.35 }, { x: .65, y: 5.4, w: 1.8, h: 2.35 },
    { x: -1.3, y: 1.8, w: 2.4, h: 2.9 },
  ], .52)
  // A lost right bay reveals the floor return instead of a jagged front-facing silhouette.
  kit.box('plaster', [1.4, 5.9, .53], [3.7, 4.45, 4.5], .045, .85)
  kit.box('stone', [2.6, .35, 4.4], [3, 8.3, 2.65], .035, .86, [.015, -.09, -.075])
  kit.box('timber', [.24, 3.75, 2.5], [2.2, 10.45, 1.8], .03, .64)
  kit.box('metal', [9.7, .24, 9.6], [0, 13.03, 0], .065, .89)
  kit.box('plaster', [4.2, 1.6, 2.8], [-1.8, 13.86, -1.9], .06, .93)
  kit.box('tile', [4.5, .18, 3.05], [-1.8, 14.72, -1.9], .035, .93)
  kit.box('metal', [3.3, .85, 2.05], [-2.1, 5.66, 5.1], .04, .72, [.08, .03, .11])
  kit.path('metal', [[-4.6, 12.8, 4.7], [-4.5, 9.8, 4.8], [-4.3, 4.05, 4.95]], .07, 14, .73)
}

function mountain(kit: Assembly, outline: V2[], depth: number, seed: number) {
  const curve = new THREE.CatmullRomCurve3(outline.map(([x, y]) => new THREE.Vector3(x, y, 0)), false, 'catmullrom', .22)
  const positions: number[] = [], uv: number[] = [], indices: number[] = []
  const columns = 112, rows = 12
  for (let row = 0; row <= rows; row++) for (let column = 0; column <= columns; column++) {
    const u = column / columns, v = row / rows, crest = curve.getPoint(u)
    const ridge = Math.sin(u * 31 + seed) * 1.1 + Math.sin(u * 81 - seed) * .38 + Math.sin(u * 147 + seed) * .16
    const folds = 1 + Math.sin(u * 47 + v * 5 + seed) * .09 * Math.sin(v * Math.PI * 2)
    positions.push(crest.x + (v - .5) * Math.sin(u * 22 + seed) * 3, 2 + (crest.y + ridge) * Math.sin(v * Math.PI) ** .7 * folds, (v - .5) * depth); uv.push(u * 5, v)
  }
  for (let j = 0; j < rows; j++) for (let i = 0; i < columns; i++) {
    const a = j * (columns + 1) + i, b = a + 1, c = a + columns + 1
    indices.push(a, c, b, b, c, c + 1)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  geometry.setIndex(indices); geometry.computeVertexNormals()
  kit.add('distant', geometry, seed === 3 ? 1.1 : seed === 8 ? .72 : .86, (x, y, z) => .83 + .15 * Math.sin(x * .38 + z * .2 + seed) + .12 * y / 25 + .13 * z / depth)
}

function cityRemnant(kit: Assembly, width: number, height: number, depth: number, seed: number) {
  kit.box('distant', [width, height, depth], [0, height / 2 + 2, 0], .09, .75)
  kit.box('distant', [width * .65, 1.2, depth * .65], [-width * .1, height + 2.6, -.4], .06, .78)
  for (let row = 0; row < Math.floor(height / 3); row++) for (let column = 0; column < 3; column++) {
    if ((row + column + seed) % 4 === 0) continue
    kit.box('glass', [width * .17, 1.22, .04], [(column - 1) * width * .28, height + .65 - row * 2.9, depth / 2 + .03], 0, .42)
  }
}

export function buildSeoulDream(): SeoulBatch[] {
  const groups = new Map<SeoulSurface, THREE.BufferGeometry[]>()
  // A water approach between unequal banks; no legacy city shapes or placements are reused.
  mountain(assembly(groups, [-12, 0, -127]), [[-95, 0], [-69, 8], [-42, 17], [-14, 22], [8, 18], [31, 12], [58, 17], [86, 3]], 38, 3)
  mountain(assembly(groups, [-38, 0, -91]), [[-60, 0], [-39, 7], [-21, 19], [-10, 23], [1, 20], [12, 12], [32, 8], [66, 0]], 30, 8)
  mountain(assembly(groups, [46, 0, -77]), [[-34, 0], [-17, 6], [7, 11], [21, 9], [33, 14], [57, 4], [76, 0]], 22, 12)
  for (const [x, z, w, h, d, yaw, seed] of [
    [-40, -61, 6, 11, 5, .28, 1], [-28, -72, 8, 15, 6, -.18, 2], [-16, -78, 5.5, 10, 5, .12, 3],
    [31, -61, 7, 14, 6, -.29, 4], [44, -56, 9, 10, 7, .19, 5], [55, -78, 6, 18, 5, -.12, 6],
  ]) cityRemnant(assembly(groups, [x, 0, z], yaw), w, h, d, seed)
  courtyardHome(assembly(groups, [-27, 0, -31], .34), 15, 7.2, 5.1)
  courtyardHome(assembly(groups, [-14, 0, -46], -.12), 10.2, 6.1, 4.3)
  courtyardHome(assembly(groups, [29, 0, -31], -.49), 13.5, 7.3, 3.8)
  courtyardHome(assembly(groups, [38, 0, -14], -.67), 12.8, 7.2, 3.3, true)
  pavilion(assembly(groups, PALACE_PLACEMENT.position, PALACE_PLACEMENT.yaw, PALACE_PLACEMENT.scale))
  courtyardHome(assembly(groups, [-21, 0, 6], .55), 12, 7.7, 4.45, true)
  brickCorner(assembly(groups, [-8, 0, 27], .52, .66))
  courtyardHome(assembly(groups, [11, 0, 24], -.65, .86), 10.1, 7, 1.4, true)
  const result: SeoulBatch[] = []
  for (const [surface, pieces] of groups) {
    const geometry = mergeGeometries(pieces)!
    pieces.forEach(piece => piece.dispose()); geometry.computeBoundingBox(); geometry.computeBoundingSphere()
    result.push({ surface, geometry })
  }
  return result
}
