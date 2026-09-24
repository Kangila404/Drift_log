// Run: node --test front/tests/voyage-navigation.test.cjs
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { test } = require('node:test')
const ts = require('typescript')

const file = path.join(__dirname, '../src/components/r3f/voyage/VoyageNavigation.ts')
const { outputText } = ts.transpileModule(readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS }, fileName: file,
})
const navigationModule = { exports: {} }
// No React, browser, store, clock, network or persistence dependencies are supplied.
vm.runInNewContext(outputText, { exports: navigationModule.exports, module: navigationModule }, { filename: file })
const { createVoyageNavigation, advanceVoyageNavigation, VOYAGE_MAX_X, VOYAGE_MAX_HEADING } = navigationModule.exports

function run(state, seconds, sailing = true, fps = 60) {
  for (let frame = 0; frame < seconds * fps; frame++) advanceVoyageNavigation(state, 1 / fps, sailing)
  return state
}

test('factory owns independent mutable state; advance preserves identity and reset counter', () => {
  const a = createVoyageNavigation(), b = createVoyageNavigation()
  assert.notEqual(a, b)
  assert.deepEqual({ ...a }, { x: 0, heading: 0, input: 0, speed: 0, resetView: 0 })
  a.input = -1
  a.resetView = 7
  assert.equal(advanceVoyageNavigation(a, 1 / 60, true), a)
  assert.equal(a.resetView, 7)
  assert.equal(b.input, 0)
  assert.equal(b.x, 0)
})

for (const input of [-1, 1]) {
  test(`${input < 0 ? 'left' : 'right'} input has correct Three heading and stays bounded`, () => {
    const state = createVoyageNavigation()
    state.input = input
    run(state, 1)
    assert.equal(Math.sign(state.x), input)
    assert.equal(Math.sign(state.heading), -input)
    for (let frame = 0; frame < 60 * 120; frame++) {
      advanceVoyageNavigation(state, 1 / 60, true)
      assert(Math.abs(state.x) <= VOYAGE_MAX_X)
      assert(Math.abs(state.heading) <= VOYAGE_MAX_HEADING)
      assert(state.speed >= 0 && state.speed <= 1)
    }
    assert.equal(state.x, input * VOYAGE_MAX_X)
    assert.equal(state.heading, 0, 'At the lateral bound the boat resumes its forward heading')
  })

  test(`release from ${input} returns position and heading without a snap`, () => {
    const state = createVoyageNavigation()
    state.input = input
    run(state, 12)
    const oldX = state.x, oldHeading = state.heading
    state.input = 0
    advanceVoyageNavigation(state, 1 / 60, true)
    assert(Math.abs(state.x - oldX) < .02)
    assert(Math.abs(state.heading - oldHeading) < .02)
    run(state, 40)
    assert.equal(state.x, 0)
    assert.equal(state.heading, 0)
    assert.equal(state.speed, 1)
  })
}

test('automatic voyage reaches cruise speed without steering or lateral drift', () => {
  const state = run(createVoyageNavigation(), 10)
  assert.equal(state.x, 0)
  assert.equal(state.heading, 0)
  assert.equal(state.speed, 1)
})

test('pause clears held input, holds lateral position, settles and resumes toward the route', () => {
  const state = createVoyageNavigation()
  state.input = -1
  run(state, 4)
  const pausedX = state.x
  run(state, 10, false)
  assert.equal(state.input, 0)
  assert.equal(state.x, pausedX)
  assert.equal(state.heading, 0)
  assert.equal(state.speed, 0)
  run(state, 40)
  assert.equal(state.x, 0)
  assert.equal(state.heading, 0)
  assert.equal(state.speed, 1)
})

test('30/60/120 Hz produce the same steering and return response', () => {
  const simulate = fps => {
    const state = createVoyageNavigation()
    state.input = -1
    run(state, 4, true, fps)
    state.input = 1
    run(state, 3, true, fps)
    state.input = 0
    return run(state, 5, true, fps)
  }
  const reference = simulate(120)
  for (const fps of [30, 60]) {
    const state = simulate(fps)
    for (const field of ['x', 'heading', 'speed']) assert(Math.abs(state[field] - reference[field]) < 1e-10)
  }
})

test('invalid elapsed time is inert and tab-resume delta cannot teleport the boat', () => {
  const state = createVoyageNavigation()
  state.input = 1
  const before = { ...state }
  for (const delta of [0, -1, NaN, Infinity, -Infinity]) {
    advanceVoyageNavigation(state, delta, true)
    assert.deepEqual({ ...state }, before)
  }
  const normal = createVoyageNavigation()
  normal.input = 1
  advanceVoyageNavigation(normal, .25, true)
  advanceVoyageNavigation(state, 1000, true)
  assert.deepEqual({ ...state }, { ...normal })
  advanceVoyageNavigation(state, NaN, false)
  assert.equal(state.input, 0, 'Pause clears input even when no time can advance')
})
