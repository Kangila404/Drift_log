const assert = require('node:assert/strict')
const { test } = require('node:test')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

function fixture(available = true, canSteer = true) {
  const file = path.join(__dirname, '../src/components/r3f/voyage/NativeVoyageNavigation.ts')
  const { outputText } = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS }, fileName: file,
  })
  const exports = {}, timers = new Map()
  let next = 0, published = 0, hidden = false
  vm.runInNewContext(outputText, {
    exports,
    setTimeout: (fn, ms) => { const id = ++next; timers.set(id, { fn, ms }); return id },
    clearTimeout: id => timers.delete(id),
  })
  const navigation = { current: { input: 0, resetView: 0 } }
  const receiver = exports.createNativeNavigationReceiver(navigation, { available, canSteer }, () => published++, () => hidden)
  const send = (action, direction) => receiver.receive(JSON.stringify({ type: 'voyage-control', action, direction }))
  return { receiver, navigation, timers, send, published: () => published, hide: () => { hidden = true } }
}

test('native steer leases refresh; a lost release expires without further input', () => {
  const f = fixture()
  f.send('steer', -1)
  assert.equal(f.navigation.current.input, -1)
  const first = [...f.timers.keys()][0]
  f.send('steer', 1)
  assert.equal(f.navigation.current.input, 1)
  assert(!f.timers.has(first))
  assert.equal(f.timers.size, 1)
  const lease = [...f.timers.values()][0]
  assert.equal(lease.ms, 500)
  lease.fn()
  assert.equal(f.navigation.current.input, 0)
  assert.equal(f.timers.size, 0)
})

test('release, teardown and background all clear native steering', () => {
  const f = fixture()
  for (const release of [() => f.send('steer', 0), f.receiver.clear]) {
    f.send('steer', 1)
    release()
    assert.equal(f.navigation.current.input, 0)
    assert.equal(f.timers.size, 0)
  }
  f.hide()
  f.send('steer', -1)
  f.send('reset-view')
  assert.equal(f.navigation.current.input, 0)
  assert.equal(f.navigation.current.resetView, 0)
})

test('analog native helm receives proportional input with the same lease safety', () => {
  const f = fixture()
  f.send('steer', .37)
  assert.equal(f.navigation.current.input, .37)
  assert.equal(f.timers.size, 1)
  f.send('steer', -.6)
  assert.equal(f.navigation.current.input, -.6)
  f.send('steer', 0)
  assert.equal(f.navigation.current.input, 0)
  assert.equal(f.timers.size, 0)
})

test('capability handshake and camera reset are separate from sailing controls', () => {
  const paused = fixture(true, false)
  paused.send('navigation-state-request')
  assert.equal(paused.published(), 1)
  paused.send('steer', 1)
  assert.equal(paused.navigation.current.input, 0)
  paused.send('reset-view')
  assert.equal(paused.navigation.current.resetView, 1)
  const city = fixture(false, false)
  city.send('reset-view')
  city.send('steer', 1)
  assert.equal(city.navigation.current.resetView, 0)
  assert.equal(city.navigation.current.input, 0)
})

test('malformed/unrelated messages cannot steer or invoke gameplay', () => {
  const f = fixture()
  for (const value of [undefined, null, {}, '', 'null', '[]', '{', '1',
    '{"type":"other","action":"steer","direction":1}',
    '{"type":"voyage-control","action":"steer","direction":"1"}']) f.receiver.receive(value)
  for (const direction of [2, -2, null, {}, true]) f.send('steer', direction)
  f.send('pause-resume')
  assert.equal(f.navigation.current.input, 0)
  assert.equal(f.navigation.current.resetView, 0)
  assert.equal(f.timers.size, 0)
})
