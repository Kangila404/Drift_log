import * as THREE from 'three'
import type { CityBuilder, CityFinish } from '../city/CityGeometry'
import type { CitySurface } from '../city/CitySurfaces'

const TURN = Math.PI / 4
const HALF_FACE = Math.tan(Math.PI / 8)
const WALL = .38
const PROFILE = [[.28, 3.3], [4.4, 2.35], [8.6, 1.88], [13.7, 1.66], [20.1, 1.6]] as const
const WINDOWS = [5.5, 11, 17.6] as const
const WINDOW_WIDTH = .72
const WINDOW_HEIGHT = [1.7, 1.7, 1.5] as const

function apothem(y: number): number {
  for (let i = 1; i < PROFILE.length; i++) {
    const [low, a] = PROFILE[i - 1], [high, b] = PROFILE[i]
    if (y <= high) return THREE.MathUtils.lerp(a, b, (y - low) / (high - low))
  }
  return PROFILE[PROFILE.length - 1][1]
}

function rectangle(x: number, y: number, width: number, height: number): THREE.Shape {
  return new THREE.Shape([
    new THREE.Vector2(x - width / 2, y), new THREE.Vector2(x + width / 2, y),
    new THREE.Vector2(x + width / 2, y + height), new THREE.Vector2(x - width / 2, y + height),
  ])
}

function doorOutline(): THREE.Shape {
  const shape = new THREE.Shape()
  shape.moveTo(-.7, .45)
  shape.lineTo(.7, .45)
  shape.lineTo(.7, 2.95)
  shape.absarc(0, 2.95, .7, 0, Math.PI, false)
  shape.closePath()
  return shape
}

function hole(shape: THREE.Shape): THREE.Path {
  return new THREE.Path(shape.getPoints(8).reverse())
}

// Each segment is affine in height, so triangulated reveals follow the taper.
function faceGeometry(shape: THREE.Shape, depth: number, outset = 0, yaw = 0, miter = false): THREE.BufferGeometry {
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 8, steps: 1 })
  const position = geometry.getAttribute('position')
  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i), a = apothem(y), z = a + outset + position.getZ(i) - depth
    position.setXYZ(i, position.getX(i) * (miter ? z / a : 1), y, z)
  }
  geometry.rotateY(yaw)
  geometry.computeVertexNormals()
  return geometry
}

// Closed octagonal volumes use explicit cap fans, without collapsed pole quads.
function octagonalVolume(levels: ReadonlyArray<readonly [number, number]>): THREE.BufferGeometry {
  const vertices: number[] = []
  const point = (level: readonly [number, number], i: number) => {
    const angle = (i - .5) * TURN, radius = level[1] / Math.cos(Math.PI / 8)
    return [Math.sin(angle) * radius, level[0], Math.cos(angle) * radius]
  }
  for (let layer = 1; layer < levels.length; layer++) {
    for (let i = 0; i < 8; i++) {
      const a = point(levels[layer - 1], i), b = point(levels[layer - 1], i + 1)
      const c = point(levels[layer], i + 1), d = point(levels[layer], i)
      vertices.push(...a, ...b, ...d, ...b, ...c, ...d)
    }
  }
  const bottom = levels[0], top = levels[levels.length - 1]
  for (let i = 0; i < 8; i++) {
    vertices.push(0, bottom[0], 0, ...point(bottom, i + 1), ...point(bottom, i))
    vertices.push(0, top[0], 0, ...point(top, i), ...point(top, i + 1))
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.computeVertexNormals()
  return geometry
}

function domeGeometry(): THREE.BufferGeometry {
  const profile = [
    [1.17, 22.57], [1.18, 22.66], [1.12, 22.7], [1.1, 22.85],
    [1.02, 23.03], [.87, 23.2], [.66, 23.34], [.41, 23.44],
    [.23, 23.48], [.2, 23.56], [.055, 23.61],
  ]
  const source = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 32)
  source.normalizeNormals()
  const lathe = source.toNonIndexed()
  source.dispose()
  const positions = Array.from(lathe.getAttribute('position').array)
  const normals = Array.from(lathe.getAttribute('normal').array)
  for (const [r, y, sign] of [[profile[0][0], profile[0][1], -1], [.055, 23.61, 1]]) {
    for (let i = 0; i < 32; i++) {
      const a = i * Math.PI / 16, b = (i + 1) * Math.PI / 16
      const p = [Math.sin(a) * r, y, Math.cos(a) * r]
      const q = [Math.sin(b) * r, y, Math.cos(b) * r]
      positions.push(0, y, 0, ...(sign > 0 ? p : q), ...(sign > 0 ? q : p))
      normals.push(0, sign, 0, 0, sign, 0, 0, sign, 0)
    }
  }
  lathe.dispose()
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  return geometry
}

/** Photo-derived Homigot tower; local ground 0, front +Z, crown top 24. */
export function buildHomigotLighthouse(kit: CityBuilder): void {
  const face = (finish: CityFinish, shape: THREE.Shape, depth: number, outset = 0, surface: CitySurface = 'plaster') =>
    kit.add(finish, faceGeometry(shape, depth, outset), surface)
  const volume = (finish: CityFinish, levels: ReadonlyArray<readonly [number, number]>, surface: CitySurface = 'plaster') =>
    kit.add(finish, octagonalVolume(levels), surface)
  const bar = (finish: CityFinish, x: number, y: number, width: number, height: number, depth: number, outset: number, surface: CitySurface = 'plaster') =>
    face(finish, rectangle(x, y, width, height), depth, outset, surface)
  const pediment = (y: number, width: number, rise: number) => {
    const triangle = new THREE.Shape([
      new THREE.Vector2(-width / 2, y), new THREE.Vector2(width / 2, y), new THREE.Vector2(0, y + rise),
    ])
    face('trim', triangle, .22, .2)
    const inset = new THREE.Shape([
      new THREE.Vector2(-width / 2 + .2, y + .065),
      new THREE.Vector2(width / 2 - .2, y + .065), new THREE.Vector2(0, y + rise - .12),
    ])
    face('concrete', inset, .025, .205)
    bar('trim', 0, y - .1, width + .12, .1, .28, .24)
    bar('edge', 0, y - .17, width - .04, .065, .19, .12)
  }

  volume('trim', [[0, 3.3], [.17, 3.3], [.28, 3.3]], 'masonry')
  for (let segment = 1; segment < PROFILE.length; segment++) {
    const [low, lower] = PROFILE[segment - 1], [high, upper] = PROFILE[segment]
    for (let side = 0; side < 8; side++) {
      const outline = new THREE.Shape([
        new THREE.Vector2(-lower * HALF_FACE, low), new THREE.Vector2(lower * HALF_FACE, low),
        new THREE.Vector2(upper * HALF_FACE, high), new THREE.Vector2(-upper * HALF_FACE, high),
      ])
      if (side === 0) {
        if (segment === 1) outline.holes.push(hole(doorOutline()))
        WINDOWS.forEach((y, i) => {
          if (y > low && y + WINDOW_HEIGHT[i] < high) {
            outline.holes.push(hole(rectangle(0, y, WINDOW_WIDTH, WINDOW_HEIGHT[i])))
          }
        })
      }
      kit.add('trim', faceGeometry(outline, WALL, 0, side * TURN, true), 'plaster')
    }
  }

  WINDOWS.forEach((y, i) => {
    const height = WINDOW_HEIGHT[i]
    const surround = rectangle(0, y - .12, WINDOW_WIDTH + .25, height + .24)
    surround.holes.push(hole(rectangle(0, y, WINDOW_WIDTH, height)))
    face('trim', surround, .18, .115)
    bar('glass', 0, y + .035, WINDOW_WIDTH - .07, height - .07, .035, -.29, 'generic')
    for (const x of [-WINDOW_WIDTH / 2 + .035, 0, WINDOW_WIDTH / 2 - .035]) {
      bar('faded', x, y + .025, .045, height - .05, .08, -.2, 'timber')
    }
    for (const fraction of [0, .33, .66, 1]) {
      bar('faded', 0, y + fraction * (height - .05), WINDOW_WIDTH - .04, .05, .08, -.2, 'timber')
    }
    bar('trim', 0, y - .2, WINDOW_WIDTH + .4, .11, .34, .2)
    pediment(y + height + .23, WINDOW_WIDTH + .48, .34)
  })

  // The door and fanlight sit inside one arched opening, behind the masonry reveal.
  for (const x of [-.345, .345]) {
    bar('faded', x, .47, .665, 2.46, .065, -.29, 'timber')
    for (const y of [.63, 1.38, 2.13]) {
      bar('concrete', x, y, .47, .58, .025, -.25, 'timber')
    }
  }
  const fanlight = new THREE.Shape()
  fanlight.moveTo(-.66, 2.95)
  fanlight.lineTo(.66, 2.95)
  fanlight.absarc(0, 2.95, .66, 0, Math.PI, false)
  fanlight.closePath()
  face('glass', fanlight, .035, -.29, 'generic')
  for (let i = 1; i < 6; i++) {
    const angle = i * Math.PI / 6, x = Math.cos(angle) * .65, y = 2.95 + Math.sin(angle) * .65
    kit.beam('trim', [0, 2.95, apothem(2.95) - .22], [x, y, apothem(y) - .22], .035, .05, 'timber')
  }
  bar('trim', 0, 2.91, 1.4, .065, .08, -.2, 'timber')
  for (const x of [-.86, .86]) {
    bar('trim', x, .3, .24, 3.46, .25, .17)
    bar('trim', x, .28, .34, .3, .32, .22, 'masonry')
    bar('trim', x, 3.5, .32, .19, .31, .22)
  }
  bar('trim', 0, 3.67, 2.03, .13, .3, .22)
  pediment(3.95, 2.22, .43)
  kit.box('trim', [2.18, .15, 1.05], [0, .075, 3.65], undefined, 'masonry')
  kit.box('trim', [1.99, .3, .73], [0, .15, 3.49], undefined, 'masonry')
  kit.box('trim', [1.8, .45, .4], [0, .225, 3.32], undefined, 'masonry')

  volume('trim', [[20.1, 1.6], [20.18, 1.76], [20.3, 1.8], [20.48, 2.3], [20.68, 2.3]])
  volume('edge', [[20.68, 2.3], [20.74, 2.3]], 'masonry')
  volume('steel', [[20.74, 1.09], [20.94, 1.09], [21.02, 1.04]], 'sheet')
  volume('steel', [[22.45, 1.04], [22.55, 1.11], [22.59, 1.11]], 'sheet')
  for (let i = 0; i < 8; i++) {
    const yaw = i * TURN, radius = 2.13 / Math.cos(Math.PI / 8)
    const a = (i - .5) * TURN, b = (i + .5) * TURN
    const start = new THREE.Vector3(Math.sin(a) * radius, 21.51, Math.cos(a) * radius)
    const end = new THREE.Vector3(Math.sin(b) * radius, 21.51, Math.cos(b) * radius)
    kit.beam('steel', start.toArray(), end.toArray(), .055, .055, 'sheet')
    for (let j = 0; j < 5; j++) {
      const at = start.clone().lerp(end, j / 5)
      kit.beam('steel', [at.x, 20.73, at.z], [at.x, 21.52, at.z], j === 0 ? .065 : .032, .04, 'sheet')
    }
    const glass = new THREE.BoxGeometry(2 * 1.04 * HALF_FACE - .055, 1.43, .035)
    glass.translate(0, 21.735, 1.025).rotateY(yaw)
    kit.add(i % 3 === 0 ? 'glazing' : 'glass', glass, 'generic')
    const postRadius = 1.04 / Math.cos(Math.PI / 8)
    kit.beam('steel', [Math.sin(a) * postRadius, 20.98, Math.cos(a) * postRadius],
      [Math.sin(a) * postRadius, 22.53, Math.cos(a) * postRadius], .055, .055, 'sheet')
  }
  kit.add('steel', domeGeometry(), 'sheet')
  volume('steel', [[23.59, .085], [23.69, .11], [23.78, .055], [24, .022]], 'sheet')
}
