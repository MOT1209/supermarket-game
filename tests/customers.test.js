import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CUSTOMER_CHARACTERS,
  pickCustomerCharacter,
  rosterSummary
} from '../src/data/customers.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REQUIRED_CLIPS = [
  'Idle',
  'Walk',
  'WalkBasket',
  'WalkCart',
  'IdleBasket',
  'IdleCart',
  'TurnLeft',
  'TurnRight',
  'Stop',
  'PickItem',
  'PlaceItem',
  'Checkout',
  'LookAround',
  'Wait'
];

function readGlb(file) {
  const buf = fs.readFileSync(file);
  assert.equal(buf.readUInt32LE(0), 0x46546c67, `${file} is not a GLB`);
  const jsonLength = buf.readUInt32LE(12);
  assert.equal(buf.readUInt32LE(16), 0x4e4f534a, `${file} has no JSON chunk`);
  return JSON.parse(buf.subarray(20, 20 + jsonLength).toString('utf8'));
}

function bounds(gltf) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const mesh of gltf.meshes || []) {
    for (const prim of mesh.primitives) {
      const acc = gltf.accessors[prim.attributes.POSITION];
      for (let i = 0; i < 3; i += 1) {
        min[i] = Math.min(min[i], acc.min[i]);
        max[i] = Math.max(max[i], acc.max[i]);
      }
    }
  }
  return { min, max };
}

test('customer roster is 12 characters: 6 male, 6 female, five age groups', () => {
  assert.equal(CUSTOMER_CHARACTERS.length, 12);
  const summary = rosterSummary();
  assert.equal(summary.gender.male, 6);
  assert.equal(summary.gender.female, 6);
  assert.deepEqual(Object.keys(summary.ageGroups), [
    'child',
    'teen',
    'young_adult',
    'adult',
    'senior'
  ]);
  for (const count of Object.values(summary.ageGroups)) assert.ok(count >= 2);
  const ids = new Set(CUSTOMER_CHARACTERS.map((c) => c.id));
  assert.equal(ids.size, 12);
});

test('every character GLB carries a skinned 22-bone rig and the full animation set', () => {
  for (const character of CUSTOMER_CHARACTERS) {
    const file = path.join(ROOT, 'public', 'models', character.file);
    assert.ok(fs.existsSync(file), `missing ${file}`);
    assert.ok(fs.statSync(file).size > 50_000, `${character.id} GLB is suspiciously small`);

    const gltf = readGlb(file);
    assert.ok((gltf.skins || []).length === 1, `${character.id} must have exactly one skin`);
    assert.ok(gltf.skins[0].joints.length >= 20, `${character.id} rig is too small`);
    assert.equal((gltf.cameras || []).length, 0, `${character.id} exported a camera`);
    assert.ok((gltf.materials || []).length >= 8, `${character.id} lost its materials`);

    const clips = (gltf.animations || []).map((a) => a.name);
    for (const needed of REQUIRED_CLIPS) {
      assert.ok(clips.includes(needed), `${character.id} is missing the ${needed} clip`);
    }
    assert.ok(clips.length >= 12, `${character.id} only has ${clips.length} clips`);

    const box = bounds(gltf);
    const height = box.max[1] - box.min[1];
    assert.ok(Math.abs(box.min[1]) < 0.02, `${character.id} feet are not on the ground`);
    assert.ok(
      Math.abs(height - character.height) < 0.12,
      `${character.id} is ${height.toFixed(2)}m tall, expected ${character.height}m`
    );

    const metaFile = path.join(
      ROOT,
      'assets',
      'characters',
      'exports',
      'glb',
      `${character.id}.json`
    );
    assert.ok(fs.existsSync(metaFile), `missing metadata ${metaFile}`);
    const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
    assert.equal(meta.id, character.id);
    assert.equal(meta.gender, character.gender);
    assert.ok(meta.animations.length >= 12);
    if (character.carry !== 'none') {
      assert.equal(
        typeof meta.grip_gap,
        'number',
        `${character.id} has no solved ${character.carry} grip`
      );
      assert.ok(
        meta.grip_gap <= 0.02,
        `${character.id} palms sit ${(meta.grip_gap * 100).toFixed(1)} cm off the ${character.carry} handle`
      );
    }
  }
});

test('weighted spawns cover all twelve characters and every age group', () => {
  let seed = 0x9e3779b9;
  const random = () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const counts = new Map();
  const groups = new Map();
  const picks = 6000;
  for (let i = 0; i < picks; i += 1) {
    const c = pickCustomerCharacter(random);
    counts.set(c.id, (counts.get(c.id) || 0) + 1);
    groups.set(c.ageGroup, (groups.get(c.ageGroup) || 0) + 1);
  }
  assert.equal(counts.size, 12);
  for (const count of counts.values()) assert.ok(count > picks * 0.02);
  for (const group of ['child', 'teen', 'young_adult', 'adult', 'senior']) {
    assert.ok(groups.get(group) > picks * 0.04, `${group} is under-represented`);
  }
});
