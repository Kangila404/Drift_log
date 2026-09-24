const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')
const THREE = require('three')

const filename = path.resolve(__dirname, '../src/components/r3f/ConstellationField.ts')
const loaded = new Module(filename, module)
loaded.filename = filename
loaded.paths = Module._nodeModulePaths(path.dirname(filename))
loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename)
const { CONSTELLATION_PATTERNS: patterns, createConstellationField, constellationVisibility,
  CONSTELLATION_LINE_OPACITY, CONSTELLATION_STAR_OPACITY } = loaded.exports

test('six distinct small constellations cover all viewing directions', () => {
  assert.equal(patterns.length, 6)
  assert.equal(new Set(patterns.map(p => JSON.stringify(p.points))).size, 6)
  const angles = patterns.map(p => (p.azimuth + 360) % 360).sort((a, b) => a - b)
  angles.forEach((a, i) => assert((angles[(i + 1) % angles.length] - a + 360) % 360 <= 80))
  patterns.forEach(p => {
    p.edges.forEach(([a, b]) => { assert(p.points[a] && p.points[b]); assert.notEqual(a, b) })
    assert(p.elevation >= 12 && p.elevation <= 24)
  })
})

test('batched field is deterministic, finite, above horizon and on a common sky shell', () => {
  const field = createConstellationField()
  assert.deepEqual(field, createConstellationField())
  assert.equal(field.points.length / 3, patterns.reduce((n, p) => n + p.points.length, 0))
  assert.equal(field.lines.length / 6, patterns.reduce((n, p) => n + p.edges.length, 0))
  for (const [positions, phases] of [[field.points, field.pointPhases], [field.lines, field.linePhases]]) {
    assert.equal(positions.length / 3, phases.length)
    assert(positions.every(Number.isFinite))
    for (let i = 0; i < positions.length; i += 3) {
      assert(positions[i + 1] > 0)
      assert(Math.abs(Math.hypot(...positions.slice(i, i + 3)) - 180) < 1e-4)
    }
  }
})

test('both layers respect weather, daytime and host star suppression at low brightness', () => {
  assert.equal(constellationVisibility(false, 1, 1), 0)
  assert.equal(constellationVisibility(true, 0, 1), 0)
  assert.equal(constellationVisibility(true, 1, 0), 0)
  assert.equal(constellationVisibility(true, .4, .5), .2)
  assert.equal(constellationVisibility(true, 2, 2), 1)
  assert.equal(constellationVisibility(true, -1, 1), 0)
  assert(CONSTELLATION_LINE_OPACITY <= .04)
  assert(CONSTELLATION_STAR_OPACITY <= .35)
})

test('view-space disc projects circularly during orbit without relocating the anchor', () => {
  const anchor = new THREE.Vector3(0, 8.4, -20)
  for (const aspect of [1440 / 900, 390 / 844]) {
    const camera = new THREE.PerspectiveCamera(52, aspect, .1, 1000)
    for (const angle of [-1.2, -.7, 0, .7, 1.2]) {
      camera.position.set(Math.sin(angle) * 18, 2, Math.cos(angle) * 18)
      camera.lookAt(0, 1, 0)
      camera.updateMatrixWorld()
      const center = anchor.clone().applyMatrix4(camera.matrixWorldInverse)
      const project = (x, y) => center.clone().add(new THREE.Vector3(x, y, 0)).applyMatrix4(camera.projectionMatrix)
      const right = project(1, 0), left = project(-1, 0), top = project(0, 1), bottom = project(0, -1)
      assert(Math.abs((right.x - left.x) * aspect / (top.y - bottom.y) - 1) < 1e-10)
      assert.deepEqual(anchor.toArray(), [0, 8.4, -20])
    }
  }
  const shader = fs.readFileSync(path.resolve(__dirname, '../src/components/r3f/OceanSkyShader.ts'), 'utf8')
    .split('export const celestialVertexShader')[1].split('export const celestialFragmentShader')[0]
  assert.match(shader, /modelViewMatrix \* vec4\(0\.0, 0\.0, 0\.0, 1\.0\)/)
  assert.match(shader, /mvPosition\.xy \+= position\.xy \* worldScale/)
})
