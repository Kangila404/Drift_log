import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../src/hooks/useAccountDeletion.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;

function harness({ apiFailure = false, cleanupFailure = false, apple = false, appleCanceled = false } = {}) {
  const alerts = [], calls = [], states = [], removed = [];
  const modules = {
    react: { useRef: value => ({ current: value }), useState: value => [value, value => states.push(value)] },
    'react-native': { Alert: { alert: (...args) => alerts.push(args) }, Platform: { OS: 'ios' } },
    'expo-apple-authentication': {
      isAvailableAsync: async () => true,
      signInAsync: async () => {
        calls.push('apple');
        if (appleCanceled) throw { code: 'ERR_REQUEST_CANCELED' };
        return { identityToken: 'identity', authorizationCode: 'code' };
      },
    },
    'expo-router': { useRouter: () => ({
      canDismiss: () => true, dismissAll: () => calls.push('dismiss'),
      replace: route => calls.push(route),
    }) },
    '@react-native-async-storage/async-storage': { default: { multiRemove: async keys => {
      removed.push(...keys);
      if (cleanupFailure) throw new Error('storage');
    } } },
    '../api/voyage': { getUserProfile: async () => ({ authType: apple ? 'APPLE' : 'LOCAL' }), deleteAccount: async credentials => {
      if (apple) {
        assert.equal(credentials.appleIdentityToken, 'identity');
        assert.equal(credentials.appleAuthorizationCode, 'code');
      } else assert.equal(credentials, undefined);
      calls.push('delete');
      if (apiFailure) throw new Error('network');
    } },
    '../api/nativeBgm': { nativeBgm: { stop: () => calls.push('bgm') } },
    '../api/nativeNoise': { nativeNoise: { stopAll: () => calls.push('noise') } },
    '../services/studyNotification': { stopStudyNotification: async () => calls.push('notification') },
  };
  const exports = {};
  vm.runInNewContext(compiled, { exports, require: name => {
    assert.ok(name in modules, name); return modules[name];
  } });
  const hook = exports.useAccountDeletion();
  return { hook, alerts, calls, states, removed,
    confirm() {
      hook.removeAccount();
      alerts.at(-1)[2].find(button => button.text === '계속').onPress();
      return alerts.at(-1)[2].find(button => button.text === '계정 삭제').onPress;
    },
  };
}

test('cancel/first confirmation never deletes; final confirmation deletes once', async () => {
  const h = harness();
  const submit = h.confirm();
  assert.deepEqual(h.calls, []);
  await Promise.all([submit(), submit()]);
  assert.equal(h.calls.filter(call => call === 'delete').length, 1);
  assert.deepEqual(h.removed, ['accessToken', 'refreshToken', 'studyStartAt', 'studyGoalMin', 'studySubject', 'studyEndAt']);
  for (const call of ['bgm', 'noise', 'notification', 'dismiss', '/login']) assert.ok(h.calls.includes(call));
  assert.equal(h.alerts.at(-1)[0], '계정 삭제 완료');
});

test('API failure preserves local session and allows retry', async () => {
  const h = harness({ apiFailure: true });
  await h.confirm()();
  assert.deepEqual(h.calls, ['delete']);
  assert.deepEqual(h.removed, []);
  assert.equal(h.states.at(-1), false);
  assert.equal(h.alerts.at(-1)[0], '삭제 완료를 확인하지 못했습니다');
  await h.confirm()();
  assert.deepEqual(h.calls, ['delete', 'delete']);
});

test('local cleanup failure does not report a committed deletion as failed', async () => {
  const h = harness({ cleanupFailure: true });
  await h.confirm()();
  assert.ok(h.calls.includes('/login'));
  assert.ok(h.calls.includes('notification'));
  assert.equal(h.alerts.at(-1)[0], '계정 삭제 완료');
  assert.match(h.alerts.at(-1)[1], /기기 정리/);
});

test('Apple accounts reauthenticate before deleting', async () => {
  const h = harness({ apple: true });
  await h.confirm()();
  assert.deepEqual(h.calls.slice(0, 2), ['apple', 'delete']);
  assert.equal(h.alerts.at(-1)[0], '계정 삭제 완료');
});

test('canceling Apple authentication does not delete or clear the session', async () => {
  const h = harness({ apple: true, appleCanceled: true });
  await h.confirm()();
  assert.deepEqual(h.calls, ['apple']);
  assert.deepEqual(h.removed, []);
  assert.equal(h.states.at(-1), false);
  assert.equal(h.alerts.length, 2);
});
