const assert = require('node:assert/strict')
const { test } = require('node:test')
const path = require('node:path')
const { readFileSync } = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

function load(file) {
  const source = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText
  const exports = {}
  vm.runInNewContext(source, {
    exports,
    require: id => {
      if (id !== './OceanWaves') throw new Error(`Unexpected dependency: ${id}`)
      return load(path.join(path.dirname(file), 'OceanWaves.ts'))
    },
  }, { filename: file })
  return exports
}
const { sampleOceanSurface } = load(path.join(__dirname, '../src/components/r3f/OceanWaves.ts'))
const { sampleBoatMotionTarget, BOAT_MAX_TILT } = load(path.join(__dirname, '../src/components/r3f/BoatMotion.ts'))

test('steered hull samples its translated, rotated shared-ocean footprint', () => {
  for (const heading of [-.21, -.1, 0, .1, .21]) for (const x of [-3, 0, 3]) {
    const water = { time: 7.4, scale: 1.3, speed: 1.4, wind: 1 }
    const result = sampleBoatMotionTarget(x, -4, 1.8, water, undefined, undefined, heading)
    const c = Math.cos(heading), s = Math.sin(heading)
    let height = 0, localX = 0, localZ = 0
    for (const [a, wx] of [[-.8,1],[0,2],[.8,1]]) for (const [b,wz] of [[-1.65,1],[0,2],[1.65,1]]) {
      const w = wx*wz/16
      const sample = sampleOceanSurface(x + 1.8*(a*c+b*s), -4 + 1.8*(b*c-a*s), water.time, water.scale, water.speed, water.wind)
      height += sample.height*w
      localX += (sample.slopeX*c-sample.slopeZ*s)*w
      localZ += (sample.slopeX*s+sample.slopeZ*c)*w
    }
    assert(Math.abs(result.height-height)<1e-12)
    assert.equal(Math.sign(result.roll),Math.sign(localX))
    assert.equal(Math.sign(result.pitch),-Math.sign(localZ))
    assert(Math.hypot(result.pitch,result.roll)<=BOAT_MAX_TILT)
  }
})
