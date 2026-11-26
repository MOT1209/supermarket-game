import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WebGLGuard,
  defaultProbe,
  webglMessage,
  WEBGL_LOST,
  WEBGL_READY,
  WEBGL_UNAVAILABLE
} from '../src/core/WebGLGuard.js';

test('WebGL messages explain each failure state', () => {
  for (const state of [WEBGL_UNAVAILABLE, WEBGL_LOST]) {
    const msg = webglMessage(state);
    assert.equal(typeof msg, 'string');
    assert.ok(msg.length > 20, `${state} message should be helpful`);
  }
  assert.notEqual(webglMessage(WEBGL_UNAVAILABLE), webglMessage(WEBGL_LOST));
});

test('guard reports unavailable and calls back when the probe fails', () => {
  const seen = [];
  const guard = new WebGLGuard({ probe: () => false, onUnavailable: (m) => seen.push(m) });
  assert.equal(guard.check(), false);
  assert.equal(guard.status, WEBGL_UNAVAILABLE);
  assert.deepEqual(seen, [webglMessage(WEBGL_UNAVAILABLE)]);
});

test('guard accepts a working probe without callbacks', () => {
  const guard = new WebGLGuard({ probe: () => true });
  assert.equal(guard.check(), true);
  assert.equal(guard.status, WEBGL_READY);
});

test('context loss prevents the default action and notifies listeners', () => {
  let prevented = false;
  const events = [];
  const guard = new WebGLGuard({
    probe: () => true,
    onLost: (m) => events.push(m),
    onRestored: () => events.push('restored')
  });
  guard.check();
  guard.lost({
    preventDefault() {
      prevented = true;
    }
  });
  assert.equal(prevented, true);
  assert.equal(guard.status, WEBGL_LOST);
  assert.deepEqual(events, [webglMessage(WEBGL_LOST)]);
  guard.restored();
  assert.equal(guard.status, WEBGL_READY);
  assert.equal(events[1], 'restored');
});

test('default probe fails safely when there is no DOM (Node)', () => {
  assert.equal(defaultProbe(), false);
});
