import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Blender-exported GLB models are shared after loading; consumers clone the
// scene graph so transforms can be applied per instance without reloading.
const loader = new GLTFLoader();
const cache = new Map();

const base = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';

// Character parts arrive as one skinned mesh per material (21 draw calls). The
// colour is flat, so paint it into vertex colours and merge by finish: four
// skinned meshes per shopper instead of 21, with no texture cost.
const FINISHES = [
  { key: 'gloss', roughness: 0.3, metalness: 0.0, below: 0.42 },
  { key: 'satin', roughness: 0.55, metalness: 0.0, below: 0.72 },
  { key: 'matte', roughness: 0.86, metalness: 0.0, below: Infinity }
];
const METAL = { key: 'metal', roughness: 0.34, metalness: 0.85 };
const finishMaterials = new Map();

function finishFor(material) {
  if (material.metalness >= 0.5) return METAL;
  return FINISHES.find((f) => material.roughness < f.below) || FINISHES[FINISHES.length - 1];
}

// One material per finish shared by all shoppers: identical parameters, fewer
// renderer state changes, and no per-character material copies.
function finishMaterial(finish) {
  if (!finishMaterials.has(finish.key)) {
    finishMaterials.set(
      finish.key,
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: finish.roughness,
        metalness: finish.metalness
      })
    );
  }
  return finishMaterials.get(finish.key);
}

function identityTransform(obj) {
  return (
    obj.position.lengthSq() < 1e-12 &&
    Math.abs(obj.quaternion.w - 1) < 1e-9 &&
    Math.abs(obj.scale.x - 1) < 1e-9 &&
    Math.abs(obj.scale.y - 1) < 1e-9 &&
    Math.abs(obj.scale.z - 1) < 1e-9
  );
}

function mergeSkinnedParts(root) {
  const meshes = [];
  root.traverse((obj) => {
    if (obj.isSkinnedMesh) meshes.push(obj);
  });
  if (meshes.length < 4) return;

  const skeleton = meshes[0].skeleton;
  const parent = meshes[0].parent;
  const usable = meshes.every(
    (mesh) =>
      mesh.skeleton === skeleton &&
      mesh.parent === parent &&
      identityTransform(mesh) &&
      mesh.material &&
      !Array.isArray(mesh.material) &&
      !mesh.material.map &&
      !mesh.material.alphaMap &&
      !mesh.material.transparent &&
      mesh.geometry.attributes.skinIndex &&
      mesh.geometry.attributes.skinWeight
  );
  if (!usable) return;

  const buckets = new Map();
  for (const mesh of meshes) {
    const finish = finishFor(mesh.material);
    const geometry = mesh.geometry.clone();
    for (const name of Object.keys(geometry.attributes)) {
      if (!['position', 'normal', 'skinIndex', 'skinWeight'].includes(name)) {
        geometry.deleteAttribute(name);
      }
    }
    const count = geometry.attributes.position.count;
    const colors = new Float32Array(count * 3);
    const { r, g, b } = mesh.material.color || new THREE.Color(1, 1, 1);
    for (let i = 0; i < count; i += 1) {
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    if (!buckets.has(finish)) buckets.set(finish, []);
    buckets.get(finish).push(geometry);
  }

  const merged = [];
  for (const [finish, geometries] of buckets) {
    const geometry = mergeGeometries(geometries, false);
    geometries.forEach((g) => g.dispose());
    if (!geometry) return; // any failure leaves the original meshes intact
    merged.push({
      geometry,
      material: finishMaterial(finish),
      name: `${meshes[0].name || 'character'}_${finish.key}`
    });
  }

  if (merged.length === 0) return;

  for (const mesh of meshes) {
    mesh.removeFromParent();
    mesh.geometry.dispose();
    mesh.material.dispose();
  }
  for (const part of merged) {
    const mesh = new THREE.SkinnedMesh(part.geometry, part.material);
    mesh.name = part.name;
    mesh.bind(skeleton, meshes[0].bindMatrix);
    mesh.bindMode = meshes[0].bindMode;
    mesh.frustumCulled = true;
    parent.add(mesh);
  }
}

function prepare(root, animations) {
  mergeSkinnedParts(root);
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

/**
 * Clone a rigged GLB. Object3D.clone() shares the skeleton, so every copy would
 * deform identically; SkeletonUtils.clone rebuilds bones/skeleton per instance.
 */
export async function cloneCharacter(file) {
  const source = await loadModel(file);
  if (!source) return null;
  const model = cloneSkinned(source);
  model.userData = model.userData || {};
  model.userData.animations = source.userData.animations || [];
  return model;
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
