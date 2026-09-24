import * as THREE from 'three'
import type { CityBuilder, CityFinish } from '../city/CityGeometry'
import type { CitySurface } from '../city/CitySurfaces'
import { buildHanbitTower } from './HanbitTower'

type Point = [number, number, number]

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

// Subdivide broad structural faces so baked contact shade can fall off locally.
function mass(kit: CityBuilder, finish: CityFinish, size: Point, at: Point, surface: CitySurface = 'masonry') {
  kit.add(finish, new THREE.BoxGeometry(...size,
    Math.max(1, Math.ceil(size[0] / 1.8)), Math.max(1, Math.ceil(size[1] / 1.8)), Math.max(1, Math.ceil(size[2] / 1.8)))
    .translate(...at), surface)
}

function glazing(kit: CityBuilder, width: number, height: number, at: Point, missing = false) {
  if (!missing) {
    kit.box('glass', [width - .12, height - .14, .045], at)
    kit.box('glazing', [width * .3, height - .18, .025], [at[0] - width * .23, at[1], at[2] + .03])
  }
  for (const sign of [-1, 1]) {
    kit.box('steel', [.065, height + .1, .13], [at[0] + sign * width / 2, at[1], at[2]])
    kit.box('steel', [width, .085, .13], [at[0], at[1] + sign * height / 2, at[2]])
  }
}

export function buildExpoGallery(kit: CityBuilder) {
  // One displaced upper volume and an unequal lower wing, not repeated office floors.
  const width = 29, depth = 12, roof = 8.7
  mass(kit, 'edge', [width, .45, depth], [0, 2.2, 0])
  mass(kit, 'concrete', [width + 1.4, .48, depth + 1.7], [0, roof, .2])
  mass(kit, 'faded', [width + 1.2, .12, depth + 1.5], [0, roof + .31, .2], 'sheet')
  mass(kit, 'concrete', [width, 6.5, .6], [0, 5.5, -depth / 2])
  mass(kit, 'concrete', [.65, 6.5, depth], [-width / 2, 5.5, 0])
  // Water and exposed interior meet behind the structural front colonnade.
  for (const x of [-13, -7.7, -2.4, 3.8, 12.5]) {
    mass(kit, 'concrete', [.68, 6.1, .92], [x, 5.3, 5.7])
    mass(kit, 'edge', [.8, .16, 1.03], [x, 8.34, 5.7])
    mass(kit, 'edge', [.22, .32, 10.7], [x, 8.15, -.05])
  }
  for (const [x, w, missing] of [[-10.35, 4.55, 0], [-5.05, 4.55, 0], [.7, 5.25, 1], [8.15, 7.65, 1]]) {
    glazing(kit, w, 5.45, [x, 5.45, 3.65], Boolean(missing))
  }
  place(kit, [14.1, 0, -.2], Math.PI / 2, 1, side => {
    for (const x of [-4.7, 0, 4.7]) mass(side, 'concrete', [.5, 6.1, .8], [x, 5.3, 0])
    for (const x of [-2.35, 2.35]) glazing(side, 4.03, 5.4, [x, 5.43, -.7])
    mass(side, 'edge', [9.7, .2, 1.05], [0, 8.2, -.05])
  })
  mass(kit, 'faded', [5.2, 4.4, .35], [6.2, 4.7, -1.8])
  mass(kit, 'concrete', [.4, 5.9, 6.8], [-1.9, 5.1, -.5])
  // A surviving mezzanine edge recedes into a lost-glazing bay.
  mass(kit, 'edge', [7.6, .23, 4], [8.9, 6.35, -3.4])
  kit.box('steel', [7.5, .06, .08], [8.9, 7.18, -1.45])
  for (const x of [5.3, 8.9, 12.5]) kit.box('steel', [.055, .85, .07], [x, 6.77, -1.45])
  for (let i = 0; i < 8; i++) mass(kit, 'concrete', [2.2, .2, .5], [10.9, 4.35 + i * .26, 2.15 - i * .48])

  const upperX = -5.8, upperZ = -1.6, upperWidth = 17
  mass(kit, 'concrete', [upperWidth, .42, 8.4], [upperX, 11.6, upperZ])
  mass(kit, 'faded', [upperWidth - .25, .1, 8.2], [upperX, 11.87, upperZ], 'sheet')
  mass(kit, 'concrete', [upperWidth, 2.15, .4], [upperX, 10.3, -5.6])
  for (const x of [upperX - upperWidth / 2 + .25, upperX + upperWidth / 2 - .25]) {
    mass(kit, 'concrete', [.5, 2.3, 8.4], [x, 10.3, upperZ])
  }
  for (let i = 0; i < 6; i++) glazing(kit, 2.55, 1.85, [upperX + (i - 2.5) * 2.65, 10.31, 2.25])
  mass(kit, 'edge', [upperWidth - .7, .15, .38], [upperX, 9.31, 2.5])
  // Roof drainage and joints are sparse, set back from the visible silhouette.
  for (const x of [-11.8, -3.2, 5.4]) kit.box('edge', [.025, .025, 4.4], [x, 9.09, 4.05], undefined, 'sheet')
  kit.box('steel', [.16, 5.2, .17], [-13.55, 6.13, 4.8], undefined, 'sheet')
  mass(kit, 'paint', [6.2, .14, 3.8], [10.6, 8.1, 6.5], 'sheet')
  for (const x of [8.1, 13.1]) kit.beam('steel', [x, 7.65, 5.5], [x, 8.02, 7.9], .1)
}

export function buildExpoAnnex(kit: CityBuilder) {
  mass(kit, 'concrete', [13.8, .38, 8.4], [0, 6.7, 0])
  mass(kit, 'faded', [13.5, .1, 8.1], [0, 6.96, 0], 'sheet')
  mass(kit, 'concrete', [12.8, 4.5, .45], [0, 4.25, -3.6])
  mass(kit, 'paint', [.45, 4.5, 7.2], [-6.25, 4.25, 0], 'masonry')
  for (const x of [-5.85, -1.95, 1.95, 5.85]) mass(kit, 'concrete', [.42, 4.3, .6], [x, 4.4, 3.5])
  for (const x of [-3.9, 0, 3.9]) glazing(kit, 3.36, 3.7, [x, 4.5, 2.35], x === 0)
  mass(kit, 'edge', [12.6, .3, 7.1], [0, 2.2, 0])
  mass(kit, 'concrete', [4.2, 1.5, 4], [2.9, 7.63, -1.6])
  kit.box('steel', [3.3, .8, .06], [2.9, 7.67, .43])
  for (let i = 0; i < 4; i++) kit.box('edge', [3.4, .045, .13], [2.9, 7.38 + i * .19, .47])
}

function drownedPlazaEdge(kit: CityBuilder) {
  const outline = new THREE.Shape()
  outline.absarc(0, 0, 10.6, Math.PI * 1.14, Math.PI * 1.6, false)
  outline.absarc(0, 0, 10.2, Math.PI * 1.6, Math.PI * 1.14, true)
  outline.closePath()
  kit.add('edge', new THREE.ExtrudeGeometry(outline, { depth: 1.26, bevelEnabled: false, curveSegments: 40 })
    .rotateX(-Math.PI / 2).translate(0, 3.25, 0), 'masonry')
}

function connectingGallery(kit: CityBuilder) {
  mass(kit, 'concrete', [18, .32, 7], [0, 6.55, 0])
  mass(kit, 'faded', [17.8, .1, 6.8], [0, 6.78, 0], 'sheet')
  mass(kit, 'edge', [17, 4.4, .4], [0, 4.15, -3])
  for (const x of [-8, -3, 2, 8]) mass(kit, 'concrete', [.36, 4.3, .65], [x, 4.15, 2.7])
  for (const [x, w] of [[-5.5, 4.5], [-.5, 4.5], [5, 5.5]]) glazing(kit, w, 3.7, [x, 4.25, 1.7])
}

export function buildExpoNeighborhood(kit: CityBuilder, portrait = false) {
  if (portrait) {
    place(kit, [-4.2, 1.1, -3], -.68, .55, buildExpoGallery)
    place(kit, [10.5, .95, -27], -.28, .65, buildExpoAnnex)
    place(kit, [-8.8, 1.1, -24], -.36, .7, buildExpoAnnex)
    place(kit, [.8, .85, -29], -.18, .62, connectingGallery)
    place(kit, [5.5, 1.06, -19], 0, .75, drownedPlazaEdge)
  } else {
    place(kit, [-18, 0, 2], -.68, 1, buildExpoGallery)
    place(kit, [33, 0, -24], -.16, 1, buildExpoAnnex)
    place(kit, [-29, .5, -25], -.36, .9, buildExpoAnnex)
    place(kit, [2.5, 0, -29], -.22, 1, connectingGallery)
    place(kit, [16, 0, -22], 0, 1, drownedPlazaEdge)
  }
}

export function buildExpoLandmark(kit: CityBuilder, portrait = false) {
  place(kit, portrait ? [5.5, 1.06, -19] : [16, 0, -22], -.2, portrait ? .75 : 1, buildHanbitTower)
}
