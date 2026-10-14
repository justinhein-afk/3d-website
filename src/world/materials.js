import * as THREE from 'three';
import * as T from './textures.js';

// Shared material palette for the lobby. Built once after the renderer exists (for anisotropy).
export function createMaterials() {
  const std = (o) => new THREE.MeshStandardMaterial(o);

  const floorTex = T.marbleFloorTexture();
  floorTex.repeat.set(1 / 2.4, 1 / 2.4); // 1.2 m tiles (2 tiles per texture)

  const darkMarbleTex = T.marbleTexture({ base: '#1d1814', vein: '#b38b52', dark: true });
  const whiteMarbleTex = T.marbleTexture();
  const walnutTex = T.woodTexture();
  const oakTex = T.woodTexture({ base: '#b88a5a', dark: '#8a6238', light: '#d4a873' });
  const teakTex = T.woodTexture({ base: '#7a5638', dark: '#553823', light: '#94694a' });
  const stoneTex = T.stoneReliefTexture();
  const panelTex = T.wallPanelTexture();
  const latticeA = T.latticeAlpha();
  const latticeB = T.latticeAlpha({ cells: 6, bar: 0.12, diamond: false });

  const m = {
    floor: std({ map: floorTex, roughness: 0.12, metalness: 0.0, envMapIntensity: 0.9 }),
    floorOverlay: std({ map: floorTex, roughness: 0.18, metalness: 0, transparent: true, opacity: 0.86 }),
    darkMarble: std({ map: darkMarbleTex, roughness: 0.15, metalness: 0.05 }),
    whiteMarble: std({ map: whiteMarbleTex, roughness: 0.2, metalness: 0 }),
    walnut: std({ map: walnutTex, roughness: 0.55, metalness: 0 }),
    oak: std({ map: oakTex, roughness: 0.6, metalness: 0 }),
    teak: std({ map: teakTex, roughness: 0.5, metalness: 0 }),
    stone: std({ map: stoneTex, roughness: 0.85, metalness: 0 }),
    panel: std({ map: panelTex, roughness: 0.7, metalness: 0 }),
    plaster: std({ color: 0xf2ece2, roughness: 0.9, metalness: 0 }),
    ceiling: std({ color: 0xf5efe6, roughness: 0.95, metalness: 0 }),
    gold: std({ color: 0xc9a25a, roughness: 0.28, metalness: 1 }),
    brass: std({ color: 0xb08d57, roughness: 0.35, metalness: 1 }),
    blackMetal: std({ color: 0x1b1916, roughness: 0.4, metalness: 0.8 }),
    fabricIvory: std({ color: 0xebe3d6, roughness: 0.95, metalness: 0 }),
    fabricSand: std({ color: 0xcbb79a, roughness: 0.95, metalness: 0 }),
    fabricTaupe: std({ color: 0x8c7a66, roughness: 0.95, metalness: 0 }),
    fabricRust: std({ color: 0xa2553a, roughness: 0.9, metalness: 0 }),
    fabricOlive: std({ color: 0x6f7650, roughness: 0.95, metalness: 0 }),
    leatherCognac: std({ color: 0x7e4a28, roughness: 0.55, metalness: 0 }),
    rattan: std({ color: 0xc8a97a, roughness: 0.8, metalness: 0 }),
    ceramicWhite: std({ color: 0xf4f0ea, roughness: 0.3, metalness: 0 }),
    ceramicBlack: std({ color: 0x23201d, roughness: 0.35, metalness: 0 }),
    ceramicCeladon: std({ color: 0x9db5a2, roughness: 0.3, metalness: 0 }),
    leaf: std({ color: 0x3f6b2e, roughness: 0.8, metalness: 0, side: THREE.DoubleSide }),
    leafLight: std({ color: 0x6e9a43, roughness: 0.8, metalness: 0, side: THREE.DoubleSide }),
    bark: std({ color: 0x4a3626, roughness: 0.95, metalness: 0 }),
    driftwood: std({ color: 0xb58d62, roughness: 0.9, metalness: 0 }),
    soil: std({ color: 0x2b2017, roughness: 1, metalness: 0 }),
    pebble: std({ color: 0xe8e2d6, roughness: 0.6, metalness: 0 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0xdfe9ea,
      roughness: 0.05,
      metalness: 0,
      transmission: 0,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    facadeGlass: new THREE.MeshStandardMaterial({
      color: 0x9fb4c4,
      roughness: 0.05,
      metalness: 0.2,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    latticeWood: std({ map: walnutTex, alphaMap: latticeA, alphaTest: 0.5, roughness: 0.6, side: THREE.DoubleSide }),
    latticeOak: std({ map: oakTex, alphaMap: latticeB, alphaTest: 0.5, roughness: 0.6, side: THREE.DoubleSide }),
    // emissive "light" materials (picked up by bloom)
    led: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.82, 0.58).multiplyScalar(3.2), toneMapped: true }),
    ledSoft: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.8, 0.55).multiplyScalar(1.6) }),
    downlight: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.92, 0.8).multiplyScalar(4) }),
    shadeGlow: std({ color: 0xfff1d8, emissive: 0xffd9a0, emissiveIntensity: 1.6, roughness: 0.6 }),
    crystal: new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.02,
      metalness: 0,
      emissive: 0xffe2b0,
      emissiveIntensity: 0.32,
      clearcoat: 1,
      transparent: true,
      opacity: 0.85,
    }),
    shelfGlow: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.74, 0.45).multiplyScalar(0.72) }),
    rodGlow: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.82, 0.6).multiplyScalar(0.85) }),
  };

  // textures that need world-scale repeats are cloned per use via helper below
  m._tex = { floorTex, darkMarbleTex, whiteMarbleTex, walnutTex, oakTex, stoneTex, panelTex };
  return m;
}

// Clone a material with its own texture repeat (for big surfaces that need tiling).
export function tiled(mat, rx, ry) {
  const c = mat.clone();
  if (c.map) {
    c.map = c.map.clone();
    c.map.repeat.set(rx, ry);
    c.map.needsUpdate = true;
  }
  return c;
}
