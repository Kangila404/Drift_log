import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { test } from 'node:test';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const source = ts.transpileModule(readFileSync(new URL('../src/components/hud/VoyageLookJoystick.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function harness() {
  const slots = [], effects = [], sent = [], timers = new Map();
  let cursor = 0, pan, tree, appState, id = 0;
  const react = {
    useRef(value) { return slots[cursor++] ??= { current: value }; },
    useState(value) { const i = cursor++; if (!(i in slots)) slots[i] = value; return [slots[i], v => { slots[i] = v; }]; },
    useMemo(factory, deps) { const i = cursor++; if (!slots[i] || deps.some((v,j)=>slots[i].deps[j]!==v)) slots[i] = {value:factory(),deps}; return slots[i].value; },
    useCallback(fn, deps) { return react.useMemo(()=>fn, deps); },
    useEffect(fn, deps) { const i=cursor++; if (!slots[i] || deps.some((v,j)=>slots[i].deps[j]!==v)) effects.push(()=>{slots[i]?.cleanup?.();slots[i]={deps,cleanup:fn()};}); },
  };
  const exports = {};
  vm.runInNewContext(source, { exports,
    setInterval: fn => { const key=++id; timers.set(key,fn);return key; }, clearInterval: key=>timers.delete(key),
    require: name => ({ react, 'react/jsx-runtime': require('react/jsx-runtime'), 'react-native': {
      View:'View', StyleSheet:{create:s=>s,absoluteFill:{}},
      Animated:{View:'Animated.View', ValueXY:class {x=0;y=0;setValue(v){this.x=v.x;this.y=v.y;}}},
      PanResponder:{create:config=>{pan=config;return {panHandlers:{}};}},
      AppState:{addEventListener:(_,fn)=>{appState=fn;return {remove(){}};}},
    } })[name],
  });
  function render(enabled=true) { cursor=0;tree=exports.default({enabled,send:message=>sent.push(message)});effects.splice(0).forEach(fn=>fn()); }
  render();
  return {render,sent,timers,get pan(){return pan;},get tree(){return tree;},background:()=>appState('background')};
}
const event = (count=1) => ({nativeEvent:{touches:Array(count).fill({pageX:160,pageY:300}),locationX:140,locationY:240}});

test('joystick uses local touch origin, clamps displacement, and never sends steering', () => {
  const h=harness();h.pan.onPanResponderGrant(event());h.render();
  const ring=h.tree.props.children;
  assert.equal(ring.props.style[1].left,94);
  assert.equal(ring.props.style[1].top,194);
  h.pan.onPanResponderMove(event(),{dx:100,dy:-100});
  const input=h.sent.at(-1);
  assert.ok(Math.abs(Math.hypot(input.x,input.y)-1)<1e-10);
  assert.ok(input.y<0);
  assert.ok(h.sent.every(message=>message.action==='look'));
  h.pan.onPanResponderRelease();h.render();
  assert.equal(h.timers.size,0);assert.equal(h.tree.props.children,null);
  assert.equal(h.sent.at(-1).x,0);
});
test('second finger cancels ownership until a new grant', () => {
  const h=harness();h.pan.onPanResponderGrant(event());
  h.pan.onPanResponderStart(event(2));
  h.pan.onPanResponderMove(event(),{dx:40,dy:0});
  assert.equal(h.sent.at(-1).x,0);assert.equal(h.timers.size,0);
});
test('background and disabled state clear ring, heartbeat and camera input', () => {
  const h=harness();
  for (const stop of [h.background,()=>h.render(false),()=>h.pan.onPanResponderTerminate()]) {
    h.render(true);h.pan.onPanResponderGrant(event());h.pan.onPanResponderMove(event(),{dx:40,dy:0});
    stop();h.render(false);
    assert.equal(h.timers.size,0);assert.equal(h.sent.at(-1).x,0);assert.equal(h.tree.props.children,null);
  }
  assert.equal(h.pan.onStartShouldSetPanResponder(event()),false);
});
