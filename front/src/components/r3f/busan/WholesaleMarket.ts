import * as THREE from 'three'
import type { CityBuilder } from '../city/CityGeometry'
import { roofShell, windowWall } from '../city/CityDetails'

// Concept B: local front +Z; water y=4.25. The landing belongs to this footprint.
export function buildWholesaleMarket(kit: CityBuilder) {
  const eave = 8.55, ridge = 11.2, ridgeX = -2
  const front = 3.65, back = -5.6, halfWidth = 7.85
  const floor = 5.35

  kit.box('edge', [15.7, .32, 9.25], [0, .16, -.975], undefined, 'masonry')
  kit.box('concrete', [15.7, .3, 9.25], [0, floor - .15, -.975], undefined, 'masonry')
  kit.box('edge', [15.85, .18, 9.4], [0, 4.98, -.975], undefined, 'masonry')
  // The dark inner leaf stays at the rear wall, preserving the full depth of the hall.
  kit.box('concrete', [15.7, 8.23, .34], [0, 4.435, back + .17], undefined, 'plaster')
  kit.box('dark', [15.7, 8.23, .04], [0, 4.435, back + .36], undefined, 'plaster')

  for (const side of [-1, 1]) {
    kit.box('concrete', [.38, 4.58, 8.87], [side * 7.66, 2.61, -.785], undefined, 'masonry')
    windowWall(kit, 'concrete', [side * halfWidth, floor, -.975], 9.25, eave - floor, [
      { x: -2.95, y: 1.55, width: 1.35, height: 1.45 },
      { x: -.6, y: 1.55, width: 1.7, height: 1.45 },
      { x: 2.25, y: 1.55, width: 1.35, height: 1.45 },
    ], { depth: .38, yaw: side * Math.PI / 2, seed: 3, surface: 'plaster' })
  }

  // Four shuttered shops disappear below the common water, leaving their heads visible.
  const shops = [
    { left: -7.4, right: -4.35 },
    { left: -3.9, right: -.25 },
    { left: .2, right: 3.35 },
    { left: 3.8, right: 7.4 },
  ]
  for (const x of [-7.625, -4.125, -.025, 3.575, 7.625]) {
    kit.box('concrete', [.45, 4.58, .56], [x, 2.61, front - .28], undefined, 'masonry')
  }
  kit.box('concrete', [15.7, .25, .56], [0, 4.775, front - .28], undefined, 'plaster')
  for (const { left, right } of shops) {
    const width = right - left, x = (left + right) / 2
    kit.box('dark', [width, 3.95, .14], [x, 2.675, front - .47], undefined, 'sheet')
    for (let row = 0; row < 24; row++) {
      kit.box('steel', [width - .13, .145, .065], [x, .85 + row * .158, front - .3], undefined, 'sheet')
    }
    for (const jamb of [left + .04, right - .04]) {
      kit.box('edge', [.08, 4, .16], [jamb, 2.65, front - .24], undefined, 'sheet')
    }
    kit.box('edge', [width, .2, .24], [x, 4.6, front - .24], undefined, 'sheet')
  }

  // An actual open loading bay: no backing pane or core across the opening.
  kit.box('concrete', [3.05, 3.2, .42], [-6.325, 6.95, front - .21], undefined, 'plaster')
  windowWall(kit, 'concrete', [4.225, floor, front], 7.25, 3.2, [
    { x: 1.65, y: 1.5, width: 1.25, height: 1.55 },
  ], { depth: .42, seed: 3 })
  kit.box('edge', [5.4, .25, .56], [-2.1, 8.425, front - .2], undefined, 'masonry')
  for (const x of [-4.8, .6]) {
    kit.box('edge', [.16, 2.95, .6], [x, 6.825, front - .22], undefined, 'masonry')
  }
  kit.box('edge', [5.55, .12, .72], [-2.1, 5.41, front - .1], undefined, 'masonry')

  // End gables use Three's triangulated extrusion; roof slopes stay two continuous shells.
  const gable = new THREE.Shape([
    new THREE.Vector2(-halfWidth, eave),
    new THREE.Vector2(halfWidth, eave),
    new THREE.Vector2(ridgeX, ridge - .19),
  ])
  for (const z of [back, front - .36]) {
    kit.add('concrete', new THREE.ExtrudeGeometry(gable, { depth: .36, bevelEnabled: false }).translate(0, 0, z), 'plaster')
  }

  // Storage partition leaves a walk-through aisle; a raised rear platform reads through the bay.
  kit.box('steel', [.2, 2.45, 5.6], [1.65, 6.575, -2.45], undefined, 'plaster')
  kit.box('edge', [5.9, .26, 2.3], [-2.1, 5.48, -3.85], undefined, 'masonry')
  kit.box('concrete', [5.9, .13, .45], [-2.1, 5.415, -2.475], undefined, 'masonry')
  for (const z of [2.3, -1.2, -4.75]) {
    const tieY = z === 2.3 ? 7.9 : 8.35
    for (const x of [-7.43, 7.43]) {
      kit.box('steel', [.18, 3.02, .2], [x, 6.86, z], undefined, 'sheet')
    }
    kit.beam('steel', [-7.43, tieY, z], [7.43, tieY, z], z === 2.3 ? .18 : .14, .16, 'sheet')
    kit.beam('steel', [-7.43, 8.35, z], [ridgeX, 10.91, z], .15, .18, 'sheet')
    kit.beam('steel', [ridgeX, 10.91, z], [7.43, 8.35, z], .15, .18, 'sheet')
    kit.beam('steel', [ridgeX, tieY, z], [ridgeX, 10.91, z], .1, .12, 'sheet')
    kit.beam('steel', [-5.7, tieY, z], [ridgeX, 10.91, z], .09, .1, 'sheet')
    kit.beam('steel', [4.3, tieY, z], [ridgeX, 10.91, z], .09, .1, 'sheet')
  }

  for (const [edgeX, edgeY] of [[-8.5, 8.38], [8.5, 8.38]]) {
    const leftX = Math.min(edgeX, ridgeX), rightX = Math.max(edgeX, ridgeX)
    const leftY = edgeX < ridgeX ? edgeY : ridge
    const rightY = edgeX < ridgeX ? ridge : edgeY
    const skin = new THREE.PlaneGeometry(1, 1)
    const positions = skin.getAttribute('position')
    for (let i = 0; i < positions.count; i++) {
      const u = positions.getX(i) + .5, v = .5 - positions.getY(i)
      positions.setXYZ(i, THREE.MathUtils.lerp(leftX, rightX, u), THREE.MathUtils.lerp(leftY, rightY, u), -6 + 10.25 * v)
    }
    roofShell(kit, skin, .16, 'steel', 'sheet')

    const along = new THREE.Vector3(ridgeX - edgeX, ridge - edgeY, 0)
    const length = along.length()
    along.normalize()
    const sign = Math.sign(along.x)
    const across = new THREE.Vector3(0, 0, -sign)
    const normal = new THREE.Vector3(-along.y * sign, Math.abs(along.x), 0)
    const orientation = new THREE.Matrix4().makeBasis(across, normal, along)
    const seam = new THREE.Shape([
      new THREE.Vector2(-.065, 0), new THREE.Vector2(.065, 0),
      new THREE.Vector2(.065, .025), new THREE.Vector2(.025, .025),
      new THREE.Vector2(.025, .09), new THREE.Vector2(-.025, .09),
      new THREE.Vector2(-.025, .025), new THREE.Vector2(-.065, .025),
    ])
    for (let course = 0; course < 17; course++) {
      const geometry = new THREE.ExtrudeGeometry(seam, { depth: length - .18, bevelEnabled: false })
      geometry.applyMatrix4(orientation).translate(edgeX + along.x * .12, edgeY + along.y * .12 + .015, -5.8 + course * .61)
      kit.add('steel', geometry, 'sheet')
    }
    for (const z of [-5.91, 4.16]) {
      kit.beam('edge', [edgeX + along.x * .12, edgeY + along.y * .12 - .06, z], [ridgeX, ridge - .06, z], .13, .15, 'sheet')
    }
    kit.box('edge', [.13, .18, 10.25], [edgeX > 0 ? 8.435 : -8.435, edgeY - .1, -.875], undefined, 'sheet')
    for (const t of [.3, .67]) {
      kit.box('steel', [.12, .14, 9.55], [THREE.MathUtils.lerp(edgeX, ridgeX, t), THREE.MathUtils.lerp(edgeY, ridge, t) - .24, -.875], undefined, 'sheet')
    }
  }
  kit.box('faded', [.24, .12, 10.25], [ridgeX, 11.27, -.875], undefined, 'sheet')

  // Short loading landing, bearing beams and braced piles, with stairs down into water.
  kit.box('concrete', [6.65, .22, 1.7], [-2.05, 5.24, 4.4], undefined, 'masonry')
  for (const x of [-5.1, -2.1, 1]) {
    kit.box('edge', [.26, 5.02, .26], [x, 2.51, 4.98], undefined, 'masonry')
    kit.box('steel', [.18, .22, 1.78], [x, 5.02, 4.36], undefined, 'sheet')
    kit.beam('steel', [x, 3.9, 4.98], [x, 4.95, 3.72], .12, .12, 'sheet')
  }
  kit.box('steel', [6.65, .22, .18], [-2.05, 5.02, 4.98], undefined, 'sheet')
  for (const x of [-5.22, -4.32]) {
    kit.box('steel', [.07, .92, .07], [x, 5.81, 5.16], undefined, 'sheet')
  }
  kit.beam('steel', [-5.22, 6.27, 5.16], [-4.32, 6.27, 5.16], .075, .075, 'sheet')
  kit.beam('steel', [-5.22, 5.84, 5.16], [-4.32, 5.84, 5.16], .05, .05, 'sheet')
  kit.beam('steel', [-5.22, 6.27, 3.78], [-5.22, 6.27, 5.16], .075, .075, 'sheet')
  kit.box('steel', [.07, .92, .07], [-5.22, 5.81, 3.78], undefined, 'sheet')

  for (let step = 0; step < 9; step++) {
    const x = 1.45 + step * .4, top = floor - (step + 1) * .22
    kit.box('concrete', [.4, .15, 1.55], [x, top - .075, 4.75], undefined, 'masonry')
    kit.box('edge', [.065, .07, 1.55], [x + .16, top - .035, 4.75], undefined, 'masonry')
  }
  for (const z of [4.1, 5.4]) {
    kit.beam('steel', [1.25, 5.02, z], [4.85, 3.04, z], .14, .18, 'sheet')
    kit.box('edge', [.24, 3.02, .24], [4.7, 1.51, z], undefined, 'masonry')
  }
  for (const step of [0, 3, 6, 8]) {
    const x = 1.45 + step * .4, top = floor - (step + 1) * .22
    kit.box('steel', [.065, .88, .065], [x, top + .44, 5.48], undefined, 'sheet')
  }
  kit.beam('steel', [1.45, 6.01, 5.48], [4.65, 4.25, 5.48], .075, .075, 'sheet')
  kit.beam('steel', [1.45, 5.59, 5.48], [4.65, 3.83, 5.48], .05, .05, 'sheet')

  // One working gutter/downpipe junction, kept clear of the loading opening.
  kit.box('steel', [.22, .17, 9.8], [8.25, 8.2, -.9], undefined, 'sheet')
  kit.beam('steel', [8.25, 8.16, 2.65], [7.96, 7.88, 2.65], .105, .105, 'sheet')
  kit.box('steel', [.105, 4.3, .105], [7.96, 5.73, 2.65], undefined, 'sheet')
  for (const y of [4.62, 6.85]) {
    kit.box('edge', [.25, .055, .19], [7.87, y, 2.65], undefined, 'sheet')
  }
}
