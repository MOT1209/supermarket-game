// Shortens a chase-camera offset before the first blocked 2D point. Marching
// in small steps keeps this independent of collider layout and cheap enough to
// run every frame; the margin leaves room for the camera's near plane.
export function safeCameraDistance(
  originX,
  originZ,
  offsetX,
  offsetZ,
  blocked,
  { step = 0.1, margin = 0.08 } = {}
) {
  const length = Math.hypot(offsetX, offsetZ);
  if (length < 1e-6) return 0;
  const ux = offsetX / length;
  const uz = offsetZ / length;
  let safe = 0;
  for (let d = step; d < length; d += step) {
    if (blocked(originX + ux * d, originZ + uz * d)) {
      return Math.max(0, safe - margin);
    }
    safe = d;
  }
  if (blocked(originX + offsetX, originZ + offsetZ)) {
    return Math.max(0, safe - margin);
  }
  return length;
}
