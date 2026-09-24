import * as THREE from 'three'
import type { CityBuilder, CityFinish } from '../city/CityGeometry'
import type { CitySurface } from '../city/CitySurfaces'

type Point = [number, number, number]
type Opening = { x: number; y: number; w: number; h: number; door?: boolean }

// Fictional upper-coast lodging. Local flood datum: 4.25; floor spacing: 3.35.
export function buildCoastalPension(kit: CityBuilder) {
  const floor = 3.35
  const block = (finish: CityFinish, size: Point, at: Point, yaw = 0, surface: CitySurface = 'plaster') => {
    const geometry = new THREE.BoxGeometry(...size,
      Math.max(1, Math.ceil(size[0] / 2.5)),
      Math.max(1, Math.ceil(size[1] / 2.5)),
      Math.max(1, Math.ceil(size[2] / 2.5)))
    kit.add(finish, geometry.rotateY(yaw).translate(...at), surface)
  }

  // Tile solid wall bands around open apertures, retaining subdivisions for offline AO.
  const wall = (finish: CityFinish, at: Point, width: number, height: number,
    openings: Opening[], yaw = 0, thickness = .38, openInterior = false) => {
    const transform = new THREE.Matrix4().makeRotationY(yaw).setPosition(...at)
    const piece = (material: CityFinish, size: Point, position: Point) => {
      const point = new THREE.Vector3(...position).applyMatrix4(transform)
      block(material, size, point.toArray() as Point, yaw)
    }
    const levels = [...new Set([0, height, ...openings.flatMap(o => [o.y - o.h / 2, o.y + o.h / 2])])].sort((a, b) => a - b)
    for (let row = 1; row < levels.length; row++) {
      const bottom = levels[row - 1], top = levels[row], middle = (bottom + top) / 2
      const cuts = openings.filter(o => middle > o.y - o.h / 2 && middle < o.y + o.h / 2)
        .sort((a, b) => a.x - b.x)
      let left = -width / 2
      for (const cut of [...cuts, { x: width / 2, w: 0 }]) {
        const right = cut.x - cut.w / 2
        if (right - left > .001) piece(finish, [right - left, top - bottom, thickness], [(left + right) / 2, middle, -thickness / 2])
        left = cut.x + cut.w / 2
      }
    }
    openings.forEach((o, index) => {
      if (!openInterior) {
        piece(index % 3 === 0 ? 'glazing' : 'glass', [o.w, o.h, .07], [o.x, o.y, -thickness - .13])
        piece('steel', [.065, o.h, .1], [o.x + o.w * .13, o.y, -thickness - .055])
        if (o.door) piece('paint', [o.w, .32, .08], [o.x, o.y - o.h / 2 + .16, -thickness - .06])
      }
      piece('edge', [o.w + .14, .12, thickness + .22], [o.x, o.y - o.h / 2 - .06, -thickness / 2 + .035])
      piece('steel', [.055, o.h, .075], [o.x - o.w / 2 + .03, o.y, -thickness + .015])
      piece('steel', [.055, o.h, .075], [o.x + o.w / 2 - .03, o.y, -thickness + .015])
    })
  }

  // The room block ends behind its perforated shells; no solid core fills the reveals.
  for (let level = 0; level <= 4; level++) {
    block(level === 4 ? 'edge' : 'concrete', [7.05, .25, 6.05], [.875, level * floor + .125, -.575], 0, 'masonry')
  }
  const front: Opening[] = [], side: Opening[] = [], rear: Opening[] = []
  for (let level = 0; level < 4; level++) {
    const base = level * floor
    front.push({ x: -1.75, y: base + 1.83, w: 1.5, h: 1.95 })
    front.push({ x: 1.35, y: base + (level === 2 ? 1.48 : 1.83), w: 2.15, h: level === 2 ? 2.36 : 1.95, door: level === 2 })
    side.push({ x: -1.6, y: base + 1.87, w: 1.25, h: 1.65 })
    if (level !== 3) side.push({ x: 1.25, y: base + 1.87, w: 1.45, h: 1.65 })
    rear.push({ x: -1.4, y: base + 1.95, w: 1.1, h: 1.4 }, { x: 1.3, y: base + 1.95, w: 1.1, h: 1.4 })
  }
  wall('concrete', [.875, 0, 2.45], 7.05, 13.4, front)
  wall('faded', [4.4, 0, -.575], 6.05, 13.4, side, Math.PI / 2)
  wall('faded', [.875, 0, -3.6], 7.05, 13.4, rear, Math.PI)
  wall('concrete', [-2.65, 0, -.575], 6.05, 13.4,
    [0, 1, 2, 3].flatMap(level => [
      { x: -1.9, y: level * floor + 1.8, w: .8, h: 1.5 },
      { x: 2.475, y: level * floor + 1.28, w: .94, h: 2.05, door: true },
    ]), -Math.PI / 2)
  block('edge', [.18, 13.4, .55], [4.43, 6.7, -3.35])
  block('concrete', [.2, 13.4, .58], [4.43, 6.7, 2.14])
  block('paint', [7.05, .32, .12], [.875, 3.2, 2.49])

  // Offset enclosed stair tower: switchback flights meet full and half landings.
  const stairX = -3.9, frontZ = 3.65, backZ = -1.8
  const stairOpenings = [0, 1, 2, 3, 4].map(level => ({
    x: level % 2 ? -.22 : .22,
    y: level === 4 ? 14.85 : level * floor + 2.05,
    w: 1.04, h: level === 4 ? 1.5 : 1.92,
  }))
  wall('concrete', [stairX, 0, frontZ], 2.2, 15.95, stairOpenings, 0, .43, true)
  wall('faded', [stairX, 0, backZ], 2.2, 15.95,
    [0, 1, 2, 3].map(level => ({ x: -.13, y: level * floor + 3.4, w: .86, h: 1.45 })), Math.PI, .38, true)
  wall('faded', [-5, 0, .925], 5.45, 15.95,
    [1, 2, 3, 4].map(level => ({ x: 1.73, y: level * floor + .72, w: .7, h: 1.02 })), -Math.PI / 2, .34)
  wall('concrete', [-2.8, 0, .925], 5.45, 15.95,
    [0, 1, 2, 3, 4].map(level => ({ x: -.975, y: level * floor + 1.28, w: .94, h: 2.05, door: true })), Math.PI / 2, .3)
  for (let level = 0; level <= 4; level++) {
    block('edge', [.55, .25, 1.15], [-2.7, level * floor + .125, 1.9], 0, 'masonry')
  }
  block('concrete', [.2, 13.4, .3], [-2.725, 6.7, 2.4])
  for (let half = 0; half <= 8; half++) {
    const y = half * floor / 2, forward = half % 2 === 0
    block('edge', [1.52, .18, forward ? 1.74 : 1.06], [stairX, y + .16, forward ? 2.34 : -1.02], 0, 'masonry')
    if (half === 8) continue
    const x = stairX + (forward ? -.38 : .38)
    const startZ = forward ? 1.47 : -.49, endZ = forward ? -.49 : 1.47
    kit.beam('concrete', [x, y + .08, startZ], [x, y + floor / 2 + .08, endZ], .7, .2, 'masonry')
    for (let step = 0; step < 9; step++) {
      block('edge', [.7, .19, .24], [x, y + (step + 1) * floor / 18 + .08,
        startZ + (endZ - startZ) * (step + .5) / 9], 0, 'masonry')
    }
  }
  // Set glass only in the upper portion: deep lower openings expose real landings.
  stairOpenings.forEach(o => {
    block('glazing', [.92, .6, .06], [stairX + o.x, o.y + o.h / 2 - .32, 3.13])
    block('steel', [1.02, .075, .1], [stairX + o.x, o.y + o.h / 2 - .64, 3.14])
  })
  block('edge', [2.2, .25, 5.45], [stairX, 16.075, .925], 0, 'masonry')
  block('steel', [2.14, .08, 5.37], [stairX, 16.24, .925], 0, 'sheet')

  // One rounded corner balcony, with a substantial concrete parapet and soffit.
  const edge: THREE.Vector2[] = [new THREE.Vector2(.3, 3.9), new THREE.Vector2(3.85, 3.9)]
  for (let i = 1; i <= 8; i++) {
    const angle = Math.PI / 2 * (1 - i / 8)
    edge.push(new THREE.Vector2(3.85 + Math.cos(angle), 2.9 + Math.sin(angle)))
  }
  edge.push(new THREE.Vector2(4.85, .9))
  const extrudePlan = (finish: CityFinish, points: THREE.Vector2[], base: number, height: number) => {
    const shape = new THREE.Shape(points.map(p => new THREE.Vector2(p.x, -p.y)))
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, steps: 1 })
    kit.add(finish, geometry.rotateX(-Math.PI / 2).translate(0, base, 0), 'masonry')
  }
  extrudePlan('concrete', [...edge, new THREE.Vector2(3.95, .9), new THREE.Vector2(3.95, 2.05), new THREE.Vector2(.3, 2.05)], 6.62, .3)
  const inner: THREE.Vector2[] = [new THREE.Vector2(.3, 3.65), new THREE.Vector2(3.85, 3.65)]
  for (let i = 1; i <= 8; i++) {
    const angle = Math.PI / 2 * (1 - i / 8)
    inner.push(new THREE.Vector2(3.85 + .75 * Math.cos(angle), 2.9 + .75 * Math.sin(angle)))
  }
  inner.push(new THREE.Vector2(4.6, .9))
  extrudePlan('faded', [...edge, ...inner.slice().reverse()], 6.92, .86)
  extrudePlan('edge', [...edge, ...inner.slice().reverse()], 7.78, .1)
  block('concrete', [.26, 3.27, 1.42], [.43, 4.985, 3.13])
  block('concrete', [.4, 3.27, .55], [4.27, 4.985, 2.63])

  // Flat accessible roof, raised coping, and a modest service room beside the tower.
  block('faded', [6.3, .1, 5.3], [.875, 13.68, -.575], 0, 'masonry')
  block('concrete', [7.12, .48, .24], [.875, 13.89, 2.46])
  block('concrete', [7.12, .48, .24], [.875, 13.89, -3.61])
  block('concrete', [.24, .48, 5.9], [4.43, 13.89, -.575])
  block('concrete', [.24, .48, 5.9], [-2.68, 13.89, -.575])
  block('edge', [7.22, .1, .32], [.875, 14.18, 2.46])
  block('edge', [7.22, .1, .32], [.875, 14.18, -3.61])
  block('edge', [.32, .1, 5.82], [4.43, 14.18, -.575])
  wall('concrete', [-1.3, 13.73, .8], 2.45, 1.95, [{ x: .1, y: .95, w: .8, h: 1.75, door: true }])
  block('faded', [2.45, 1.95, .3], [-1.3, 14.705, -1.8])
  block('concrete', [.3, 1.95, 2.6], [-2.375, 14.705, -.5])
  block('concrete', [.3, 1.95, 2.6], [-.225, 14.705, -.5])
  block('edge', [2.67, .2, 2.98], [-1.3, 15.78, -.5], 0, 'masonry')
  block('steel', [.28, .48, .3], [1.85, 13.97, -2.75], 0, 'sheet')
  block('edge', [.5, .09, .52], [1.85, 14.255, -2.75], 0, 'sheet')
  block('steel', [.16, .18, .58], [3.88, 13.68, 2.55], 0, 'sheet')
  block('steel', [.12, 9.1, .14], [3.88, 9.025, 2.66], 0, 'sheet')
  block('steel', [.18, .22, .43], [3.88, 4.55, 2.78], 0, 'sheet')
}
