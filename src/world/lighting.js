import * as THREE from 'three';
import { L } from '../core/collision.js';

// Warm interior lighting: soft sky fill, one shadow-casting key and a few warm pools.
export function buildLighting({ scene, quality }) {
  const hemi = new THREE.HemisphereLight(0xfff1de, 0x6a5440, 0.55);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffe6c8, 1.0);
  key.position.set(7, 22, 9);
  key.target.position.set(0, 0, 0);
  key.castShadow = !!quality.shadows;
  key.shadow.mapSize.set(quality.shadowSize || 1024, quality.shadowSize || 1024);
  const sc = key.shadow.camera;
  sc.left = -26;
  sc.right = 26;
  sc.top = 22;
  sc.bottom = -22;
  sc.near = 4;
  sc.far = 50;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.03;
  key.shadow.radius = 3;
  scene.add(key, key.target);

  const warm = 0xffcf96;
  const points = [
    [0, 6.6, 2, 45, warm], // chandelier
    [0, 3.6, -12.5, 20, 0xffd8a8], // reception
    [-17, 3.4, -2, 16, warm], // west lounge
    [17, 3.4, -1, 16, warm], // cafe
    [-18, 2.6, 11, 10, 0xffc38a], // tea pavilion
    [0, 3.2, 13.5, 12, 0xffe2bd], // entrance
  ];
  const lights = [];
  for (const [x, y, z, i, c] of points) {
    const p = new THREE.PointLight(c, i, 0, 2);
    p.position.set(x, y, z);
    scene.add(p);
    lights.push(p);
  }
  // upper floor fill
  for (const x of [-17, 17]) {
    const p = new THREE.PointLight(warm, 14, 0, 2);
    p.position.set(x, L.MEZZ + 3.8, 0);
    scene.add(p);
    lights.push(p);
  }
  return { hemi, key, lights };
}

// Image-based lighting from the lobby itself so glossy surfaces reflect the LED coves.
export function bakeEnvironment(renderer, scene, hide = []) {
  const prev = hide.map((o) => o.visible);
  hide.forEach((o) => (o.visible = false));
  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(scene, 0.02, 0.1, 120, { size: 256, position: new THREE.Vector3(0, 3.2, 1) });
  pmrem.dispose();
  hide.forEach((o, i) => (o.visible = prev[i]));
  scene.environment = rt.texture;
  scene.environmentIntensity = 0.4;
  return rt;
}
