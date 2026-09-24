import assert from "node:assert/strict";
import { test } from "node:test";
import vm from "node:vm";
import { createNativeNavigationReceiver } from "../../front/src/components/r3f/voyage/NativeVoyageNavigation.ts";
import {
  createVoyageNavigationController, navigationScript, readNavigationCapability,
  resolveVoyageWebUrl, PRODUCTION_VOYAGE_URL, STEERING_HEARTBEAT_MS,
} from "../src/services/voyageNavigation.ts";

function setup(t, ready = true) {
  t.mock.timers.enable({ apis: ["setInterval"] });
  const messages = [];
  const controller = createVoyageNavigationController((message) => messages.push(message));
  if (ready) controller.setCapability(true, true);
  controller.setEnabled(true, true);
  messages.length = 0;
  t.after(() => controller.setCapability(false, false));
  return { controller, messages, directions: () => messages.map((m) => m.direction) };
}

test("old web stays inert until an explicit v1 capability; request works before readiness", (t) => {
  const { controller, messages } = setup(t, false);
  controller.hold(-1);
  controller.resetCamera();
  t.mock.timers.tick(600);
  assert.deepEqual(messages, []);
  controller.requestState();
  assert.deepEqual(messages, [{ type: "voyage-control", action: "navigation-state-request" }]);
  controller.setCapability(true, true);
  controller.hold(1);
  assert.equal(messages.at(-1).direction, 1);
});

test("capability parser rejects malformed, unsupported and truthy-only values", () => {
  for (const value of [null, "ready", [], { type: "voyage", initReady: true }]) {
    assert.equal(readNavigationCapability(value), null);
  }
  for (const fields of [
    {}, { version: 2, available: true, canSteer: true },
    { version: 1, available: "true", canSteer: true },
    { version: 1, available: true }, { version: 1, available: true, canSteer: 1 },
  ]) {
    assert.deepEqual(readNavigationCapability({ type: "voyage-navigation", ...fields }),
      { available: false, canSteer: false });
  }
  assert.deepEqual(readNavigationCapability({ type: "voyage-navigation", version: 1, available: true, canSteer: false }),
    { available: true, canSteer: false });
});

test("held steering refreshes every 150ms and release clears the heartbeat", (t) => {
  const { controller, messages, directions } = setup(t);
  controller.hold(-1);
  t.mock.timers.tick(STEERING_HEARTBEAT_MS - 1);
  assert.deepEqual(directions(), [-1]);
  t.mock.timers.tick(1);
  assert.deepEqual(directions(), [-1, -1]);
  controller.release(-1);
  const count = messages.length;
  t.mock.timers.tick(1500);
  assert.equal(messages.length, count);
  assert.deepEqual(directions(), [-1, -1, 0]);
});

test("competing touches never revive the first direction after release", (t) => {
  const { controller, directions } = setup(t);
  controller.hold(-1);
  controller.hold(1);
  controller.release(-1);
  t.mock.timers.tick(150);
  controller.release(1);
  t.mock.timers.tick(600);
  assert.deepEqual(directions(), [-1, 1, 1, 0]);
});

test("repeated press-in has only one heartbeat", (t) => {
  const { controller, directions } = setup(t);
  controller.hold(1);
  controller.hold(1);
  t.mock.timers.tick(150);
  assert.deepEqual(directions(), [1, 1, 1]);
});

test("overlay/background/blur cancellation blocks commands and never restores a hold", (t) => {
  const { controller, messages, directions } = setup(t);
  controller.hold(-1);
  controller.setEnabled(false, false);
  const count = messages.length;
  controller.hold(1);
  controller.resetCamera();
  t.mock.timers.tick(600);
  assert.equal(messages.length, count);
  controller.setEnabled(true, true);
  t.mock.timers.tick(600);
  assert.deepEqual(directions(), [-1, 0]);
  controller.hold(1);
  assert.equal(messages.at(-1).direction, 1);
});

test("web canSteer false stops a hold but still allows camera reset", (t) => {
  const { controller, messages } = setup(t);
  controller.hold(1);
  controller.setCapability(true, false);
  assert.equal(messages.at(-1).direction, 0);
  const count = messages.length;
  controller.hold(-1);
  t.mock.timers.tick(600);
  assert.equal(messages.length, count);
  controller.resetCamera();
  assert.deepEqual(messages.at(-1), { type: "voyage-control", action: "reset-view" });
});

test("native voyage pause also stops steering before the next web capability", (t) => {
  const { controller, messages } = setup(t);
  controller.hold(-1);
  controller.setEnabled(true, false);
  const count = messages.length;
  controller.hold(1);
  t.mock.timers.tick(600);
  assert.equal(messages.length, count);
  assert.equal(messages.at(-1).direction, 0);
  controller.resetCamera();
  assert.equal(messages.at(-1).action, "reset-view");
});

test("capability loss/reload/unmount clears timers and needs a fresh handshake", (t) => {
  const { controller, messages } = setup(t);
  controller.hold(1);
  controller.setCapability(false, false);
  assert.equal(messages.at(-1).direction, 0);
  const count = messages.length;
  controller.hold(-1);
  controller.resetCamera();
  t.mock.timers.tick(600);
  assert.equal(messages.length, count);
  controller.setCapability(true, true);
  const restoredCount = messages.length;
  t.mock.timers.tick(600);
  assert.equal(messages.length, restoredCount);
});

test("reset stops steering before resetting the camera", (t) => {
  const { controller, messages } = setup(t);
  controller.hold(1);
  controller.resetCamera();
  assert.deepEqual(messages.slice(-2), [
    { type: "voyage-control", action: "steer", direction: 0 },
    { type: "voyage-control", action: "reset-view" },
  ]);
  const count = messages.length;
  t.mock.timers.tick(600);
  assert.equal(messages.length, count);
});

test("duplicate capability reports do not interrupt an active hold", (t) => {
  const { controller, directions } = setup(t);
  controller.hold(1);
  controller.setCapability(true, true);
  t.mock.timers.tick(150);
  assert.deepEqual(directions(), [1, 1]);
});

test("bridge dispatches exactly one JSON window message for each command", () => {
  for (const command of [
    { type: "voyage-control", action: "steer", direction: -1 },
    { type: "voyage-control", action: "reset-view" },
    { type: "voyage-control", action: "navigation-state-request" },
  ]) {
    const events = [];
    vm.runInNewContext(navigationScript(command), {
      MessageEvent,
      window: { dispatchEvent: (event) => events.push(event) },
    });
    assert.equal(events.length, 1);
    assert.equal(events[0].type, "message");
    assert.deepEqual(JSON.parse(events[0].data), command);
  }
});

test("URL override is development-only, HTTP(S), credential-free and optional", () => {
  for (const value of [undefined, "", "  ", "bad-url", "javascript:alert(1)", "file:///voyage", "https://user:password@example.com"]) {
    assert.equal(resolveVoyageWebUrl(value, true), PRODUCTION_VOYAGE_URL);
  }
  assert.equal(resolveVoyageWebUrl("http://192.168.1.2:30001", false), PRODUCTION_VOYAGE_URL);
  assert.equal(resolveVoyageWebUrl(" http://192.168.1.2:30001 ", true), "http://192.168.1.2:30001/voyage");
  assert.equal(resolveVoyageWebUrl("http://10.0.2.2:30001/voyage?test=1", true), "http://10.0.2.2:30001/voyage?test=1");
});

test("native bridge interoperates with the web receiver and its lost-release watchdog", (t) => {
  t.mock.timers.enable({ apis: ["setInterval", "setTimeout"] });
  const boat = { current: { input: 0, resetView: 0 } };
  const available = { available: true, canSteer: true };
  let dropMessages = false;
  const receiver = createNativeNavigationReceiver(boat, available, () => {
    const capability = readNavigationCapability({ type: "voyage-navigation", version: 1, ...available });
    controller.setCapability(capability.available, capability.canSteer);
  }, () => false);
  const controller = createVoyageNavigationController((command) => {
    if (dropMessages) return;
    vm.runInNewContext(navigationScript(command), {
      MessageEvent, window: { dispatchEvent: (event) => receiver.receive(event.data) },
    });
  });
  t.after(() => { controller.setCapability(false, false); receiver.clear(); });
  controller.setEnabled(true, true);
  controller.requestState();
  controller.hold(-1);
  assert.equal(boat.current.input, -1);
  for (let i = 0; i < 8; i++) {
    t.mock.timers.tick(150);
    assert.equal(boat.current.input, -1);
  }
  controller.release(-1);
  assert.equal(boat.current.input, 0);
  controller.hold(1);
  controller.resetCamera();
  assert.equal(boat.current.input, 0);
  assert.equal(boat.current.resetView, 1);
  controller.hold(1);
  dropMessages = true;
  controller.stop();
  t.mock.timers.tick(499);
  assert.equal(boat.current.input, 1);
  t.mock.timers.tick(1);
  assert.equal(boat.current.input, 0);
});
