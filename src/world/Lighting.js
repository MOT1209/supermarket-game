import * as THREE from 'three';

export default class Lighting {
  constructor(scene) {
    this.scene = scene;
    this.interior = [];
    this.ambient = new THREE.AmbientLight(0xffffff, 1.1);
    scene.add(this.ambient);

    this.sun = new THREE.DirectionalLight(0xfff8ea, 1.8);
    this.sun.position.set(12, 24, 10);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    const cam = this.sun.shadow.camera;
    cam.left = -22; cam.right = 22; cam.top = 22; cam.bottom = -22;
    scene.add(this.sun);

    for (const [x, z] of [[-6, -5], [6, -5], [-6, 4], [6, 4]]) {
      const l = new THREE.PointLight(0xfff0c0, 0, 16, 2);
      l.position.set(x, 4.4, z);
      scene.add(l);
      this.interior.push(l);
      const fix = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 0.1, 0.4),
        new THREE.MeshBasicMaterial({ color: 0xfff8d0 })
      );
      fix.position.set(x, 4.85, z);
      scene.add(fix);
    }
    scene.background = new THREE.Color(0x9fd8ef);
    scene.fog = new THREE.Fog(0x9fd8ef, 30, 70);
  }

  update(progress) {
    const dayFactor = Math.max(0.08, Math.min(1, 1 - Math.max(0, progress - 0.72) / 0.28));
    this.sun.intensity = dayFactor * 1.8;
    this.ambient.intensity = 0.35 + dayFactor * 0.95;
    const sky = new THREE.Color(0x0d1930).lerp(new THREE.Color(0x9fd8ef), dayFactor);
    this.scene.background = sky;
    this.scene.fog.color = sky;
    for (const l of this.interior) l.intensity = 0.35 + (1 - dayFactor) * 2.6;
  }
}
