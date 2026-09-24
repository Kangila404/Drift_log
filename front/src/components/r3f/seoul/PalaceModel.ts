import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { addPalaceSurface, createPalaceSign } from './PalaceMaterials.ts'

type V3 = [number, number, number]
type Surface = (u: number, t: number) => THREE.Vector3
type Roof = { width: number; depth: number; eave: number; rise: number }

const palette = {
  mortar: '#59697f',
  stone: '#7c8ba0',
  stoneLight: '#8794a8',
  stoneCool: '#74869e',
  stoneWarm: '#7e899d',
  wetStone: '#4a607f',
  roof: '#405374',
  roofLight: '#465a7b',
  roofDark: '#3a4c6c',
  roofEdge: '#506487',
  wood: '#40495f',
  vermilion: '#635b73',
  redLight: '#70677e',
  jade: '#4a6580',
  teal: '#3c5774',
  mint: '#70849d',
  ochre: '#838ba2',
  paper: '#8493aa',
  recess: '#283449',
  bronze: '#53647d',
  lantern: '#7c8ba3',
} as const
type Finish = keyof typeof palette
const TAU = Math.PI * 2

class Mason {
  private batches = new Map<Finish, THREE.BufferGeometry[]>()

  add(finish: Finish, geometry: THREE.BufferGeometry) {
    const flat = geometry.index ? geometry.toNonIndexed() : geometry
    if (flat !== geometry) geometry.dispose()
    flat.deleteAttribute('uv')
    let batch = this.batches.get(finish)
    if (!batch) this.batches.set(finish, batch = [])
    batch.push(flat)
  }

  box(finish: Finish, size: V3, position: V3) {
    this.add(finish, new THREE.BoxGeometry(...size).translate(...position))
  }

  rod(finish: Finish, a: V3 | THREE.Vector3, b: V3 | THREE.Vector3, radius: number, sides = 6, tip = radius) {
    const start = Array.isArray(a) ? new THREE.Vector3(...a) : a
    const end = Array.isArray(b) ? new THREE.Vector3(...b) : b
    const direction = end.clone().sub(start)
    const length = direction.length()
    if (length < 0.00001) return
    const geometry = new THREE.CylinderGeometry(tip, radius, length, Math.min(sides, 8))
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()))
    geometry.translate(...start.clone().add(end).multiplyScalar(0.5).toArray() as V3)
    this.add(finish, geometry)
  }

  shape(finish: Finish, shape: THREE.Shape, depth: number, z: number) {
    this.add(finish, new THREE.ExtrudeGeometry(shape, {
      depth, bevelEnabled: false, curveSegments: 32,
    }).translate(0, 0, z))
  }

  finish() {
    const group = new THREE.Group()
    group.name = 'Procedural Korean double-eaved palace gate'
    for (const [finish, pieces] of this.batches) {
      const geometry = mergeGeometries(pieces, false)!
      pieces.forEach(piece => piece.dispose())
      geometry.computeBoundingBox()
      geometry.computeBoundingSphere()
      const material = new THREE.MeshStandardMaterial({
        color: palette[finish],
        roughness: 0.98,
        metalness: 0,
        envMapIntensity: 0.12,
      })
      if (finish.toLowerCase().includes('stone')) addPalaceSurface(material, 'stone')
      if (finish === 'mortar' || finish.startsWith('roof')) addPalaceSurface(material, 'stone')
      if (['wood', 'vermilion', 'redLight', 'jade', 'teal', 'mint', 'ochre', 'paper', 'lantern'].includes(finish)) addPalaceSurface(material, 'wood')
      const mesh = new THREE.Mesh(geometry, material)
      mesh.name = `Palace / ${finish}`
      mesh.castShadow = finish !== 'lantern'
      mesh.receiveShadow = true
      group.add(mesh)
    }
    this.batches.clear()
    return group
  }
}

function polygon(points: [number, number][]) {
  // Dressing blocks contain sampled straight edges; keep only their actual corners.
  const corners = points.filter(([x, y], i) => {
    const a = points[(i + points.length - 1) % points.length]
    const b = points[(i + 1) % points.length]
    return Math.abs((x - a[0]) * (b[1] - y) - (y - a[1]) * (b[0] - x)) > 1e-8
  })
  const shape = new THREE.Shape()
  ;(corners.length >= 3 ? corners : points).forEach(([x, y], i) => i ? shape.lineTo(x, y) : shape.moveTo(x, y))
  shape.closePath()
  return shape
}

function archBase(m: Mason) {
  // Openings join the bottom boundary, so there are no touching Shape holes.
  const outline = new THREE.Shape()
  outline.moveTo(-11, -0.5)
  // The dressed vault owns the visible 1.6-radius opening; recess its backing slightly.
  const backingRadius = 1.604
  for (const x of [-6, 0, 6]) {
    outline.lineTo(x - backingRadius, -0.5)
    outline.lineTo(x - backingRadius, 2)
    outline.absarc(x, 2, backingRadius, Math.PI, 0, true)
    outline.lineTo(x + backingRadius, -0.5)
  }
  outline.lineTo(11, -0.5)
  outline.lineTo(11, 4.8)
  outline.lineTo(-11, 4.8)
  outline.closePath()
  m.shape('mortar', outline, 5.5, -2.75)

  const stones: Finish[] = ['stone', 'stoneCool', 'stoneLight', 'stoneWarm']
  const outerRadius = 1.98
  // Each dressing block is clipped against the outer arch ring, including the spring line.
  for (let row = 0; row < 10; row++) {
    const lo = -0.48 + row * 0.52 + 0.018
    const hi = Math.min(4.76, lo + 0.484)
    const breaks = [lo, ...[2, 3.98].filter(y => y > lo && y < hi), hi]
    for (let c = 0; c < 15; c++) {
      const x0 = -12.6 + c * 1.73 + (row % 2) * 0.865
      const x1 = x0 + 1.695
      if (x0 >= 11 || x1 <= -11) continue
      for (let band = 0; band < breaks.length - 1; band++) {
        const y0 = breaks[band], y1 = breaks[band + 1]
        const aboveArch = y0 >= 3.98
        for (let pier = 0; pier < (aboveArch ? 1 : 4); pier++) {
          const left: [number, number][] = [], right: [number, number][] = []
          for (let s = 0; s <= 16; s++) {
            const y = y0 + (y1 - y0) * s / 16
            const r = y <= 2 ? outerRadius : Math.sqrt(Math.max(0, outerRadius ** 2 - (y - 2) ** 2))
            const a = aboveArch || pier === 0 ? -11 : [-6, 0, 6][pier - 1] + r
            const b = aboveArch || pier === 3 ? 11 : [-6, 0, 6][pier] - r
            const l = Math.max(x0, a, -11), h = Math.min(x1, b, 11)
            if (h - l < 0.003) continue
            left.push([l, y]); right.push([h, y])
          }
          if (left.length < 2) continue
          const block = polygon([...left, ...right.reverse()])
          const finish = hi < 1.12 ? 'wetStone' : stones[(row * 13 + c * 7) % stones.length]
          m.shape(finish, block, 0.055, 2.752)
          m.shape(finish, block, 0.055, -2.807)
        }
      }
    }
    for (const side of [-1, 1]) {
      for (let j = -1; j < 4; j++) {
        const z0 = Math.max(-2.75, -2.75 + j * 1.7 + (row % 2) * 0.85)
        const z1 = Math.min(2.75, -2.75 + (j + 1) * 1.7 + (row % 2) * 0.85 - 0.025)
        if (z1 <= z0) continue
        m.box(hi < 1.12 ? 'wetStone' : stones[(row + j) % 4], [0.06, hi - lo, z1 - z0], [side * 11.025, (hi + lo) / 2, (z1 + z0) / 2])
      }
    }
  }

  for (const x of [-6, 0, 6]) {
    for (let i = 0; i < 15; i++) {
      const a = i * Math.PI / 15 + 0.007, b = (i + 1) * Math.PI / 15 - 0.007
      const ring: [number, number][] = []
      for (let n = 0; n <= 5; n++) {
        const angle = a + (b - a) * n / 5
        ring.push([x + 1.6 * Math.cos(angle), 2 + 1.6 * Math.sin(angle)])
      }
      for (let n = 5; n >= 0; n--) {
        const angle = a + (b - a) * n / 5
        ring.push([x + 1.96 * Math.cos(angle), 2 + 1.96 * Math.sin(angle)])
      }
      // Full-depth voussoirs give the vault a real stone soffit inside the passage.
      m.shape(stones[i % 4], polygon(ring), 5.64, -2.82)
    }
    for (const side of [-1, 1]) {
      for (let course = 0; course < 5; course++) {
        const y = -0.25 + course * 0.5
        m.box(course < 3 ? 'wetStone' : 'stoneLight', [0.36, 0.474, 5.64], [x + side * 1.78, y, 0])
      }
    }
  }
  m.box('stoneLight', [22.35, 0.22, 5.83], [0, 4.7, 0])
  m.box('stoneCool', [22.12, 0.1, 5.64], [0, 4.51, 0])

  for (const side of [-1, 1]) {
    m.box('stone', [1.56, 0.6, 5.55], [side * 10.25, 5.04, 0])
    m.box('stoneLight', [1.7, 0.16, 5.72], [side * 10.25, 5.41, 0])
    for (const z of [-2.65, -1.32, 0, 1.32, 2.65]) {
      m.box('stoneLight', [0.27, 0.79, 0.28], [side * 10.93, 5.2, z])
      m.box('stoneCool', [0.35, 0.11, 0.36], [side * 10.93, 5.65, z])
    }
  }
}

function surfaceGeometry(surface: Surface, nu: number, nt: number, offset = 0, underside = false) {
  const positions: number[] = [], indices: number[] = []
  for (let j = 0; j <= nt; j++) {
    for (let i = 0; i <= nu; i++) {
      const p = surface(-1 + 2 * i / nu, j / nt)
      positions.push(p.x, p.y + offset, p.z)
    }
  }
  const p = surface(0, 0.5)
  const normal = surface(0.01, 0.5).sub(p).cross(surface(0, 0.51).sub(p))
  const reverse = (normal.y < 0) !== underside
  for (let j = 0; j < nt; j++) {
    for (let i = 0; i < nu; i++) {
      const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1
      indices.push(...(reverse ? [a, c, b, b, c, d] : [a, b, c, b, d, c]))
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

// Continuous open-backed barrel tiles need no buried underside or internal end caps.
function curvedRidge(path: (t: number) => THREE.Vector3, steps: number, radius: number, half = true, endCap = false) {
  const sides = half ? 3 : 6
  const positions: number[] = [], indices: number[] = []
  for (let j = 0; j <= steps; j++) {
    const t = j / steps, center = path(t)
    const tangent = path(Math.min(1, t + 0.001)).sub(path(Math.max(0, t - 0.001))).normalize()
    const across = tangent.clone().cross(new THREE.Vector3(0, 1, 0)).normalize()
    const up = across.clone().cross(tangent).normalize()
    for (let i = 0; i <= sides; i++) {
      const angle = i / sides * (half ? Math.PI : TAU)
      const p = center.clone().addScaledVector(across, Math.cos(angle) * radius).addScaledVector(up, Math.sin(angle) * radius)
      positions.push(p.x, p.y, p.z)
    }
  }
  for (let j = 0; j < steps; j++) for (let i = 0; i < sides; i++) {
    const a = j * (sides + 1) + i, b = a + 1, c = a + sides + 1, d = c + 1
    indices.push(a, c, b, b, c, d)
  }
  if (endCap) {
    const center = path(1), index = positions.length / 3, ring = steps * (sides + 1)
    positions.push(center.x, center.y, center.z)
    for (let i = 0; i < sides; i++) indices.push(index, ring + i + 1, ring + i)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function roof(m: Mason, spec: Roof) {
  const { width: w, depth: d, eave, rise } = spec
  const shoulder = 0.36, ridgeHalf = w * 0.315
  const ornamentScale = Math.min(1, rise / 1.2, d / 3)
  const height = (t: number) => eave + rise * (1 - t) ** 2
  const extent = (t: number) => ridgeHalf + (w / 2 - ridgeHalf) * Math.max(0, (t - shoulder) / (1 - shoulder))
  const lift = (u: number, t: number) => Math.min(0.48, rise * 0.2) * u ** 8 * t ** 3
  const surfaces: Surface[] = []
  for (const sign of [-1, 1]) {
    surfaces.push((u, t) => new THREE.Vector3(u * extent(t), height(t) + lift(u, t), sign * t * d / 2))
  }
  for (const sign of [-1, 1]) {
    surfaces.push((u, v) => {
      const t = shoulder + (1 - shoulder) * v
      return new THREE.Vector3(sign * extent(t), height(t) + lift(u, t), u * t * d / 2)
    })
  }

  surfaces.forEach((intactSurface, face) => {
    const damageCenter = eave > 10 ? -0.48 : 0.54
    const damagedFace = eave > 10 ? 0 : 1
    const damaged = (u: number) => face === damagedFace && Math.abs(u - damageCenter) < 0.115
    // A local settled eave and missing cover tiles leave the hip and ridge recognizable.
    const surface: Surface = (u, t) => {
      const p = intactSurface(u, t)
      const patch = face === damagedFace ? Math.max(0, 1 - Math.abs(u - damageCenter) / 0.19) : 0
      p.y -= Math.min(0.25, rise * 0.1) * patch * THREE.MathUtils.smoothstep(t, 0.65, 1)
      return p
    }
    const acrossSteps = Math.max(6, Math.ceil((face < 2 ? w : d) / 1.5))
    const slopeSteps = Math.max(4, Math.ceil(Math.sqrt(rise) * 4))
    m.add('roof', surfaceGeometry(surface, acrossSteps, slopeSteps))
    m.add('wood', surfaceGeometry(surface, acrossSteps, Math.max(3, slopeSteps - 2), -0.2, true))
    const tileColumns = Math.max(2, Math.round((face < 2 ? w : d) / 0.34))
    const run = face < 2 ? d / 2 : w / 2 - ridgeHalf
    const tileRows = Math.max(3, Math.ceil(Math.hypot(run, rise * (face < 2 ? 1 : 0.41)) / 0.4))
    for (let col = 0; col <= tileColumns; col++) {
      const u = -1 + 2 * col / tileColumns
      m.add('roof', curvedRidge(t => {
        const p = surface(u, t * (damaged(u) ? 0.72 + (col % 3) * 0.045 : 1))
        p.y += 0.05
        return p
      }, slopeSteps, 0.064))
      const tip = surface(u, 1)
      // Round end caps read as traditional tile ends, not a wire outline.
      const behind = surface(u, 0.975)
      tip.y += 0.025; behind.y += 0.025
      if (!damaged(u)) m.add('roofEdge', curvedRidge(t => behind.clone().lerp(tip, t), 1, 0.078, true, true))
      if (col % 2 === 0) {
        const rafterEnd = surface(u, 0.987), rafterStart = surface(u, 0.67)
        rafterEnd.y -= 0.22; rafterStart.y -= 0.22
        m.rod(col % 4 ? 'jade' : 'redLight', rafterStart, rafterEnd, 0.065, 4)
      }
    }
    // Low, broad overlapping pans fill the spaces between cylindrical cover tiles.
    for (let row = 1; row <= tileRows; row++) {
      const t = row / tileRows
      const strip: Surface = (u, v) => {
        const p = surface(u, Math.max(0, t - 0.022 + v * 0.022))
        p.y += 0.012 + v * 0.018
        return p
      }
      m.add(row % 3 ? 'roof' : 'roofDark', surfaceGeometry(strip, acrossSteps, 1))
    }
    // Closed fascia connects the upper skin to its soffit, with two substantial lip courses.
    const lipSteps = Math.max(10, acrossSteps)
    for (let i = 0; i < lipSteps; i++) {
      const a = surface(-1 + 2 * i / lipSteps, 1), b = surface(-1 + 2 * (i + 1) / lipSteps, 1)
      const quad = new THREE.BufferGeometry()
      quad.setAttribute('position', new THREE.Float32BufferAttribute([
        a.x, a.y, a.z, b.x, b.y - 0.2, b.z, b.x, b.y, b.z,
        a.x, a.y, a.z, a.x, a.y - 0.2, a.z, b.x, b.y - 0.2, b.z,
      ], 3))
      // Surface ordering differs on opposite roof faces.
      const normal = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3(0, -1, 0))
      const outward = new THREE.Vector3(a.x, 0, a.z)
      if (normal.dot(outward) > 0) {
        const attr = quad.getAttribute('position')
        for (let j = 0; j < 6; j += 3) {
          const p1 = new THREE.Vector3().fromBufferAttribute(attr, j + 1)
          const p2 = new THREE.Vector3().fromBufferAttribute(attr, j + 2)
          attr.setXYZ(j + 1, p2.x, p2.y, p2.z); attr.setXYZ(j + 2, p1.x, p1.y, p1.z)
        }
      }
      quad.computeVertexNormals()
      m.add('roofDark', quad)
    }
    for (const [finish, offset] of [['roofEdge', -0.065], ['teal', -0.205]] as const) {
      m.add(finish, curvedRidge(t => {
        const p = surface(-1 + 2 * t, 1)
        p.y += offset
        return p
      }, lipSteps, 0.065, false))
    }
  })

  for (const side of [-1, 1]) {
    // Small upper gables distinguish this roof from a pyramid or generic hip roof.
    const points: [number, number][] = []
    for (let i = 0; i <= 24; i++) {
      const z = -shoulder * d / 2 + shoulder * d * i / 24
      points.push([z, height(Math.abs(z) / (d / 2)) - 0.035])
    }
    const gable = new THREE.ExtrudeGeometry(polygon(points), { depth: 0.12, bevelEnabled: false })
    gable.rotateY(Math.PI / 2).translate(side * ridgeHalf - 0.06, 0, 0)
    m.add('teal', gable)
    for (let j = -4; j <= 4; j++) {
      const z = j * shoulder * d / 10
      const bottom = height(shoulder) + 0.06, top = height(Math.abs(z) / (d / 2)) - 0.12
      if (top > bottom) m.box('mint', [0.15, top - bottom, 0.055], [side * ridgeHalf, (top + bottom) / 2, z])
    }
    for (const zSign of [-1, 1]) {
      m.add('roofLight', curvedRidge(t => new THREE.Vector3(side * extent(t), height(t) + lift(1, t) + 0.1, zSign * t * d / 2), Math.max(6, Math.ceil(Math.sqrt(rise) * 6)), 0.105, false))
    }
  }
  const ridgeEnd = ridgeHalf + 0.36 * ornamentScale, ridgeY = eave + rise + 0.14 * ornamentScale
  m.rod('roofEdge', [-ridgeEnd, ridgeY, 0], [ridgeEnd, ridgeY, 0], 0.16 * ornamentScale, 8)
  m.box('roofLight', [ridgeEnd * 2, 0.2 * ornamentScale, 0.24 * ornamentScale], [0, ridgeY - 0.15 * ornamentScale, 0])
  for (const side of [-1, 1]) {
    const x = side * (ridgeHalf + 0.31 * ornamentScale), y = eave + rise + 0.17 * ornamentScale
    m.rod('roofLight', [x, y, 0], [x + side * 0.19 * ornamentScale, y + 0.27 * ornamentScale, 0], 0.17 * ornamentScale, 8, 0.09 * ornamentScale)
  }
}

function hall(m: Mason, floor: number, top: number, width: number, depth: number, bays: number) {
  const half = width / 2, zFace = depth / 2, spacing = width / bays
  m.box('wood', [width + 0.58, 0.25, depth + 0.6], [0, floor + 0.08, 0])
  m.box('vermilion', [width + 0.42, 0.15, depth + 0.42], [0, floor + 0.24, 0])
  m.box('recess', [width - 0.22, top - floor - 0.45, depth - 0.24], [0, (floor + top) / 2, 0])
  for (const side of [-1, 1]) {
    const z = side * zFace
    m.box('vermilion', [width + 0.55, 0.25, 0.3], [0, top - 0.12, z])
    m.box('jade', [width + 0.65, 0.18, 0.39], [0, top + 0.12, z])
    m.box('ochre', [width + 0.55, 0.045, 0.41], [0, top + 0.13, z])
    for (let bay = 0; bay < bays; bay++) {
      const center = -half + (bay + 0.5) * spacing
      const panelWidth = spacing - 0.4
      const bottom = floor + (bay === 0 || bay === bays - 1 ? 0.92 : 0.72), panelTop = top - 0.38
      const panelHeight = panelTop - bottom
      const broken = side === 1 ? bay === (floor > 9 ? 1 : 4) : floor < 9 && bay === 1
      if (broken) {
        m.box('paper', [panelWidth * 0.21, panelHeight * 0.64, 0.085], [center - panelWidth * 0.395, panelTop - panelHeight * 0.32, z - side * 0.045])
        m.box('paper', [panelWidth * 0.28, panelHeight * 0.19, 0.085], [center + panelWidth * 0.36, bottom + panelHeight * 0.095, z - side * 0.045])
      } else {
        m.box('paper', [panelWidth, panelHeight, 0.085], [center, (bottom + panelTop) / 2, z - side * 0.045])
      }
      m.box('wood', [panelWidth + 0.06, bottom - floor - 0.3, 0.12], [center, (bottom + floor + 0.3) / 2, z + side * 0.055])
      for (const leaf of [-1, 1]) {
        m.box('vermilion', [panelWidth * 0.44, bottom - floor - 0.46, 0.045], [center + leaf * panelWidth * 0.25, (bottom + floor + 0.3) / 2, z + side * 0.13])
      }
      for (let j = 0; j <= 6; j++) {
        const x = center - panelWidth / 2 + j * panelWidth / 6
        if (broken && j > 1 && j < 6) {
          if (j === 3 || j === 5) m.rod('wood', [x, bottom, z + side * 0.09], [x + 0.09, bottom + panelHeight * (j === 3 ? 0.28 : 0.46), z + side * 0.15], 0.025, 4)
          continue
        }
        m.box(j % 3 ? 'jade' : 'vermilion', [j % 3 ? 0.042 : 0.085, panelHeight + 0.04, 0.1], [x, (bottom + panelTop) / 2, z + side * 0.09])
      }
      const rows = floor > 9 ? 3 : 4
      for (let j = 0; j <= rows; j++) {
        if (broken && j > 0 && j < rows) {
          m.box('wood', [panelWidth * 0.23, 0.044, 0.1], [center - panelWidth * 0.385, bottom + j * panelHeight / rows, z + side * 0.1])
          continue
        }
        m.box('jade', [panelWidth, 0.044, 0.1], [center, bottom + j * panelHeight / rows, z + side * 0.1])
      }
      m.box('redLight', [panelWidth + 0.12, 0.085, 0.14], [center, panelTop + 0.04, z + side * 0.035])
      bracket(m, center, top, z, side, false)
    }
    for (let i = 0; i <= bays; i++) {
      const x = -half + i * spacing
      m.rod('vermilion', [x, floor + 0.29, z], [x, top, z], 0.18, 12, 0.145)
      m.rod('stoneLight', [x, floor + 0.22, z], [x, floor + 0.39, z], 0.235, 10)
      m.box('redLight', [0.38, 0.13, 0.38], [x, top - 0.24, z])
      bracket(m, x, top, z, side, true)
    }
  }
  for (const side of [-1, 1]) {
    const x = side * half
    m.box('jade', [0.32, 0.2, depth + 0.35], [x, top + 0.08, 0])
    m.box('vermilion', [0.25, 0.23, depth + 0.25], [x, top - 0.13, 0])
    m.box('paper', [0.09, top - floor - 0.83, depth - 0.55], [x, (top + floor) / 2, 0])
    for (let i = 0; i <= 16; i++) {
      const z = -zFace + 0.25 + (depth - 0.5) * i / 16
      m.box('jade', [0.13, top - floor - 0.7, 0.038], [x + side * 0.05, (top + floor) / 2, z])
    }
    for (let j = 0; j <= 5; j++) {
      m.box('jade', [0.14, 0.04, depth - 0.5], [x + side * 0.055, floor + 0.46 + j * (top - floor - 0.85) / 5, 0])
    }
    m.rod('vermilion', [x, floor + 0.3, 0], [x, top, 0], 0.18, 12, 0.145)
    for (let j = -1; j <= 1; j++) {
      m.box('jade', [0.85, 0.15, 0.22], [x + side * 0.16, top + 0.08, j * depth / 3])
      m.box('mint', [1.16, 0.1, 0.14], [x + side * 0.29, top + 0.23, j * depth / 3])
    }
  }
}

function bracket(m: Mason, x: number, y: number, z: number, side: number, full: boolean) {
  const spread = full ? 1 : 0.72
  m.box('teal', [0.31, 0.21, 0.37], [x, y - 0.02, z])
  for (let level = 0; level < 3; level++) {
    const reach = (0.48 + level * 0.25) * spread
    const yy = y + level * 0.15
    m.box(level % 2 ? 'jade' : 'teal', [reach, 0.13, 0.25], [x, yy, z + side * level * 0.12])
    m.box('jade', [0.2, 0.12, 0.48 + level * 0.28], [x, yy + 0.055, z + side * 0.13])
    for (const direction of [-1, 1]) {
      m.box('mint', [0.12, 0.1, 0.28], [x + direction * reach * 0.43, yy + 0.075, z + side * level * 0.12])
      m.box('ochre', [0.065, 0.045, 0.025], [x + direction * reach * 0.43, yy + 0.075, z + side * (level * 0.12 + 0.15)])
    }
  }
}

function lantern(m: Mason, x: number, y: number, z: number) {
  m.rod('bronze', [x, y + 0.24, z], [x, y + 0.53, z], 0.018, 6)
  m.rod('lantern', [x, y - 0.17, z], [x, y + 0.17, z], 0.135, 8)
  for (let i = 0; i < 8; i++) {
    const a = i * TAU / 8
    const xx = x + Math.cos(a) * 0.137, zz = z + Math.sin(a) * 0.137
    m.rod('bronze', [xx, y - 0.18, zz], [xx, y + 0.18, zz], 0.011, 5)
  }
  for (const sign of [-1, 1]) {
    m.rod('bronze', [x, y + sign * 0.17, z], [x, y + sign * 0.22, z], 0.17, 8)
  }
  m.rod('redLight', [x, y - 0.22, z], [x, y - 0.35, z], 0.018, 6)
}

/** Deterministic material-batched solids; the scene owns lighting, water, and camera. */
export function createPalaceModel() {
  const m = new Mason()
  archBase(m)
  hall(m, 4.8, 7.4, 18, 5, 6)
  roof(m, { width: 25, depth: 9, eave: 7.6, rise: 2.6 })
  hall(m, 9.5, 11.4, 13.5, 4, 5)
  roof(m, { width: 20.5, depth: 7.5, eave: 11.6, rise: 2.4 })
  lantern(m, -7.5, 6.76, 2.88)
  lantern(m, 4.5, 6.83, -2.88)
  lantern(m, 4.05, 10.79, 2.36)
  m.box('wood', [2.24, 0.94, 0.19], [0, 10.96, 2.2])
  m.box('ochre', [2.12, 0.83, 0.035], [0, 10.96, 2.31])
  const model = m.finish()
  const sign = createPalaceSign()
  if (sign) model.add(sign)
  return model
}

export function createPalaceRoofModel({ width, depth, rise }: { width: number; depth: number; rise: number }) {
  if (![width, depth, rise].every(value => Number.isFinite(value) && value > 0)) {
    throw new Error('PalaceRoof width, depth and rise must be positive finite numbers')
  }
  const m = new Mason()
  roof(m, { width, depth, rise, eave: 0 })
  return m.finish()
}
