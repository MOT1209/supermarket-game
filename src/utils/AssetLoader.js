import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Blender-exported GLB models are shared after loading; consumers clone the
// scene graph so transforms can be applied per instance without reloading.
const loader = new GLTFLoader();
const cache = new Map();

const base = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';

function prepare(root, animations) {
  root.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
  // Keep animation clips on the loaded root so consumers (characters) can drive
  // an AnimationMixer per instance.
  root.userData = root.userData || {};
  root.userData.animations = animations || [];
  return root;
}

export function loadModel(file) {
  if (!cache.has(file)) {
    const url = `${base}models/${file}`;
    cache.set(
      file,
      loader
        .loadAsync(url)
        .then((gltf) => prepare(gltf.scene, gltf.animations))
        .catch((err) => {
          console.warn(`[AssetLoader] Could not load ${url}; using procedural fallback.`, err);
          return null;
        })
    );
  }
  return cache.get(file);
}

export async function cloneModel(file) {
  const root = await loadModel(file);
  return root ? root.clone(true) : null;
}

export async function preloadModels(files) {
  const entries = await Promise.all(
    Object.entries(files).map(async ([key, file]) => [key, await loadModel(file)])
  );
  return Object.fromEntries(entries);
}

export function disposeModelCache() {
  cache.clear();
}
