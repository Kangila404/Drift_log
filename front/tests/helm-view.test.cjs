const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { test } = require('node:test')
const ts = require('typescript')

function load(relative) {
  const file = path.resolve(__dirname, relative), exports = {}
  vm.runInNewContext(ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS }, fileName: file,
  }).outputText, { exports })
  return exports
}
const helm = load('../../shared/src/helm.ts')
const view = load('../src/components/r3f/voyage/VoyageView.ts')
const framing = load('../src/components/r3f/voyage/BoatFraming.ts')

test('shared framing is centered and only four percent farther than deployed voyage', () => {
  for (const [width, height, mobile] of [[390, 844, true], [320, 568, true], [844, 390, true], [1440, 900, false]]) {
    const frame = framing.boatFraming(width, height, mobile)
    const tangent = Math.tan((mobile ? 64 : 52) * Math.PI / 360)
      * (width - (mobile ? 82 : 0)) / height * .9
    const oldDistance = Math.max(14.2, 5.5 * Math.sqrt(1 + 1 / tangent ** 2))
    assert(Math.abs(frame.distance / oldDistance - 1.04) < 1e-12)
    assert.equal(frame.position[0], 0)
    assert.equal(frame.target[0], 0)
    assert(Math.abs(Math.hypot(...frame.position.map((v, i) => v - frame.target[i])) - frame.distance) < 1e-12)
    assert(frame.position[1] > 0, 'camera stays above water')
  }
})

test('rotary helm is proportional, bounded and quiet around the center', () => {
  for (const value of [-4, 0, 4, NaN, Infinity]) assert.equal(Math.abs(helm.helmSteering(value)), 0)
  assert.equal(helm.helmSteering(37), .5)
  assert.equal(helm.helmSteering(-37), -.5)
  assert.equal(helm.helmSteering(180), 1)
  assert.equal(helm.helmSteering(-180), -1)
})

test('wheel seam crossing uses shortest angular change and hard stops do not wind up', () => {
  const rad = degrees => degrees * Math.PI / 180
  assert(Math.abs(helm.advanceHelmAngle(0, rad(179), rad(-179)) - 2) < 1e-10)
  assert.equal(helm.advanceHelmAngle(65, 0, 1), 70)
  assert(helm.advanceHelmAngle(70, 1, .9) < 70)
  assert.equal(helm.advanceHelmAngle(10, NaN, 1), 0)
})

test('sky pitch only looks upward, never down into the sea', () => {
  assert.equal(view.dragSkyPitch(0, -600, 800), 0)
  assert.equal(view.dragSkyPitch(0, 1000, 800), view.MAX_SKY_PITCH)
  assert(view.dragSkyPitch(0, 200, 800) > .5)
  assert.equal(view.dragSkyPitch(.3, 100, 0), 0)
})

test('steering camera follows a small portion of heading without an immediate snap', () => {
  const heading = -.35
  const first = view.followSteeringView(0, heading, 1/60)
  assert(first < 0 && first > -.005)
  let yaw = 0
  for(let i=0;i<240;i++) yaw = view.followSteeringView(yaw, heading, 1/60)
  assert(Math.abs(yaw - heading*.35)<.001)
  assert(Math.abs(yaw)<Math.abs(heading), 'The bow turn remains visible relative to the camera')
})

test('release returns smoothly by the shortest route and is frame-rate independent', () => {
  assert(view.returnViewAngle(1, 1/60) > .9)
  assert(view.returnViewAngle(Math.PI * 2 + .5, 1/60) < .5)
  const results = [30, 60, 120].map(fps => {
    let angle = 2
    for (let i = 0; i < fps; i++) angle = view.returnViewAngle(angle, 1/fps)
    return angle
  })
  assert(Math.max(...results) - Math.min(...results) < 1e-12)
  assert.equal(view.returnViewAngle(NaN, .1), 0)
})
