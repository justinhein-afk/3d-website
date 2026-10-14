import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

// Quaternius CC0 characters (see CREDITS.md). Rig A: idle/walk/run/wave/interact. Rig B: idle/walk/run/sit/stand/clap.
export const MODELS = {
  business_man: { file: 'business_man.glb', rig: 'A', height: 1.8 },
  woman_a: { file: 'woman_a.glb', rig: 'A', height: 1.68 },
  woman_b: { file: 'woman_b.glb', rig: 'A', height: 1.68 },
  casual: { file: 'casual.glb', rig: 'A', height: 1.77 },
  adventurer: { file: 'adventurer.glb', rig: 'A', height: 1.76 },
  worker: { file: 'worker.glb', rig: 'A', height: 1.78 },
  man_suit: { file: 'man_suit.glb', rig: 'B', height: 1.8 },
  woman_dress: { file: 'woman_dress.glb', rig: 'B', height: 1.68 },
  woman_casual: { file: 'woman_casual.glb', rig: 'B', height: 1.66 },
  woman: { file: 'woman.glb', rig: 'B', height: 1.7 },
};

const CLIP_MAP = {
  idle: 'idle',
  idle_neutral: 'idleCalm',
  walk: 'walk',
  run: 'run',
  wave: 'wave',
  interact: 'interact',
  sitting: 'sit',
  standing: 'stand',
  clapping: 'clap',
};

function canonicalClipName(name) {
  const s = name
    .split('|')
    .pop()
    .replace(/^(Man_|Female_)/, '')
    .toLowerCase();
  return CLIP_MAP[s];
}

export async function loadCharacterAssets(manager) {
  const loader = new GLTFLoader(manager);
  const base = `${import.meta.env.BASE_URL}models/characters/`;
  const entries = await Promise.all(
    Object.entries(MODELS).map(async ([key, def]) => {
      const gltf = await loader.loadAsync(base + def.file);
      const clips = {};
      for (const clip of gltf.animations) {
        const k = canonicalClipName(clip.name);
        if (!k) continue;
        const c = clip.clone();
        c.name = k;
        clips[k] = c;
      }
      const root = gltf.scene;
      root.traverse((o) => {
        if (o.isMesh) {
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          for (const mt of mats) {
            mt.roughness = Math.max(mt.roughness ?? 0.6, 0.62);
            mt.metalness = Math.min(mt.metalness ?? 0, 0.05);
            mt.envMapIntensity = 0.6;
          }
        }
      });
      root.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(root, true);
      const h = box.max.y - box.min.y || 1;
      return [key, { key, def, scene: root, clips, scale: def.height / h, minY: box.min.y }];
    }),
  );
  return new Map(entries);
}

// Clone a character with its own skeleton and optional per-material colour tints.
export function instantiate(assets, key, { tints = {}, heightJitter = 0 } = {}) {
  const a = assets.get(key);
  const model = SkeletonUtils.clone(a.scene);
  const s = a.scale * (1 + (Math.random() - 0.5) * heightJitter);
  model.scale.setScalar(s);
  model.position.y = -a.minY * s;
  const cloned = new Map();
  model.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = true;
    o.frustumCulled = false;
    const swap = (mt) => {
      const tint = tints[mt.name];
      if (tint === undefined) return mt;
      if (!cloned.has(mt.name)) {
        const c = mt.clone();
        c.color = new THREE.Color(tint);
        cloned.set(mt.name, c);
      }
      return cloned.get(mt.name);
    };
    o.material = Array.isArray(o.material) ? o.material.map(swap) : swap(o.material);
  });
  const root = new THREE.Group();
  root.add(model);
  return { root, model, clips: a.clips, rig: a.def.rig };
}
