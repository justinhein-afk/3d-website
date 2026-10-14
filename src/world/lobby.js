import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { L } from '../core/collision.js';
import { tiled } from './materials.js';
import * as T from './textures.js';
import { HOTEL } from '../config.js';

// Architecture: floor, walls, pillars, ceilings, mezzanine, stairs, facade and exterior.
export function buildLobby({ scene, root, b, m, world, quality, renderer }) {
  const out = { reflector: null, dynamic: [] };
  const W = L.W;
  const D = L.D;

  /* ---------------- floor ---------------- */
  const floorGeo = new THREE.PlaneGeometry(W * 2, D * 2);
  const floorRep = [(W * 2) / 2.4, (D * 2) / 2.4];
  {
    // Planar mirror under a semi-transparent marble layer = polished stone floor.
    const pr = renderer.getPixelRatio();
    const scale = quality.reflectorScale || 0.5;
    const refl = new Reflector(floorGeo, {
      textureWidth: Math.round(window.innerWidth * pr * scale),
      textureHeight: Math.round(window.innerHeight * pr * scale),
      color: 0x8d8780,
      clipBias: 0.003,
      multisample: 0,
    });
    refl.rotation.x = -Math.PI / 2;
    refl.position.y = -0.003;
    refl.userData.noMerge = true;
    refl.visible = !!quality.reflector;
    scene.add(refl);
    out.reflector = refl;
    const overlay = new THREE.Mesh(floorGeo, tiled(m.floorOverlay, ...floorRep));
    overlay.material.opacity = quality.reflector ? 0.8 : 1;
    overlay.material.transparent = !!quality.reflector;
    overlay.rotation.x = -Math.PI / 2;
    overlay.receiveShadow = true;
    overlay.userData.noMerge = true;
    overlay.renderOrder = -1;
    scene.add(overlay);
    out.floorOverlay = overlay;
  }

  // dark marble inlay: border band along the walls + main axis runner + medallion
  const inlayMat = m.darkMarble.clone();
  inlayMat.transparent = true;
  inlayMat.opacity = 0.92;
  const inlay = (x0, x1, z0, z1) => {
    return b.plane(x1 - x0, z1 - z0, inlayMat, (x0 + x1) / 2, 0.004, (z0 + z1) / 2, { rx: -Math.PI / 2, receive: true });
  };
  inlay(-1.6, -1.35, -9.4, 15.6);
  inlay(1.35, 1.6, -9.4, 15.6);
  const ring = new THREE.Mesh(new THREE.RingGeometry(3.9, 4.25, 96), inlayMat);
  b.add(ring, { x: 0, y: 0.005, z: 2, rx: -Math.PI / 2, cast: false });

  /* ---------------- outer walls ---------------- */
  const wallMat = (w, h) => tiled(m.panel, w / 2.4, h / 3.0);
  // north wall (full)
  b.span(-W, W, 0, L.H, -D - 0.3, -D, wallMat(W * 2, L.H), { cast: false });
  // east wall
  b.span(W, W + 0.3, 0, L.H, -D, D, wallMat(D * 2, L.H), { cast: false });
  // west wall pieces around the moon gate (z 6.6..15.6 on the ground floor)
  b.span(-W - 0.3, -W, 0, L.H, -D, 6.6, wallMat(22.6, L.H), { cast: false });
  b.span(-W - 0.3, -W, 4.1, L.H, 6.6, 15.6, wallMat(9, 5.9), { cast: false });
  b.span(-W - 0.3, -W, 0, L.H, 15.6, D, wallMat(0.4, L.H), { cast: false });
  {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(9, 0);
    shape.lineTo(9, 4.1);
    shape.lineTo(0, 4.1);
    shape.lineTo(0, 0);
    const hole = new THREE.Path();
    hole.absarc(4.4, 2.05, 1.65, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: false, curveSegments: 48 });
    const mat = tiled(m.panel, 1 / 2.4, 1 / 3.0);
    b.mesh(geo, mat, -W, 0, 6.6, { ry: -Math.PI / 2, cast: false });
    // walnut ring frame
    const torus = new THREE.Mesh(new THREE.TorusGeometry(1.68, 0.09, 12, 72), m.walnut);
    b.add(torus, { x: -W + 0.05, y: 2.05, z: 11, ry: Math.PI / 2 });
    const torus2 = new THREE.Mesh(new THREE.TorusGeometry(1.66, 0.025, 8, 72), m.brass);
    b.add(torus2, { x: -W + 0.16, y: 2.05, z: 11, ry: Math.PI / 2 });
    // bamboo garden seen through the moon gate
    const bamboo = new THREE.MeshBasicMaterial({ map: T.bambooTexture() });
    b.plane(9, 6, bamboo, -W - 2.6, 2.6, 11, { ry: Math.PI / 2 });
    const gravel = new THREE.MeshStandardMaterial({ color: 0xcfc6b4, roughness: 1 });
    b.plane(2.6, 6, gravel, -W - 1.3, 0.01, 11, { rx: -Math.PI / 2 });
    const stalk = new THREE.MeshStandardMaterial({ color: 0x7e9a4c, roughness: 0.6 });
    for (let i = 0; i < 9; i++) {
      const z = 9 + Math.random() * 4;
      b.cyl(0.035, 0.04, 6, stalk, -W - 0.8 - Math.random() * 1.4, 0, z, 8);
    }
    for (let i = 0; i < 4; i++) {
      b.sphere(0.25 + Math.random() * 0.15, m.pebble, -W - 0.8 - Math.random() * 1.2, 0.05, 9.6 + Math.random() * 2.8, 10);
    }
    // backyard enclosure (so nothing leaks around the opening)
    b.span(-W - 3, -W - 0.3, 0, 6, 8.3, 8.4, m.plaster, { cast: false });
    b.span(-W - 3, -W - 0.3, 0, 6, 13.6, 13.7, m.plaster, { cast: false });
  }

  world.add(-W - 2, -W + 0.25, -D - 1, D + 1);
  world.add(W - 0.25, W + 2, -D - 1, D + 1);
  world.add(-W - 1, W + 1, -D - 2, -D + 0.25);
  world.add(-W - 1, W + 1, D - 0.25, D + 2);

  /* ---------------- mezzanine slabs ---------------- */
  const slabBottom = L.MEZZ - L.SLAB;
  const slab = (x0, x1, z0, z1) => {
    b.span(x0, x1, slabBottom, L.MEZZ - 0.04, z0, z1, m.ceiling, { cast: true });
    b.span(x0, x1, L.MEZZ - 0.04, L.MEZZ, z0, z1, tiled(m.teak, (x1 - x0) / 1.6, (z1 - z0) / 1.6), { cast: false });
    world.addCam(x0, x1, slabBottom, L.MEZZ, z0, z1);
  };
  slab(-W, -L.AX, -D, D);
  slab(L.AX, W, -D, D);
  slab(-L.AX, L.AX, L.AZS, D);

  // walnut fascia + LED line along slab edges facing the atrium
  const fascia = (x0, x1, z0, z1) => {
    b.span(x0, x1, slabBottom - 0.25, L.MEZZ + 0.08, z0, z1, m.walnut);
  };
  fascia(-L.AX - 0.05, -L.AX + 0.08, -D, L.AZS + 0.08);
  fascia(L.AX - 0.08, L.AX + 0.05, -D, L.STAIR.zLanding);
  fascia(L.AX - 0.08, L.AX + 0.05, L.STAIR.zTop, L.AZS + 0.08);
  fascia(-L.AX, L.AX, L.AZS - 0.08, L.AZS + 0.05);
  const ledLine = (x0, x1, z0, z1) => b.span(x0, x1, slabBottom - 0.3, slabBottom - 0.25, z0, z1, m.led, { cast: false });
  ledLine(-L.AX + 0.02, -L.AX + 0.08, -D, L.AZS);
  ledLine(L.AX - 0.08, L.AX - 0.02, -D, L.STAIR.zLanding);
  ledLine(L.AX - 0.08, L.AX - 0.02, L.STAIR.zTop, L.AZS);
  ledLine(-L.AX, L.AX, L.AZS - 0.08, L.AZS - 0.02);

  // glass railings with brass handrails
  const rail = (x0, x1, z0, z1) => {
    const alongX = x1 - x0 > z1 - z0;
    const len = alongX ? x1 - x0 : z1 - z0;
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    b.box(alongX ? len : 0.025, 1.0, alongX ? 0.025 : len, m.glass, cx, L.MEZZ + 0.55, cz, { cast: false });
    const hr = b.box(alongX ? len : 0.07, 0.05, alongX ? 0.07 : len, m.brass, cx, L.MEZZ + 1.08, cz);
    hr.castShadow = false;
    // posts
    const n = Math.max(1, Math.round(len / 1.6));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      b.box(0.05, 1.05, 0.05, m.brass, alongX ? x0 + len * t : cx, L.MEZZ + 0.53, alongX ? cz : z0 + len * t, { cast: false });
    }
  };
  rail(-L.AX, -L.AX + 0.001, -D, L.AZS);
  rail(-L.AX, L.AX, L.AZS, L.AZS + 0.001);
  rail(L.AX, L.AX + 0.001, L.STAIR.zTop, L.AZS);
  rail(L.AX, L.AX + 0.001, -D, L.STAIR.zLanding);
  const up = { cam: false, nav: false };
  world.add(-L.AX - 0.1, -L.AX + 0.05, -D, L.AZS + 0.05, 4.2, 6.5, up);
  world.add(-L.AX, L.AX, L.AZS - 0.05, L.AZS + 0.1, 4.2, 6.5, up);
  world.add(L.AX - 0.05, L.AX + 0.1, L.STAIR.zTop, L.AZS + 0.05, 4.2, 6.5, up);
  world.add(L.AX - 0.05, L.AX + 0.1, -D, L.STAIR.zLanding, 4.2, 6.5, up);

  /* ---------------- pillars ---------------- */
  const pillarSpots = [];
  for (const sx of [-1, 1]) {
    for (const z of [-11, -3, 5, 12.45]) pillarSpots.push([sx * 12.45, z]);
  }
  pillarSpots.push([-5, 12.45], [5, 12.45]);
  for (const [x, z] of pillarSpots) {
    b.boxB(0.9, L.H, 0.9, tiled(m.walnut, 1, 4), x, 0, z);
    b.boxB(1.02, 0.5, 1.02, m.darkMarble, x, 0, z);
    b.boxB(0.94, 0.04, 0.94, m.brass, x, 0.5, z, { cast: false });
    b.boxB(0.94, 0.04, 0.94, m.brass, x, 2.6, z, { cast: false });
    world.addCentered(x, z, 1.02, 1.02);
  }

  /* ---------------- ceilings ---------------- */
  b.plane(W * 2, D * 2, m.ceiling, 0, L.H, 0, { rx: Math.PI / 2, receive: false });
  world.addCam(-W, W, L.H - 0.1, L.H + 1, -D, D);

  // atrium: glowing coffers behind a two-level walnut grid (refs 2 & 3)
  const ax0 = -L.AX + 0.9;
  const ax1 = L.AX - 0.9;
  const az0 = -D + 0.9;
  const az1 = L.AZS - 0.9;
  const cofferGlow = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.86, 0.66).multiplyScalar(0.62) });
  b.plane(ax1 - ax0, az1 - az0, cofferGlow, 0, L.H - 0.12, (az0 + az1) / 2, { rx: Math.PI / 2, receive: false });
  // perimeter soffit
  const soffitY0 = L.H - 0.9;
  b.span(-L.AX, ax0, soffitY0, L.H, -D, L.AZS, m.ceiling, { cast: false });
  b.span(ax1, L.AX, soffitY0, L.H, -D, L.AZS, m.ceiling, { cast: false });
  b.span(ax0, ax1, soffitY0, L.H, -D, az0, m.ceiling, { cast: false });
  b.span(ax0, ax1, soffitY0, L.H, az1, L.AZS, m.ceiling, { cast: false });
  // LED cove lines on the soffit edge (ref 1)
  b.span(ax0 - 0.04, ax0, soffitY0 - 0.04, soffitY0, az0, az1, m.led, { cast: false });
  b.span(ax1, ax1 + 0.04, soffitY0 - 0.04, soffitY0, az0, az1, m.led, { cast: false });
  b.span(ax0, ax1, soffitY0 - 0.04, soffitY0, az0 - 0.04, az0, m.led, { cast: false });
  b.span(ax0, ax1, soffitY0 - 0.04, soffitY0, az1, az1 + 0.04, m.led, { cast: false });
  // walnut grid
  const gridW = ax1 - ax0;
  const gridD = az1 - az0;
  const mainStep = gridW / 6;
  for (let i = 0; i <= 6; i++) {
    const x = ax0 + i * mainStep;
    b.span(x - 0.11, x + 0.11, L.H - 0.75, L.H - 0.12, az0, az1, m.walnut, { cast: false });
  }
  const mainStepZ = gridD / 7;
  for (let i = 0; i <= 7; i++) {
    const z = az0 + i * mainStepZ;
    b.span(ax0, ax1, L.H - 0.75, L.H - 0.12, z - 0.11, z + 0.11, m.walnut, { cast: false });
  }
  for (let i = 0; i < 6; i++) {
    for (const f of [1 / 3, 2 / 3]) {
      const x = ax0 + (i + f) * mainStep;
      b.span(x - 0.04, x + 0.04, L.H - 0.4, L.H - 0.12, az0, az1, m.walnut, { cast: false });
    }
  }
  for (let i = 0; i < 7; i++) {
    for (const f of [1 / 3, 2 / 3]) {
      const z = az0 + (i + f) * mainStepZ;
      b.span(ax0, ax1, L.H - 0.4, L.H - 0.12, z - 0.04, z + 0.04, m.walnut, { cast: false });
    }
  }

  // recessed downlights under the slabs and in the upper wings
  const dlGeo = new THREE.CircleGeometry(0.09, 20);
  const dlPos = [];
  for (let x = -W + 1.5; x < -L.AX - 0.5; x += 2.4) for (let z = -D + 1.5; z < D - 0.5; z += 2.4) dlPos.push([x, slabBottom - 0.005, z], [x, L.H - 0.005, z]);
  for (let x = L.AX + 1.3; x < W - 0.5; x += 2.4) for (let z = -D + 1.5; z < D - 0.5; z += 2.4) dlPos.push([x, slabBottom - 0.005, z], [x, L.H - 0.005, z]);
  for (let x = -L.AX + 1.5; x < L.AX - 0.5; x += 2.4) for (let z = L.AZS + 1.2; z < D - 0.5; z += 2.4) dlPos.push([x, slabBottom - 0.005, z], [x, L.H - 0.005, z]);
  for (let x = -L.AX + 0.45; x < L.AX; x += 2.3) {
    dlPos.push([x, L.H - 0.905, -D + 0.45]);
  }
  const dl = new THREE.InstancedMesh(dlGeo, m.downlight, dlPos.length);
  const mtx = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
  dlPos.forEach(([x, y, z], i) => dl.setMatrixAt(i, mtx.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, 1, 1))));
  dl.userData.noMerge = true;
  scene.add(dl);

  /* ---------------- feature wall (north, atrium) ---------------- */
  const fz = -D;
  b.span(-7.2, 7.2, 0, L.H - 0.9, fz, fz + 0.18, tiled(m.stone, 14.4 / 4.8, 9.1 / 4.2), { cast: false });
  // uplight wash at the base of the stone wall
  const wash = new THREE.MeshBasicMaterial({ map: T.washTexture(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  b.plane(14.2, 3.2, wash, 0, 1.6, fz + 0.2, { receive: false });
  const washTop = new THREE.MeshBasicMaterial({ map: T.washTexture({ fromTop: true }), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  b.plane(14.2, 3.0, washTop, 0, L.H - 2.4, fz + 0.2, { receive: false });
  // gold landscape painting in a brass frame
  const artTex = T.goldLandscapeTexture();
  const artMat = new THREE.MeshStandardMaterial({ map: artTex, emissiveMap: artTex, emissive: 0xffffff, emissiveIntensity: 0.35, roughness: 0.5, metalness: 0.3 });
  b.plane(6.0, 3.2, artMat, 0, 3.3, fz + 0.24);
  b.span(-3.1, 3.1, 1.6, 1.7, fz + 0.18, fz + 0.3, m.brass, { cast: false });
  b.span(-3.1, 3.1, 4.9, 5.0, fz + 0.18, fz + 0.3, m.brass, { cast: false });
  b.span(-3.1, -3.0, 1.6, 5.0, fz + 0.18, fz + 0.3, m.brass, { cast: false });
  b.span(3.0, 3.1, 1.6, 5.0, fz + 0.18, fz + 0.3, m.brass, { cast: false });
  // backlit logo lettering
  const logoMat = new THREE.MeshBasicMaterial({
    map: T.logoTexture(HOTEL.name.toUpperCase(), { sub: 'HOTEL  ·  ' + HOTEL.city.toUpperCase(), color: '#8f6428', weight: 700 }),
    transparent: true,
    color: new THREE.Color(0.5, 0.4, 0.3),
    depthWrite: false,
  });
  const logo = b.plane(8.4, 2.1, logoMat, 0, 6.6, fz + 0.22, { receive: false });
  logo.userData.noMerge = true;
  // vertical black bars (ref 4)
  for (let i = 0; i < 13; i++) {
    b.span(-1.5 + i * 0.25 - 0.04, -1.5 + i * 0.25 + 0.04, 7.9, 8.9, fz + 0.18, fz + 0.26, m.blackMetal, { cast: false });
  }
  // walnut pilasters with LED slits
  for (const sx of [-1, 1]) {
    b.span(sx * 7.2 - 0.4, sx * 7.2 + 0.4, 0, L.H, fz, fz + 0.55, tiled(m.walnut, 1, 4));
    b.span(sx * 7.2 - sx * 0.42 - 0.02, sx * 7.2 - sx * 0.42 + 0.02, 0.2, L.H - 1, fz + 0.1, fz + 0.5, m.led, { cast: false });
    world.add(sx * 7.2 - 0.45, sx * 7.2 + 0.45, fz, fz + 0.6);
  }
  // backlit lattice screens on both sides of the feature wall (ref 1)
  const glowBack = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.78, 0.5).multiplyScalar(0.95) });
  for (const sx of [-1, 1]) {
    const cx = sx * 9.9;
    b.plane(3.6, 7.6, glowBack, cx, 4.1, fz + 0.02, { receive: false });
    const lat = b.plane(3.6, 7.6, tiled(m.latticeWood, 3, 6.3), cx, 4.1, fz + 0.3, { cast: true });
    lat.material.side = THREE.DoubleSide;
    b.span(cx - 1.85, cx + 1.85, 0, 0.3, fz, fz + 0.4, m.walnut);
    b.span(cx - 1.85, cx + 1.85, 7.9, 8.1, fz, fz + 0.4, m.walnut);
  }

  /* ---------------- west wing: elevators + red art ---------------- */
  for (const ex of [-19.6, -15.6]) {
    b.span(ex - 1.15, ex + 1.15, 0, 3.3, -D, -D + 0.12, m.darkMarble, { cast: false });
    b.span(ex - 0.72, ex - 0.01, 0, 2.7, -D + 0.12, -D + 0.16, m.brass, { cast: false });
    b.span(ex + 0.01, ex + 0.72, 0, 2.7, -D + 0.12, -D + 0.16, m.brass, { cast: false });
    b.span(ex - 0.3, ex + 0.3, 2.85, 3.05, -D + 0.12, -D + 0.15, m.ledSoft, { cast: false });
    b.span(ex + 0.95, ex + 1.05, 1.1, 1.35, -D + 0.12, -D + 0.17, m.gold, { cast: false });
  }
  const redArt = new THREE.MeshStandardMaterial({ map: T.redArtTexture(), roughness: 0.6, emissive: 0x220000 });
  b.plane(1.3, 2.6, redArt, -17.6, 1.9, -D + 0.08);
  b.span(-18.3, -16.9, 0.55, 0.6, -D, -D + 0.14, m.gold, { cast: false });

  /* ---------------- stairs (east side of the atrium) ---------------- */
  const S = L.STAIR;
  const steps = 25;
  const rise = L.MEZZ / steps;
  const run = (S.zBottom - S.zTop) / steps;
  for (let i = 0; i < steps; i++) {
    const top = (i + 1) * rise;
    const z0 = S.zBottom - i * run;
    b.span(S.x0, S.x1, top - 0.07, top, z0 - run - 0.02, z0, m.whiteMarble);
    b.span(S.x0, S.x1, top - rise, top - 0.07, z0 - 0.06, z0 - 0.02, m.walnut, { cast: false });
    b.span(S.x0 + 0.02, S.x1 - 0.02, top - 0.11, top - 0.08, z0 - 0.06, z0 - 0.02, m.shelfGlow, { cast: false });
  }
  b.span(S.x0, S.x1, L.MEZZ - 0.4, L.MEZZ, S.zLanding, S.zTop, m.walnut);
  b.span(S.x0, S.x1, L.MEZZ - 0.04, L.MEZZ, S.zLanding, S.zTop, m.teak, { cast: false });
  {
    // solid walnut side panels enclosing the space under the stair
    const shape = new THREE.Shape();
    shape.moveTo(S.zBottom, 0);
    shape.lineTo(S.zBottom, rise + 0.02);
    shape.lineTo(S.zTop, L.MEZZ + 0.02);
    shape.lineTo(S.zLanding, L.MEZZ + 0.02);
    shape.lineTo(S.zLanding, 0);
    shape.lineTo(S.zBottom, 0);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: false });
    const mat = tiled(m.walnut, 0.4, 0.4);
    // ry = -90°: shape x -> world z, extrusion -> world -x
    b.mesh(geo, mat, S.x0, 0, 0, { ry: -Math.PI / 2 });
    b.mesh(geo, mat, S.x1 + 0.12, 0, 0, { ry: -Math.PI / 2 });
    // glass balustrade on the open (west) side + handrail
    const gshape = new THREE.Shape();
    gshape.moveTo(S.zBottom, rise);
    gshape.lineTo(S.zTop, L.MEZZ);
    gshape.lineTo(S.zLanding, L.MEZZ);
    gshape.lineTo(S.zLanding, L.MEZZ + 1.0);
    gshape.lineTo(S.zTop, L.MEZZ + 1.0);
    gshape.lineTo(S.zBottom, rise + 1.0);
    gshape.lineTo(S.zBottom, rise);
    const ggeo = new THREE.ExtrudeGeometry(gshape, { depth: 0.02, bevelEnabled: false });
    b.mesh(ggeo, m.glass, S.x0, 0.02, 0, { ry: -Math.PI / 2, cast: false });
    b.mesh(ggeo, m.glass, S.x1 + 0.02, 0.02, 0, { ry: -Math.PI / 2, cast: false });
    const len = Math.hypot(S.zBottom - S.zTop, L.MEZZ - rise);
    const ang = Math.atan2(L.MEZZ - rise, S.zBottom - S.zTop);
    for (const x of [S.x0 - 0.01, S.x1 + 0.01]) {
      const hr = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, len, 10), m.brass);
      b.add(hr, { x, y: (rise + L.MEZZ) / 2 + 1.05, z: (S.zBottom + S.zTop) / 2, rx: -(Math.PI / 2 - ang), cast: false });
    }
    b.span(S.x0 - 0.04, S.x0, L.MEZZ + 1.03, L.MEZZ + 1.08, S.zLanding, S.zTop, m.brass, { cast: false });
    // landing north glass
    b.span(S.x0, S.x1, L.MEZZ, L.MEZZ + 1.0, S.zLanding - 0.02, S.zLanding, m.glass, { cast: false });
    b.span(S.x0, S.x1, L.MEZZ + 1.03, L.MEZZ + 1.08, S.zLanding - 0.04, S.zLanding, m.brass, { cast: false });
  }
  world.add(S.x0 - 0.2, S.x0, S.zLanding, S.zBottom, -1, 30, { cam: false });
  world.add(S.x1, S.x1 + 0.15, S.zTop, S.zBottom, -1, 30, { cam: false });
  // the solid stair body blocks the camera (glass balustrade above does not)
  for (let i = 0; i < 5; i++) {
    const z1 = S.zBottom - (i * (S.zBottom - S.zTop)) / 5;
    const z0 = S.zBottom - ((i + 1) * (S.zBottom - S.zTop)) / 5;
    world.addCam(S.x0, S.x1, 0, ((i + 1) / 5) * L.MEZZ, z0, z1);
  }
  world.addCam(S.x0, S.x1, 0, L.MEZZ, S.zLanding, S.zTop);
  world.add(S.x0, S.x1, S.zLanding - 0.2, S.zLanding, -1, 30, { cam: false });
  world.add(S.x1, S.x1 + 0.15, S.zLanding, S.zTop, -1, 4.0, { cam: false });

  /* ---------------- south glass facade + entrance ---------------- */
  const sz = D;
  b.plane(W * 2, L.H, m.facadeGlass, 0, L.H / 2, sz - 0.02, { receive: false, cast: false });
  for (let x = -W; x <= W + 0.01; x += 44 / 16) {
    if (Math.abs(x) < 2.6) continue;
    b.span(x - 0.06, x + 0.06, 0, L.H, sz - 0.1, sz + 0.05, m.blackMetal, { cast: false });
  }
  for (const y of [0.08, 7.2]) b.span(-W, W, y - 0.06, y + 0.06, sz - 0.1, sz + 0.05, m.blackMetal, { cast: false });
  // entrance portal
  b.span(-2.75, -2.45, 0, 3.6, sz - 0.25, sz + 0.1, m.brass, { cast: false });
  b.span(2.45, 2.75, 0, 3.6, sz - 0.25, sz + 0.1, m.brass, { cast: false });
  b.span(-2.75, 2.75, 3.4, 3.6, sz - 0.25, sz + 0.1, m.brass, { cast: false });
  for (const dx of [-1.2, 1.2]) {
    b.span(dx - 1.15, dx - 1.11, 0, 3.4, sz - 0.12, sz - 0.08, m.brass, { cast: false });
    b.span(dx + 1.11, dx + 1.15, 0, 3.4, sz - 0.12, sz - 0.08, m.brass, { cast: false });
    b.span(dx - 0.05, dx + 0.05, 1.0, 1.6, sz - 0.2, sz - 0.14, m.brass, { cast: false });
  }
  // door mat (dark coir) inside the entrance
  b.span(-2.6, 2.6, 0, 0.012, sz - 2.6, sz - 0.3, new THREE.MeshStandardMaterial({ color: 0x2b241d, roughness: 1 }), { cast: false });

  /* ---------------- exterior (seen through the glass) ---------------- */
  const outsideGround = new THREE.MeshStandardMaterial({ color: 0x3a342e, roughness: 0.9 });
  b.plane(140, 60, outsideGround, 0, -0.02, D + 30, { rx: -Math.PI / 2 });
  const paving = new THREE.MeshStandardMaterial({ color: 0x8e8478, roughness: 0.8 });
  b.plane(30, 8, paving, 0, -0.01, D + 4, { rx: -Math.PI / 2 });
  const sky = new THREE.MeshBasicMaterial({ map: T.skyTexture(), fog: false });
  b.plane(260, 90, sky, 0, 30, D + 70, { ry: Math.PI, receive: false });
  // porte-cochère canopy
  b.span(-7, 7, 4.6, 4.9, D + 0.1, D + 7, m.ceiling);
  b.span(-7, 7, 4.9, 5.0, D + 0.1, D + 7, m.walnut);
  for (const x of [-6.2, 6.2]) b.boxB(0.5, 4.6, 0.5, m.walnut, x, 0, D + 6.4);
  for (let x = -5.5; x <= 5.5; x += 2.2) for (let z = D + 1.5; z < D + 7; z += 2.2) b.plane(0.2, 0.2, m.downlight, x, 4.58, z, { rx: Math.PI / 2 });
  // street trees
  const treeMat = new THREE.MeshStandardMaterial({ color: 0x2f4426, roughness: 0.9 });
  for (const x of [-16, -10, 10, 16]) {
    b.cyl(0.12, 0.16, 2.6, m.bark, x, 0, D + 4.5, 8);
    b.sphere(1.6, treeMat, x, 3.8, D + 4.5, 12);
  }
  // planters along facade
  for (const x of [-20, -14, 14, 20]) {
    b.boxB(3, 0.6, 1, m.darkMarble, x, 0, D + 1.2);
    b.sphere(0.6, treeMat, x - 0.8, 0.8, D + 1.2, 10);
    b.sphere(0.6, treeMat, x + 0.6, 0.8, D + 1.2, 10);
  }

  /* ---------------- upper floor: doors with signage ---------------- */
  const sign = (text, x, y, z, ry, w = 3.2) => {
    const mat = new THREE.MeshBasicMaterial({
      map: T.logoTexture(text, { w: 1024, h: 160, color: '#e3c27f' }),
      transparent: true,
      color: new THREE.Color(1.3, 1.2, 1.0),
      depthWrite: false,
    });
    const p = b.plane(w, w * (160 / 1024), mat, x, y, z, { ry, receive: false });
    p.userData.noMerge = true;
  };
  const upperDoor = (x, z, ry, label) => {
    const g = b.group(x, L.MEZZ, z, ry);
    b.into(g, () => {
      b.span(-1.6, 1.6, 0, 3.2, 0, 0.12, m.darkMarble, { cast: false });
      b.span(-1.25, -0.02, 0, 2.8, 0.12, 0.18, m.walnut, { cast: false });
      b.span(0.02, 1.25, 0, 2.8, 0.12, 0.18, m.walnut, { cast: false });
      b.span(-0.2, -0.12, 1.0, 1.8, 0.18, 0.24, m.brass, { cast: false });
      b.span(0.12, 0.2, 1.0, 1.8, 0.18, 0.24, m.brass, { cast: false });
      b.span(-1.3, 1.3, 2.95, 3.0, 0.12, 0.2, m.ledSoft, { cast: false });
    });
    sign(label, x + Math.sin(ry) * 0.25, L.MEZZ + 3.55, z + Math.cos(ry) * 0.25, ry);
  };
  upperDoor(-W, -2, Math.PI / 2, 'AURELIA SPA');
  upperDoor(W, -2, -Math.PI / 2, 'ROOFTOP GRILL');
  upperDoor(-17, -D, 0, 'GRAND BALLROOM');
  upperDoor(17, -D, 0, 'BUSINESS LOUNGE');
  // ground floor wing signage
  sign('CAFÉ AURELIA', W - 0.2, 3.2, -11.5, -Math.PI / 2, 2.8);

  return out;
}
