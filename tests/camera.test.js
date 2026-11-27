import test from 'node:test';
import assert from 'node:assert/strict';
import { safeCameraDistance } from '../src/utils/camera.js';

test('third-person camera stops before a wall', () => {
  const distance = safeCameraDistance(0, 0, 0, -3, (x, z) => z <= -1);
  assert.ok(distance > 0.7 && distance < 1, `camera stopped at ${distance}m`);
});

test('third-person camera keeps its distance in the open', () => {
  assert.equal(
    safeCameraDistance(0, 0, 0, -3.2, () => false),
    3.2
  );
});

test('third-person camera collapses against a close wall', () => {
  const distance = safeCameraDistance(0, 0, 0, -3, (x, z) => z <= -0.4);
  assert.ok(distance < 0.4, `camera stopped at ${distance}m`);
});
