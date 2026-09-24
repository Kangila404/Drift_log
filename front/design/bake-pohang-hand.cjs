const fs = require('node:fs')
const path = require('node:path')
const THREE = require('three')

// Regenerate from any working directory: node front/design/bake-pohang-hand.cjs
async function bake() {
  const { MarchingCubes } = await import('three/examples/jsm/objects/MarchingCubes.js')
  const { mergeVertices } = await import('three/examples/jsm/utils/BufferGeometryUtils.js')
  const segments = []
  const grooves = []
  const segment = (a, b, r0, r1) => {
    const delta = b.clone().sub(a)
    return { a, delta, lengthSq: delta.lengthSq(), r0, r1 }
  }
  const finger = (points, baseRadius, tipRadius) => {
    const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)))
    const samples = curve.getPoints(10)
    const radius = t => THREE.MathUtils.lerp(baseRadius, tipRadius, t)
      + .095 * Math.exp(-(((t - .47) / .11) ** 2))
      + .065 * Math.exp(-(((t - .76) / .1) ** 2))
    for (let i = 0; i < 10; i++) {
      segments.push(segment(samples[i], samples[i + 1], radius(i / 10), radius((i + 1) / 10)))
    }
    for (const t of [.47, .76]) {
      const at = curve.getPoint(t)
      const halfWidth = radius(t) * .68
      grooves.push(segment(
        new THREE.Vector3(at.x - halfWidth, at.y - .05, at.z + radius(t) * .91),
        new THREE.Vector3(at.x + halfWidth, at.y + .06, at.z + radius(t) * .91), .17, .17,
      ))
    }
  }
  // Shore-facing right palm: thumb is on the viewer's right.
  finger([[-2.55, 13.65, 0], [-3.4, 16.3, -.05], [-3.75, 18.25, .3], [-3.7, 19.7, .62]], .85, .52)
  finger([[-1.05, 14.7, -.15], [-1.55, 18.2, -.35], [-1.65, 21.05, .04], [-1.5, 22.6, .55]], .91, .6)
  finger([[.7, 14.8, -.12], [.7, 18.6, -.3], [.65, 21.65, .06], [.5, 23.6, .66]], .96, .64)
  finger([[2.25, 14.1, .02], [2.85, 17.65, -.12], [3.2, 20, .32], [3.15, 21.7, .86]], .92, .61)
  finger([[2, 10.2, .25], [3.8, 11.75, .65], [5.45, 13.75, .93], [5.6, 15.75, 1.18]], 1.25, .73)
  for (const points of [
    [[-2.25, 13.4, .99], [-1.1, 13.15, 1.14], [.1, 12.85, 1.2], [1.55, 12.75, 1.44]],
    [[-1.9, 10.85, 1.05], [-.7, 11.15, 1.32], [.5, 11.65, 1.49], [1.3, 12.15, 1.6]],
    [[1.2, 8.7, 1.46], [.6, 9.7, 1.48], [.5, 10.9, 1.52], [.95, 12.3, 1.61]],
  ]) {
    const samples = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))).getPoints(8)
    for (let i = 0; i < 8; i++) grooves.push(segment(samples[i], samples[i + 1], .2, .2))
  }
  const blend = (a, b, width) => {
    const h = Math.max(width - Math.abs(a - b), 0) / width
    return Math.min(a, b) - h * h * width * .25
  }
  const oval = (x, y, z, at, radii) =>
    (Math.hypot((x - at[0]) / radii[0], (y - at[1]) / radii[1], (z - at[2]) / radii[2]) - 1) * Math.min(...radii)
  const capsule = (x, y, z, part) => {
    const px = x - part.a.x, py = y - part.a.y, pz = z - part.a.z
    const t = THREE.MathUtils.clamp((px * part.delta.x + py * part.delta.y + pz * part.delta.z) / part.lengthSq, 0, 1)
    return Math.hypot(px - part.delta.x * t, py - part.delta.y * t, pz - part.delta.z * t)
      - THREE.MathUtils.lerp(part.r0, part.r1, t)
  }
  const resolution = 56
  const material = new THREE.MeshBasicMaterial()
  const volume = new MarchingCubes(resolution, material, false, false, 38000)
  volume.isolation = 0
  for (let iz = 0; iz < resolution; iz++) {
    const z = (iz / resolution * 2 - 1) * 4
    for (let iy = 0; iy < resolution; iy++) {
      const y = iy / resolution * 26
      for (let ix = 0; ix < resolution; ix++) {
        const x = (ix / resolution * 2 - 1) * 8
        let distance = oval(x, y, z, [-.1, 10.9, -.14], [3.25, 4.7, 1.45])
        distance = blend(distance, oval(x, y, z, [-.25, 4.5, -.3], [2.15, 5.7, 1.47]), .7)
        distance = blend(distance, oval(x, y, z, [1.65, 10.5, .3], [1.8, 2.8, 1.55]), .55)
        for (const part of segments) distance = blend(distance, capsule(x, y, z, part), .32)
        // Incised folds and shallow casting losses retain a single continuous surface.
        distance = Math.max(distance, -oval(x, y, z, [-.45, 12.4, 1.65], [1.65, 1.55, .63]))
        for (const groove of grooves) distance = Math.max(distance, -capsule(x, y, z, groove))
        distance = Math.max(distance, -oval(x, y, z, [-1.8, 9.6, 1.3], [.45, .7, .19]))
        distance = Math.max(distance, -oval(x, y, z, [1.8, 11.5, 1.77], [.37, .55, .18]))
        distance = Math.max(distance, -oval(x, y, z, [-3.2, 17.4, .72], [.33, .48, .15]))
        distance += .032 * Math.sin(x * 3.1 + y * 1.6) * Math.sin(y * 2.7 - z * 4)
          + .016 * Math.sin(x * 8 + y * 3) * Math.sin(y * 7 - z * 9)
        volume.setCell(ix, iy, iz, -distance)
      }
    }
  }
  volume.update()
  if (!volume.count || volume.count / 3 >= 38000) throw new Error('Hand extraction exceeded its triangle budget')
  const source = new THREE.BufferGeometry()
  for (const name of ['position', 'normal']) {
    const attribute = volume.geometry.getAttribute(name)
    source.setAttribute(name, new THREE.Float32BufferAttribute(attribute.array.slice(0, volume.count * 3), 3))
  }
  source.scale(8, 13, 4).translate(-4, 13, 2)
  const indexed = mergeVertices(source, .0001)
  const round = values => Array.from(values, value => Number(value.toFixed(5)))
  const data = {
    position: round(indexed.getAttribute('position').array),
    normal: round(indexed.getAttribute('normal').array),
    index: Array.from(indexed.index.array),
  }
  if (![...data.position, ...data.normal].every(Number.isFinite)) throw new Error('Non-finite baked hand attribute')
  const output = path.resolve(__dirname, '../src/components/r3f/cities/pohang-hand.json')
  const serialized = JSON.stringify(data)
  fs.writeFileSync(output, serialized)
  console.log(JSON.stringify({ output, vertices: data.position.length / 3, triangles: data.index.length / 3, bytes: Buffer.byteLength(serialized) }))
  indexed.dispose()
  source.dispose()
  volume.geometry.dispose()
  material.dispose()
}

bake().catch(error => { console.error(error); process.exitCode = 1 })
