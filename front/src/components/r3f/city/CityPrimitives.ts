import * as THREE from 'three'
import type { CityBuilder, CityFinish } from './CityGeometry'
import { roofShell } from './CityDetails'

export type Point = [number, number, number]
export type Outline = [number, number][]

export function solid(kit: CityBuilder, finish: CityFinish, outline: Outline, depth: number, at: Point, rotation: Point = [0, 0, 0]) {
  const shape = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)))
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: .045, bevelThickness: .04, bevelSegments: 2, steps: 1 })
  geometry.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...rotation))).translate(...at)
  kit.add(finish, geometry)
}

export function tube(kit: CityBuilder, finish: CityFinish, points: Point[], radius: number, segments = 24) {
  kit.add(finish, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), segments, radius, 6, false))
}

export function ellipsoid(kit: CityBuilder, finish: CityFinish, at: Point, radii: Point, rotation: Point = [0, 0, 0]) {
  const geometry = new THREE.SphereGeometry(1, 20, 12)
  geometry.scale(...radii).applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...rotation))).translate(...at)
  kit.add(finish, geometry)
}

export function lathe(kit: CityBuilder, finish: CityFinish, profile: Outline, at: Point, segments = 32) {
  const geometry = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segments)
  geometry.translate(...at)
  kit.add(finish, geometry)
}

export function rock(kit: CityBuilder, finish: CityFinish, at: Point, radii: Point, seed = 1) {
  const geometry = new THREE.IcosahedronGeometry(1, 2)
  const positions = geometry.getAttribute('position')
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i)
    const scale = 1 + .12 * Math.sin(x * 8 + seed) * Math.sin(z * 6 - seed) + .065 * Math.cos(y * 13 + x * 4)
    positions.setXYZ(i, x * scale * radii[0], y * scale * radii[1], z * scale * radii[2])
  }
  geometry.computeVertexNormals()
  geometry.translate(...at)
  kit.add(finish, geometry)
}

export function terrain(kit: CityBuilder, at: Point, width: number, depth: number, height: number, seed = 1) {
  const columns = 64, rows = 24
  const geometry = new THREE.PlaneGeometry(width, depth, columns, rows)
  geometry.rotateX(-Math.PI / 2)
  const positions = geometry.getAttribute('position')
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), z = positions.getZ(i)
    const u = x / width * 2, v = z / depth * 2
    const envelope = Math.pow(Math.max(0, 1 - u * u), 1.7) * Math.pow(Math.max(0, 1 - v * v), .8)
    const ridge = .78 + .14 * Math.sin(u * 8 + seed) + .08 * Math.sin(u * 19 + v * 3 - seed)
    const folds = Math.sin(u * 27 + v * 9 + seed) * .055 + Math.sin(u * 61 - v * 7) * .018
    positions.setY(i, height * envelope * (ridge + folds))
  }
  geometry.computeVertexNormals()
  geometry.translate(...at)
  kit.add('edge', geometry)
}

export function roof(kit: CityBuilder, at: Point, width: number, depth: number, rise = 1.5, yaw = 0, detail = 1, damaged = false) {
  const matrix = new THREE.Matrix4().makeRotationY(yaw).setPosition(...at)
  const uSteps = Math.max(12, Math.round(width * 2 * detail)), vSteps = Math.max(10, Math.round(20 * detail))
  const hip = Math.min(.36, depth / width * .45)
  const surface = (u: number, v: number): Point => {
    const slope = Math.max(0, Math.min(1 - Math.abs(v), (1 - Math.abs(u)) / hip))
    const eave = .12 * (Math.pow(u, 8) + Math.pow(v, 8)) + .42 * Math.pow(u * v, 4)
    return [u * width / 2, rise * Math.pow(slope, 1.5) + eave, v * depth / 2]
  }
  const geometry = new THREE.PlaneGeometry(width, depth, uSteps, vSteps)
  const positions = geometry.getAttribute('position')
  for (let i = 0; i < positions.count; i++) {
    const u = positions.getX(i) / width * 2, v = positions.getY(i) / depth * -2
    positions.setXYZ(i, ...surface(u, v))
  }
  if (damaged) {
    const indices = geometry.index!, kept: number[] = []
    for (let i = 0; i < indices.count; i += 3) {
      const a = indices.getX(i), b = indices.getX(i + 1), c = indices.getX(i + 2)
      const u = (positions.getX(a) + positions.getX(b) + positions.getX(c)) / (width * 1.5)
      const v = (positions.getZ(a) + positions.getZ(b) + positions.getZ(c)) / (depth * 1.5)
      if (u > .18 && u < .65 - .05 * Math.sin(v * 17) && v > .32 && v < .9) continue
      kept.push(a, b, c)
    }
    geometry.setIndex(kept)
  }
  geometry.computeVertexNormals()
  // Plane indices originally face +Z; mapping rows onto +Z makes the roof face +Y.
  geometry.applyMatrix4(matrix)
  roofShell(kit, geometry, .18, 'steel', 'tile')
  const strips = Math.round(width / .38 * detail)
  const point = (u: number, v: number, lift = .035): Point => {
    const vertex = new THREE.Vector3(...surface(u, v))
    vertex.y += lift
    return vertex.applyMatrix4(matrix).toArray() as Point
  }
  for (let i = 0; i <= strips; i++) {
    const u = i / strips * 2 - 1
    const start = Math.max(0, 1 - (1 - Math.abs(u)) / hip)
    if (start > .98) continue
    for (const side of [-1, 1]) {
      if (damaged && side > 0 && u > .18 && u < .7) continue
      const points = Array.from({ length: 7 }, (_, j) => point(u, side * (start + (1 - start) * j / 6)))
      tube(kit, 'steel', points, .035, Math.max(5, Math.round(9 * detail)))
    }
  }
  if (damaged) {
    for (const u of [.26, .45, .61]) kit.beam('rust', point(u, .3, -.08), point(u, .91, -.09), .095, .13, 'timber')
  }
  // The end planes turn the tile courses toward the hips, shortening the ridge.
  const endStrips = Math.round(depth / .4 * detail)
  for (let i = 1; i < endStrips; i++) {
    const v = i / endStrips * 2 - 1, start = 1 - hip * (1 - Math.abs(v))
    for (const side of [-1, 1]) {
      tube(kit, 'steel', Array.from({ length: 7 }, (_, j) => point(side * (start + (1 - start) * j / 6), v)), .035, Math.max(5, Math.round(9 * detail)))
    }
  }
  for (const side of [-1, 1]) {
    tube(kit, 'edge', Array.from({ length: 19 }, (_, i) => point(i / 9 - 1, side)), .1, Math.max(8, Math.round(24 * detail)))
    tube(kit, 'edge', Array.from({ length: 15 }, (_, i) => point(side, i / 7 - 1)), .1, Math.max(8, Math.round(20 * detail)))
    for (const end of [-1, 1]) {
      tube(kit, 'edge', Array.from({ length: 9 }, (_, i) => point(end * (1 - hip + hip * i / 8), side * i / 8, .09)), .1, Math.max(6, Math.round(16 * detail)))
    }
  }
  tube(kit, 'edge', Array.from({ length: 15 }, (_, i) => point((i / 7 - 1) * (1 - hip), 0, .07)), .13, Math.max(8, Math.round(20 * detail)))
}
