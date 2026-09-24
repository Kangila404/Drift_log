const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')

const filename = path.resolve(__dirname, '../src/components/r3f/events/EncounterMotion.ts')
const loaded = new Module(filename, module)
loaded.filename = filename
loaded.paths = Module._nodeModulePaths(path.dirname(filename))
loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename)
const { encounterOpacity, breach, ENCOUNTER_DURATION } = loaded.exports

test('encounter fades in and out once, including skipped frames', () => {
  assert.equal(ENCOUNTER_DURATION, 12)
  for (const t of [-1, 0, 12, 13, 100]) assert.equal(encounterOpacity(t), 0)
  for (const t of [2, 5, 9]) assert.equal(encounterOpacity(t), 1)
  assert(encounterOpacity(.6) < encounterOpacity(1.2))
  assert(encounterOpacity(10) > encounterOpacity(11))
  for (let t = -1; t < 14; t += .013) assert(encounterOpacity(t) >= 0 && encounterOpacity(t) <= 1)
})

test('dolphins make one staggered low breach, not a repeating jump', () => {
  for (const offset of [1.5, 2.9]) {
    assert.equal(breach(0, offset).height, 0)
    assert(Math.abs(breach(12, offset).height) < 1e-8)
    assert.equal(breach(offset + 2.1, offset).height, 1)
    for (let t = 0; t <= 12; t += .07) {
      const value = breach(t, offset)
      assert(value.height >= 0 && value.height <= 1)
      assert(Math.abs(value.pitch) <= .3)
    }
  }
  assert.notEqual(breach(3, 1.5).height, breach(3, 2.9).height)
})
