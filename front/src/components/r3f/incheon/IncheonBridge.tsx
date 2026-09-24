import * as THREE from 'three'
import HarborGeometry, { type HarborBuilder, type HarborFinish } from './HarborGeometry'

const ANGLE = .94
const ORIGIN = new THREE.Vector3(-13, 0, -28)
const rotation = new THREE.Matrix4().makeRotationY(ANGLE)
const transform = new THREE.Matrix4().makeTranslation(...ORIGIN.toArray()).multiply(rotation)
const level = (s: number) => 6.8 + s * .023
type Point = [number, number, number]
const point = (s: number, y: number, t = 0): Point => new THREE.Vector3(s, y, t).applyMatrix4(transform).toArray()

function buildBridge(kit: HarborBuilder) {
  const box = (finish: HarborFinish, size: Point, at: Point, grade = 0) => kit.box(finish, size, point(...at), [0, ANGLE, grade])
  const beam = (finish: HarborFinish, a: Point, b: Point, width: number, depth = width) => kit.beam(finish, point(...a), point(...b), width, depth)
  const cylinder = (finish: HarborFinish, radius: number, depth: number, at: Point) => {
    const geometry = new THREE.CylinderGeometry(radius, radius, depth, 10)
    geometry.rotateZ(Math.PI / 2).translate(...at).applyMatrix4(transform)
    kit.add(finish, geometry)
  }
  const solid = (finish: HarborFinish, outline: Point[], depth: number) => {
    const shape = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)))
    const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: .055, bevelSize: .055, bevelSegments: 2, steps: 1 })
    geometry.translate(0, 0, -depth / 2)
    geometry.applyMatrix4(transform)
    kit.add(finish, geometry)
  }
  const curve = (points: Point[]) => new THREE.CubicBezierCurve3(...points.map(p => new THREE.Vector3(...p)) as [THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3])
  const bentRail = (points: Point[]) => {
    const section = new THREE.Shape([
      new THREE.Vector2(-.09, -.16), new THREE.Vector2(.09, -.16),
      new THREE.Vector2(.09, .16), new THREE.Vector2(-.09, .16),
    ])
    const geometry = new THREE.ExtrudeGeometry(section, { extrudePath: curve(points), steps: 18, bevelEnabled: false })
    geometry.applyMatrix4(transform)
    kit.add('steel', geometry)
  }

  // The road recedes into the harbor; shattered edges belong to the solid, not drawn outlines.
  for (const [from, to] of [[-58, 12], [21, 94]]) {
    const left = from < 0
    solid('edge', left ? [
      [from, level(from) - .72, 0], [6.4, level(6.4) - .72, 0],
      [8.1, level(8.1) - .35, 0], [9.3, level(9.3) - .84, 0],
      [12.5, level(12) - .88, 0], [11.7, level(12) - .46, 0],
      [12, level(12) - .22, 0], [10.7, level(12) - .03, 0],
      [10.2, level(10.2) + .3, 0], [from + .18, level(from) + .3, 0],
      [from + .4, level(from) - .05, 0],
    ] : [
      [20.8, level(21) - .92, 0], [23.6, level(23.6) - .72, 0],
      [25.1, level(25.1) - .3, 0], [26.8, level(26.8) - .72, 0],
      [to - .25, level(to) - .67, 0], [to + .15, level(to) - .39, 0],
      [to - .32, level(to) - .18, 0], [to - .16, level(to) + .17, 0],
      [to - .62, level(to) + .3, 0], [23.1, level(23.1) + .3, 0],
      [22.7, level(22.7) - .1, 0], [21.4, level(21.4) - .26, 0],
      [21.9, level(21.9) - .54, 0],
    ], 4)
    const roadFrom = left ? from + .4 : 23.25
    const roadTo = left ? 10 : to - .4
    const middle = (roadFrom + roadTo) / 2
    box('paint', [roadTo - roadFrom, .08, 3.8], [middle, level(middle) + .31, 0], .023)
    for (const t of [-1.5, 1.5]) {
      box('steel', [roadTo - roadFrom, .2, .45], [middle, level(middle) - .78, t], .023)
    }
    for (const side of [-1, 1]) {
      for (let s = from + 1.3, index = 0; s < to - 2; s += 5.7, index++) {
        if ((index + side) % 6 === 0 || (s > 7 && s < 27)) continue
        box('edge', [3.8 + index % 3 * .35, .46, .3], [s, level(s) + .53, side * 1.97], .023)
        box('dark', [.37, .16, .065], [s - 1, level(s) + .34, side * 2.14], .023)
        if (s > -35 && s < 32) {
          box('steel', [.33, .57, .23], [s, level(s) - .42, side * 2.04], .023)
          box('trim', [.2, .09, .03], [s, level(s) - .15, side * 2.18], .023)
        }
      }
    }
  }

  // One slab has rolled off its bearings, partly disappearing below the flood.
  solid('edge', [[15.2, 3.35, 0], [16.3, 4.05, 0], [17.1, 4.21, 0],
    [21.65, 6.62, 0], [22.35, 7.12, 0], [21.8, 7.48, 0], [20.6, 6.94, 0],
    [20.45, 6.63, 0], [18.5, 5.81, 0], [17.8, 5.74, 0], [16.1, 4.52, 0],
    [15.95, 4.17, 0], [15.25, 4.11, 0]], 3.65)
  for (const t of [-1.37, 1.37]) {
    beam('steel', [15.4, 3.53, t], [21.8, 6.73, t], .18, .35)
    beam('edge', [15.5, 3.42, t], [21.9, 6.62, t], .45, .14)
  }
  // Only detached roadside metal bends; the load-bearing pylons and stays keep their geometry.
  bentRail([[8.4, level(8.4) + .72, 1.98], [12.2, 8.3, 2.1], [12.9, 4.3, 2.7], [16.1, 4.71, 2.05]])
  bentRail([[25.7, level(25.7) + .72, -1.98], [22.2, 8.5, -2.1], [20.1, 6.5, -2.8], [21.3, 5.65, -2.35]])
  for (const [s, t] of [[8.4, 1.98], [25.7, -1.98]]) {
    beam('steel', [s, level(s) + .27, t], [s, level(s) + .72, t], .13)
  }
  const tornBars: Point[][] = [
    [[11.3, 6.65, 1.35], [13, 6.7, 1.6], [12.7, 4.9, 1.9], [14.1, 5.2, 1.7]],
    [[10.7, 6.85, -.85], [12.9, 7.15, -.8], [13.1, 5.5, -1.3], [12.4, 5.35, -1.15]],
    [[22.1, 6.86, .7], [20.2, 6.6, .6], [19.8, 4.9, .95], [20.6, 4.65, 1.1]],
  ]
  for (const points of tornBars) {
    const geometry = new THREE.TubeGeometry(curve(points), 12, .055, 5, false)
    geometry.applyMatrix4(transform)
    kit.add('rust', geometry)
  }

  for (const station of [0, 60]) {
    const finish = station === 0 ? 'concrete' : 'edge'
    const crossSection = (vertices: number[][]) => {
      const shape = new THREE.Shape(vertices.map(([t, y]) => new THREE.Vector2(t, y)))
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: 1.4, bevelEnabled: true, bevelThickness: .08, bevelSize: .08, bevelSegments: 2, steps: 1 })
      geometry.rotateY(-Math.PI / 2).translate(station + .7, 0, 0).applyMatrix4(transform)
      kit.add(finish, geometry)
    }
    // Forks straddle the actual road width rather than facing the camera like a diagram.
    crossSection(station === 0
      ? [[-2.8, 3.4], [-1.75, 3.4], [.48, 15.8], [-.54, 16.1], [-1.1, 13], [-1.02, 12.8], [-1.28, 12.45], [-1.31, 11.8]]
      : [[-2.8, 3.4], [-1.75, 3.4], [.48, 15.8], [-.54, 16.1]])
    crossSection([[1.75, 3.4], [2.8, 3.4], [.54, 16.1], [-.48, 15.8]])
    crossSection([[-.58, 15.3], [.58, 15.3], [.4, 27.7], [-.4, 27.7]])
    box(finish, [1.7, .72, 4.2], [station, level(station) - .5, 0])
    for (const side of [-1, 1]) box('edge', [3, 3.8, 2.2], [station, 2, side * 2.15])
    box('dark', [.025, .6, .35], [station + .78, 14.1, .45])
    // Bearing blocks, collars and service openings articulate the large concrete masses.
    for (const t of [-1.2, 1.2]) {
      box('steel', [1.9, .22, .9], [station, level(station) - 1, t])
      box('dark', [1.4, .25, .68], [station, level(station) - .8, t])
      box('trim', [1.55, .12, .82], [station, level(station) - .63, t])
    }
    box('dark', [.04, 1.15, .65], [station + .8, 16.35, 0])
    box('steel', [.15, 1.03, .52], [station + .86, 16.35, 0])
    box('trim', [.035, .16, .11], [station + .945, 16.31, .13])
    if (station === 0) {
      for (const y of [17.8, 21.2, 24.6]) {
        box('steel', [.035, .075, .8], [station + .805, y, 0])
        for (const t of [-.26, .26]) cylinder('dark', .065, .04, [station + .83, y - .22, t])
      }
      for (const t of [-.28, .28]) beam('steel', [station + .99, 13.6, t], [station + .99, 17, t], .075)
      for (let rung = 0; rung < 8; rung++) beam('trim', [station + 1.01, 13.7 + rung * .41, -.28], [station + 1.01, 13.7 + rung * .41, .28], .06)
      box('steel', [1.1, .18, 1.3], [station + .91, 13.52, 0])
    }

    for (const side of [-1, 1]) {
      const stays = station === 0 ? 6 : 4
      for (let i = 0; i < stays; i++) {
        const reach = 4.7 + i * 3.25
        const anchor = station + side * reach
        if (anchor > 11 && anchor < 22) continue
        const height = 19.1 + i * 1.55
        box('steel', [.19, .76, .72], [station + side * .8, height, 0])
        box('edge', [.35, .44, .48], [station + side * 1.03, height -.1, 0])
        cylinder('trim', .145, .12, [station + side * 1.24, height -.1, 0])
        const a = new THREE.Vector3(...point(station + side * 1.25, height -.1, 0))
        const b = new THREE.Vector3(...point(anchor, level(anchor) + .4, 1.8))
        const middle = a.clone().add(b).multiplyScalar(.5)
        middle.y -= .14
        kit.add('cable', new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, middle, b), 10, .04, 5, false))
        box('steel', [.46, .27, .5], [anchor, level(anchor) + .37, 1.8])
      }
    }
  }
  for (const s of [-45, -30, 82]) {
    box('edge', [1.45, level(s) - .7, 2.8], [s, (level(s) - .7) / 2, 0])
    box('edge', [2.5, .55, 3.85], [s, level(s) - .87, 0])
  }
  for (const [s, lean] of [[-23, .7], [5, -.18], [74, 0]]) {
    beam('steel', [s, level(s) + .45, 1.8], [s + lean, level(s) + 2.2, 1.8], .06)
    box('steel', [.48, .11, .19], [s + lean + .16, level(s) + 2.2, 1.8])
  }
  // A single stranded van gives scale without a repeated procession of props.
  box('paint', [2.6, .78, 1.02], [-8, level(-8) + .77, -.5], .03)
  box('dark', [.65, .33, .025], [-8.7, level(-8) + .89, .023], .03)
  box('edge', [1.63, .12, 1.08], [-8.22, level(-8) + 1.19, -.5], .03)
  box('glass', [.68, .39, .065], [-7.73, level(-8) + .94, .032], .03)
  box('steel', [.075, .44, .09], [-8.1, level(-8) + .94, .08], .03)
  for (const s of [-8.82, -7.19]) {
    const wheel = new THREE.CylinderGeometry(.22, .22, 1.1, 10)
    wheel.rotateX(Math.PI / 2).translate(s, level(-8) + .48, -.5).applyMatrix4(transform)
    kit.add('dark', wheel)
  }
}

export default function IncheonBridge() {
  return <HarborGeometry build={buildBridge} name="Incheon broken cable-stayed bridge" />
}
