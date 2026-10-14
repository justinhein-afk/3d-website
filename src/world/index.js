import * as THREE from 'three';
import { Builder, mergeStatic } from './builder.js';
import { createMaterials } from './materials.js';
import { setMaxAnisotropy } from './textures.js';
import { buildLobby } from './lobby.js';
import { buildFurniture } from './furniture.js';
import { buildLighting, bakeEnvironment } from './lighting.js';

// Builds the whole static lobby and returns handles the game needs.
export function buildWorld(rctx, world) {
  const { scene, renderer, quality } = rctx;
  setMaxAnisotropy(Math.min(8, renderer.capabilities.getMaxAnisotropy()));
  const m = createMaterials();
  const root = new THREE.Group();
  root.name = 'static';
  scene.add(root);
  const b = new Builder(root, m, world);
  const ctx = { scene, root, b, m, world, quality, renderer };

  const lobby = buildLobby(ctx);
  const furn = buildFurniture(ctx);
  const merged = mergeStatic(root);
  const lights = buildLighting({ scene, quality });

  rctx.reflector = lobby.reflector;
  rctx.floorOverlay = lobby.floorOverlay;
  bakeEnvironment(renderer, scene, [lobby.reflector].filter(Boolean));

  return { m, lobby, furn, lights, merged };
}
