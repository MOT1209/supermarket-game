import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeKey,
  isEditableTarget,
  readAxes,
  isSprinting,
  movementToWorld,
  clampPitch,
  describeLockError
} from '../src/core/controls.js';

test('key normalization handles letters, arrows and modifiers', () => {
  assert.equal(normalizeKey('W'), 'w');
  assert.equal(normalizeKey('ArrowLeft'), 'arrowleft');
  assert.equal(normalizeKey('Shift'), 'shift');
  assert.equal(normalizeKey(undefined), '');
});

test('editable targets are detected so typing never moves the player', () => {
  assert.equal(isEditableTarget({ tagName: 'INPUT' }), true);
  assert.equal(isEditableTarget({ tagName: 'TEXTAREA' }), true);
  assert.equal(isEditableTarget({ tagName: 'SELECT' }), true);
  assert.equal(isEditableTarget({ tagName: 'DIV', isContentEditable: true }), true);
  assert.equal(isEditableTarget({ tagName: 'CANVAS' }), false);
  assert.equal(isEditableTarget(null), false);
});

test('readAxes merges keyboard and joystick input without exceeding unit length', () => {
  const close = (actual, expected) => {
    assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} is not close to ${expected}`);
  };

  assert.deepEqual(readAxes({ w: true }), { x: 0, z: -1 });
  assert.deepEqual(readAxes({ s: true }), { x: 0, z: 1 });
  assert.deepEqual(readAxes({ a: true }), { x: -1, z: 0 });
  assert.deepEqual(readAxes({ d: true }), { x: 1, z: 0 });
  assert.deepEqual(readAxes({ arrowup: true }), { x: 0, z: -1 });
  assert.deepEqual(readAxes({ arrowdown: true }), { x: 0, z: 1 });
  assert.deepEqual(readAxes({ arrowleft: true }), { x: -1, z: 0 });
  assert.deepEqual(readAxes({ arrowright: true }), { x: 1, z: 0 });

  const diagonalKeys = readAxes({ w: true, d: true });
  close(diagonalKeys.x, Math.SQRT1_2);
  close(diagonalKeys.z, -Math.SQRT1_2);

  // Joystick magnitude is preserved: a half-strength push blends with W
  // and the combined vector is normalised back to unit length.
  const mixed = readAxes({ w: true }, { x: 0.5, z: 0 });
  close(mixed.x, 0.5 / Math.sqrt(1.25));
  close(mixed.z, -1 / Math.sqrt(1.25));
});

test('sprint combines keyboard and touch sprint state', () => {
  assert.equal(isSprinting(), false);
  assert.equal(isSprinting({ shift: true }), true);
  assert.equal(isSprinting({}, true), true);
  assert.equal(isSprinting({ shift: false }, false), false);
});

test('movement is relative to camera yaw with the correct signs', () => {
  const step = (axes, yaw) => movementToWorld(axes, yaw, 10, 0.1);

  // Yaw 0: camera looks down -Z, right is +X.
  assert.deepEqual(step({ x: 0, z: -1 }, 0), { x: 0, z: -1 });
  assert.deepEqual(step({ x: 0, z: 1 }, 0), { x: 0, z: 1 });
  assert.deepEqual(step({ x: 1, z: 0 }, 0), { x: 1, z: 0 });
  assert.deepEqual(step({ x: -1, z: 0 }, 0), { x: -1, z: 0 });

  // Yaw 90 deg: camera looks down -X, right is -Z.
  const q = Math.PI / 2;
  assert.ok(Math.abs(step({ x: 0, z: -1 }, q).x + 1) < 1e-9);
  assert.ok(Math.abs(step({ x: 0, z: -1 }, q).z) < 1e-9);
  assert.ok(Math.abs(step({ x: 1, z: 0 }, q).z + 1) < 1e-9);

  // Yaw -90 deg: camera looks down +X, right is +Z.
  const nq = -Math.PI / 2;
  assert.ok(Math.abs(step({ x: 0, z: -1 }, nq).x - 1) < 1e-9);
  assert.ok(Math.abs(step({ x: 1, z: 0 }, nq).z - 1) < 1e-9);
});

test('pitch is clamped and lock errors are described visibly', () => {
  assert.equal(clampPitch(10), 1.4);
  assert.equal(clampPitch(-10), -1.4);
  assert.match(describeLockError({ name: 'NotAllowedError' }), /permission|blocked/i);
  assert.match(describeLockError({ name: 'SecurityError' }), /secure|permission/i);
  assert.match(describeLockError(null), /click|retry/i);
});
