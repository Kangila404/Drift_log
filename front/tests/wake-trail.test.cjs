const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')
const filename = path.resolve(__dirname, '../src/components/r3f/voyage/WakeTrail.ts')
const loaded = new Module(filename, module)
loaded.filename = filename
loaded.paths = Module._nodeModulePaths(path.dirname(filename))
loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename)
const { createWakeTrail, advanceWakeTrail, WAKE_CAPACITY, WAKE_LIFETIME, WAKE_STERN_Z, wakeEnvelope } = loaded.exports

test('wake emits every tenth of a second at the transformed transom', () => {
  assert.equal(WAKE_LIFETIME, 2.2)
  assert.equal(WAKE_CAPACITY, 26)
  assert.equal(WAKE_STERN_Z, 3.96)
  for (const heading of [-.21, 0, .21]) {
    const trail = createWakeTrail(), pose = { x: 2.3, heading, speed: 1 }
    advanceWakeTrail(trail, pose, .05)
    assert.equal(trail.points.length, 0)
    advanceWakeTrail(trail, pose, .05)
    assert.equal(trail.points.length, 1)
    const point = trail.points[0]
    assert(Math.abs(point.x - (pose.x + Math.sin(heading) * 3.96)) < 1e-12)
    assert(Math.abs(point.z - (-4 + Math.cos(heading) * 3.96)) < 1e-12)
    assert.equal(point.heading, heading)
    assert.equal(point.age, 0)
    assert.equal(point.strength, 1)
    for (let i = 0; i < 18; i++) advanceWakeTrail(trail, pose, .05)
    assert.equal(trail.serial, 10)
  }
})

test('wake retains world-space history while the boat turns', () => {
  const trail = createWakeTrail()
  for (let i = 0; i < 180; i++) advanceWakeTrail(trail, { x: 0, heading: 0, speed: 1 }, 1 / 60)
  const old = trail.points[10], x = old.x, heading = old.heading, z = old.z
  for (let i = 0; i < 60; i++) advanceWakeTrail(trail, { x: 2, heading: -.2, speed: 1 }, 1 / 60)
  assert.equal(old.x, x)
  assert.equal(old.heading, heading)
  assert(old.z > z)
  assert(trail.points.includes(old), 'Emitted history survives the turn until its lifetime expires')
  assert(trail.points[0].x > 1)
})
test('stopping lets old foam expire without emitting pause rings', () => {
  const trail = createWakeTrail()
  for (let i = 0; i < 120; i++) advanceWakeTrail(trail, { x: 0, heading: 0, speed: 1 }, 1 / 60)
  assert(trail.points.length > 10)
  const serial = trail.serial
  advanceWakeTrail(trail, { x: 0, heading: 0, speed: 0 }, 1 / 60)
  assert(trail.points.length > 0, 'Stopping preserves the existing wash while it decays')
  for (let i = 0; i < 135; i++) advanceWakeTrail(trail, { x: 0, heading: 0, speed: 0 }, 1 / 60)
  assert.equal(trail.serial, serial)
  assert.equal(trail.points.length, 0)
})
test('wake is bounded, finite and frozen with zero delta', () => {
  const trail = createWakeTrail()
  for (let i = 0; i < 6000; i++) advanceWakeTrail(trail, { x: Math.sin(i * .003), heading: .15, speed: 1 }, 1 / 60)
  assert(trail.points.length <= WAKE_CAPACITY)
  assert(trail.points.length >= 21 && trail.points.length <= 23)
  assert(trail.points.every(p => p.age <= WAKE_LIFETIME && p.z < 6.2))
  assert(trail.points.every(p => Object.values(p).every(Number.isFinite)))
  const frozen = JSON.stringify(trail)
  for (const delta of [0, -1, NaN, Infinity]) advanceWakeTrail(trail, { x: 5, heading: .4, speed: 0 }, delta)
  assert.equal(JSON.stringify(trail), frozen)
  assert.equal(wakeEnvelope(0), 1)
  assert.equal(wakeEnvelope(WAKE_LIFETIME), 0)
  assert.equal(wakeEnvelope(WAKE_LIFETIME + 1), 0)
  let previous = 1
  for (let age = 0; age < WAKE_LIFETIME; age += .05) {
    const strength = wakeEnvelope(age)
    assert(strength >= 0 && strength <= previous)
    previous = strength
  }
})
