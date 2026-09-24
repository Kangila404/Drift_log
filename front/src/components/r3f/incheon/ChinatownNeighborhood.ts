import * as THREE from 'three'
import type { CityBuilder, CityFinish } from '../city/CityGeometry'
import { windowWall, type WallOpening } from '../city/CityDetails'
import { buildChinatownGate, buildChinatownRoof } from './ChinatownGate'

type Point = [number, number, number]
type ShopKind = 'timber' | 'plaster' | 'brick' | 'courtyard'
export const INCHEON_FRAMING = { desktopDistance: 94, portraitDistance: 101, orbitLimit: .1, zoomMin: .85, zoomMax: 1.15 }

function place(kit: CityBuilder, at: Point, yaw: number, scale: number, build: (local: CityBuilder) => void) {
  const matrix = new THREE.Matrix4().compose(new THREE.Vector3(...at),
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), new THREE.Vector3(scale, scale, scale))
  const add: CityBuilder['add'] = (finish, geometry, surface) => kit.add(finish, geometry.applyMatrix4(matrix), surface)
  build({ add,
    box: (finish, size, p, rotation = [0, 0, 0], surface) => add(finish,
      new THREE.BoxGeometry(...size).applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...rotation))).translate(...p), surface),
    beam: (finish, a, b, width, depth = width, surface) => {
      const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), delta = end.clone().sub(start)
      add(finish, new THREE.BoxGeometry(width, delta.length(), depth)
        .applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()))
        .translate(...start.add(end).multiplyScalar(.5).toArray()), surface)
    },
  })
}

function ledge(kit: CityBuilder, width: number, depth: number, y: number, finish: CityFinish = 'concrete') {
  kit.box(finish, [width + .2, .22, depth + .2], [0, y, 0], undefined, 'masonry')
}

function facade(kit: CityBuilder, width: number, height: number, floors: number, yaw: number, at: Point, kind: ShopKind) {
  const floorHeight = height / floors, columns = Math.max(2, Math.round(width / 2.7))
  const pitch = (width - .6) / columns, openings: WallOpening[] = []
  for (let row = 0; row < floors; row++) {
    for (let col = 0; col < columns; col++) {
      openings.push({ x: (col - (columns - 1) / 2) * pitch,
        y: row * floorHeight + floorHeight * .55,
        width: pitch * (kind === 'timber' ? .8 : .66), height: floorHeight * (row ? .63 : .72) })
    }
  }
  const finish = kind === 'brick' ? 'rust' : kind === 'timber' ? 'faded' : 'concrete'
  windowWall(kit, finish, at, width, height, openings, { depth: .42, yaw, seed: columns, surface: kind === 'timber' ? 'timber' : 'masonry' })
  place(kit, at, yaw, 1, local => {
    for (const opening of openings) {
      const { x, y, width: w, height: h } = opening
      for (const side of [-1, 1]) {
        local.box(kind === 'timber' ? 'trim' : 'edge', [.11, h + .22, .16], [x + side * (w / 2 + .055), y, .025], undefined, 'timber')
      }
      local.box('edge', [w + .25, .13, .3], [x, y + h / 2 + .065, .02], undefined, 'masonry')
      if (kind === 'timber') {
        for (const offset of [-.22, .22]) local.box('steel', [.055, h, .08], [x + w * offset, y, -.31], undefined, 'timber')
        local.box('steel', [w, .06, .08], [x, y + h * .22, -.3], undefined, 'timber')
        // Lower solid panels support the upper glazed restaurant bay.
        local.box('faded', [w + .15, .42, .15], [x, y - h / 2 - .32, -.03], undefined, 'timber')
      } else if (kind === 'plaster' && y > floorHeight) {
        const sx = x - w * .31
        local.box('steel', [w * .55, h, .13], [sx, y, -.18], undefined, 'timber')
        for (let louver = 1; louver < 7; louver++) {
          local.box('faded', [w * .52, .055, .15], [sx, y - h / 2 + h * louver / 7, -.12], undefined, 'timber')
        }
      }
    }
    for (let floor = 1; floor < floors; floor++) {
      local.box(kind === 'timber' ? 'steel' : 'edge', [width, .24, .26], [0, floor * floorHeight, .04], undefined, 'masonry')
    }
    // Low-relief brick joints are restricted to a few structural piers, not a wire grid.
    if (kind === 'brick') {
      for (let row = 1; row < Math.floor(height / .8); row++) {
        for (const side of [-1, 1]) local.box('edge', [.37, .026, .045], [side * (width / 2 - .2), row * .8, .025], undefined, 'masonry')
      }
    }
  })
}

export function buildChinatownShop(kit: CityBuilder, kind: ShopKind, width: number, depth: number, height: number) {
  const floors = Math.max(2, Math.round(height / 4.8))
  const wallKind = kind === 'timber' ? 'brick' : kind
  const baseHeight = kind === 'timber' ? height / floors : height
  facade(kit, width, baseHeight, kind === 'timber' ? 1 : floors, 0, [0, 0, depth / 2], wallKind)
  facade(kit, depth, height, floors, -Math.PI / 2, [-width / 2, 0, 0], wallKind)
  facade(kit, depth, height, floors, Math.PI / 2, [width / 2, 0, 0], wallKind)
  kit.box('edge', [width, height, .45], [0, height / 2, -depth / 2 + .22], undefined, 'masonry')
  ledge(kit, width, depth, .2)
  for (let i = 1; i < floors; i++) kit.box('dark', [width - .85, .2, depth - .85], [0, i * height / floors, 0])
  if (kind === 'timber') {
    const bayHeight = height - baseHeight
    facade(kit, width + .4, bayHeight, floors - 1, 0, [0, baseHeight, depth / 2 + .65], 'timber')
    for (const side of [-1, 1]) {
      facade(kit, 1.5, bayHeight, floors - 1, side * Math.PI / 2, [side * (width / 2 + .2), baseHeight, depth / 2 - .1], 'timber')
      kit.beam('steel', [side * width * .38, baseHeight - .9, depth / 2], [side * width * .38, baseHeight - .12, depth / 2 + .73], .19, .22, 'timber')
    }
    kit.box('edge', [width + .75, .25, 1.5], [0, baseHeight - .08, depth / 2 + .1], undefined, 'timber')
    place(kit, [0, 0, .4], 0, 1, k => buildChinatownRoof(k, width + 1.2, depth + 1.5, height + .3, 1.6, 'steel'))
    // Solid sloping canopy over the submerged shopfront, not a floating ornamental lip.
    kit.box('steel', [width + .6, .12, 1.6], [0, baseHeight - .4, depth / 2 + .65], [-.18, 0, 0], 'sheet')
  } else if (kind === 'plaster') {
    ledge(kit, width + .35, depth, height)
    kit.box('dark', [width - .4, .2, depth - .4], [0, height + .05, 0])
    for (const side of [-1, 1]) {
      kit.box('concrete', [.35, .8, depth], [side * (width / 2 - .18), height + .4, 0], undefined, 'masonry')
      kit.box('concrete', [width, .8, .35], [0, height + .4, side * (depth / 2 - .18)], undefined, 'masonry')
    }
    kit.box('concrete', [width * .56, .75, .44], [0, height + .95, depth / 2 - .2], undefined, 'masonry')
    kit.box('trim', [width * .6, .14, .55], [0, height + 1.39, depth / 2 - .2], undefined, 'masonry')
  } else {
    buildChinatownRoof(kit, width + .85, depth + .9, height + .2, kind === 'courtyard' ? 1.15 : 1.8, 'steel')
    for (const side of [-1, 1]) kit.box('edge', [.32, height, .32], [side * (width / 2 - .2), height / 2, depth / 2], undefined, 'masonry')
  }
  // Drainpipes return into the masonry rather than ending in mid-air.
  kit.add('steel', new THREE.CylinderGeometry(.075, .075, height - .25, 8).translate(width / 2 - .3, height / 2, depth / 2 + .12), 'sheet')
}

function street(kit: CityBuilder, width: number, depth: number) {
  // Only the uphill street is stepped. Water and the surrounding neighborhood remain continuous.
  const count = 18, tread = depth / count
  for (let i = 0; i < count; i++) {
    const top = 3.3 + i * .29, z = -i * tread
    kit.box('concrete', [width, top + 1, tread + .015], [0, (top - 1) / 2, z], undefined, 'masonry')
    kit.box('trim', [width, .045, .15], [0, top + .025, z + tread / 2 - .06], undefined, 'masonry')
    for (const side of [-1, 1]) {
      kit.box('edge', [.48, top + 1.15, tread + .015], [side * (width / 2 + .24), (top - .85) / 2, z], undefined, 'masonry')
      if (i % 3 === 1) {
        kit.box('concrete', [.36, 1.12, .36], [side * (width / 2 + .24), top + .7, z], undefined, 'masonry')
        kit.box('trim', [.47, .16, .47], [side * (width / 2 + .24), top + 1.32, z], undefined, 'masonry')
      }
    }
  }
  const landing = 3.3 + (count - 1) * .29
  kit.box('concrete', [width + 8, landing + 1, 4], [3.5, (landing - 1) / 2, -depth - .7], undefined, 'masonry')
  kit.box('edge', [width + 8, .2, .44], [3.5, landing + .1, -depth - 2.5], undefined, 'masonry')
}

export function buildChinatownLandmark(kit: CityBuilder, portrait = false) {
  place(kit, portrait ? [.8, 1, 5] : [10, 0, 3], -.18, portrait ? .64 : 1, buildChinatownGate)
}

export function buildChinatownNeighborhood(kit: CityBuilder, portrait = false) {
  const shop = (kind: ShopKind, size: Point, at: Point, yaw: number, scale = 1) =>
    place(kit, at, yaw, scale, k => buildChinatownShop(k, kind, ...size))
  if (portrait) {
    place(kit, [.8, 1, 3.9], -.18, .64, k => street(k, 8.5, 27))
    shop('timber', [9, 8, 15], [-6.8, 1, -8.5], -.42, .8)
    shop('plaster', [6, 8, 18], [-11.6, 2.1, -25], -.27, .8)
    shop('brick', [8, 7, 13], [-16.2, 2.6, -40], -.37, .74)
    shop('courtyard', [8, 6, 8], [10.5, 2.1, -13], -.25, .72)
    shop('plaster', [6.5, 7, 15], [11.5, 4.3, -35], -.3, .82)
    shop('brick', [10, 8, 14], [-3.6, 7, -39], -.16, .85)
  } else {
    place(kit, [10, 0, .8], -.18, 1, k => street(k, 8.5, 26))
    shop('timber', [13, 10, 16], [-9, 0, 1], -.42)
    shop('plaster', [7.5, 9, 18], [-23, 1.5, -13], -.28)
    shop('brick', [10, 8, 14], [-34, 1.8, -32], -.4)
    shop('courtyard', [10, 7, 8], [-43, 2.1, -46], -.46)
    shop('courtyard', [10, 8, 9], [27, 1.8, -2], -.18)
    shop('plaster', [8, 9, 18], [30, 6.3, -34], -.3)
    shop('brick', [12, 9, 14], [3, 7.1, -38], -.22)
    shop('timber', [10, 8, 13], [-11, 6.4, -41], -.34)
  }
}
