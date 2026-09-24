const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')

function load(name, dependencies = {}) {
  const filename = path.resolve(__dirname, '../src/components/r3f/voyage', name)
  const loaded = new Module(filename, module)
  loaded.filename = filename
  loaded.paths = Module._nodeModulePaths(path.dirname(filename))
  const nativeRequire = loaded.require.bind(loaded)
  loaded.require = name => Object.hasOwn(dependencies, name) ? dependencies[name] : nativeRequire(name)
  loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename,
  }).outputText, filename)
  return loaded.exports
}

const trailModule = load('WakeTrail.ts')
const { createWakeTrail, advanceWakeTrail, WAKE_LIFETIME, WAKE_STERN_Z } = trailModule
const { createWakeSheets, updateWakeSheets, waterlineBeam } = load('WakeGeometry.ts', { './WakeTrail': trailModule })
const parts = sheets => [...sheets.shoulders, sheets.stern]
const close = (actual, expected, message) => assert(Math.abs(actual - expected) < 2e-6, `${message}: ${actual} != ${expected}`)

function fixture(t, pose = { x: 0, heading: 0, speed: 1 }, seconds = 3) {
  const sheets = createWakeSheets(), trail = createWakeTrail()
  t.after(() => parts(sheets).forEach(part => part.geometry.dispose()))
  for (let i = 0; i < Math.round(seconds * 60); i++) advanceWakeTrail(trail, pose, 1 / 60)
  updateWakeSheets(sheets, trail, pose, seconds)
  return { sheets, trail, pose }
}

function activeCount(part) {
  const indices = part.geometry.index.array
  const { start, count } = part.geometry.drawRange
  const end = Math.min(indices.length, start + count)
  return end > start ? Math.max(...indices.subarray(start, end)) + 1 : 0
}

function snapshot(sheets) {
  return parts(sheets).map(part => ({
    positions: Array.from(part.positions), strength: Array.from(part.strength),
    crest: Array.from(part.crest), uv: Array.from(part.uv), drawRange: { ...part.geometry.drawRange },
  }))
}

function checkActiveNormals(sheets, label) {
  for (const part of parts(sheets)) {
    const normals = part.geometry.getAttribute('normal')
    assert(normals && normals.array.every(Number.isFinite), `${label}: non-finite normal array`)
  }
  const geometry = sheets.stern.geometry, { start, count } = geometry.drawRange
  const indices = Array.from(geometry.index.array.subarray(start, start + count))
  const reference = geometry.clone()
  try {
    // Recompute independently with no triangles outside the actual draw range.
    reference.setIndex(indices)
    reference.computeVertexNormals()
    const actual = geometry.getAttribute('normal'), expected = reference.getAttribute('normal')
    assert(expected.array.every(Number.isFinite), `${label}: non-finite reference normals`)
    for (const vertex of new Set(indices)) {
      for (let axis = 0; axis < 3; axis++) {
        close(actual.array[vertex * 3 + axis], expected.array[vertex * 3 + axis],
          `${label}: normal contaminated at vertex ${vertex}, axis ${axis}`)
      }
    }
  } finally {
    reference.dispose()
  }
  return indices.length
}

test('startup normals match an active-only index copy while unused rows remain', t => {
  const { sheets, trail, pose } = fixture(t, { x: 1.2, heading: .18, speed: 1 }, 0)
  let compared = 0
  for (let frame = 1; frame <= 24; frame++) {
    advanceWakeTrail(trail, pose, 1 / 60)
    updateWakeSheets(sheets, trail, pose, frame / 60)
    assert(sheets.stern.geometry.drawRange.count < sheets.stern.geometry.index.count)
    compared += checkActiveNormals(sheets, `Startup frame ${frame}`)
  }
  assert(compared > 0, 'Startup must exercise drawn triangles')
})

test('expiring tail normals match an active-only index copy as rows disappear', t => {
  const { sheets, trail, pose } = fixture(t, { x: -2, heading: -.2, speed: 1 })
  const stopped = { ...pose, speed: 0 }
  let previousCount = sheets.stern.geometry.drawRange.count, shrinkingChecks = 0
  for (let frame = 1; frame <= Math.ceil((WAKE_LIFETIME + .1) * 60); frame++) {
    advanceWakeTrail(trail, stopped, 1 / 60)
    updateWakeSheets(sheets, trail, stopped, 3 + frame / 60)
    const count = sheets.stern.geometry.drawRange.count
    if (count < previousCount) {
      checkActiveNormals(sheets, `Expiry frame ${frame}`)
      shrinkingChecks++
    }
    previousCount = count
  }
  assert(shrinkingChecks > 2, 'Expiry must exercise multiple active boundary rows')
  assert.equal(sheets.stern.geometry.drawRange.count, 0)
})

test('fully expired tail clears stale positions and energy with finite normals', t => {
  const { sheets, trail, pose } = fixture(t)
  const stopped = { ...pose, speed: 0 }
  for (let frame = 0; frame < Math.ceil((WAKE_LIFETIME + .1) * 60); frame++) {
    advanceWakeTrail(trail, stopped, 1 / 60)
  }
  updateWakeSheets(sheets, trail, stopped, 6)
  assert.equal(trail.points.length, 0)
  assert.equal(sheets.stern.geometry.drawRange.count, 0)
  for (const name of ['positions', 'strength', 'crest']) {
    assert(sheets.stern[name].every(value => value === 0), `Expired ${name} must be zero`)
  }
  checkActiveNormals(sheets, 'Fully expired tail')
})

test('three bounded sheets have finite attributes and valid indexed triangles', t => {
  const { sheets, trail, pose } = fixture(t)
  assert.equal(sheets.shoulders.length, 2)
  assert.equal(parts(sheets).length, 3)
  let triangles = 0
  for (const part of parts(sheets)) {
    const vertices = part.positions.length / 3, geometry = part.geometry
    triangles += geometry.index.count / 3
    assert.equal(geometry.index.count % 3, 0)
    assert(geometry.index.count > 0)
    assert(geometry.index.array.every(index => Number.isInteger(index) && index >= 0 && index < vertices))
    const normals = geometry.getAttribute('normal')
    if (normals) assert(normals.array.every(Number.isFinite), 'Non-finite surface normals')
    for (const [name, array, size] of [
      ['position', part.positions, 3], ['strength', part.strength, 1],
      ['crest', part.crest, 1], ['uv', part.uv, 2],
    ]) {
      assert.equal(array.length, vertices * size)
      assert(array.every(Number.isFinite), `${name} contains a non-finite value`)
      assert.equal(geometry.getAttribute(name).array, array)
    }
    const buffers = [part.positions, part.strength, part.crest, part.uv]
    updateWakeSheets(sheets, trail, pose, 4)
    buffers.forEach((buffer, i) => assert.equal([part.positions, part.strength, part.crest, part.uv][i], buffer))
  }
  assert(triangles <= 2600, `Allocated wake triangle budget exceeded: ${triangles}`)
  assert(sheets.stern.geometry.drawRange.count <= sheets.stern.geometry.index.count)
})

test('displacement stays low at all speeds and full-speed curls have real height', t => {
  for (const speed of [0, .03, .25, .5, 1]) {
    const { sheets, trail, pose } = fixture(t, { x: -3, heading: -.21, speed })
    for (const phase of [0, .37, 2.1, 7.9]) {
      updateWakeSheets(sheets, trail, pose, phase)
      for (const part of parts(sheets)) {
        let peak = 0
        const count = activeCount(part)
        for (let i = 0; i < count; i++) {
          const height = part.positions[i * 3 + 1]
          assert(Number.isFinite(height) && height >= -1e-7 && height < .36 * speed + 1e-7)
          assert(part.strength[i] >= 0 && part.strength[i] <= 1 + 1e-6)
          assert(part.crest[i] >= 0 && part.crest[i] <= 1 + 1e-6)
          peak = Math.max(peak, height)
        }
        if (speed === 1) assert(peak > .04, 'Full-speed water must have resolved local displacement')
      }
    }
  }
})

test('stern history is physically flat with zero energy by one second while retained', t => {
  const { sheets, trail, pose } = fixture(t, { x: 1.2, heading: .18, speed: 1 }, 0)
  const ages = [.18, .99, 1, 1.001, 1.5, 2.19, WAKE_LIFETIME]
  trail.points = ages.map((age, seed) => ({
    x: pose.x, z: -4 + WAKE_STERN_Z + age * 2.78,
    heading: pose.heading, age, strength: 1, seed,
  }))
  const history = JSON.stringify(trail.points)
  for (const speed of [1, 0]) {
    updateWakeSheets(sheets, trail, { ...pose, speed }, 3)
    const part = sheets.stern, offset = speed > 0 ? 1 : 0
    assert.equal(activeCount(part), (ages.length + offset) * part.columns)
    for (let row = 0; row < ages.length; row++) {
      const start = (row + offset) * part.columns
      const heights = Array.from({ length: part.columns }, (_, col) => part.positions[(start + col) * 3 + 1])
      const strength = part.strength.subarray(start, start + part.columns)
      const crest = part.crest.subarray(start, start + part.columns)
      for (const [name, values] of [['height', heights], ['strength', strength], ['crest', crest]]) {
        assert(values.every(Number.isFinite), `${name} must stay finite`)
        if (ages[row] >= 1) {
          assert(values.every(value => value === 0), `${name} must settle to zero at age ${ages[row]}, speed ${speed}`)
        } else {
          assert(values.some(value => value > 0), `Young history must retain ${name} at age ${ages[row]}`)
        }
      }
    }
    assert.equal(JSON.stringify(trail.points), history, 'Settling must not delete or mutate retained history')
  }
  assert.equal(WAKE_LIFETIME, 2.2)
})

test('waterline beam lies on the immersed hull cross-section in world units', () => {
  const scale = 1.8, waterline = -.7 / scale + .16
  for (const t of [0, .1, .23, .5, .75, .9, 1]) {
    const width = waterlineBeam(t)
    const beam = .025 + 1.17 * (1 - Math.exp(-t * 9)) * (1 - .24 * t * t)
    const sheer = .39 + .24 * (1 - t) ** 3 + .07 * t ** 4
    const keel = -.79 + .43 * (1 - t) ** 4 + .12 * t ** 5
    assert(Number.isFinite(width) && width > 0 && width < beam * scale)
    // The hull's elliptical section must pass through (width, waterline).
    close((width / scale / beam) ** 2 + ((sheer - waterline) / (sheer - keel)) ** 2, 1, 'Hull section intersection')
  }
  assert(waterlineBeam(1) > 1.29 && waterlineBeam(1) < 1.33, 'Stern contact must stay near 1.3 world units')
})

test('shoulder roots follow waterline sections instead of maximum hull beam', t => {
  const { sheets } = fixture(t)
  for (const part of sheets.shoulders) {
    for (let row = 1; row < part.rows; row++) {
      const rootX = Math.abs(part.positions[row * part.columns * 3])
      const contact = waterlineBeam(row / part.rows)
      assert(Math.abs(rootX - contact) <= .03, `Detached shoulder root at row ${row}: ${rootX} vs ${contact}`)
    }
  }
})

test('outer edges and shoulder tips meet the base without displaced walls', t => {
  const { sheets } = fixture(t)
  for (const part of parts(sheets)) {
    const count = activeCount(part)
    for (let row = 0; row * part.columns < count; row++) {
      for (const col of [0, part.columns - 1]) {
        const i = row * part.columns + col
        close(part.positions[i * 3 + 1], 0, 'Outer displacement')
        close(part.strength[i], 0, 'Outer coverage')
      }
    }
  }
  for (const part of sheets.shoulders) for (const row of [0, part.rows]) {
    for (let col = 0; col < part.columns; col++) {
      const i = row * part.columns + col
      close(part.positions[i * 3 + 1], 0, 'Shoulder tip displacement')
      close(part.strength[i], 0, 'Shoulder tip coverage')
    }
  }
})

test('shoulders follow the boat world transform without double scale or rotation', t => {
  const reference = fixture(t, { x: 0, heading: 0, speed: 1 })
  for (const heading of [-.21, .21]) {
    const { sheets } = fixture(t, { x: 2.3, heading, speed: 1 })
    sheets.shoulders.forEach((part, side) => {
      const base = reference.sheets.shoulders[side].positions
      for (let i = 0; i < base.length; i += 3) {
        const x = base[i], z = base[i + 2] + 4
        close(part.positions[i], 2.3 + x * Math.cos(heading) + z * Math.sin(heading), 'World x')
        close(part.positions[i + 1], base[i + 1], 'Local displacement')
        close(part.positions[i + 2], -4 + z * Math.cos(heading) - x * Math.sin(heading), 'World z')
      }
    })
  }
})

test('live stern row stays at the transom between emissions and joins history', t => {
  const { sheets, trail } = fixture(t)
  for (const heading of [-.21, 0, .21]) {
    const pose = { x: 1.2, heading, speed: 1 }
    updateWakeSheets(sheets, trail, pose, 3)
    const part = sheets.stern, center = Math.floor(part.columns / 2)
    close(part.positions[center * 3], pose.x + Math.sin(heading) * WAKE_STERN_Z, 'Live stern x')
    close(part.positions[center * 3 + 2], -4 + Math.cos(heading) * WAKE_STERN_Z, 'Live stern z')
    assert(part.strength.subarray(0, part.columns).some(value => value > .05), 'Live row must retain active curl lobes')
    const historyCenter = part.columns + center
    close(part.positions[historyCenter * 3], trail.points[0].x, 'First history row x')
    close(part.positions[historyCenter * 3 + 2], trail.points[0].z, 'First history row z')
    const firstSpan = part.geometry.index.array.subarray(0, (part.columns - 1) * 6)
    for (const index of firstSpan) assert(index < part.columns * 2)
    assert(firstSpan.some(index => index < part.columns))
    assert(firstSpan.some(index => index >= part.columns))
    advanceWakeTrail(trail, pose, .017)
  }
})

test('turning the live boat never retransforms emitted stern rows', t => {
  const { sheets, trail, pose } = fixture(t)
  const before = snapshot(sheets)[2]
  updateWakeSheets(sheets, trail, { ...pose, x: 3, heading: -.21 }, 3)
  const after = snapshot(sheets)[2], part = sheets.stern
  const count = activeCount(part)
  assert.deepEqual(after.positions.slice(part.columns * 3, count * 3), before.positions.slice(part.columns * 3, count * 3))
  assert.deepEqual(after.strength.slice(part.columns, count), before.strength.slice(part.columns, count))
  assert.notDeepEqual(after.positions.slice(0, part.columns * 3), before.positions.slice(0, part.columns * 3))
})

test('zero elapsed time and fixed phase preserve all geometry and trail values', t => {
  const { sheets, trail, pose } = fixture(t)
  const before = snapshot(sheets), beforeTrail = JSON.stringify(trail)
  for (let i = 0; i < 12; i++) {
    advanceWakeTrail(trail, pose, 0)
    updateWakeSheets(sheets, trail, pose, 3)
  }
  assert.equal(JSON.stringify(trail), beforeTrail)
  assert.deepEqual(snapshot(sheets), before)
})

test('stopping removes new collar energy, preserves old wash, then clears its draw range', t => {
  const { sheets, trail, pose } = fixture(t)
  const stopped = { ...pose, speed: 0 }, serial = trail.serial
  advanceWakeTrail(trail, stopped, 1 / 60)
  updateWakeSheets(sheets, trail, stopped, 3 + 1 / 60)
  for (const part of sheets.shoulders) {
    assert(part.strength.every(value => value === 0))
    assert(part.positions.every((value, i) => i % 3 !== 1 || value === 0))
  }
  assert(sheets.stern.geometry.drawRange.count > 0, 'Existing wash must not vanish on stop')
  assert(sheets.stern.strength.subarray(0, activeCount(sheets.stern)).some(value => value > 0))
  for (let i = 0; i < Math.ceil((WAKE_LIFETIME + .1) * 60); i++) advanceWakeTrail(trail, stopped, 1 / 60)
  updateWakeSheets(sheets, trail, stopped, 6)
  assert.equal(trail.serial, serial)
  assert.equal(trail.points.length, 0)
  assert.equal(sheets.stern.geometry.drawRange.count, 0)
})
