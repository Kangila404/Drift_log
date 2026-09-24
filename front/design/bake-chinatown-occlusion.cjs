const fs = require('node:fs')
const path = require('node:path')
const THREE = require('three')
const { MeshBVH } = require('three-mesh-bvh')
const { mergeGeometries } = require('three/examples/jsm/utils/BufferGeometryUtils.js')
const { load } = require('./check-city-geometry.cjs')
const root = path.resolve(__dirname, '../src/components/r3f')
const { CITY_AO_MAGIC, cityGeometryFingerprint } = load(path.join(root, 'city/CityOcclusion.ts'))

function makeBatches(build) {
  const groups = new Map()
  const { setCitySurface } = load(path.join(root, 'city/CitySurfaces.ts'))
  const add = (finish, source, surface) => {
    const geometry = source.index ? source.toNonIndexed() : source
    if (geometry !== source) source.dispose()
    geometry.deleteAttribute('uv'); setCitySurface(geometry, surface)
    if (!groups.has(finish)) groups.set(finish, [])
    groups.get(finish).push(geometry)
  }
  build({ add,
    box: (finish, size, at, rotation = [0, 0, 0], surface) => add(finish, new THREE.BoxGeometry(...size)
      .applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...rotation))).translate(...at), surface),
    beam: (finish, a, b, width, depth = width, surface) => {
      const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), delta = end.clone().sub(start)
      add(finish, new THREE.BoxGeometry(width, delta.length(), depth)
        .applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()))
        .translate(...start.add(end).multiplyScalar(.5).toArray()), surface)
    },
  })
  return [...groups].map(([finish, pieces]) => {
    const geometry = mergeGeometries(pieces)
    pieces.forEach(piece => piece.dispose())
    return { finish, geometry }
  })
}

function bakeCityOcclusion(batches) {
  const pieces = batches.map(({ geometry }) => {
    const proxy = new THREE.BufferGeometry()
    proxy.setAttribute('position', geometry.getAttribute('position').clone())
    return proxy
  })
  const proxy = mergeGeometries(pieces)
  pieces.forEach(piece => piece.dispose())
  const tree = new MeshBVH(proxy, { maxLeafTris: 12 })
  const ray = new THREE.Ray(), point = new THREE.Vector3(), normal = new THREE.Vector3()
  const orientation = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0)
  const radius = 1.65, samples = 6, memo = new Map()
  const directions = Array.from({ length: samples }, (_, i) => {
    const r = Math.sqrt((i + .5) / samples), a = i * Math.PI * (3 - Math.sqrt(5))
    return new THREE.Vector3(r * Math.cos(a), Math.sqrt(1 - r * r), r * Math.sin(a))
  })
  const count = batches.reduce((sum, { geometry }) => sum + geometry.getAttribute('position').count, 0)
  const buffer = new ArrayBuffer(count + 12), header = new DataView(buffer), data = new Uint8Array(buffer, 12)
  header.setUint32(0, CITY_AO_MAGIC, true)
  header.setUint32(4, cityGeometryFingerprint(batches), true)
  header.setUint32(8, count, true)
  let offset = 0
  try {
    for (const { geometry } of batches) {
      const positions = geometry.getAttribute('position'), normals = geometry.getAttribute('normal')
      for (let i = 0; i < positions.count; i++) {
        point.fromBufferAttribute(positions, i); normal.fromBufferAttribute(normals, i).normalize()
        const key = [point.x, point.y, point.z, normal.x, normal.y, normal.z].map(v => Math.round(v * 200)).join(',')
        let value = memo.get(key)
        if (value === undefined) {
          orientation.setFromUnitVectors(up, normal)
          ray.origin.copy(point).addScaledVector(normal, .045)
          let blocked = 0
          for (const direction of directions) {
            ray.direction.copy(direction).applyQuaternion(orientation)
            const hit = tree.raycastFirst(ray, THREE.DoubleSide, .025, radius)
            if (hit) blocked += 1 - THREE.MathUtils.smoothstep(hit.distance, .1, radius)
          }
          value = Math.round((1 - blocked / samples) * 255)
          memo.set(key, value)
        }
        data[offset++] = value
      }
    }
  } finally { proxy.dispose() }
  return buffer
}

function main() {
  const { buildChinatownNeighborhood, buildChinatownLandmark } = load(path.join(root, 'incheon/ChinatownNeighborhood.ts'))
  const directory = path.join(root, 'incheon/baked')
  fs.mkdirSync(directory, { recursive: true })
  for (const portrait of [false, true]) {
    for (const [name, build] of [['town', buildChinatownNeighborhood], ['gate', buildChinatownLandmark]]) {
      const batches = makeBatches(kit => build(kit, portrait)), start = performance.now()
      try {
        const bytes = Buffer.from(bakeCityOcclusion(batches))
        const file = path.join(directory, `${name}-${portrait ? 'portrait' : 'desktop'}.bin`)
        fs.writeFileSync(file, bytes)
        console.log(`${path.basename(file)}: ${bytes.length} bytes, ${Math.round(performance.now() - start)}ms offline bake`)
      } finally { batches.forEach(({ geometry }) => geometry.dispose()) }
    }
  }
}
module.exports = { bakeCityOcclusion, bakeChinatownOcclusion: bakeCityOcclusion, makeBatches }
if (require.main === module) main()
