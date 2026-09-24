// Run: node --test front/tests/voyage-events.test.cjs
// Without a local jsdom install, set DRIFTLOG_TEST_JSDOM to its package directory.
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { test } = require('node:test')
const { createRequire } = require('node:module')
// Match React across hoisted dependencies and the DOM renderer in this workspace.
const rootRequire = createRequire(path.join(__dirname, '../../package.json'))
const ts = require('typescript')
const { JSDOM } = require(process.env.DRIFTLOG_TEST_JSDOM || 'jsdom')
const React = rootRequire('react')
const { create } = rootRequire('zustand')

const dom = new JSDOM('<!doctype html><html><body></body></html>')
global.window = dom.window
global.document = dom.window.document
global.IS_REACT_ACT_ENVIRONMENT = true
const { createRoot } = rootRequire('react-dom/client')
const { renderToStaticMarkup } = rootRequire('react-dom/server')
const { act, createElement, StrictMode } = React

function loadSource(file, imports = {}, globals = {}) {
  const source = readFileSync(path.join(__dirname, '../src', file), 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    fileName: file,
  })
  const module = { exports: {} }
  vm.runInNewContext(outputText, {
    exports: module.exports,
    module,
    require: id => Object.hasOwn(imports, id) ? imports[id] : id.endsWith('.css') ? {} : rootRequire(id),
    ...globals,
  }, { filename: file })
  return module.exports
}

const constants = loadSource('constants/event.ts')
const eventFixture = (eventId = 1) => Object.freeze({
  eventId, type: 'Server title', textContent: 'Original server narrative', imageUrl: null,
})
const MIN_DELAY = 25 * 60_000
const MAX_DELAY = 35 * 60_000

async function fixture(t, initialState = 'SAILING', random = 0) {
  let now = 0
  let nextId = 0
  let displayed = null
  let mounted = true
  let effectSetups = 0
  const timers = new Map()
  const requests = []
  const occurrences = []
  const store = create(() => ({
    voyageState: initialState,
    addOccurredEvent: id => occurrences.push(id),
  }))
  const { useRandomEvent } = loadSource('hooks/useRandomEvent.ts', {
    '../api/event': {
      getRandomEvent: () => new Promise((resolve, reject) => requests.push({ resolve, reject })),
    },
    '../stores/voyageStore': { useVoyageStore: store },
    '../constants/event': constants,
  }, {
    Math: { random: () => { effectSetups++; return random } },
    setTimeout: (callback, delay) => {
      const id = ++nextId
      timers.set(id, { at: now + delay, callback })
      return id
    },
    clearTimeout: id => timers.delete(id),
  })
  function Probe() {
    displayed = useRandomEvent()
    return null
  }
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const close = async () => {
    if (mounted) {
      await act(async () => root.unmount())
      mounted = false
      container.remove()
    }
  }
  t.after(close)
  await act(async () => root.render(createElement(StrictMode, null, createElement(Probe))))
  return {
    requests, occurrences, timers, close,
    get event() { return displayed },
    get effectSetups() { return effectSetups },
    async state(voyageState) {
      await act(async () => store.setState({ voyageState }))
    },
    async advance(ms) {
      await act(async () => {
        now += ms
        for (const [id, timer] of [...timers]) {
          if (timer.at <= now) {
            timers.delete(id)
            timer.callback()
          }
        }
      })
    },
    async resolve(index, event) {
      await act(async () => requests[index].resolve(event))
    },
    async reject(index) {
      await act(async () => requests[index].reject(new Error('offline')))
    },
  }
}

test('StrictMode replay leaves one schedule; records once and hides at 12 seconds', async t => {
  const f = await fixture(t)
  assert.equal(f.effectSetups, 2, 'Actual React StrictMode must replay the mount effect')
  assert.equal(f.timers.size, 1)
  await f.advance(MIN_DELAY - 1)
  assert.equal(f.requests.length, 0)
  await f.advance(1)
  const event = eventFixture()
  await f.resolve(0, event)
  assert.equal(f.event, event, 'Keep the response object identity for the encounter')
  assert.deepEqual(f.occurrences, [1])
  await f.advance(11_999)
  assert.equal(f.event, event)
  await f.advance(1)
  assert.equal(f.event, null)
  assert.equal(f.timers.size, 1)
})

test('upper randomized interval remains 35 minutes', async t => {
  const f = await fixture(t, 'SAILING', 1)
  await f.advance(MAX_DELAY - 1)
  assert.equal(f.requests.length, 0)
  await f.advance(1)
  assert.equal(f.requests.length, 1)
})

for (const state of ['PAUSED', 'ANCHORED']) {
  test(`${state} does not schedule and discards a late successful response`, async t => {
    const f = await fixture(t, state)
    assert.equal(f.timers.size, 0)
    await f.state('SAILING')
    await f.advance(MIN_DELAY)
    await f.state(state)
    await f.resolve(0, eventFixture())
    assert.equal(f.event, null)
    assert.deepEqual(f.occurrences, [])
    assert.equal(f.timers.size, 0)
    await f.advance(MAX_DELAY * 2)
    assert.equal(f.requests.length, 1)
  })
}

test('stop clears the displayed event and both timers; restart gets a fresh interval', async t => {
  const f = await fixture(t)
  await f.advance(MIN_DELAY)
  await f.resolve(0, eventFixture())
  assert.equal(f.timers.size, 2)
  await f.state('PAUSED')
  assert.equal(f.event, null)
  assert.equal(f.timers.size, 0)
  await f.state('SAILING')
  await f.advance(MIN_DELAY - 1)
  assert.equal(f.requests.length, 1)
  await f.advance(1)
  const next = eventFixture()
  await f.resolve(1, next)
  assert.equal(f.event, next)
  assert.deepEqual(f.occurrences, [1, 1])
})

test('late response from a stopped run cannot overwrite or shorten a restarted event', async t => {
  const f = await fixture(t)
  await f.advance(MIN_DELAY)
  await f.state('PAUSED')
  await f.state('SAILING')
  await f.advance(MIN_DELAY)
  const next = eventFixture(2)
  await f.resolve(1, next)
  await f.resolve(0, eventFixture(1))
  assert.equal(f.event, next)
  assert.deepEqual(f.occurrences, [2])
  assert.equal(f.timers.size, 2)
  await f.advance(12_000)
  assert.equal(f.event, null)
})

for (const settlement of ['resolve', 'reject']) {
  test(`unmount with pending fetch ignores late ${settlement} and never reschedules`, async t => {
    const f = await fixture(t)
    await f.advance(MIN_DELAY)
    await f.close()
    if (settlement === 'resolve') await f.resolve(0, eventFixture())
    else await f.reject(0)
    assert.deepEqual(f.occurrences, [])
    assert.equal(f.timers.size, 0)
  })
}

test('unmount clears active display and schedule timers', async t => {
  const f = await fixture(t)
  await f.advance(MIN_DELAY)
  await f.resolve(0, eventFixture())
  await f.close()
  assert.equal(f.timers.size, 0)
})

test('null and failed responses retry only while sailing; unknown IDs still record', async t => {
  const f = await fixture(t)
  await f.advance(MIN_DELAY)
  await f.resolve(0, null)
  assert.equal(f.event, null)
  assert.equal(f.timers.size, 1)
  await f.advance(MIN_DELAY)
  await f.reject(1)
  assert.equal(f.timers.size, 1)
  await f.advance(MIN_DELAY)
  const unknown = eventFixture(999)
  await f.resolve(2, unknown)
  assert.equal(f.event, unknown)
  assert.deepEqual(f.occurrences, [999])
  await f.advance(MIN_DELAY)
  await f.state('PAUSED')
  await f.reject(3)
  assert.equal(f.timers.size, 0)
})

test('five compact captions preserve server data and unknown text falls back', () => {
  const captions = new Set()
  for (let id = 1; id <= 5; id++) {
    const event = eventFixture(id)
    const caption = constants.getEventCaption(event)
    assert(caption.length <= 22, 'Keep known captions compact for narrow layouts')
    assert(!caption.includes('\n'))
    assert.notEqual(caption, event.textContent)
    assert.equal(event.textContent, 'Original server narrative')
    captions.add(caption)
  }
  assert.equal(captions.size, 5)
  assert.equal(constants.getEventCaption(eventFixture(999)), 'Original server narrative')
  assert.equal(constants.getEventCaption({ ...eventFixture(999), textContent: '  ' }), 'Server title')
})

test('overlay renders only passive caption text and no illustration dependency', () => {
  const css = readFileSync(path.join(__dirname, '../src/components/event/EventOverlay.css'), 'utf8')
  const styleDocument = new JSDOM(`<style>${css}</style>`)
  const baseRule = styleDocument.window.document.styleSheets[0].cssRules[0]
  assert.equal(baseRule.selectorText, '.voyage-event-caption')
  assert(baseRule.style.getPropertyValue('bottom').includes('safe-area-inset-bottom'))
  const { default: Overlay } = loadSource('components/event/EventOverlay.tsx', {
    '../../constants/event': constants,
  })
  assert.equal(renderToStaticMarkup(createElement(Overlay, { event: null })), '')
  for (const id of [1, 2, 3, 4, 5, 999]) {
    const event = eventFixture(id)
    const html = renderToStaticMarkup(createElement(Overlay, { event }))
    const node = new JSDOM(html).window.document.body
    assert.equal(node.children.length, 1)
    assert.equal(node.firstElementChild.tagName, 'P')
    assert.equal(node.textContent, constants.getEventCaption(event))
    assert.equal(node.querySelector('svg, img, button, a, h1, h2'), null)
    assert.equal(node.firstElementChild.style.pointerEvents, 'none')
    assert.equal(Number.parseFloat(node.firstElementChild.style.letterSpacing), 0)
    assert(node.firstElementChild.classList.contains('voyage-event-caption'))
  }
})

test('caption mount, same-ID replacement and removal clean up animations in StrictMode', async t => {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  let mounted = true
  let active = false
  let starts = 0
  let stops = 0
  const scope = { current: null }
  const animate = (node, keyframes, options) => {
    assert.equal(node, container.querySelector('[role="status"]'), 'Caption must mount before animation starts')
    assert.equal(keyframes.opacity[0], 0)
    assert.equal(active, false, 'A replacement must stop the previous animation')
    assert.equal(options.duration, 12)
    active = true
    starts++
    return { stop: () => { active = false; stops++ } }
  }
  // Observe the animation boundary while running the component's real React effects.
  const { default: Overlay } = loadSource('components/event/EventOverlay.tsx', {
    '../../constants/event': constants,
    'framer-motion': {
      useAnimate: () => [scope, animate],
    },
  })
  const close = async () => {
    if (!mounted) return
    await act(async () => root.unmount())
    mounted = false
    container.remove()
  }
  t.after(close)
  const render = async event => {
    await act(async () => root.render(createElement(StrictMode, null, createElement(Overlay, { event }))))
  }

  const first = eventFixture(1)
  await render(first)
  assert.equal(starts, 2, 'StrictMode must replay initial caption setup')
  assert.equal(stops, 1)
  assert.equal(container.textContent, constants.getEventCaption(first))
  assert.equal(container.children.length, 1)

  await render(first)
  assert.equal(starts, 2, 'Unrelated rerenders must not restart the same occurrence')
  assert.equal(stops, 1)

  const repeated = eventFixture(1)
  await render(repeated)
  assert.equal(starts, 3, 'A new object with the same ID must restart its caption')
  assert.equal(stops, 2)
  assert.equal(container.children.length, 1, 'Do not stack identical captions')

  await render(null)
  assert.equal(container.children.length, 0)
  assert.equal(active, false)
  assert.equal(stops, 3)
  await render(null)
  assert.equal(starts, 3)
  assert.equal(stops, 3)

  await render(repeated)
  assert.equal(starts, 4, 'The same ID must mount again after the caption is cleared')
  assert.equal(container.textContent, constants.getEventCaption(repeated))
  await close()
  assert.equal(active, false)
  assert.equal(stops, 4)
  assert.equal(container.children.length, 0)
})
