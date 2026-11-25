import { clamp } from '../utils/math.js';

export const PITCH_LIMIT = 1.4;
export const TOUCH_LOOK_SCALE = 5;

export function normalizeKey(key) {
  return String(key ?? '').toLowerCase();
}

export function isEditableTarget(target) {
  if (!target) return false;
  if (target.isContentEditable) return true;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

// Keyboard uses -1/Z for forward (W) and +1/X for right (D). Touch joystick
// axes use the same convention, so they can be merged before normalisation.
export function readAxes(keys = {}, touchAxes = null) {
  let x = 0;
  let z = 0;

  if (keys.a || keys.arrowleft) x -= 1;
  if (keys.d || keys.arrowright) x += 1;
  if (keys.w || keys.arrowup) z -= 1;
  if (keys.s || keys.arrowdown) z += 1;

  if (touchAxes) {
    x += Number(touchAxes.x) || 0;
    z += Number(touchAxes.z) || 0;
  }

  const length = Math.hypot(x, z);
  if (length > 1) {
    x /= length;
    z /= length;
  }
  return { x, z };
}

// Camera yaw rotates around +Y. Three.js RotY(yaw) maps local (x, z) to
// (x * cos + z * sin, -x * sin + z * cos). Mixing up either sign makes W
// walk backwards or strafes tilt with the view, which was the original bug.
export function movementToWorld(axes, yaw, speed, dt) {
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);
  return {
    x: (axes.x * cos + axes.z * sin) * speed * dt,
    z: (-axes.x * sin + axes.z * cos) * speed * dt
  };
}

export function isSprinting(keys = {}, touchSprint = false) {
  return !!(keys.shift || touchSprint);
}

export function clampPitch(pitch) {
  return clamp(pitch, -PITCH_LIMIT, PITCH_LIMIT);
}

export function describeLockError(error) {
  switch (error?.name) {
    case 'NotAllowedError':
      return 'Mouse capture was blocked by the browser. Click below to retry.';
    case 'SecurityError':
      return 'Mouse capture needs a secure page and your permission. Click below to retry.';
    case 'NotFoundError':
      return 'The game canvas is unavailable for mouse capture. Reload and retry.';
    case 'InvalidStateError':
      return 'Mouse capture was interrupted. Click below to retry.';
    default:
      return error?.message
        ? `Mouse capture failed: ${error.message}. Click below to retry.`
        : 'Mouse not captured. Click below to retry mouse look.';
  }
}
