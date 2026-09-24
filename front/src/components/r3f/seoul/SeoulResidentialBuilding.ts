import * as THREE from 'three'

type Kind = 'architecture' | 'metal'
interface Building {
  width: number; depth: number; floors: number; storey: number
  variant: number; plaster: string; detailed: boolean
  foundationDepth?: number
}
interface Builder {
  box: (group: string, kind: Kind, tint: string, x: number, y: number, z: number, w: number, h: number, d: number, yaw?: number) => void
  geometry: (group: string, geometry: THREE.BufferGeometry, tint: string) => void
  shelter: (x: number, y: number, z: number, rx: number, rz: number, reach?: number) => void
}
interface Opening { x: number; y: number; w: number; h: number; door?: boolean }

// Footprints, floor counts and placement belong to the caller. Each type builds
// its own occupied envelope; glazing always sits behind an extruded wall reveal.
export function buildSeoulResidence(spec: Building, builder: Builder) {
  const { width: w, depth: d, floors, storey: floor, variant, plaster, detailed } = spec
  const h = floors * floor, skin = .2
  const roofColor = '#354858', frameColor = '#74838c'
  const box = builder.box
  const wall = (width: number, height: number, openings: Opening[], cx: number, cy: number, cz: number, yaw = 0, tint = plaster) => {
    const shape = new THREE.Shape()
    shape.moveTo(-width / 2, 0); shape.lineTo(width / 2, 0)
    shape.lineTo(width / 2, height); shape.lineTo(-width / 2, height); shape.closePath()
    for (const o of openings) {
      const hole = new THREE.Path(), l = o.x - o.w / 2, r = o.x + o.w / 2, b = o.y - o.h / 2, t = o.y + o.h / 2
      hole.moveTo(l, b); hole.lineTo(l, t); hole.lineTo(r, t); hole.lineTo(r, b); hole.closePath()
      shape.holes.push(hole)
    }
    const masonry = new THREE.ExtrudeGeometry(shape, { depth: skin, bevelEnabled: false, curveSegments: 1, steps: 1 })
    masonry.translate(0, 0, -skin); masonry.rotateY(yaw); masonry.translate(cx, cy, cz)
    builder.geometry('Residential masonry', masonry, tint)
    const part = (group: string, kind: Kind, color: string, x: number, y: number, z: number, a: number, b: number, c: number) =>
      box(group, kind, color, cx + x * Math.cos(yaw) + z * Math.sin(yaw), cy + y, cz - x * Math.sin(yaw) + z * Math.cos(yaw), a, b, c, yaw)
    for (const o of openings) {
      part('Recessed residential glazing', 'architecture', o.door ? '#304355' : '#1d3042', o.x, o.y, -.24, o.w, o.h, .035)
      // Sliding frames sit behind the outer reveal, with a projecting stone sill.
      const frame = frameColor
      for (const side of [-1, 1]) {
        part('Residential window frames', 'metal', frame, o.x + side * (o.w / 2 - .025), o.y, -.13, .05, o.h, .05)
        part('Residential window frames', 'metal', frame, o.x, o.y + side * (o.h / 2 - .025), -.13, o.w, .05, .05)
      }
      part('Residential window frames', 'metal', frame, o.x, o.y, -.12, .035, o.h, .055)
      if (!o.door) {
        part('Residential sills and cornices', 'architecture', '#9aa7ae', o.x, o.y - o.h / 2 - .04, .045, o.w + .13, .08, .23)
      } else {
        part('Residential window frames', 'metal', '#9ca8ad', o.x + o.w * .13, o.y - .05, -.075, .035, .22, .055)
      }
      const sx = cx + o.x * Math.cos(yaw), sz = cz - o.x * Math.sin(yaw)
      builder.shelter(sx, cy + o.y + o.h / 2, sz, Math.abs(Math.cos(yaw)) * o.w / 2 + .24, Math.abs(Math.sin(yaw)) * o.w / 2 + .24, o.h)
    }
  }
  const opening = (x: number, width: number, door = false): Opening =>
    ({ x, y: floor * (door ? .45 : .56), w: width, h: floor * (door ? .78 : .5), door })
  const slab = (group: string, x: number, y: number, z: number, width: number, depth: number) => {
    box(group, 'architecture', roofColor, x, y + .075, z, width, .15, depth)
    builder.shelter(x, y + .025, z, width / 2 + .12, depth / 2 + .12, floor * .85)
  }
  const rail = (x: number, y: number, z: number, length: number, yaw = 0) => {
    const height = floor * .48
    for (const dy of [height * .35, height]) box('Residential terrace rails', 'metal', '#697c88', x, y + dy, z, length, .045, .045, yaw)
    const spans = Math.max(2, Math.ceil(length / .85))
    for (let i = 0; i <= spans; i++) {
      const offset = (i / spans - .5) * (length - .05)
      box('Residential terrace rails', 'metal', '#697c88', x + offset * Math.cos(yaw), y + height / 2, z - offset * Math.sin(yaw), .045, height, .045, yaw)
    }
  }
  const perimeterRail = (y: number) => {
    for (const side of [-1, 1]) {
      rail(0, y, side * (d / 2 - .09), w - .18)
      rail(side * (w / 2 - .09), y, 0, d - .18, Math.PI / 2)
    }
  }
  const parapet = (x: number, y: number, z: number, width: number, depth: number) => {
    const height = floor * .19
    for (const side of [-1, 1]) {
      box('Residential roof parapets', 'architecture', plaster, x, y + height / 2, z + side * (depth / 2 - .07), width, height, .14)
      box('Residential roof parapets', 'architecture', plaster, x + side * (width / 2 - .07), y + height / 2, z, .14, height, depth - .28)
    }
  }
  const hatch = (x: number, z: number) => {
    box('Residential roof access hatches', 'metal', roofColor, x, h + .24, z, w * .19, .18, d * .24)
  }
  const coreW = w * .3, coreX = -w / 2 + coreW / 2
  const livingW = w - coreW, livingX = coreW / 2
  const recess = Math.min(d * .24, 1.15)
  const setbackX = w * .28, setbackZ = d * .32
  const upperW = w - setbackX, upperD = d - setbackZ
  const upperX = setbackX / 2, upperZ = -setbackZ / 2
  for (let level = 0; level < floors; level++) {
    const y = level * floor
    const stepped = variant === 4 && level === floors - 1 && level > 0
    const bw = stepped ? upperW : w, bd = stepped ? upperD : d
    const bx = stepped ? upperX : 0, bz = stepped ? upperZ : 0
    box('Residential floor slabs', 'architecture', '#617382', bx, y + .035, bz, bw - skin * 2, .12, bd - skin * 2)
    box('Residential masonry', 'architecture', plaster, bx, y + floor / 2, bz - bd / 2 + skin / 2, bw, floor, skin)
    for (const side of [-1, 1]) {
      const sideWindow = opening(side * bd * .13, bd * (variant === 0 ? .32 : .27))
      wall(bd, floor, [sideWindow], bx + side * bw / 2, y, bz, side * Math.PI / 2)
    }
    if (variant === 1) {
      // The stair bay stays at the street plane. Living rooms retreat behind
      // full-depth balcony decks and the two structural cheeks on either side.
      const stair = level === 0 ? opening(0, coreW * .57, true)
        : { x: 0, y: floor * .38, w: coreW * .4, h: floor * .44 }
      wall(coreW, floor, [stair], coreX, y, d / 2)
      wall(livingW, floor, [opening(0, livingW * .72, true)], livingX, y, d / 2 - recess)
      box('Residential masonry', 'architecture', plaster, -w / 2 + coreW, y + floor / 2, 0, .16, floor, d - .4)
      slab('Residential balcony decks', livingX, y, d / 2 - recess / 2, livingW - .2, recess)
      if (level > 0) rail(livingX, y + .15, d / 2 - .09, livingW - .22)
    } else if (variant === 2) {
      const windows = [level === 0 ? opening(coreX, coreW * .5, true) : opening(coreX, coreW * .36)]
      for (let bay = 0; bay < 3; bay++) {
        windows.push({ x: livingX + (bay - 1) * livingW * .3, y: floor * .57, w: livingW * .275, h: floor * .66 })
      }
      wall(w, floor, windows, 0, y, d / 2)
      // An enclosed veranda has a continuous sill, ceiling and an interior
      // partition behind its glazing, all contained within the footprint.
      box('Residential veranda bands', 'architecture', '#6c7c86', livingX, y + floor - .08, d / 2 - .03, livingW, .16, .26)
      box('Residential veranda partitions', 'architecture', '#526370', livingX, y + floor / 2, d / 2 - recess, livingW - .2, floor, .12)
      box('Residential masonry', 'architecture', plaster, -w / 2 + coreW, y + floor / 2, 0, .16, floor, d - .4)
    } else {
      const windows = variant === 0
        ? [opening(-w * .3, w * .22), opening(0, w * .14, level === 0), opening(w * .3, w * .22)]
        : stepped
          ? [opening(-bw * .25, bw * .23, true), opening(bw * .22, bw * .3)]
          : [opening(-w * .26, w * .2, level === 0), opening(w * .22, w * .3)]
      wall(bw, floor, windows, bx, y, bz + bd / 2)
    }
  }
  const foundationDepth = spec.foundationDepth ?? 1.8
  box('Residential foundations', 'architecture', '#526676', 0, -foundationDepth / 2, 0, w + .18, foundationDepth, d + .18)
  builder.shelter(0, -.04, 0, w / 2 + .2, d / 2 + .2, .8)

  if (variant === 0) {
    // Straight metal slopes over a closed triangular attic, with no tile curls.
    const rise = floor * .55, halfDepth = d / 2 + .24
    const gable = new THREE.Shape()
    gable.moveTo(-d / 2, 0); gable.lineTo(d / 2, 0); gable.lineTo(0, rise); gable.closePath()
    const attic = new THREE.ExtrudeGeometry(gable, { depth: w, bevelEnabled: false, steps: 1, curveSegments: 1 })
    attic.rotateY(-Math.PI / 2); attic.translate(w / 2, h, 0)
    builder.geometry('Residential gabled attics', attic, plaster)
    const pitch = Math.atan2(rise, d / 2), eaveY = h - .24 * Math.tan(pitch)
    const length = halfDepth / Math.cos(pitch)
    for (const side of [-1, 1]) {
      const sheet = new THREE.BoxGeometry(w + .48, .075, length)
      sheet.rotateX(side * pitch); sheet.translate(0, (h + rise + eaveY) / 2 + .04, side * halfDepth / 2)
      builder.geometry('Residential pitched metal roofs', sheet, roofColor)
      if (detailed) for (let seam = 1; seam < 7; seam++) {
        const rib = new THREE.BoxGeometry(.025, .035, length)
        rib.rotateX(side * pitch); rib.translate((seam / 7 - .5) * (w + .48), (h + rise + eaveY) / 2 + .09, side * halfDepth / 2)
        builder.geometry('Residential standing seams', rib, '#435563')
      }
    }
    box('Residential metal ridges', 'metal', roofColor, 0, h + rise + .09, 0, w + .5, .1, .15)
    builder.shelter(0, h, 0, w / 2 + .26, d / 2 + .26, floor)
  } else if (variant === 4 && floors > 1) {
    const terraceY = (floors - 1) * floor
    // Two adjoining strips close the lower roof without filling the upper
    // floor's doorways. The occupied upper floor retreats on front and left.
    slab('Residential setback terraces', 0, terraceY, d / 2 - setbackZ / 2, w, setbackZ)
    slab('Residential setback terraces', -w / 2 + setbackX / 2, terraceY, upperZ, setbackX, upperD)
    rail(0, terraceY + .15, d / 2 - .09, w - .18)
    rail(-w / 2 + .09, terraceY + .15, 0, d - .18, Math.PI / 2)
    rail(w / 2 - .09, terraceY + .15, d / 2 - setbackZ / 2, setbackZ - .18, Math.PI / 2)
    rail(-w / 2 + setbackX / 2, terraceY + .15, -d / 2 + .09, setbackX - .18)
    slab('Residential flat roofs', upperX, h, upperZ, upperW + .08, upperD + .08)
    parapet(upperX, h + .15, upperZ, upperW, upperD)
  } else {
    slab('Residential flat roofs', 0, h, 0, w + .12, d + .12)
    if (variant === 3) {
      perimeterRail(h + .15)
      hatch(-w * .23, -d * .23)
    } else {
      parapet(0, h + .15, 0, w, d)
      if (variant === 2) {
        const exitW = coreW * .84, exitD = d * .36, exitH = floor * .82, exitZ = -d * .22
        const exitY = h + .15
        // A hollow access enclosure continues the entry/stair bay. Its door
        // uses the same recessed opening construction as the occupied floors.
        wall(exitW, exitH, [{ x: 0, y: exitH * .45, w: exitW * .6, h: exitH * .78, door: true }], coreX, exitY, exitZ + exitD / 2)
        for (const side of [-1, 1]) box('Residential roof stairwells', 'architecture', plaster, coreX + side * (exitW / 2 - .1), exitY + exitH / 2, exitZ, .2, exitH, exitD)
        box('Residential roof stairwells', 'architecture', plaster, coreX, exitY + exitH / 2, exitZ - exitD / 2 + .1, exitW, exitH, .2)
        slab('Residential roof access caps', coreX, exitY + exitH, exitZ, exitW + .16, exitD + .16)
      } else hatch(coreX, -d * .23)
    }
  }
  if (detailed) {
    // Drain follows the retained rear corner even on the setback duplex.
    box('Residential service metal', 'metal', '#5b6d7a', w / 2 - .1, h / 2, -d / 2 - .055, .065, h, .075)
  }
}
