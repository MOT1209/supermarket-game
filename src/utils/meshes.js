import * as THREE from 'three';

export const boxMesh = (w, h, d, color, opts = {}) => {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...opts })
  );
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
};
