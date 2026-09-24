import * as THREE from 'three'

type MarineKind = 'whale' | 'dolphin'
type Section = readonly [z: number, width: number, centerY: number, upper: number, lower: number]
type Ring = { center: THREE.Vector3; u: THREE.Vector3; v: THREE.Vector3 }

// Fresh anatomical sections: NOAA PMEL humpback anatomy and NOAA Fisheries
// bottlenose photographs; +Z is the rostrum, +Y is dorsal. No scene placement.
const WHALE: readonly Section[] = [
  [-4.9, 0, -.15, 0, 0], [-4.65, .19, -.15, .21, .20],
  [-3.9, .29, -.12, .32, .29], [-3, .48, -.06, .48, .41],
  [-2, .75, 0, .70, .60], [-1, 1.10, -.04, .96, .89],
  [0, 1.40, -.06, 1.17, 1.18], [1, 1.50, -.02, 1.28, 1.28],
  [2, 1.45, .03, 1.17, 1.15], [3, 1.32, .10, .92, .96],
  [4, 1.18, .18, .64, .71], [4.8, .97, .23, .43, .51],
  [5.15, .73, .24, .31, .40], [5.38, .41, .24, .19, .26],
  [5.5, 0, .24, 0, 0],
]

const DOLPHIN: readonly Section[] = [
  [-1.52, 0, -.03, 0, 0], [-1.36, .055, -.03, .095, .075],
  [-1.05, .105, -.02, .14, .12], [-.65, .205, -.015, .23, .21],
  [-.20, .305, 0, .31, .30], [.25, .35, 0, .35, .35],
  [.65, .315, .005, .32, .30], [.93, .245, .005, .275, .235],
  [1.10, .16, -.005, .205, .155], [1.23, .105, -.065, .08, .075],
  [1.48, .087, -.065, .062, .062], [1.63, .051, -.065, .042, .046],
  [1.7, 0, -.065, 0, 0],
]

// Shape-preserving Hermite interpolation avoids shoulders ringing or the
// narrow tail stock going negative between the measured design sections.
function sectionAt(sections: readonly Section[], z: number): number[] {
  let i = 0
  while (i < sections.length - 2 && z > sections[i + 1][0]) i++
  const a = sections[i], b = sections[i + 1]
  const span = b[0] - a[0]
  const t = THREE.MathUtils.clamp((z - a[0]) / span, 0, 1)
  const slope = (n: number, k: number) =>
    (sections[n + 1][k] - sections[n][k]) / (sections[n + 1][0] - sections[n][0])
  const tangent = (n: number, k: number) => {
    if (n === 0) return slope(0, k)
    if (n === sections.length - 1) return slope(n - 1, k)
    const left = slope(n - 1, k), right = slope(n, k)
    return left * right <= 0 ? 0 : 2 * left * right / (left + right)
  }
  return [z, ...[1, 2, 3, 4].map(k =>
    (2 * t ** 3 - 3 * t ** 2 + 1) * a[k]
    + (t ** 3 - 2 * t ** 2 + t) * span * tangent(i, k)
    + (-2 * t ** 3 + 3 * t ** 2) * b[k]
    + (t ** 3 - t ** 2) * span * tangent(i + 1, k))]
}

function bodyPoint(sections: readonly Section[], z: number, angle: number): THREE.Vector3 {
  const [, width, center, upper, lower] = sectionAt(sections, z)
  const c = Math.cos(angle)
  return new THREE.Vector3(width * Math.sin(angle), center + (c >= 0 ? upper : lower) * c, z)
}

function geometry(positions: number[], indices: number[]): THREE.BufferGeometry {
  let volume = 0
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3()
  for (let i = 0; i < indices.length; i += 3) {
    a.fromArray(positions, indices[i] * 3)
    b.fromArray(positions, indices[i + 1] * 3)
    c.fromArray(positions, indices[i + 2] * 3)
    volume += a.dot(b.cross(c))
  }
  if (volume < 0) {
    for (let i = 0; i < indices.length; i += 3)
      [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]]
  }
  const result = new THREE.BufferGeometry()
  result.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  result.setIndex(indices)
  result.computeVertexNormals()
  result.computeBoundingBox()
  result.computeBoundingSphere()
  return result
}

// Single vertices at both poles and a wrapped ring index keep the skin welded.
function skin(rings: THREE.Vector3[][], start: THREE.Vector3, end: THREE.Vector3): THREE.BufferGeometry {
  const positions = start.toArray()
  for (const ring of rings) for (const p of ring) positions.push(p.x, p.y, p.z)
  const last = positions.length / 3
  positions.push(end.x, end.y, end.z)
  const indices: number[] = []
  const sides = rings[0].length
  for (let j = 0; j < sides; j++) {
    const next = (j + 1) % sides
    indices.push(0, 1 + j, 1 + next)
    for (let r = 0; r < rings.length - 1; r++) {
      const a = 1 + r * sides + j, b = 1 + r * sides + next
      indices.push(a, a + sides, b, b, a + sides, b + sides)
    }
    const base = 1 + (rings.length - 1) * sides
    indices.push(base + j, last, base + next)
  }
  return geometry(positions, indices)
}

function bodyGeometry(sections: readonly Section[], rows: number, sides: number): THREE.BufferGeometry {
  const from = sections[0][0], to = sections[sections.length - 1][0]
  const rings: THREE.Vector3[][] = []
  for (let r = 1; r < rows; r++) {
    // Cosine sampling spends more vertices at the blunt nose and narrow tail.
    const z = THREE.MathUtils.lerp(from, to, (1 - Math.cos(Math.PI * r / rows)) / 2)
    rings.push(Array.from({ length: sides }, (_, j) => bodyPoint(sections, z, j / sides * Math.PI * 2)))
  }
  return skin(rings, bodyPoint(sections, from, 0), bodyPoint(sections, to, 0))
}

function finGeometry(stations: readonly Ring[], rows = 20, sides = 12): THREE.BufferGeometry {
  const center = new THREE.CatmullRomCurve3(stations.map(s => s.center), false, 'centripetal')
  const rings: THREE.Vector3[][] = []
  for (let i = 1; i < rows; i++) {
    const t = i / rows, s = t * (stations.length - 1), k = Math.floor(s)
    const f = s - k
    const u = stations[k].u.clone().lerp(stations[k + 1].u, f)
    const v = stations[k].v.clone().lerp(stations[k + 1].v, f)
    const p = center.getPoint(t)
    rings.push(Array.from({ length: sides }, (_, j) => {
      const angle = j / sides * Math.PI * 2
      return p.clone().addScaledVector(u, Math.cos(angle)).addScaledVector(v, Math.sin(angle))
    }))
  }
  return skin(rings, stations[0].center, stations[stations.length - 1].center)
}

function horizontalFin(points: readonly (readonly [number, number, number, number, number])[]): THREE.BufferGeometry {
  return finGeometry(points.map(([x, y, z, chord, thickness]) => ({
    center: new THREE.Vector3(x, y, z),
    u: new THREE.Vector3(0, thickness, 0),
    v: new THREE.Vector3(0, 0, chord),
  })))
}

function material(name: string, color: string, roughness: number): THREE.MeshStandardMaterial {
  const result = new THREE.MeshStandardMaterial({ color, roughness, metalness: .04, transparent: true })
  result.name = name
  return result
}

function mesh(group: THREE.Group, name: string, shape: THREE.BufferGeometry, surface: THREE.Material): THREE.Mesh {
  const result = new THREE.Mesh(shape, surface)
  result.name = name
  group.add(result)
  return result
}

function ellipsoid(group: THREE.Group, name: string, p: THREE.Vector3, size: THREE.Vector3, surface: THREE.Material, segments = 12): THREE.Mesh {
  const shape = new THREE.SphereGeometry(1, segments, 8)
  shape.scale(size.x, size.y, size.z)
  const result = mesh(group, name, shape, surface)
  result.position.copy(p)
  return result
}

function curveMesh(group: THREE.Group, name: string, points: THREE.Vector3[], radius: number, surface: THREE.Material): THREE.Mesh {
  return mesh(group, name, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 48, radius, 6, false), surface)
}

/** Caller owns placement, motion and water effects. Each call owns its GPU resources.
 * userData.blowholeLocalPosition and blowholeLocalPositions are root-local XYZ arrays.
 * The named blowhole-anchor can also be queried with getWorldPosition after posing.
 */
export function createMarineModel(kind: MarineKind): THREE.Group {
  const whale = kind === 'whale'
  const sections = whale ? WHALE : DOLPHIN
  const model = new THREE.Group()
  model.name = `marine-${kind}`
  const skinMaterial = material(`${kind}-skin`, whale ? '#51616b' : '#72848b', .50)
  skinMaterial.metalness = 0
  skinMaterial.emissive.set('#293740')
  skinMaterial.emissiveIntensity = .18
  const lipMaterial = material(`${kind}-lip`, whale ? '#64727b' : '#9aa8ad', .43)
  const undersideMaterial = material(`${kind}-pectoral`, whale ? '#9aa8ab' : '#87999f', .45)
  const creaseMaterial = material(`${kind}-crease`, '#202b32', .48)
  const eyeMaterial = material(`${kind}-eye`, '#101b23', .20)
  mesh(model, 'body', bodyGeometry(sections, whale ? 66 : 48, whale ? 48 : 32), skinMaterial)

  // Mouth and lower lip follow the same skin surface, including the broad nose.
  const mouth: THREE.Vector3[] = []
  const from = whale ? 2.75 : .97, to = whale ? 5.45 : 1.675
  for (const side of [1, -1]) {
    for (let i = 0; i <= 16; i++) {
      const t = (side === 1 ? i : 16 - i) / 16
      const z = THREE.MathUtils.lerp(from, to, t)
      const p = bodyPoint(sections, z, side * (whale ? 1.48 : 1.62))
      p.x *= 1.003
      mouth.push(p)
    }
  }
  curveMesh(model, 'mouth-crease', mouth, whale ? .027 : .008, creaseMaterial)
  curveMesh(model, 'lower-jaw-lip', mouth.map(p => new THREE.Vector3(p.x * 1.002, p.y - (whale ? .065 : .022), p.z - .006)), whale ? .043 : .015, lipMaterial)

  for (const side of [-1, 1]) {
    const label = side > 0 ? 'starboard' : 'port'
    const eye = bodyPoint(sections, whale ? 2.95 : 1.00, side * 1.25)
    ellipsoid(model, `eye-socket-${label}`, eye, new THREE.Vector3(whale ? .075 : .024, whale ? .14 : .042, whale ? .19 : .056), skinMaterial)
    eye.x += side * (whale ? .051 : .018)
    ellipsoid(model, `eye-${label}`, eye, new THREE.Vector3(whale ? .038 : .014, whale ? .070 : .023, whale ? .100 : .033), eyeMaterial)

    const fin = whale ? [
      [side * .91, -.37, 1.52, .18, .04],
      [side * 1.42, -.42, 1.12, .59, .15],
      [side * 1.93, -.53, .30, .48, .105],
      [side * 2.35, -.64, -.66, .34, .075],
      [side * 2.62, -.66, -1.50, .20, .040],
      [side * 2.70, -.60, -1.94, 0, 0],
    ] : [
      [side * .20, -.15, .60, .05, .012],
      [side * .30, -.22, .42, .17, .035],
      [side * .34, -.30, .18, .11, .025],
      [side * .345, -.34, -.04, 0, 0],
    ]
    mesh(model, `pectoral-${label}`, horizontalFin(fin as [number, number, number, number, number][]), undersideMaterial)
  }

  const dorsal = whale ? [
    [0, .53, -2.32, .22, .55], [0, .79, -2.23, .18, .47],
    [0, 1.08, -2.39, .10, .30], [0, 1.26, -2.64, .04, .11],
    [0, 1.30, -2.78, 0, 0],
  ] : [
    [0, .20, -.19, .075, .25], [0, .34, -.16, .064, .19],
    [0, .48, -.25, .032, .10], [0, .54, -.38, 0, 0],
  ]
  mesh(model, 'dorsal-fin', finGeometry(dorsal.map(([x, y, z, thickness, chord]) => ({
    center: new THREE.Vector3(x, y, z), u: new THREE.Vector3(thickness, 0, 0), v: new THREE.Vector3(0, 0, chord),
  })), 18, 12), skinMaterial)

  const tail = new THREE.Group()
  tail.name = 'tail-flukes'
  tail.position.set(0, whale ? -.15 : -.03, whale ? -4.62 : -1.36)
  model.add(tail)
  for (const side of [-1, 1]) {
    const points: [number, number, number, number, number][] = whale ? [
      [0, 0, -.14, .34, .11], [side * .48, .015, -.13, .48, .105],
      [side * 1.07, .075, -.23, .43, .075], [side * 1.55, .15, -.44, .22, .04],
      [side * 1.83, .21, -.88, 0, 0],
    ] : [
      [0, 0, -.065, .095, .036], [side * .10, .008, -.10, .125, .025],
      [side * .23, .02, -.16, .09, .018], [side * .34, .03, -.34, 0, 0],
    ]
    mesh(tail, `fluke-${side > 0 ? 'starboard' : 'port'}`, horizontalFin(points), skinMaterial)
  }

  const blowhole = bodyPoint(sections, whale ? 3.15 : .97, 0)
  const blowholes: number[][] = []
  if (whale) {
    ellipsoid(model, 'blowhole-mound', blowhole.clone().add(new THREE.Vector3(0, -.055, 0)), new THREE.Vector3(.31, .105, .38), skinMaterial)
  }
  for (const side of whale ? [-1, 1] : [0]) {
    const p = blowhole.clone().add(new THREE.Vector3(side * .112, whale ? .037 : .007, 0))
    const slit = ellipsoid(model, `blowhole-${side === 0 ? 'single' : side > 0 ? 'starboard' : 'port'}`, p,
      new THREE.Vector3(whale ? .065 : .037, whale ? .014 : .008, whale ? .17 : .049), creaseMaterial)
    slit.rotation.y = side * -.17
    blowholes.push(p.toArray())
  }
  const anchor = new THREE.Object3D()
  anchor.name = 'blowhole-anchor'
  anchor.position.copy(blowhole).y += whale ? .055 : .015
  model.add(anchor)
  model.userData.blowholeLocalPosition = anchor.position.toArray()
  model.userData.blowholeLocalPositions = blowholes
  model.userData.kind = kind

  if (whale) {
    for (const [index, z] of [3.80, 4.27, 4.68, 5.02].entries()) {
      for (const side of [-1, 0, 1]) {
        const p = bodyPoint(sections, z, side * .77)
        const radius = .066 + (3 - index) * .006
        ellipsoid(model, `rostrum-tubercle-${index}-${side}`, p, new THREE.Vector3(radius, radius * .65, radius * 1.15), skinMaterial, 8)
      }
    }
  }
  model.updateMatrixWorld(true)
  return model
}
