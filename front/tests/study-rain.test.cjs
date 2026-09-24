const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { test } = require('node:test')
const ts = require('typescript')

function load(relative, modules = {}) {
  const filename = path.resolve(__dirname, relative), exports = {}
  const source = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, esModuleInterop: false },
  }).outputText
  vm.runInNewContext(source, { exports, require: name => {
    assert(name in modules, name)
    return modules[name]
  } })
  return exports
}
const environment = load('../src/components/r3f/OceanEnvironment.tsx', {
  'react/jsx-runtime': require('react/jsx-runtime'),
  './OceanSky': {default:'Sky'}, './OceanWater': {default:'Water'}, './Rain': {default:'Rain'},
  '../../constants/weatherAtmosphere': load('../src/constants/weatherAtmosphere.ts'),
}).default
const rain = (effects, rainOverride) => environment({preset:{effects},rainOverride}).props.children.filter(child=>child?.type==='Rain')

test('study sound rain is readable and remains one shared emitter', () => {
  assert.equal(rain([], false).length, 0)
  const drops = rain([], true)
  assert.equal(drops.length, 1)
  assert.equal(drops[0].props.intensity, .65)
  assert.equal(drops[0].props.maxOpacity, .42)
})

test('disabling white noise restores weather rain, not clear weather', () => {
  for (const [effects, intensity] of [[['rain'], .45], [['rain', 'wind'], 1]]) {
    assert.equal(rain(effects, true).length, 1)
    const drops = rain(effects, false)
    assert.equal(drops.length, 1)
    assert.equal(drops[0].props.intensity, intensity)
    assert.equal(drops[0].props.maxOpacity, .3)
  }
})
