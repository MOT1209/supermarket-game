// GPU resource cleanup helpers.
//
// Many procedural assets deliberately share geometries/materials (customers,
// products, city props). Disposing one instance must never destroy resources
// another instance still uses, so every disposable resource can opt out with
// `userData.shared = true`. A root marked `shared` is skipped entirely.

const TEXTURE_KEYS = [
  'map',
  'lightMap',
  'aoMap',
  'emissiveMap',
  'bumpMap',
  'normalMap',
  'displacementMap',
  'roughnessMap',
  'metalnessMap',
  'alphaMap',
  'envMap'
];

export function disposeObject3D(root, { shared = false } = {}) {
  if (!root || shared || root.userData?.shared) return;
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();

  root.traverse((obj) => {
    if (obj.userData?.shared) return;
    if (obj.geometry && !obj.geometry.userData?.shared) geometries.add(obj.geometry);
    if (!obj.material) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const mat of mats) {
      if (!mat || mat.userData?.shared) continue;
      materials.add(mat);
      for (const key of TEXTURE_KEYS) {
        const tex = mat[key];
        if (tex && !tex.userData?.shared) textures.add(tex);
      }
    }
  });

  for (const tex of textures) {
    try {
      tex.dispose();
    } catch {
      /* already disposed */
    }
  }
  for (const mat of materials) {
    try {
      mat.dispose();
    } catch {
      /* already disposed */
    }
  }
  for (const geo of geometries) {
    try {
      geo.dispose();
    } catch {
      /* already disposed */
    }
  }
}
