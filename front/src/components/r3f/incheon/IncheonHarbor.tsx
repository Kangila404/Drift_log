import * as THREE from 'three'
import HarborGeometry, { type HarborBuilder } from './HarborGeometry'

type Point = [number, number, number]
type Outline = [number, number][]
type Finish = Parameters<HarborBuilder['box']>[0]

function oriented(kit: HarborBuilder, pivot: Point, yaw: number): HarborBuilder {
  const matrix = new THREE.Matrix4().makeTranslation(...pivot)
    .multiply(new THREE.Matrix4().makeRotationY(yaw))
    .multiply(new THREE.Matrix4().makeTranslation(-pivot[0], -pivot[1], -pivot[2]))
  const at = (point: Point): Point => new THREE.Vector3(...point).applyMatrix4(matrix).toArray() as Point
  const add: HarborBuilder['add'] = (finish, geometry) => kit.add(finish, geometry.applyMatrix4(matrix))
  return {
    add,
    box(finish, size, position, rotation = [0, 0, 0]) {
      const geometry = new THREE.BoxGeometry(...size)
      geometry.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...rotation)))
      geometry.translate(...position)
      add(finish, geometry)
    },
    beam: (finish, from, to, width, depth) => kit.beam(finish, at(from), at(to), width, depth),
  }
}

function solid(kit: HarborBuilder, finish: Finish, outline: Outline, depth: number, position: Point, rotation: Point = [0, 0, 0], horizontal = false) {
  const shape = new THREE.Shape()
  outline.forEach(([x, y], index) => {
    const v = horizontal ? -y : y
    if (index) shape.lineTo(x, v)
    else shape.moveTo(x, v)
  })
  shape.closePath()
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth, steps: 1, bevelEnabled: true, bevelSegments: 1,
    bevelSize: .045, bevelThickness: .035, curveSegments: 1,
  })
  if (horizontal) geometry.rotateX(-Math.PI / 2)
  geometry.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...rotation)))
  geometry.translate(...position)
  kit.add(finish, geometry)
}

function slab(kit: HarborBuilder, finish: Finish, outline: Outline, depth: number, position: Point, tilt: Point = [0, 0, 0]) {
  // Footprints are in X/Z; extrusion gives the broken surfaces actual thickness.
  solid(kit, finish, outline, depth, position, tilt, true)
}

function cylinder(kit: HarborBuilder, finish: Finish, from: Point, to: Point, radius: number, segments = 16) {
  const start = new THREE.Vector3(...from), end = new THREE.Vector3(...to)
  const direction = end.clone().sub(start)
  const geometry = new THREE.CylinderGeometry(radius, radius, direction.length(), segments)
  geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()))
  geometry.translate(...start.add(end).multiplyScalar(.5).toArray())
  kit.add(finish, geometry)
}

function iBeam(kit: HarborBuilder, from: Point, to: Point, width: number, depth: number) {
  const start = new THREE.Vector3(...from), end = new THREE.Vector3(...to)
  const length = end.distanceTo(start)
  const rotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(start).normalize())
  const center = start.add(end).multiplyScalar(.5)
  for (const z of [-1, 0, 1]) {
    const geometry = new THREE.BoxGeometry(z ? width : .16, length, z ? .16 : depth)
    geometry.translate(0, 0, z * depth / 2).applyQuaternion(rotation).translate(...center.toArray())
    kit.add(z ? 'steel' : 'rust', geometry)
  }
}

function hose(kit: HarborBuilder, finish: Finish, points: Point[], radius: number, segments = 20) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)))
  kit.add(finish, new THREE.TubeGeometry(curve, segments, radius, 5, false))
}

function tornCanvas(kit: HarborBuilder) {
  const columns = 20, rows = 14
  const vertices: number[] = [], indices: number[] = []
  // A salvaged cover still hangs from two roof fixings; gravity shapes the folds.
  for (let row = 0; row <= rows; row++) {
    const v = row / rows
    for (let col = 0; col <= columns; col++) {
      const u = col / columns
      const hem = .2 * Math.sin(u * 17) + .1 * Math.sin(u * 39)
      vertices.push(
        13.12 + u * 3.5 + v * v * .16 * Math.sin(v * 8 + u * 5),
        8.1 - v * (2.22 + hem) - .49 * Math.sin(Math.PI * u) * (1 - v),
        -2.72 + .46 * Math.sin(Math.PI * u) * Math.sin(v * Math.PI * .8)
          + .095 * Math.sin(u * 28 + v * 2) * Math.sin(v * Math.PI / 2),
      )
    }
  }
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      if ((col > 15 && row > 8 + (columns - col) * .7) || (col === 13 && row > 10)) continue
      const a = row * (columns + 1) + col, b = a + columns + 1
      indices.push(a, b, a + 1, a + 1, b, b + 1)
      indices.push(a + 1, b, a, b + 1, b, a + 1)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  // Separate both faces before normal generation so their normals cannot cancel.
  const faces = geometry.toNonIndexed()
  geometry.dispose()
  faces.computeVertexNormals()
  kit.add('faded', faces)
  for (const x of [13.12, 16.62]) cylinder(kit, 'steel', [x, 8.1, -2.86], [x, 8.1, -2.63], .1, 8)
}

function corrugatedRoof(kit: HarborBuilder, finish: Finish, position: Point, width: number, depth: number, rotation: Point) {
  const count = Math.round(width / .43)
  const pitch = width / count
  const transform = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...rotation)).setPosition(...position)
  for (let i = 0; i < count; i++) {
    const center = (i + .5) / count
    const loss = .14 + 1.25 * Math.exp(-Math.pow((center - .58) / .19, 2))
      + .16 * (1 + Math.sin(i * 2.7))
    // Thick trapezoidal folds produce alternating faces and a visibly torn eave.
    const profile = new THREE.Shape()
    const points = [[0, 0], [pitch * .23, 0], [pitch * .4, .17], [pitch * .7, .17],
      [pitch * .87, 0], [pitch, 0], [pitch, -.12], [pitch * .8, -.12],
      [pitch * .63, .05], [pitch * .46, .05], [pitch * .3, -.12], [0, -.12]]
    points.forEach(([x, y], index) => index ? profile.lineTo(x, y) : profile.moveTo(x, y))
    profile.closePath()
    const geometry = new THREE.ExtrudeGeometry(profile, { depth: depth - loss, bevelEnabled: false, steps: 10 })
    geometry.translate(-width / 2 + i * pitch, 0, -depth / 2)
    const vertices = geometry.getAttribute('position')
    for (let vertex = 0; vertex < vertices.count; vertex++) {
      const x = vertices.getX(vertex), z = vertices.getZ(vertex)
      const u = x / width + .5, v = (z + depth / 2) / depth
      const sag = Math.sin(Math.PI * u) * Math.sin(Math.PI * v)
      const tear = Math.pow(v, 4) * Math.sin(u * 11 + .6)
      vertices.setXYZ(vertex, x + .15 * v * v * Math.sin(u * 9),
        vertices.getY(vertex) - Math.min(.95, depth * .105) * sag
          + .48 * tear + .07 * Math.sin(v * 12 + u * 4) * sag,
        z + .19 * Math.pow(v, 3) * Math.sin(u * 17))
    }
    geometry.computeVertexNormals()
    geometry.applyMatrix4(transform)
    kit.add(i % 9 === 3 ? 'rust' : finish, geometry)
  }
}

function warehouse(kit: HarborBuilder) {
  slab(kit, 'concrete', [
    [11.9, -18.7], [25.8, -18.2], [26.3, -6], [24.8, -2.1],
    [21, -1.6], [20.4, -.5], [16.2, -.9], [15.6, -2.2], [12.6, -2.6],
  ], 1.2, [0, 3.15, 0])
  kit.box('rust', [7.1, .27, .38], [20.3, 4.48, -1.6], [0, -.07, .015])

  // Thick walls surround a flooded interior and unequal loading bays.
  kit.box('concrete', [11.9, 4.4, .65], [19, 5.6, -16.7])
  kit.box('faded', [.65, 4.3, 13.3], [24.6, 5.55, -10])
  kit.box('concrete', [.65, 4.1, 10.3], [13.4, 5.45, -11.4])
  kit.box('dark', [10.5, .3, 12], [19, 4.35, -10])
  solid(kit, 'concrete', [
    [0, 0], [3.5, 0], [3.5, 1.1], [3.28, 1.57], [3.41, 1.83],
    [3.02, 2.1], [2.84, 2.65], [2.51, 2.86], [2.63, 3.17],
    [2.26, 3.64], [2.35, 4.15], [1.62, 4.06], [.96, 4.17], [0, 4.15],
  ], .7, [13.1, 3.6, -3.5])
  kit.box('dark', [1.3, 3.8, .38], [20.7, 5.5, -3.39])
  solid(kit, 'concrete', [[0, 1.5], [.3, 1.2], [.58, 1.6], [.86, 1.35], [1.3, 1.8], [1.3, 3.8], [0, 3.8]],
    .65, [20.05, 3.6, -3.57])
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 3; col++) {
      solid(kit, (row + col) % 3 ? 'rust' : 'concrete', [[0, 0], [.32, 0], [.35, .2], [.25, .25], [0, .23]],
        .26, [20.09 + col * .39 + (row % 2) * .06, 4.3 + row * .29, -3.04])
    }
  }
  kit.box('faded', [2.2, 2.45, .65], [23.45, 4.825, -3.25])
  kit.box('faded', [2.2, .65, .65], [23.45, 7.475, -3.25])
  for (const x of [22.56, 24.34]) kit.box('faded', [.42, 1.1, .65], [x, 6.6, -3.25])
  kit.box('dark', [1.4, 1.1, .15], [23.45, 6.6, -3.47])
  kit.box('glass', [1.16, .84, .13], [23.45, 6.6, -3.33])
  kit.box('steel', [.2, 1.05, .25], [23.45, 6.6, -3.11])
  kit.box('concrete', [1.6, .23, .85], [23.45, 6.03, -3.12])
  kit.box('concrete', [8.2, .7, .75], [20.6, 7.55, -3.25])
  for (const [x, width, shutterHeight] of [[18.35, 3.1, 1.25], [21.85, 1.35, 2.1]]) {
    kit.box('dark', [width, 2.85, .16], [x, 5.7, -3.95])
    for (const side of [-1, 1]) {
      kit.box('rust', [.22, 2.9, .75], [x + side * (width / 2 - .1), 5.7, -3.34])
      kit.box(x < 20 ? 'trim' : 'concrete', [.32, 3.1, .24], [x + side * (width / 2 + .08), 5.7, -2.87])
    }
    kit.box('steel', [width + .3, .35, .72], [x, 7.12, -3.3])
    if (x < 20) kit.box('trim', [width + .35, .16, .17], [x, 7.38, -2.87])
    cylinder(kit, 'rust', [x - width / 2, 7.22, -3.18], [x + width / 2, 7.22, -3.18], .24)
    const rows = Math.ceil(shutterHeight / .27)
    for (let row = 0; row < rows; row++) {
      kit.box(row % 4 === 0 ? 'steel' : 'paint', [width - .35, .23, .19], [x, 6.91 - row * .27, -3.48])
    }
    kit.box('rust', [width - .3, .19, .32], [x, 6.83 - (rows - 1) * .27, -3.4])
    kit.box('concrete', [width + .2, .25, 1.05], [x, 4.48, -2.98])
  }
  kit.box('rust', [.52, 1.5, .09], [14.1, 5.5, -2.98], [0, 0, -.08])
  kit.box('rust', [.3, 2.1, .08], [24.97, 5.9, -7.8], [0, Math.PI / 2, .04])

  corrugatedRoof(kit, 'steel', [19, 8.02, -10], 11.9, 14, [0, 0, -.025])
  corrugatedRoof(kit, 'rust', [18.1, 6.65, -4.3], 4.6, 4.4, [.32, .13, -.28])
  tornCanvas(kit)
  iBeam(kit, [16.2, 7.4, -6.8], [18.8, 5.1, -2.7], .55, .6)
  iBeam(kit, [16.5, 7.56, -3], [24.6, 7.56, -3], .5, .65)
  iBeam(kit, [16.55, 4.45, -3.15], [16.3, 7.8, -3.5], .45, .55)
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 5; col++) {
      if (col + row > 8 || (row === 3 && col === 4)) continue
      const x = 14.05 + col * .43 + (row % 2) * .19
      solid(kit, (row + col) % 4 === 0 ? 'concrete' : 'rust',
        [[0, 0], [.37, 0], [.39, .14], [.29, .23], [0, .23]], .19,
        [x, 4.65 + row * .31, -2.85])
    }
  }
  for (let i = 0; i < 13; i++) {
    slab(kit, i % 3 ? 'concrete' : 'rust', [[-.3, -.2], [.25, -.28], [.42, .1], [.1, .34], [-.35, .15]],
      .24 + (i % 3) * .12, [13.5 + (i % 5) * .57, 4.32, -2.2 + Math.floor(i / 5) * .43], [.1, i * .71, .08])
  }
  // Open gutters, a separated broken downpipe, and service fittings are readable at street scale.
  for (const x of [13.05, 24.98]) {
    kit.box('dark', [.44, .13, 10.8], [x, 7.8, -10.8])
    kit.box('steel', [.14, .34, 10.8], [x + (x < 19 ? -.22 : .22), 7.9, -10.8])
  }
  cylinder(kit, 'rust', [25.05, 7.8, -6], [25.05, 5.65, -6], .17)
  cylinder(kit, 'steel', [25.05, 5.4, -6], [25.4, 4.5, -5.7], .17)
  hose(kit, 'steel', [[24.8, 7.82, -3.2], [24.92, 7.61, -2.92],
    [24.96, 7.39, -2.86]], .12, 8)
  cylinder(kit, 'steel', [24.96, 7.39, -2.86], [24.96, 5.4, -2.86], .12, 10)
  hose(kit, 'rust', [[24.96, 5.4, -2.86], [24.98, 5.26, -2.84],
    [25.13, 5.11, -2.66], [25.29, 5.05, -2.45]], .12, 8)
  for (const y of [6.1, 7.1]) kit.box('steel', [.32, .13, .32], [24.92, y, -2.94])
  for (const y of [6.2, 7.3]) kit.box('steel', [.42, .17, .48], [25.01, y, -6])
  kit.box('dark', [1.2, 1.15, .2], [23.5, 5.1, -2.85])
  kit.box('faded', [1.02, .95, .4], [23.5, 5.12, -2.64])
  kit.box('steel', [.17, .34, .16], [23.82, 5.13, -2.36])
  kit.beam('rust', [23.1, 5.5, -2.65], [22.85, 6.3, -2.65], .17)
  kit.box('dark', [1.6, .1, .6], [20.2, 4.4, -1.8])
  for (let i = 0; i < 6; i++) kit.box('steel', [.16, .13, .65], [19.55 + i * .25, 4.48, -1.8])
  kit.box('concrete', [2.2, .65, 2.5], [22.1, 8.53, -13.6])
  kit.box('dark', [1.65, .13, 1.8], [22.1, 8.91, -13.6])

  // The lower annex has folded into the water beside the main warehouse.
  solid(kit, 'concrete', [[0, 0], [4.7, 0], [4.7, 1.7], [3.9, 1.1], [3, 2.1], [0, 2.5]],
    .55, [5.5, 3.1, -7.5])
  kit.box('concrete', [.65, 2.3, 3.1], [5.8, 4.1, -5.7])
  corrugatedRoof(kit, 'faded', [7.8, 5.3, -4.5], 5, 5, [.09, -.08, -.15])
  corrugatedRoof(kit, 'steel', [9.8, 4.6, -2.1], 3.7, 2.9, [.21, .3, -.32])
  kit.box('concrete', [1.2, .7, 1.4], [12.1, 4.25, -1.1], [.08, .38, .12])
  hose(kit, 'rust', [[10.3, 5.06, -2.6], [11.15, 4.68, -1.9], [11.63, 4.4, -.95],
    [10.8, 4.32, -.26], [10.11, 4.35, -.88], [10.67, 4.43, -1.15]], .12, 26)
}

function container(kit: HarborBuilder, position: Point, rotation: Point, finish: Finish, open: boolean) {
  const transform = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...rotation))
  transform.setPosition(...position)
  // Apply the same impact field to shell, ribs and fittings so dents remain connected.
  const add: HarborBuilder['add'] = (material, geometry) => {
    const vertices = geometry.getAttribute('position')
    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i), y = vertices.getY(i), z = vertices.getZ(i)
      const dent = Math.exp(-Math.pow((x + .7) / 1.15, 2))
      const sideDent = dent * Math.exp(-Math.pow((y - .15) / .9, 2))
      vertices.setXYZ(i, x + .1 * dent * Math.sin(y * 2),
        y - .42 * dent * Math.max(0, (y + .8) / 2),
        z - Math.sign(z) * .36 * sideDent + .085 * Math.sin(x * 1.15) * (y + 1) / 2)
    }
    geometry.computeVertexNormals()
    kit.add(material, geometry.applyMatrix4(transform))
  }
  const shell: HarborBuilder = { ...kit, add }
  const box = (material: Finish, size: Point, at: Point, yaw = 0) => {
    const panel = size[0] > 4
    const geometry = new THREE.BoxGeometry(...size, panel ? 14 : 1, panel && size[1] > 1 ? 4 : 1, panel && size[2] > 2 ? 4 : 1)
    geometry.rotateY(yaw)
    geometry.translate(...at)
    add(material, geometry)
  }
  // Hollow shells leave visible interiors behind the hinged doors.
  box('dark', [5.6, .14, 2.35], [0, -1.05, 0])
  box(finish, [5.8, .18, 2.45], [0, 1.06, 0])
  box(finish, [.16, 2.15, 2.45], [-2.82, 0, 0])
  for (const side of [-1, 1]) {
    box(finish, [5.8, 2.15, .14], [0, 0, side * 1.15])
    box('rust', [5.8, .17, .19], [0, -.94, side * 1.16])
    box('steel', [5.8, .17, .22], [0, 1, side * 1.17])
    for (let rib = 0; rib < 14; rib++) {
      const x = -2.6 + rib * .4
      slab(shell, finish, [[-.17, 0], [-.09, side * .12], [.09, side * .12], [.17, 0]],
        1.83, [x, -.91, side * 1.22])
    }
    box('rust', [.75, .55, .16], [-1.45, -.45, side * 1.37])
    box('faded', [.85, .32, .16], [.7, .44, side * 1.37])
  }
  for (let rib = 0; rib < 14; rib++) box(finish, [.2, .14, 2.13], [-2.6 + rib * .4, 1.2, 0])
  for (const x of [-2.76, 2.76]) {
    for (const z of [-1.14, 1.14]) {
      box('steel', [.23, 2.12, .25], [x, 0, z])
      for (const y of [-.94, 1.01]) {
        solid(shell, 'faded', [[-.18, -.15], [.18, -.15], [.18, .1], [.1, .18], [-.18, .18]], .31, [x, y, z - .15])
        box('dark', [.15, .12, .06], [x, y, z + Math.sign(z) * .19])
      }
    }
  }
  box('dark', [.09, 2, 2.13], [-2.7, 0, 0])
  for (const side of [-1, 1]) {
    const angle = side === 1 && open ? -1.12 : 0
    const doorX = 2.86 - Math.sin(angle) * side * .56
    const doorZ = side * 1.13 - Math.cos(angle) * side * .56
    const doorBox = (material: Finish, size: Point, at: Point) => box(material, size,
      [doorX + Math.cos(angle) * at[0] + Math.sin(angle) * at[2], at[1],
        doorZ - Math.sin(angle) * at[0] + Math.cos(angle) * at[2]], angle)
    doorBox(finish, [.14, 2.1, 1.12], [0, 0, 0])
    for (const z of [-.35, 0, .35]) doorBox(finish, [.14, 1.7, .16], [.13, 0, z])
    for (const z of [-.27, .27]) {
      doorBox('steel', [.16, 1.95, .13], [.24, 0, z])
      for (const y of [-.73, .65]) doorBox('trim', [.22, .22, .26], [.25, y, z])
      doorBox('rust', [.18, .14, .34], [.33, -.25, z + .08])
    }
    for (const y of [-.78, 0, .78]) doorBox('rust', [.26, .23, .33], [.1, y, side * .47])
    for (const y of [-1, 1]) doorBox('steel', [.19, .15, 1.14], [.08, y, 0])
  }
}

function crane(kit: HarborBuilder) {
  slab(kit, 'concrete', [[-4.5, -3.7], [4, -3.5], [4.8, 2.8], [1.6, 3.8], [-4, 3.1]],
    1.05, [18, 3.35, -34])
  for (const side of [-1, 1]) {
    const z = -34 + side * 2.15
    kit.box('dark', [7.4, .8, 1.1], [18, 4.65, z])
    kit.beam('paint', [14.9, 4.9, z], [16.8, 11.7, z - side * .5], .92, .95)
    kit.beam('paint', [21.1, 4.9, z], [19.3, 11.7, z - side * .5], 1.05, .95)
    kit.beam('steel', [16, 8.1, z], [20, 8.1, z], .52, .62)
    kit.beam('rust', [16, 8.1, z], [19.3, 11.5, z - side * .5], .34, .4)
  }
  kit.box('steel', [6.1, .8, 4.9], [18, 11.8, -34])
  cylinder(kit, 'rust', [18, 11.95, -34], [18, 12.35, -34], 2.1, 32)
  cylinder(kit, 'steel', [18, 12.36, -34], [18, 12.55, -34], 1.85, 32)
  kit.box('paint', [3.9, 2.3, 3.5], [19.15, 13.15, -34.25])
  kit.box('faded', [4.1, .25, 3.7], [19.15, 14.4, -34.25])
  // A projecting cab separates the operator's space from the machinery housing.
  const cabBox = (finish: Finish, size: Point, at: Point) => kit.box(finish, size, [at[0] - 1, at[1], at[2] + 2.2])
  cabBox('paint', [2.1, .85, 2.45], [15.85, 12.12, -32.95])
  cabBox('dark', [1.82, .16, 2.16], [15.85, 12.62, -32.95])
  cabBox('glazing', [1.8, 1.25, .14], [15.85, 13.29, -31.8])
  cabBox('glazing', [.14, 1.25, 2.15], [14.85, 13.29, -32.95])
  cabBox('glazing', [.14, 1.25, 2.15], [16.85, 13.29, -32.95])
  for (const x of [14.8, 15.85, 16.9]) cabBox('trim', [.2, 1.45, .24], [x, 13.3, -31.7])
  for (const x of [14.8, 16.9]) {
    cabBox('steel', [.18, 1.45, .18], [x, 13.3, -34.13])
    cabBox('steel', [.17, 1.45, .2], [x, 13.3, -32.95])
  }
  cabBox('faded', [2.8, .26, 3.1], [15.85, 14.07, -32.8])
  cabBox('steel', [2.4, .18, 2.8], [15.85, 12.56, -32.85])
  cabBox('rust', [.18, .38, .32], [14.67, 12.23, -32.7])
  kit.box('steel', [3.4, .29, 3.3], [15.5, 11.65, -31.1])
  kit.beam('paint', [16.4, 10.8, -32.7], [14.8, 11.65, -29.8], .32, .4)
  kit.box('rust', [1, .6, .1], [19.9, 12.7, -32.44])
  for (let layer = 0; layer < 4; layer++) {
    kit.box(layer % 2 ? 'concrete' : 'faded', [2.7, .44, 3.15], [22, 12.18 + layer * .51, -35])
  }
  kit.box('steel', [.25, 2.2, 3.35], [23.45, 12.95, -35])
  kit.box('dark', [1.8, 1.1, .25], [19.7, 13.22, -32.43])
  for (let vent = 0; vent < 5; vent++) kit.box('steel', [1.65, .13, .23], [19.7, 12.78 + vent * .22, -32.22], [.2, 0, 0])
  kit.box('rust', [1.2, .7, 1.6], [20, 14.8, -34.1])
  cylinder(kit, 'steel', [20.1, 14.6, -34], [20.1, 15.3, -34], .26)
  kit.box('faded', [.8, .17, .65], [20.1, 15.35, -34])
  kit.box('steel', [6.3, .2, 1.05], [18.2, 11.93, -31.15])
  for (const x of [16.85, 19.1, 21.25]) kit.box('rust', [.17, .95, .17], [x, 12.5, -30.68])
  kit.beam('steel', [16.85, 12.95, -30.68], [21.25, 12.95, -30.68], .16)
  for (const x of [20.55, 21.35]) kit.beam('rust', [x, 4.65, -31.1], [x, 12.2, -31.1], .19)
  for (let rung = 0; rung < 16; rung++) kit.box('steel', [.98, .17, .3], [20.95, 4.8 + rung * .46, -31.1])
  for (const side of [-1, 1]) {
    for (const x of [15.4, 18, 20.6]) cylinder(kit, 'rust', [x, 4.67, -34 + side * 2.6], [x, 4.67, -34 + side * 2.86], .43)
  }

  // Solid articulated boom with only the necessary thick support webs.
  kit.beam('paint', [17.4, 13.1, -34], [11.3, 15.65, -33], .95, 1.25)
  kit.beam('steel', [11.3, 15.65, -33], [6.2, 12.6, -30.8], .68, .85)
  for (const [x, y, z, radius] of [[17.4, 13.1, -34, .67], [11.3, 15.65, -33, .65], [6.2, 12.6, -30.8, .44]]) {
    cylinder(kit, 'rust', [x, y, z - .82], [x, y, z + .82], radius, 20)
    for (const side of [-1, 1]) cylinder(kit, 'trim', [x, y, z + side * .82], [x, y, z + side * 1.02], radius * .46)
  }
  cylinder(kit, 'rust', [18, 12.65, -32.95], [15.1, 13.96, -32.38], .36, 20)
  cylinder(kit, 'trim', [15.1, 13.96, -32.38], [12.25, 15.26, -31.83], .24, 20)
  cylinder(kit, 'steel', [12.7, 15.8, -32.12], [10.5, 14.97, -31.38], .3, 20)
  cylinder(kit, 'trim', [10.5, 14.97, -31.38], [8.05, 13.56, -30.65], .21, 20)
  cylinder(kit, 'dark', [15.2, 13.91, -32.36], [14.91, 14.04, -32.3], .42)
  hose(kit, 'dark', [[18, 13.1, -32.5], [17.35, 12.85, -31.95],
    [15.6, 13.35, -31.85], [13.5, 14.38, -31.5], [11.6, 15.32, -31.85]], .13)
  hose(kit, 'steel', [[11.75, 15.58, -31.91], [11.3, 15.94, -31.65],
    [10.7, 15.72, -31.3], [10.9, 14.93, -31.23]], .1, 16)
  kit.beam('dark', [18.5, 14.4, -34.4], [15, 16, -34], .45, .65)
  kit.beam('steel', [15, 16, -34], [11.3, 15.65, -33], .3, .4)
  hose(kit, 'steel', [[15, 16, -34], [16.4, 14.7, -34.12],
    [18.55, 13.65, -34.38], [20.6, 14.1, -34.5]], .115)
  cylinder(kit, 'dark', [17.1, 14.3, -34.9], [17.1, 14.3, -33.3], .58, 24)
  for (const z of [-34.95, -33.25]) cylinder(kit, 'steel', [17.1, 14.3, z - .1], [17.1, 14.3, z + .1], .77, 24)
  for (let wrap = 0; wrap < 7; wrap++) {
    const ring = new THREE.TorusGeometry(.59, .075, 6, 24)
    ring.translate(17.1, 14.3, -34.78 + wrap * .22)
    kit.add('cable', ring)
  }
  kit.beam('cable', [17.1, 14.85, -33.9], [11.3, 16.2, -33], .12)
  kit.beam('cable', [11.3, 16.2, -33], [6.2, 13, -30.8], .12)
  for (const x of [6.04, 6.36]) kit.beam('cable', [x, 12.5, -30.8], [x, 6.6, -30.8], .12)
  cylinder(kit, 'rust', [6.2, 6.5, -31.09], [6.2, 6.5, -30.51], .43, 20)
  kit.box('paint', [.8, .75, .2], [6.2, 6.5, -30.4])
  hose(kit, 'steel', [[6.2, 6.07, -30.76], [6.2, 5.74, -30.76],
    [6.4, 5.49, -30.76], [6.39, 5.2, -30.76], [6.08, 5.16, -30.76],
    [5.91, 5.4, -30.76]], .14, 22)
}

function buildings(kit: HarborBuilder) {
  const masses: [number, number, number, number, number, Finish][] = [
    [-25, -96, 5.4, 7, 11.8, 'concrete'],
    [-17.8, -105, 6.7, 5.2, 17.6, 'faded'],
    [-12.6, -94, 4.1, 6.1, 8.5, 'steel'],
    [-26.1, -114, 3.8, 7.7, 15.1, 'steel'],
    [-20.7, -123, 7.3, 4.6, 10.3, 'concrete'],
    [30.5, -130, 6.4, 8.1, 13.8, 'faded'],
    [34.6, -137, 3.9, 5.3, 8.7, 'concrete'],
  ]
  masses.forEach(([x, z, width, depth, height, finish], index) => {
    const facade = z + depth / 2
    const floors = Math.max(2, Math.floor((height - 3) / 2.65))
    const floorHeight = (height - 3) / floors
    const columns = index % 3 === 0 ? 3 : 2
    const bay = width / columns
    // Set the core behind the window planes; floor bands and piers form actual recesses.
    kit.box(finish, [width - .5, height - 3, depth - .65], [x + .25, (height + 3) / 2, z - .325])
    for (let floor = 0; floor < floors; floor++) {
      const y = 3 + floor * floorHeight
      kit.box(finish, [width, floorHeight * .42, .65], [x, y + floorHeight * .21, facade - .325])
      kit.box(finish, [.5, floorHeight * .42, depth], [x - width / 2 + .25, y + floorHeight * .21, z])
      if ((floor + index) % 2 === 0) {
        kit.box('concrete', [width + .22, .23, .72], [x, y + floorHeight * .42, facade - .12])
        kit.box('steel', [.64, .23, depth * .73], [x - width / 2 + .12, y + floorHeight * .42, z + depth * .1])
      }
      const windowY = y + floorHeight * .7
      const windowHeight = floorHeight * .48
      for (let col = 0; col < columns; col++) {
        const center = x - width / 2 + (col + .5) * bay
        kit.box('dark', [bay - .42, windowHeight, .15], [center, windowY, facade - .49])
        if ((floor * 2 + col + index) % 4 !== 0) {
          kit.box('glass', [bay - .64, windowHeight - .24, .13], [center, windowY, facade - .38])
        } else {
          kit.box('rust', [bay * .43, windowHeight * .62, .14], [center - .15, windowY - .1, facade - .31], [0, 0, .11])
        }
        kit.box(finish, [.42, floorHeight * .58, .65], [center - bay / 2 + .21, y + floorHeight * .71, facade - .325])
        if (bay > 2.1) kit.box('steel', [.19, windowHeight, .23], [center + .1, windowY, facade - .26])
      }
      kit.box(finish, [.36, floorHeight * .58, .65], [x + width / 2 - .18, y + floorHeight * .71, facade - .325])
      const sideBays = index % 2 ? 2 : 3
      for (let col = 0; col < sideBays; col++) {
        const sideZ = z - depth / 2 + (col + .5) * depth / sideBays
        kit.box('dark', [.14, windowHeight, depth / sideBays - .52], [x - width / 2 + .38, windowY, sideZ])
        kit.box('glass', [.13, windowHeight - .25, depth / sideBays - .76], [x - width / 2 + .27, windowY, sideZ])
        kit.box(finish, [.5, floorHeight * .58, .52], [x - width / 2 + .25, y + floorHeight * .71, sideZ - depth / sideBays / 2 + .26])
      }
    }
    kit.box('concrete', [width + .3, .32, depth + .28], [x, height + .03, z])
    kit.box('dark', [width - .55, .15, depth - .55], [x, height + .24, z])
    kit.box(finish, [width * .43, .95, depth * .38], [x + .3, height + .65, z - .4])
    kit.box('steel', [width * .47, .2, depth * .43], [x + .3, height + 1.2, z - .4])
  })
  kit.box('concrete', [9.5, 3.1, 5.3], [-19.5, 4.9, -94.8])
  slab(kit, 'steel', [[-4.8, -2.8], [4.8, -2.8], [4.6, 2.7], [1.2, 2.7], [.3, 1.7], [-4.8, 2.5]],
    .25, [-19.5, 6.48, -94.8], [0, .04, -.035])
}

function buildHarbor(kit: HarborBuilder) {
  // City-local water Y=4.25; the central X=-4..5 channel stays open.
  warehouse(oriented(kit, [19, 0, -10], .12))
  container(kit, [15.7, 4.05, 6.2], [.04, -.24, -.08], 'paint', true)
  container(kit, [9.5, 3.9, 10.5], [.13, .4, .09], 'rust', true)
  container(kit, [18.3, 4.15, 12], [-.08, -.61, -.12], 'faded', false)
  slab(kit, 'concrete', [[-3.6, -2], [3.3, -2.5], [3.8, .4], [1.7, 1.6], [-2.8, 1.3]],
    .65, [16.8, 3.65, 5.5])
  kit.box('rust', [.45, .55, .5], [21.9, 4.65, -1.4])
  kit.box('steel', [.8, .18, .5], [21.9, 4.95, -1.4])
  crane(oriented(kit, [18, 0, -34], -.16))
  buildings(kit)
}

export default function IncheonHarbor() {
  return <HarborGeometry build={buildHarbor} name="Incheon abandoned harbor" />
}
