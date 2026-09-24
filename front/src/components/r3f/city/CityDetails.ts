import * as THREE from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { CityBuilder, CityFinish } from './CityGeometry'
import type { Point } from './CityPrimitives'
import type { CitySurface } from './CitySurfaces'

export interface WallOpening {
  x: number
  y: number
  width: number
  height: number
  broken?: boolean
  boarded?: boolean
}

interface WallOptions {
  depth?: number
  yaw?: number
  seed?: number
  brokenTop?: boolean
  surface?: CitySurface
}

// A low water-level camera sees roof undersides; a single top-facing plane disappears.
export function roofShell(kit: CityBuilder, source: THREE.BufferGeometry, thickness = .17, finish: CityFinish = 'steel', surface: CitySurface = 'tile') {
  const welded = mergeVertices(source.clone().deleteAttribute('normal').deleteAttribute('uv'), .0001)
  source.dispose()
  const positions = welded.getAttribute('position'), indices = welded.index!
  const boundaries = new Map<string, { a: number; b: number; count: number }>()
  for (let i = 0; i < indices.count; i += 3) {
    const triangle = [indices.getX(i), indices.getX(i + 1), indices.getX(i + 2)]
    for (let j = 0; j < 3; j++) {
      const a = triangle[j], b = triangle[(j + 1) % 3], key = a < b ? `${a}:${b}` : `${b}:${a}`
      const edge = boundaries.get(key)
      if (edge) edge.count++
      else boundaries.set(key, { a, b, count: 1 })
    }
  }
  const edges: number[] = []
  for (const { a, b, count } of boundaries.values()) {
    if (count !== 1) continue
    const topA = new THREE.Vector3().fromBufferAttribute(positions, a), topB = new THREE.Vector3().fromBufferAttribute(positions, b)
    const lowA = topA.clone().add(new THREE.Vector3(0, -thickness, 0)), lowB = topB.clone().add(new THREE.Vector3(0, -thickness, 0))
    for (const point of [topA, lowA, topB, topB, lowA, lowB]) edges.push(...point.toArray())
  }
  const underside = welded.clone().translate(0, -thickness, 0)
  const reverse = Array.from(indices.array)
  for (let i = 0; i < reverse.length; i += 3) [reverse[i + 1], reverse[i + 2]] = [reverse[i + 2], reverse[i + 1]]
  underside.setIndex(reverse); underside.computeVertexNormals()
  welded.computeVertexNormals()
  kit.add(finish, welded, surface)
  kit.add('dark', underside, surface)
  if (edges.length) {
    const edgeGeometry = new THREE.BufferGeometry()
    edgeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(edges, 3))
    edgeGeometry.computeVertexNormals()
    kit.add('edge', edgeGeometry, surface)
  }
}

// A facade shell with real holes. The building core must stop behind this shell.
export function windowWall(kit: CityBuilder, finish: CityFinish, at: Point, width: number, height: number, openings: WallOpening[], { depth = .32, yaw = 0, seed = 1, brokenTop = false, surface = 'plaster' }: WallOptions = {}) {
  const matrix = new THREE.Matrix4().makeRotationY(yaw).setPosition(...at)
  const add = (material: CityFinish, geometry: THREE.BufferGeometry, kind?: CitySurface) => kit.add(material, geometry.applyMatrix4(matrix), kind)
  const box = (material: CityFinish, size: Point, position: Point, rotation = 0) => {
    add(material, new THREE.BoxGeometry(...size).rotateZ(rotation).translate(...position))
  }
  const outline = new THREE.Shape()
  outline.moveTo(-width / 2, 0); outline.lineTo(width / 2, 0)
  outline.lineTo(width / 2, height - (brokenTop ? .38 : 0))
  if (brokenTop) {
    outline.lineTo(width * .31, height - .13); outline.lineTo(width * .21, height - .42)
    outline.lineTo(width * .08, height - .14); outline.lineTo(-width * .11, height)
  }
  outline.lineTo(-width / 2, height); outline.closePath()
  openings.forEach((opening, index) => {
    const { x, y, width: w, height: h, broken, boarded } = opening
    if (w <= 0 || h <= 0 || x - w / 2 <= -width / 2 || x + w / 2 >= width / 2 || y - h / 2 <= 0 || y + h / 2 >= height - (brokenTop ? .45 : 0)) {
      throw new Error('Window opening must fit strictly inside its wall')
    }
    const hole = new THREE.Path()
    hole.moveTo(x - w / 2, y - h / 2); hole.lineTo(x - w / 2, y + h / 2)
    hole.lineTo(x + w / 2, y + h / 2); hole.lineTo(x + w / 2, y - h / 2); hole.closePath()
    outline.holes.push(hole)

    // Recessed glass and a shadowed reveal replace painted-on black rectangles.
    box('dark', [w + .09, h + .09, .035], [x, y, -depth - .12])
    const pane = new THREE.Shape([
      new THREE.Vector2(-w * .43, -h * .44), new THREE.Vector2(-w * .43, h * .44),
      new THREE.Vector2(w * .43, h * .44), new THREE.Vector2(w * .43, broken ? h * .06 : -h * .44),
      ...(broken ? [new THREE.Vector2(w * .08, -h * .06), new THREE.Vector2(w * .19, -h * .44)] : []),
    ])
    if (!boarded) add((index + seed) % 4 ? 'glass' : 'glazing', new THREE.ShapeGeometry(pane).translate(x, y, -depth + .05))
    if ((index + seed) % 3) box('steel', [.045, h, .08], [x - w * .1, y, -depth + .08])
    box('edge', [w + .17, .085, depth + .13], [x, y - h / 2 - .045, -depth / 2 + .03])
    if (boarded) {
      box('paint', [w * .83, h * .35, .06], [x - w * .04, y - h * .12, -.045], .12)
      box('rust', [w * .52, h * .23, .075], [x + w * .17, y + h * .2, .01], -.22)
    }
  })
  const wall = new THREE.ExtrudeGeometry(outline, { depth, bevelEnabled: false })
  add(finish, wall.translate(0, 0, -depth), surface)
}

// Low-relief, irregular patches read as lost render, not outlines around every brick.
export function plasterLoss(kit: CityBuilder, at: Point, width: number, height: number, seed = 1, yaw = 0) {
  const profile: THREE.Vector2[] = []
  for (let i = 0; i < 15; i++) {
    const angle = i / 15 * Math.PI * 2
    const radius = .84 + .1 * Math.sin(i * 2.7 + seed) + .055 * Math.cos(i * 4.3 - seed)
    profile.push(new THREE.Vector2(Math.cos(angle) * width / 2 * radius, Math.sin(angle) * height / 2 * radius))
  }
  const geometry = new THREE.ShapeGeometry(new THREE.Shape(profile))
  geometry.rotateY(yaw).translate(...at)
  kit.add('steel', geometry, 'masonry')
}

export function brokenSlab(kit: CityBuilder, at: Point, width: number, depth: number, thickness = .24, yaw = 0, seed = 1) {
  const outline = new THREE.Shape([
    new THREE.Vector2(-width / 2, -depth / 2), new THREE.Vector2(width / 2, -depth / 2),
    new THREE.Vector2(width / 2, depth * .16), new THREE.Vector2(width * .33, depth * .2),
    new THREE.Vector2(width * .25, depth * .39), new THREE.Vector2(width * .09, depth * .32),
    new THREE.Vector2(-width * .02, depth / 2), new THREE.Vector2(-width / 2, depth / 2),
  ])
  const geometry = new THREE.ExtrudeGeometry(outline, { depth: thickness, bevelEnabled: false })
  geometry.rotateX(-Math.PI / 2).rotateY(yaw).translate(...at)
  kit.add('edge', geometry, 'masonry')
  for (let i = 0; i < 3; i++) {
    const x = width * (.08 + i * .1), z = depth * (.35 - i * .05)
    const matrix = new THREE.Matrix4().makeRotationY(yaw).setPosition(...at)
    const a = new THREE.Vector3(x, thickness * .45, z).applyMatrix4(matrix)
    const b = new THREE.Vector3(x + .13 * Math.sin(seed + i), thickness * .15 - .16, z + .36).applyMatrix4(matrix)
    kit.beam('steel', a.toArray() as Point, b.toArray() as Point, .026)
  }
}
