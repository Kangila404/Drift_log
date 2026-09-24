const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')
const THREE = require('three')

function load(relative) {
  const filename = path.resolve(__dirname, '../src/components/r3f', relative)
  const loaded = new Module(filename, module)
  loaded.filename = filename
  loaded.paths = Module._nodeModulePaths(path.dirname(filename))
  const original = loaded.require.bind(loaded)
  loaded.require = id => id === '../OceanWater' ? { OCEAN_SURFACE_Y: -2.7 }
    : id === '../OceanWaves' ? load('OceanWaves.ts') : original(id)
  loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename)
  return loaded.exports
}
const { createWaterContact } = load('events/EncounterWaterContact.ts')
const { createWhaleBreath } = load('events/WhaleBreath.ts')
const { sampleOceanSurface } = load('OceanWaves.ts')
const { createDistantLights, createFloatingSign, createRainbow } = load('events/AtmosphericEncounters.ts')

test('whale exhalation is attached, finite and one-shot', () => {
  const breath = createWhaleBreath(), anchor = new THREE.Vector3(-6, -1.8, -22)
  for (const time of [0, 2, 5.2, 12]) {
    breath.update(anchor, time, 1, .7)
    assert.equal(breath.points.visible, false)
  }
  breath.update(anchor, 3.4, 1, .7)
  assert.equal(breath.points.visible, true)
  assert.deepEqual(breath.points.position.toArray(), anchor.toArray())
  for (const attribute of Object.values(breath.points.geometry.attributes)) assert(Array.from(attribute.array).every(Number.isFinite))
  breath.update(anchor, 3.4, 0, .7)
  assert.equal(breath.points.visible, false)
})

test('bow wash follows the existing ocean at every transformed vertex, without a water plane', () => {
  const contact = createWaterContact(11, 1.36)
  const water = { time: 9.3, scale: .7, speed: 1.2, wind: .8 }
  contact.update(-8, -25, 1.15, .7, 4, 1, water)
  assert.equal(contact.group.children.length, 2)
  for (const mesh of contact.group.children) {
    const p = mesh.geometry.attributes.position
    assert.equal(mesh.material.depthWrite, false)
    assert.equal(mesh.material.depthTest, true)
    for (let i = 0; i < p.count; i++) {
      const expected = -2.7 + sampleOceanSurface(p.getX(i), p.getZ(i), water.time, water.scale, water.speed, water.wind).height + .025
      assert(Math.abs(p.getY(i) - expected) < 1e-5)
    }
  }
  contact.update(0, 0, 0, 1, 12, 0, water)
  assert.equal(contact.group.visible, false)
})

for (const [name, factory, budget] of [['sign', createFloatingSign, 5000], ['lights', createDistantLights, 12000], ['rainbow', createRainbow, 10]]) {
  test(`${name}: finite geometry, bounded batches and fully faded endpoint`, () => {
    const object = factory()
    let triangles = 0, meshes = 0
    object.group.traverse(mesh => {
      if (!mesh.isMesh) return
      meshes++
      const position = mesh.geometry.attributes.position
      assert(Array.from(position.array).every(Number.isFinite))
      triangles += (mesh.geometry.index?.count ?? position.count) / 3
      assert(mesh.material.transparent)
    })
    assert(triangles > 0 && triangles <= budget)
    assert(meshes <= 12)
    for (const material of object.materials) material.opacity = 0
    object.update?.(12, 0)
    for (const material of object.materials) {
      assert.equal(material.opacity, 0)
      if (material.uniforms?.uOpacity) assert.equal(material.uniforms.uOpacity.value, 0)
    }
    if (name === 'sign') {
      const bounds = new THREE.Box3().setFromObject(object.group).getSize(new THREE.Vector3())
      assert(bounds.z > .3, 'paper-thin sign')
    }
  })
}
