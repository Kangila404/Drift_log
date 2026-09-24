import * as THREE from 'three'
import { buildSeoulResidence } from './SeoulResidentialBuilding'

export type SeoulSurfaceKind = 'architecture' | 'terrain' | 'metal'
export interface SeoulModeledPart { name: string; kind: SeoulSurfaceKind; geometry: THREE.BufferGeometry }
export const SEOUL_MODELED_FRAMING = { desktopDistance: 90, portraitDistance: 104, orbitLimit: .16, zoomMin: .8, zoomMax: 1.15 }

// Modeled hillside composition with structurally aligned residential buildings.
// World units are shared with the ocean; all objects have depth and surface normals.
export function buildSeoulModeledCity(width: number, height: number): SeoulModeledPart[] {
  if (!(width > 0 && height > 0 && Number.isFinite(width + height))) throw new Error('Invalid Seoul viewport')
  const portrait = width / height < .9
  const distance = portrait ? SEOUL_MODELED_FRAMING.portraitDistance : SEOUL_MODELED_FRAMING.desktopDistance
  const visible = (depth: number) => 2 * Math.tan(THREE.MathUtils.degToRad(14)) * (distance - depth) * width / height
  const palettes = {
    plaster: ['#8492a0', '#6e8095', '#a0a9b3', '#778491', '#758a9b'],
  }
  const buffers = new Map<string, { kind: SeoulSurfaceKind; p: number[]; n: number[]; c: number[]; ao: number[] }>()
  type Shelter = { x: number; y: number; z: number; rx: number; rz: number; cos: number; sin: number; reach: number }
  const shelters: Shelter[] = []
  const foundations: Shelter[] = []
  const color = new THREE.Color(), matrix = new THREE.Matrix4(), normalMatrix = new THREE.Matrix3()
  const point = new THREE.Vector3(), normal = new THREE.Vector3(), rotation = new THREE.Quaternion()
  const yAxis = new THREE.Vector3(0, 1, 0), position = new THREE.Vector3(), scale = new THREE.Vector3()
  const batch = (name: string, kind: SeoulSurfaceKind) => {
    if (!buffers.has(name)) buffers.set(name, { kind, p: [], n: [], c: [], ao: [] })
    return buffers.get(name)!
  }
  const put = (name: string, kind: SeoulSurfaceKind, geometry: THREE.BufferGeometry, tint: string, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, yaw = 0) => {
    const out = batch(name, kind)
    position.set(x, y, z); scale.set(sx, sy, sz); rotation.setFromAxisAngle(yAxis, yaw)
    matrix.compose(position, rotation, scale); normalMatrix.getNormalMatrix(matrix)
    const mesh = geometry
    const p = mesh.getAttribute('position'), n = mesh.getAttribute('normal'), index = mesh.index
    color.set(tint)
    for (let i = 0; i < (index?.count ?? p.count); i++) {
      const j = index ? index.getX(i) : i
      point.fromBufferAttribute(p, j).applyMatrix4(matrix)
      normal.fromBufferAttribute(n, j).applyMatrix3(normalMatrix).normalize()
      out.p.push(point.x, point.y, point.z); out.n.push(normal.x, normal.y, normal.z)
      out.c.push(color.r, color.g, color.b)
      out.ao.push(normal.y < -.5 ? .67 : 1)
    }
    geometry.dispose()
  }
  const box = (name: string, kind: SeoulSurfaceKind, tint: string, x: number, y: number, z: number, w: number, h: number, d: number, yaw = 0) =>
    put(name, kind, new THREE.BoxGeometry(1, 1, 1), tint, x, y, z, w, h, d, yaw)
  const cylinder = (name: string, kind: SeoulSurfaceKind, tint: string, x: number, y: number, z: number, top: number, bottom: number, h: number, sides = 10) =>
    put(name, kind, new THREE.CylinderGeometry(top, bottom, h, sides), tint, x, y, z)
  const surface = (cols: number, rows: number, sample: (u: number, v: number) => [number, number, number]) => {
    const p: number[] = [], indices: number[] = []
    for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) p.push(...sample(i / cols, j / rows))
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const a = j * (cols + 1) + i, b = a + cols + 1
      indices.push(a, a + 1, b, a + 1, b + 1, b)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setIndex(indices); g.computeVertexNormals()
    return g
  }

  const towerX = -visible(-68) * (portrait ? .30 : .25), towerZ = -79
  const ridgeElevation = (layer: number, x: number, z: number) => {
    const depth = -110 + layer * 24, reach = visible(depth) * .68, u = x / reach
    const peak = (center: number, breadth: number, height: number) => height * Math.exp(-Math.pow((u - center) / breadth, 2))
    const crest = layer === 2
      ? 1.4 + peak(towerX / reach, portrait ? .3 : .18, portrait ? 6 : 9) + peak(.42, .36, 5.6)
      : 1 + peak(-.64 + layer * .13, .32, 6.8) + peak(.18 + layer * .2, .3, layer === 0 ? 18 : 16) + peak(.77, .23, 5.2)
    const shoulder = Math.exp(-Math.pow((z - depth + 12) / 21, 2))
    return -8 + (crest + 8 + .12 * Math.sin(u * 29 + layer)) * shoulder
  }
  // Broad, asymmetric summits share continuous shoulders rather than scalloped strips.
  for (let layer = 0; layer < 3; layer++) {
    const depth = -110 + layer * 24, span = visible(depth) * .68
    put(`Distant ridge ${layer}`, 'terrain', surface(128, 16, (u, v) => {
      const x = (u * 2 - 1) * span, z = depth + 24 - v * 72
      return [x, ridgeElevation(layer, x, z), z]
    }), ['#526880', '#475f78', '#3c556d'][layer])
  }

  // The tower is a modeled shaft, observation deck, windows, rings and antenna.
  const towerY = ridgeElevation(2, towerX, towerZ) - .3
  const tower = 'N Seoul Tower landmark'
  cylinder(tower, 'architecture', '#94a4b5', towerX, towerY + 4.6, towerZ, .32, .62, 9.2, 16)
  cylinder(tower, 'architecture', '#92a4b7', towerX, towerY + 9, towerZ, 1.18, .75, .7, 20)
  cylinder(tower, 'architecture', '#4f697f', towerX, towerY + 9.55, towerZ, 1.04, 1.12, .45, 20)
  for (let i = 0; i < 3; i++) cylinder(tower, 'architecture', '#97a9ba', towerX, towerY + 9.38 + i * .25, towerZ, 1.15 - i * .08, 1.15 - i * .08, .09, 20)
  cylinder(tower, 'architecture', '#94a7b9', towerX, towerY + 10.25, towerZ, .3, 1.03, .8, 20)
  cylinder(tower, 'architecture', '#8fa2b4', towerX, towerY + 12.1, towerZ, .055, .18, 3.6, 8)
  cylinder(tower, 'architecture', '#899eb3', towerX, towerY + 14.9, towerZ, .018, .045, 2, 6)
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2
    cylinder(tower, 'architecture', '#728a9f', towerX + Math.sin(a) * 1.08, towerY + 9.62, towerZ + Math.cos(a) * 1.08, .022, .022, .38, 4)
  }

  const span = visible(-12), left = -span * (portrait ? .22 : .19), right = span * (portrait ? .58 : .65)
  const bankWidth = right - left
  const front = (x: number) => 1.1 + Math.sin((x - left) / bankWidth * 8) * 1.8
  const naturalHeight = (x: number, z: number) => {
    const u = (x - left) / bankWidth
    const crest = 7 + (portrait ? 11 : 15) * THREE.MathUtils.smoothstep(u, -.08, 1.15)
      + 2.5 * Math.exp(-Math.pow((u - .32) / .2, 2))
      - 2.3 * Math.exp(-Math.pow((u - .59) / .11, 2))
      + 2 * Math.exp(-Math.pow((u - .86) / .2, 2))
    const shoulder = Math.exp(-Math.pow((z + 20 - 5 * Math.sin(u * 5)) / 27, 2))
    const folds = .7 * Math.sin(u * 11 + z * .035) + .35 * Math.sin(u * 19 - z * .065)
    const height = -6 + (crest + folds) * shoulder
    const toe = THREE.MathUtils.smoothstep(front(x) + 8 - z, 0, 12)
    return THREE.MathUtils.lerp(-8, height, toe)
  }
  // Authored lots break up the old repeated diagonal rows. Depth is a street position,
  // not a screen-space offset; only the waterfront lots use the coastline as origin.
  const lots: [number, number, number][] = portrait ? [
    [.14, -29, 0], [.37, -27, 1], [.66, -30, 4], [.88, -26, 0],
    [.33, -22, 0], [.20, -17, 2], [.45, -14, 3], [.77, -17, 1], [.88, -12, 4],
    [.15, -6, 3], [.37, -5, 4], [.69, -6, 2], [.91, -8, 3],
    [.21, 4, 0], [.46, 6, 2], [.70, 4, 1],
  ] : [
    [.12, -29, 0], [.26, -25, 1], [.40, -28, 4], [.68, -27, 0], [.85, -29, 3],
    [.33, -21, 3], [.57, -32, 1], [.77, -23, 0],
    [.09, -16, 3], [.24, -15, 2], [.37, -12, 1], [.49, -19, 0], [.67, -16, 4], [.82, -13, 1],
    [.09, -8, 1],
    [.14, -4, 4], [.31, -3, 0], [.47, -6, 3], [.69, -4, 2], [.87, -4, 4],
    [.19, 4, 0], [.40, 6, 2], [.67, 4, 3], [.87, 5, 1],
  ]
  const sites = lots.map(([plot, depth, type], index) => {
    const u = plot > .65 ? .65 + (plot - .65) * (portrait ? .6 : .5) : plot
    const shoreline = depth > 0, x = left + u * bankWidth, z = shoreline ? front(x) + depth : depth
    const widthRatio = (portrait ? [.173, .117, .203, .148, .163] : [.074, .048, .099, .063, .077])[type]
    const w = bankWidth * widthRatio, d = w * [ .66, .94, .58, .82, .8 ][type]
    const floors = [2, 4, 3, 2, 3][type] - (type === 2 && !shoreline ? 1 : 0)
    const floor = Math.min(1.85, w * (type === 1 ? .58 : .38))
    const yaw = (shoreline ? [-.12, .16, -.07, .08, -.15] : [.08, -.11, .14, -.05, .17])[type]
    // Street-facing corners set the entry level; the uphill rear is a semi-basement.
    const ground = Math.max(...[-1, 1].map(sx =>
      naturalHeight(x + sx * w / 2 * Math.cos(yaw) + d / 2 * Math.sin(yaw), z - sx * w / 2 * Math.sin(yaw) + d / 2 * Math.cos(yaw))))
    const base = shoreline ? -4.1 - (index % 3) * .42 : ground + .08
    return { x, z, type, w, d, floors, floor, base, yaw, shoreline, index }
  })
  const bankHeight = naturalHeight
  put('Eroded hillside', 'terrain', surface(112, 64, (u, v) => {
    const x = left + u * bankWidth, z = front(x) + 8 - v * 82
    return [x, bankHeight(x, z), z]
  }), '#40586c')
  put('Submerged embankment', 'terrain', surface(72, 3, (u, v) => {
    const x = left + u * bankWidth
    return [x, -12 + v * 4, front(x) + 8]
  }), '#405669')

  // A narrow footpath follows the natural slope. No trench cuts the entire hill.
  const alleyCenter = (z: number) => left + bankWidth * (.565 + .025 * Math.sin((z + 5) * .11))
  for (let step = 0; step < 54; step++) {
    const z = 5 - step * .56, x = alleyCenter(z), y = bankHeight(x, z) + .09
    const nextZ = z - .56, nextY = bankHeight(alleyCenter(nextZ), nextZ) + .09
    const rise = Math.abs(nextY - y) + .12
    const yaw = Math.atan2(alleyCenter(z + .1) - alleyCenter(z - .1), .2)
    box('Flooded stair alley', 'architecture', '#627585', x, Math.min(y, nextY) + rise / 2 - .1, z, portrait ? .68 : .9, rise, .61, yaw)
  }
  for (const site of sites) {
    const { x, z, type, w, d, floors, floor, base, yaw, shoreline, index } = site
    const local = (lx: number, ly: number, lz: number): [number, number, number] => [x + lx * Math.cos(yaw) + lz * Math.sin(yaw), base + ly, z - lx * Math.sin(yaw) + lz * Math.cos(yaw)]
    const shelter = (lx: number, ly: number, lz: number, rx: number, rz: number, reach = 1.5) => {
      const [px, py, pz] = local(lx, ly, lz)
      shelters.push({ x: px, y: py, z: pz, rx, rz, cos: Math.cos(yaw), sin: Math.sin(yaw), reach })
    }
    const plaster = palettes.plaster[index % palettes.plaster.length]
    foundations.push({ x, y: base, z, rx: w / 2, rz: d / 2, cos: Math.cos(yaw), sin: Math.sin(yaw), reach: floors * floor })
    const cornerGround = [-1, 1].flatMap(sx => [-1, 1].map(sz => {
      const [cx, , cz] = local(sx * (w / 2 + .25), 0, sz * (d / 2 + .25))
      return naturalHeight(cx, cz)
    }))
    const foundationDepth = shoreline ? 1.8 : Math.max(.8, base - Math.min(...cornerGround) + .25)
    if (!shoreline) {
      box('Residential street landings', 'architecture', '#657888', ...local(0, -.07, d / 2 + .32), w + .28, .14, .66, yaw)
      shelter(0, -.14, d / 2 + .32, w / 2 + .2, .42, .9)
    }
    buildSeoulResidence({ width: w, depth: d, floors, storey: floor, variant: type, plaster, detailed: shoreline || z > -10, foundationDepth }, {
      box: (group, kind, tint, lx, ly, lz, a, b, c, turn = 0) =>
        box(group, kind, tint, ...local(lx, ly, lz), a, b, c, yaw + turn),
      geometry: (group, geometry, tint) => {
        geometry.rotateY(yaw); geometry.translate(x, base, z)
        put(group, 'architecture', geometry, tint)
      },
      shelter,
    })
  }
  // Bake local shelter into a vertex attribute once. Spatial bins bound CPU work;
  // this adds no shadow camera, texture, or screen-space pass to mobile frames.
  const cells = new Map<string, Shelter[]>(), cellSize = 5
  for (const roof of shelters) {
    const radius = Math.hypot(roof.rx, roof.rz) + .7
    for (let x = Math.floor((roof.x - radius) / cellSize); x <= Math.floor((roof.x + radius) / cellSize); x++) {
      for (let z = Math.floor((roof.z - radius) / cellSize); z <= Math.floor((roof.z + radius) / cellSize); z++) {
        const key = `${x},${z}`
        if (!cells.has(key)) cells.set(key, [])
        cells.get(key)!.push(roof)
      }
    }
  }
  return [...buffers].map(([name, { kind, p, n, c, ao }]) => {
    for (let i = 0; i < ao.length; i++) {
      const x = p[i * 3], y = p[i * 3 + 1], z = p[i * 3 + 2]
      if (z < -42) continue
      const nearby = cells.get(`${Math.floor(x / cellSize)},${Math.floor(z / cellSize)}`) ?? []
      for (const roof of nearby) {
        const drop = roof.y - y
        if (drop < .025 || drop > roof.reach) continue
        const dx = x - roof.x, dz = z - roof.z
        const lx = dx * roof.cos - dz * roof.sin, lz = dx * roof.sin + dz * roof.cos
        const edge = Math.max(Math.abs(lx) - roof.rx, Math.abs(lz) - roof.rz)
        const coverage = 1 - THREE.MathUtils.smoothstep(edge, -.1, .45)
        const shelter = coverage * (1 - THREE.MathUtils.smoothstep(drop, .05, roof.reach))
        ao[i] = Math.min(ao[i], 1 - shelter * .64)
      }
      if (kind === 'terrain') for (const body of foundations) {
        if (y < body.y - .8 || y > body.y + body.reach) continue
        const dx = x - body.x, dz = z - body.z
        const edgeX = Math.max(0, Math.abs(dx * body.cos - dz * body.sin) - body.rx)
        const edgeZ = Math.max(0, Math.abs(dx * body.sin + dz * body.cos) - body.rz)
        const contact = 1 - THREE.MathUtils.smoothstep(Math.hypot(edgeX, edgeZ), .05, .9)
        ao[i] = Math.min(ao[i], 1 - contact * .4)
      }
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(p, 3))
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3))
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(c, 3))
    geometry.setAttribute('seoulOcclusion', new THREE.Float32BufferAttribute(ao, 1))
    geometry.computeBoundingBox(); geometry.computeBoundingSphere()
    return { name, kind, geometry }
  })
}
