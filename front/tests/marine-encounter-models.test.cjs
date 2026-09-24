const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')
const THREE = require('three')

const filename = path.resolve(__dirname, '../src/components/r3f/events/MarineEncounterModels.ts')
const loaded = new Module(filename, module)
loaded.filename = filename
loaded.paths = Module._nodeModulePaths(path.dirname(filename))
loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename)
const { createMarineModel } = loaded.exports

function meshes(model) {
  const result = []
  model.traverse(object => { if (object.isMesh) result.push(object) })
  return result
}

for (const [kind, budget, length, width, height] of [
  ['whale', 14000, 11, 5.5, 2.7], ['dolphin', 8000, 3.4, .71, .91],
]) {
  test(`${kind}: finite nondegenerate geometry, unit normals and triangle budget`, () => {
    const model = createMarineModel(kind)
    let triangles = 0
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3()
    for (const object of meshes(model)) {
      const p = object.geometry.getAttribute('position')
      const n = object.geometry.getAttribute('normal')
      const index = object.geometry.index
      assert(index)
      triangles += index.count / 3
      for (let i = 0; i < p.count; i++) {
        a.fromBufferAttribute(p, i)
        b.fromBufferAttribute(n, i)
        assert(a.toArray().every(Number.isFinite), object.name)
        assert(Math.abs(b.length() - 1) < .0001, `${object.name}: non-unit normal`)
      }
      for (let i = 0; i < index.count; i += 3) {
        a.fromBufferAttribute(p, index.getX(i))
        b.fromBufferAttribute(p, index.getX(i + 1))
        c.fromBufferAttribute(p, index.getX(i + 2))
        assert(b.sub(a).cross(c.sub(a)).lengthSq() > 1e-20, `${object.name}: collapsed triangle`)
      }
      assert(object.material.transparent, object.name)
      assert.equal(object.material.side, THREE.FrontSide)
    }
    assert(triangles <= budget, `${triangles} exceeds ${budget}`)
    const bounds = new THREE.Box3().setFromObject(model)
    const size = bounds.getSize(new THREE.Vector3())
    assert(Math.abs(size.z - length) < .015, `${kind}: length ${size.z}`)
    assert(size.x <= width, `${kind}: width ${size.x}`)
    assert(size.y <= height, `${kind}: height ${size.y}`)
    assert(Math.abs((bounds.min.z + bounds.max.z) / 2) < .015)
    console.log(`${kind}: ${triangles} triangles, bounds ${size.toArray().map(n => n.toFixed(3)).join(' x ')}`)
  })

  test(`${kind}: body is a welded outward closed surface`, () => {
    const body = createMarineModel(kind).getObjectByName('body')
    const p = body.geometry.getAttribute('position'), indices = body.geometry.index
    const edges = new Map()
    let volume = 0
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3()
    for (let i = 0; i < indices.count; i += 3) {
      const ids = [indices.getX(i), indices.getX(i + 1), indices.getX(i + 2)]
      a.fromBufferAttribute(p, ids[0]); b.fromBufferAttribute(p, ids[1]); c.fromBufferAttribute(p, ids[2])
      volume += a.dot(b.cross(c)) / 6
      for (let j = 0; j < 3; j++) {
        const from = ids[j], to = ids[(j + 1) % 3]
        const key = `${Math.min(from, to)}:${Math.max(from, to)}`
        const edge = edges.get(key) || { count: 0, direction: 0 }
        edge.count++; edge.direction += from < to ? 1 : -1
        edges.set(key, edge)
      }
    }
    assert(volume > (kind === 'whale' ? 20 : .3), `insufficient body volume: ${volume}`)
    for (const edge of edges.values()) assert.deepEqual(edge, { count: 2, direction: 0 })
    body.updateMatrixWorld(true)
    for (const direction of [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0)]) {
      const ray = new THREE.Raycaster(direction.clone().multiplyScalar(10), direction.clone().negate())
      assert(ray.intersectObject(body).length > 0, 'body must be front-facing from side and above')
    }
  })

  test(`${kind}: head details remain above nominal local water and spout metadata follows pose`, () => {
    const model = createMarineModel(kind)
    const eye = model.getObjectByName('eye-starboard')
    assert(eye.position.x > 0)
    assert(eye.position.y > -.1)
    assert(eye.position.z > 0)
    const anchor = model.getObjectByName('blowhole-anchor')
    const local = new THREE.Vector3().fromArray(model.userData.blowholeLocalPosition)
    assert(local.y > 0 && local.z > eye.position.z - .1)
    assert.equal(model.userData.blowholeLocalPositions.length, kind === 'whale' ? 2 : 1)
    model.position.set(3, -2.6, 8)
    model.rotation.set(.04, 1.1, .03)
    model.updateMatrixWorld(true)
    assert(anchor.getWorldPosition(new THREE.Vector3()).distanceTo(model.localToWorld(local)) < 1e-8)
    assert(eye.getWorldPosition(new THREE.Vector3()).y > -2.7)
    assert(model.getObjectByName('lower-jaw-lip'))
    assert(model.getObjectByName('tail-flukes'))
  })

  test(`${kind}: instances own materials and geometry so fades/disposal cannot leak`, () => {
    const first = meshes(createMarineModel(kind)), second = meshes(createMarineModel(kind))
    const materials = new Set(first.map(m => m.material))
    const geometries = new Set(first.map(m => m.geometry))
    for (const m of materials) m.opacity = .25
    for (const m of second) {
      assert(!materials.has(m.material))
      assert(!geometries.has(m.geometry))
      assert.equal(m.material.opacity, 1)
    }
  })
}

test('whale broad forward head, long swept pectorals and dolphin melon differ structurally', () => {
  const whale = createMarineModel('whale')
  const body = whale.getObjectByName('body')
  const ray = new THREE.Raycaster(new THREE.Vector3(5, .25, 4.7), new THREE.Vector3(-1, 0, 0))
  const head = ray.intersectObject(body)[0]
  assert(head && head.point.x > .9, 'rostrum must retain width near the blunt nose')
  const fin = new THREE.Box3().setFromObject(whale.getObjectByName('pectoral-starboard'))
  assert(fin.max.z - fin.min.z > 3, 'humpback pectoral must have a long swept outline')
  const dolphin = createMarineModel('dolphin').getObjectByName('body')
  const topAt = z => new THREE.Raycaster(new THREE.Vector3(0, 2, z), new THREE.Vector3(0, -1, 0)).intersectObject(dolphin)[0].point.y
  assert(topAt(1.05) - topAt(1.43) > .15, 'melon must stand above the short beak')
})
