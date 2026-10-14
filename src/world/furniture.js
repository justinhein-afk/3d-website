import * as THREE from 'three';
import { L } from '../core/collision.js';
import { tiled } from './materials.js';
import * as T from './textures.js';

const _v = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _f = new THREE.Vector3();

// Furniture, decor and the interactive "slots" (seats, points of interest) NPCs use.
export function buildFurniture(ctx) {
  const { b, m, world, scene } = ctx;
  const seats = [];
  const pois = [];
  const lamps = [];

  const worldRy = (obj) => {
    obj.getWorldQuaternion(_q);
    _f.set(0, 0, 1).applyQuaternion(_q);
    return Math.atan2(_f.x, _f.z);
  };
  const addSeat = (obj, lx, ly, lz, kind, extra = {}) => {
    obj.updateWorldMatrix(true, false);
    const p = obj.localToWorld(_v.set(lx, ly, lz));
    const ry = worldRy(obj);
    seats.push({ x: p.x, y: p.y, z: p.z, ry, kind, taken: null, ...extra });
  };
  const collide = (obj, pad = 0.04) => world.addFromObject(obj, { pad, cam: false });

  /* ---------- generic pieces (built in local space, front = +z) ---------- */
  function sofa(x, z, ry, { seatsN = 3, fabric = m.fabricIvory, pillow = m.fabricRust, y = 0, sit = true } = {}) {
    const g = b.group(x, y, z, ry);
    const w = seatsN * 0.72 + 0.44;
    b.into(g, () => {
      b.boxB(w - 0.2, 0.08, 0.7, m.walnut, 0, 0, 0);
      b.rbox(w, 0.26, 0.92, 0.05, fabric, 0, 0.08, 0);
      for (let i = 0; i < seatsN; i++) {
        const sx = (i - (seatsN - 1) / 2) * 0.72;
        b.rbox(0.7, 0.14, 0.66, 0.06, fabric, sx, 0.33, 0.1);
        b.rbox(0.68, 0.42, 0.18, 0.07, fabric, sx, 0.46, -0.24, { rx: -0.12 });
      }
      b.rbox(w, 0.62, 0.2, 0.06, fabric, 0, 0.08, -0.38);
      for (const s of [-1, 1]) b.rbox(0.2, 0.52, 0.92, 0.06, fabric, s * (w / 2 - 0.1), 0.08, 0);
      b.rbox(0.38, 0.34, 0.12, 0.05, pillow, -(w / 2 - 0.42), 0.46, -0.12, { ry: 0.25, rx: -0.15 });
      b.rbox(0.38, 0.34, 0.12, 0.05, pillow, w / 2 - 0.42, 0.46, -0.12, { ry: -0.25, rx: -0.15 });
    });
    collide(g);
    if (sit) for (let i = 0; i < seatsN; i++) addSeat(g, (i - (seatsN - 1) / 2) * 0.72, 0.47, 0.12, 'sofa');
    return g;
  }

  function armchair(x, z, ry, { fabric = m.fabricSand, y = 0, sit = true } = {}) {
    const g = b.group(x, y, z, ry);
    b.into(g, () => {
      for (const sx of [-0.33, 0.33]) for (const sz of [-0.3, 0.3]) b.cyl(0.025, 0.02, 0.18, m.walnut, sx, 0, sz, 8);
      b.rbox(0.9, 0.22, 0.85, 0.06, fabric, 0, 0.16, 0);
      b.rbox(0.66, 0.12, 0.6, 0.05, fabric, 0, 0.38, 0.08);
      b.rbox(0.9, 0.5, 0.18, 0.06, fabric, 0, 0.36, -0.34, { rx: -0.1 });
      for (const s of [-1, 1]) b.rbox(0.14, 0.32, 0.8, 0.05, fabric, s * 0.38, 0.36, 0);
    });
    collide(g);
    if (sit) addSeat(g, 0, 0.5, 0.1, 'sofa');
    return g;
  }

  function coffeeTable(x, z, ry = 0, { w = 1.3, d = 0.75, y = 0, round = false } = {}) {
    const g = b.group(x, y, z, ry);
    b.into(g, () => {
      if (round) {
        b.cyl(w / 2, w / 2, 0.05, m.whiteMarble, 0, 0.36, 0, 40);
        b.cyl(w / 2 - 0.15, w / 2 - 0.1, 0.36, m.walnut, 0, 0, 0, 32);
      } else {
        b.rbox(w, 0.05, d, 0.02, m.whiteMarble, 0, 0.36, 0);
        b.boxB(w - 0.3, 0.36, d - 0.25, m.walnut, 0, 0, 0);
      }
      b.cyl(0.07, 0.05, 0.2, m.ceramicCeladon, -w * 0.22, 0.41, 0.05, 16);
      b.boxB(0.28, 0.05, 0.2, m.fabricTaupe, w * 0.2, 0.41, -0.02);
      b.boxB(0.24, 0.04, 0.18, m.ceramicWhite, w * 0.2, 0.46, -0.02);
      b.sphere(0.06, m.gold, w * 0.2, 0.55, -0.02, 12);
    });
    collide(g, 0.02);
    return g;
  }

  function rug(x, z, w, d, ry = 0, tex) {
    const mat = new THREE.MeshStandardMaterial({ map: tex || T.rectRugTexture(), roughness: 1 });
    b.box(w, 0.012, d, mat, x, 0.008, z, { ry, cast: false });
  }

  function diningChair(parent, lx, lz, lry) {
    const c = b.group(lx, 0, lz, lry, parent);
    b.into(c, () => {
      for (const sx of [-0.2, 0.2]) {
        for (const sz of [-0.19, 0.19]) b.boxB(0.035, 0.45, 0.035, m.oak, sx, 0, sz);
      }
      b.boxB(0.46, 0.05, 0.46, m.oak, 0, 0.44, 0);
      b.boxB(0.42, 0.03, 0.42, m.rattan, 0, 0.49, 0);
      for (const sx of [-0.2, 0.2]) b.boxB(0.035, 0.5, 0.035, m.oak, sx, 0.49, -0.2);
      b.boxB(0.44, 0.06, 0.04, m.oak, 0, 0.95, -0.2);
      b.boxB(0.36, 0.32, 0.02, m.rattan, 0, 0.58, -0.2);
    });
    return c;
  }

  function diningSet(x, z, ry = 0) {
    const g = b.group(x, 0, z, ry);
    b.into(g, () => {
      b.rbox(0.95, 0.05, 0.95, 0.02, m.teak, 0, 0.72, 0);
      b.cyl(0.06, 0.06, 0.72, m.blackMetal, 0, 0, 0, 12);
      b.cyl(0.32, 0.36, 0.03, m.blackMetal, 0, 0, 0, 24);
      b.cyl(0.05, 0.04, 0.16, m.ceramicWhite, 0, 0.77, 0, 12);
      b.sphere(0.06, m.leafLight, 0, 0.98, 0, 10);
    });
    const chairs = [
      [0, 0.72, Math.PI],
      [0, -0.72, 0],
      [0.72, 0, -Math.PI / 2],
      [-0.72, 0, Math.PI / 2],
    ];
    for (const [cx, cz, cry] of chairs) {
      const c = diningChair(g, cx, cz, cry);
      addSeat(c, 0, 0.5, 0.06, 'chair');
    }
    collide(g, 0.02);
    return g;
  }

  function plant(x, z, { y = 0, scale = 1, pot = m.ceramicWhite, tall = false } = {}) {
    const g = b.group(x, y, z, Math.random() * Math.PI);
    g.scale.setScalar(scale);
    b.into(g, () => {
      b.cyl(0.26, 0.2, 0.55, pot, 0, 0, 0, 20);
      b.cyl(0.24, 0.24, 0.02, m.soil, 0, 0.53, 0, 16);
      if (tall) {
        b.cyl(0.03, 0.04, 1.2, m.bark, 0, 0.55, 0, 6);
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * Math.PI * 2;
          b.sphere(0.32, i % 2 ? m.leaf : m.leafLight, Math.cos(a) * 0.25, 1.5 + Math.sin(i * 2.3) * 0.25, Math.sin(a) * 0.25, 8).scale.set(1, 0.8, 1);
        }
        b.sphere(0.35, m.leaf, 0, 1.85, 0, 8);
      } else {
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          const leaf = b.sphere(0.5, i % 3 ? m.leaf : m.leafLight, Math.cos(a) * 0.14, 0.95, Math.sin(a) * 0.14, 8, { cast: true });
          leaf.scale.set(0.08, 0.55, 0.22);
          leaf.rotation.set(Math.sin(a) * 0.5, -a, Math.cos(a) * 0.5);
        }
      }
    });
    world.addCentered(x, z, 0.55 * scale, 0.55 * scale, y - 1, y + 2, { cam: false });
    return g;
  }

  // Sculptural bonsai / driftwood tree on a glowing stone plinth (ref 2)
  function sculptureTree(x, z, ry, s = 1) {
    const g = b.group(x, 0, z, ry);
    g.scale.setScalar(s);
    b.into(g, () => {
      b.boxB(2.3, 0.42, 2.3, m.darkMarble, 0, 0.04, 0);
      b.boxB(2.2, 0.04, 2.2, m.led, 0, 0.0, 0, { cast: false });
      b.boxB(2.1, 0.06, 2.1, m.pebble, 0, 0.46, 0, { cast: false });
      for (let i = 0; i < 6; i++) b.sphere(0.13, m.pebble, Math.cos(i * 1.7) * 0.7, 0.52, Math.sin(i * 2.2) * 0.7, 10);
      const trunkPts = [
        [0, 0.45, 0],
        [0.15, 1.2, 0.05],
        [-0.25, 2.0, -0.1],
        [0.1, 2.7, 0.15],
        [0.45, 3.3, 0.05],
      ];
      const curve = new THREE.CatmullRomCurve3(trunkPts.map((p) => new THREE.Vector3(...p)));
      b.mesh(new THREE.TubeGeometry(curve, 24, 0.13, 8), m.driftwood, 0, 0, 0);
      const branches = [
        [[-0.25, 2.0, -0.1], [-0.8, 2.5, -0.2], [-1.2, 2.7, 0.1]],
        [[0.1, 2.7, 0.15], [0.6, 2.9, 0.5], [1.0, 3.0, 0.7]],
        [[0.15, 1.2, 0.05], [0.7, 1.6, -0.3], [1.0, 1.9, -0.5]],
        [[0.45, 3.3, 0.05], [0.2, 3.6, -0.4]],
      ];
      for (const br of branches) {
        const c = new THREE.CatmullRomCurve3(br.map((p) => new THREE.Vector3(...p)));
        b.mesh(new THREE.TubeGeometry(c, 12, 0.06, 6), m.driftwood, 0, 0, 0);
        const end = br[br.length - 1];
        for (let k = 0; k < 4; k++) {
          const puff = b.sphere(0.32, k % 2 ? m.leaf : m.leafLight, end[0] + (Math.random() - 0.5) * 0.5, end[1] + 0.1 + Math.random() * 0.15, end[2] + (Math.random() - 0.5) * 0.5, 10);
          puff.scale.set(1.2, 0.45, 1.0);
        }
      }
    });
    world.addCentered(x, z, 2.3 * s, 2.3 * s, -1, 4, { cam: false });
    pois.push({ x: x, z: z + 1.9 * s, ry: Math.PI, kind: 'tree' });
    pois.push({ x: x + 1.9 * s, z: z, ry: -Math.PI / 2, kind: 'tree' });
    return g;
  }

  function smallBonsai(parent, lx, ly, lz) {
    const g = b.group(lx, ly, lz, 0, parent);
    b.into(g, () => {
      b.boxB(0.42, 0.1, 0.26, m.ceramicBlack, 0, 0, 0);
      const c = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.1, 0), new THREE.Vector3(0.06, 0.25, 0), new THREE.Vector3(-0.08, 0.4, 0.02), new THREE.Vector3(0.1, 0.5, 0)]);
      b.mesh(new THREE.TubeGeometry(c, 10, 0.025, 6), m.bark, 0, 0, 0);
      for (const [px, py, pz, r] of [
        [-0.12, 0.45, 0, 0.12],
        [0.12, 0.52, 0.02, 0.13],
        [0.0, 0.6, -0.02, 0.1],
      ]) {
        b.sphere(r, m.leaf, px, py, pz, 10).scale.set(1.3, 0.55, 1);
      }
    });
    return g;
  }

  function tableLamp(parent, lx, ly, lz) {
    const g = b.group(lx, ly, lz, 0, parent);
    b.into(g, () => {
      b.cyl(0.08, 0.1, 0.03, m.brass, 0, 0, 0, 16);
      b.cyl(0.015, 0.015, 0.4, m.brass, 0, 0.03, 0, 8);
      b.cyl(0.16, 0.2, 0.26, m.shadeGlow, 0, 0.38, 0, 24);
    });
    return g;
  }

  function latticeScreen(x, z, ry, w = 2.4, h = 2.6, y = 0) {
    const g = b.group(x, y, z, ry);
    b.into(g, () => {
      const p = b.plane(w - 0.1, h - 0.1, tiled(m.latticeOak, w / 1.2, h / 1.2), 0, h / 2, 0, { cast: true });
      p.material.side = THREE.DoubleSide;
      b.span(-w / 2, w / 2, 0, 0.05, -0.04, 0.04, m.walnut);
      b.span(-w / 2, w / 2, h - 0.05, h, -0.04, 0.04, m.walnut);
      b.span(-w / 2, -w / 2 + 0.05, 0, h, -0.04, 0.04, m.walnut);
      b.span(w / 2 - 0.05, w / 2, 0, h, -0.04, 0.04, m.walnut);
    });
    world.addFromObject(g, { pad: 0.05, cam: false });
    return g;
  }

  function bookshelf(x, z, ry, w = 5, h = 3.6) {
    const g = b.group(x, 0, z, ry);
    const books = new THREE.MeshStandardMaterial({ map: T.bookSpinesTexture(), roughness: 0.8 });
    b.into(g, () => {
      b.boxB(w, h, 0.05, m.walnut, 0, 0, -0.2);
      const cols = Math.round(w / 1.0);
      const rows = 4;
      const cw = w / cols;
      const rh = (h - 0.3) / rows;
      for (let c = 0; c <= cols; c++) b.boxB(0.05, h, 0.42, m.walnut, -w / 2 + c * cw, 0, 0);
      for (let r = 0; r <= rows; r++) b.boxB(w, 0.05, 0.42, m.walnut, 0, 0.25 + r * rh - 0.025, 0);
      b.boxB(w, 0.25, 0.42, m.walnut, 0, 0, 0);
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const cx = -w / 2 + (c + 0.5) * cw;
          const y0 = 0.25 + r * rh;
          b.plane(cw - 0.06, rh - 0.06, m.shelfGlow, cx, y0 + rh / 2, -0.17, { receive: false });
          const pick = (c * 7 + r * 3) % 4;
          if (pick === 0 || pick === 2) {
            b.plane(cw * 0.7, rh * 0.6, books, cx - cw * 0.1, y0 + rh * 0.3 + 0.02, 0.05);
          } else if (pick === 1) {
            b.cyl(0.07, 0.11, 0.32, r % 2 ? m.ceramicBlack : m.ceramicCeladon, cx, y0 + 0.02, 0.0, 16);
            b.sphere(0.08, m.ceramicWhite, cx + 0.22, y0 + 0.1, 0.02, 12);
          } else {
            b.boxB(0.3, 0.05, 0.22, m.fabricTaupe, cx, y0 + 0.02, 0);
            b.boxB(0.26, 0.04, 0.2, m.ceramicWhite, cx, y0 + 0.07, 0);
          }
        }
      }
    });
    collide(g, 0.02);
    pois.push({ ...worldPoint(g, 0, 0, 1.2), ry: ry + Math.PI, kind: 'shelf' });
    pois.push({ ...worldPoint(g, -w * 0.3, 0, 1.2), ry: ry + Math.PI, kind: 'shelf' });
    return g;
  }

  function worldPoint(obj, lx, ly, lz) {
    obj.updateWorldMatrix(true, false);
    const p = obj.localToWorld(_v.set(lx, ly, lz));
    return { x: p.x, z: p.z };
  }

  /* ---------- RECEPTION (north, atrium) ---------- */
  {
    const g = b.group(0, 0, -10.55, 0);
    b.into(g, () => {
      // body
      b.span(-4.6, 4.6, 0, 1.02, -0.45, 0.4, m.walnut);
      // oak slat front (ref 1)
      for (let x = -4.5; x <= 4.5; x += 0.12) b.span(x - 0.035, x + 0.035, 0.08, 1.0, 0.4, 0.46, m.oak);
      b.span(-4.6, 4.6, 0, 0.08, 0.36, 0.46, m.darkMarble, { cast: false });
      // marble top + LED under the overhang
      b.span(-4.78, 4.78, 1.02, 1.1, -0.5, 0.56, m.whiteMarble);
      b.span(-4.6, 4.6, 0.98, 1.0, 0.44, 0.5, m.led, { cast: false });
      // staff-side work surface
      b.span(-4.5, 4.5, 0.74, 0.78, -0.95, -0.45, m.whiteMarble);
      for (const x of [-3, 0, 3]) {
        b.span(x - 0.28, x + 0.28, 0.82, 1.18, -0.75, -0.72, m.ceramicBlack, { cast: false });
        b.span(x - 0.05, x + 0.05, 0.78, 0.84, -0.78, -0.7, m.blackMetal, { cast: false });
      }
      // returns towards the back wall
      for (const s of [-1, 1]) {
        b.span(s * 4.6 - 0.25, s * 4.6 + 0.25, 0, 1.02, -4.7, -0.45, m.walnut);
        b.span(s * 4.6 - 0.32, s * 4.6 + 0.32, 1.02, 1.1, -4.75, -0.45, m.whiteMarble);
      }
    });
    smallBonsai(g, -3.9, 1.1, 0.1);
    tableLamp(g, 4.25, 1.1, -0.05);
    tableLamp(g, -1.5, 1.1, -0.2);
    // back cabinet with marble top against the feature wall
    b.span(-6.6, 6.6, 0, 0.95, -L.D + 0.55, -L.D + 1.15, m.walnut);
    b.span(-6.65, 6.65, 0.95, 1.0, -L.D + 0.55, -L.D + 1.2, m.whiteMarble);
    for (let i = 0; i < 5; i++) b.cyl(0.08, 0.1, 0.28, i % 2 ? m.ceramicCeladon : m.ceramicWhite, -5.6 + i * 0.35, 1.0, -L.D + 0.85, 14);
    b.boxB(0.5, 0.35, 0.3, m.brass, 5.4, 1.0, -L.D + 0.85);
    world.add(-4.85, 4.85, -11.05, -9.95, -1, 1.2, { cam: false });
    world.add(-4.9, -4.3, -15.4, -10.9, -1, 1.2, { cam: false });
    world.add(4.3, 4.9, -15.4, -10.9, -1, 1.2, { cam: false });
    world.add(-6.7, 6.7, -L.D, -L.D + 1.25, -1, 1.1, { cam: false });
    pois.push({ x: 0, z: -8.6, ry: Math.PI, kind: 'art', label: 'gold landscape' });
  }

  /* ---------- CENTRAL ATRIUM ---------- */
  sculptureTree(-6.6, -5.2, 0.4, 1);
  sculptureTree(6.6, -5.2, -2.6, 1);

  // round banquette with a flower centrepiece under the chandelier
  {
    const cx = 0;
    const cz = 2;
    const g = b.group(cx, 0, cz);
    b.into(g, () => {
      b.cyl(1.7, 1.7, 0.08, m.walnut, 0, 0, 0, 48);
      b.cyl(1.75, 1.75, 0.34, m.fabricIvory, 0, 0.08, 0, 48);
      b.cyl(1.0, 1.05, 0.7, m.fabricTaupe, 0, 0.42, 0, 40);
      b.cyl(0.8, 0.8, 0.06, m.darkMarble, 0, 1.12, 0, 40);
      b.cyl(0.32, 0.22, 0.6, m.ceramicWhite, 0, 1.18, 0, 24);
      for (let i = 0; i < 26; i++) {
        const a = i * 2.4;
        const r = 0.15 + (i % 5) * 0.09;
        const h = 1.85 + Math.sin(i * 1.3) * 0.25 + (5 - (i % 5)) * 0.06;
        b.cyl(0.006, 0.006, h - 1.7, m.leaf, Math.cos(a) * r * 0.5, 1.7, Math.sin(a) * r * 0.5, 4);
        const bloom = b.sphere(0.09 + (i % 3) * 0.02, i % 4 === 0 ? m.fabricRust : i % 3 ? m.ceramicWhite : m.fabricSand, Math.cos(a) * r, h, Math.sin(a) * r, 10);
        bloom.castShadow = false;
      }
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const leaf = b.sphere(0.4, m.leaf, Math.cos(a) * 0.3, 1.75, Math.sin(a) * 0.3, 8);
        leaf.scale.set(0.12, 0.6, 0.3);
        leaf.rotation.set(Math.sin(a) * 0.9, -a, Math.cos(a) * 0.9);
      }
    });
    world.addCentered(cx, cz, 3.4, 3.4, -1, 2, { cam: false });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      seats.push({ x: cx + Math.sin(a) * 1.45, y: 0.44, z: cz + Math.cos(a) * 1.45, ry: a, kind: 'banquette', taken: null });
    }
  }

  // atrium lounge clusters (ref 2: sofas on both sides)
  rug(-7.8, 7.0, 4.4, 3.4, 0);
  sofa(-7.8, 5.75, 0, { seatsN: 3 });
  armchair(-9.6, 7.6, Math.PI * 0.75, { fabric: m.fabricSand });
  armchair(-6.0, 7.6, -Math.PI * 0.75, { fabric: m.fabricSand });
  coffeeTable(-7.8, 7.15, 0, { w: 1.4, d: 0.7 });
  rug(7.0, 7.0, 4.4, 3.4, 0);
  sofa(7.0, 5.75, 0, { seatsN: 3, pillow: m.fabricOlive });
  armchair(5.2, 7.6, Math.PI * 0.75, { fabric: m.leatherCognac });
  armchair(8.8, 7.6, -Math.PI * 0.75, { fabric: m.leatherCognac });
  coffeeTable(7.0, 7.15, 0, { w: 1.0, round: true });

  plant(-11.3, -9.8, { tall: true });
  plant(11.3, -9.8, { tall: true });
  plant(-4.2, 14.9, { scale: 1.1 });
  plant(4.2, 14.9, { scale: 1.1 });

  // concierge podium near the entrance
  {
    const g = b.group(-3.6, 0, 11.0, 0);
    b.into(g, () => {
      b.boxB(1.1, 1.05, 0.55, m.walnut, 0, 0, 0);
      for (let x = -0.5; x <= 0.5; x += 0.1) b.span(x - 0.03, x + 0.03, 0.06, 1.0, 0.27, 0.31, m.oak);
      b.boxB(1.2, 0.06, 0.62, m.whiteMarble, 0, 1.05, 0);
    });
    tableLamp(g, 0.42, 1.11, -0.08);
    const signMat = new THREE.MeshBasicMaterial({ map: T.logoTexture('CONCIERGE', { w: 1024, h: 180, color: '#d9b878' }), transparent: true, depthWrite: false });
    const s = b.plane(0.9, 0.16, signMat, -3.6, 0.82, 11.32, { receive: false });
    s.userData.noMerge = true;
    collide(g, 0.03);
  }

  /* ---------- WEST WING: lounge, library, tea pavilion ---------- */
  plant(-21.3, -15.2, { tall: true });
  plant(-13.9, -15.2, { tall: true });
  {
    // bench facing the elevators
    const g = b.group(-17.6, 0, -12.6, Math.PI);
    b.into(g, () => {
      b.boxB(2.4, 0.08, 0.5, m.walnut, 0, 0.36, 0);
      b.boxB(2.3, 0.08, 0.45, m.fabricTaupe, 0, 0.44, 0);
      for (const x of [-1, 1]) b.boxB(0.1, 0.36, 0.42, m.brass, x, 0, 0);
    });
    collide(g);
    addSeat(g, -0.6, 0.5, 0.0, 'bench');
    addSeat(g, 0.6, 0.5, 0.0, 'bench');
  }
  latticeScreen(-19.2, -8.8, 0, 2.6, 2.8);
  latticeScreen(-14.4, -8.8, 0, 2.4, 2.8);

  rug(-17.3, -4.3, 4.2, 3.2, Math.PI / 2);
  sofa(-19.4, -4.3, Math.PI / 2, { seatsN: 3 });
  sofa(-15.2, -4.3, -Math.PI / 2, { seatsN: 3, pillow: m.fabricOlive });
  coffeeTable(-17.3, -4.3, Math.PI / 2, { w: 1.5, d: 0.8 });

  rug(-17.3, 1.9, 4.2, 3.2, Math.PI / 2);
  sofa(-19.4, 1.9, Math.PI / 2, { seatsN: 2, fabric: m.fabricSand });
  armchair(-15.3, 1.1, -Math.PI / 2 - 0.3, { fabric: m.fabricIvory });
  armchair(-15.3, 2.7, -Math.PI / 2 + 0.3, { fabric: m.fabricIvory });
  coffeeTable(-17.3, 1.9, 0, { w: 1.0, round: true });

  bookshelf(-21.75, -3.8, Math.PI / 2, 5.6, 3.7);
  bookshelf(-21.75, 2.4, Math.PI / 2, 5.0, 3.7);
  latticeScreen(-20.4, 5.7, 0, 2.6, 2.8);
  latticeScreen(-16.6, 5.7, 0, 2.6, 2.8);

  // tea pavilion: raised platform, tatami, low table, cushions, andon lanterns (ref 4)
  {
    const t = L.TEA;
    b.span(t.x0, t.x1, 0, t.h, t.z0, t.z1, tiled(m.oak, 3, 4));
    b.span(t.x0, t.x1, t.h - 0.04, t.h - 0.01, t.z1 - 0.06, t.z1, m.ledSoft, { cast: false });
    b.span(t.x1 - 0.06, t.x1, t.h - 0.04, t.h - 0.01, t.z0, t.z1, m.ledSoft, { cast: false });
    const tatami = new THREE.MeshStandardMaterial({ color: 0xc9c08a, roughness: 0.95 });
    const border = new THREE.MeshStandardMaterial({ color: 0x2c3a2a, roughness: 0.9 });
    for (const [cx, cz] of [
      [-19.9, 9.4],
      [-19.9, 12.6],
      [-17.2, 9.4],
      [-17.2, 12.6],
    ]) {
      b.span(cx - 1.32, cx + 1.32, t.h, t.h + 0.02, cz - 1.55, cz + 1.55, border, { cast: false });
      b.span(cx - 1.26, cx + 1.26, t.h, t.h + 0.025, cz - 1.49, cz + 1.49, tatami, { cast: false });
    }
    const tableG = b.group(-18.6, t.h, 11, 0);
    b.into(tableG, () => {
      b.rbox(1.6, 0.06, 1.0, 0.02, m.walnut, 0, 0.32, 0);
      for (const sx of [-0.7, 0.7]) b.boxB(0.08, 0.32, 0.9, m.walnut, sx, 0, 0);
      // tea set
      b.sphere(0.1, m.ceramicBlack, 0, 0.47, 0, 16).scale.set(1, 0.85, 1);
      b.cyl(0.02, 0.02, 0.08, m.ceramicBlack, 0.12, 0.45, 0, 6);
      for (const [cx2, cz2] of [
        [-0.45, 0.25],
        [0.45, 0.25],
        [-0.45, -0.25],
        [0.45, -0.25],
      ]) {
        b.cyl(0.045, 0.035, 0.06, m.ceramicCeladon, cx2, 0.38, cz2, 12);
      }
      b.boxB(0.5, 0.03, 0.2, m.oak, 0, 0.38, -0.32);
    });
    collide(tableG, 0.05);
    for (const [cx, cz] of [
      [-19.7, 10.7],
      [-19.7, 11.3],
      [-17.5, 10.7],
      [-17.5, 11.3],
      [-18.6, 12.0],
      [-18.6, 10.0],
    ]) {
      b.rbox(0.55, 0.1, 0.55, 0.05, m.fabricRust, cx, t.h + 0.02, cz);
    }
    for (const [lx, lz] of [
      [-21.3, 7.1],
      [-15.7, 7.1],
      [-21.3, 15.1],
      [-15.7, 15.1],
    ]) {
      b.boxB(0.34, 0.06, 0.34, m.walnut, lx, t.h, lz);
      b.boxB(0.3, 0.62, 0.3, m.shadeGlow, lx, t.h + 0.06, lz);
      b.boxB(0.34, 0.03, 0.34, m.walnut, lx, t.h + 0.68, lz);
      lamps.push(new THREE.Vector3(lx, t.h + 0.4, lz));
    }
    // ikebana by the moon gate
    b.cyl(0.2, 0.15, 0.3, m.ceramicBlack, -21.2, t.h, 13.2, 16);
    for (let i = 0; i < 5; i++) b.cyl(0.008, 0.008, 1.1 + i * 0.15, m.bark, -21.2 + (i - 2) * 0.04, t.h + 0.3, 13.2, 4, { rz: (i - 2) * 0.12 });
    // hanging noren-style sign board
    const signMat = new THREE.MeshBasicMaterial({ map: T.logoTexture('TEA PAVILION', { w: 1024, h: 200, color: '#3a2a1a' }), transparent: true, depthWrite: false });
    b.span(-15.2, -15.1, 2.8, 3.5, 9.7, 12.3, m.oak, { cast: false });
    const sp = b.plane(2.4, 0.47, signMat, -15.04, 3.15, 11, { ry: Math.PI / 2, receive: false });
    sp.userData.noMerge = true;
    for (const zz of [9.8, 12.2]) b.cyl(0.01, 0.01, 0.6, m.blackMetal, -15.15, 3.5, zz, 4);
    pois.push({ x: -14.4, z: 11, ry: -Math.PI / 2, kind: 'tea' });
    pois.push({ x: -14.4, z: 8.4, ry: -Math.PI / 2 - 0.3, kind: 'tea' });
  }

  /* ---------- EAST WING: café bar, plant wall, dining (ref 1) ---------- */
  {
    // plant wall
    const pw = new THREE.MeshStandardMaterial({ map: T.plantWallTexture(), roughness: 0.95 });
    pw.map.repeat.set(3, 1.3);
    b.plane(8.4, 3.6, pw, 17.4, 2.2, -L.D + 0.06);
    for (let i = 0; i < 70; i++) {
      const s = b.sphere(0.12 + Math.random() * 0.12, i % 2 ? m.leaf : m.leafLight, 13.3 + Math.random() * 8.2, 0.5 + Math.random() * 3.3, -L.D + 0.1, 6, { cast: false });
      s.scale.z = 0.5;
    }
    b.span(13.1, 21.7, 0.35, 0.4, -L.D, -L.D + 0.25, m.walnut);
    b.span(13.1, 21.7, 4.0, 4.05, -L.D, -L.D + 0.25, m.walnut);
    pois.push({ x: 17.4, z: -13.4, ry: Math.PI, kind: 'plants' });
  }
  {
    // café bar
    const g = b.group(17.2, 0, -11.2, 0);
    b.into(g, () => {
      b.span(-3.0, 3.0, 0, 1.05, -0.35, 0.35, m.darkMarble);
      for (let x = -2.9; x <= 2.9; x += 0.12) b.span(x - 0.035, x + 0.035, 0.1, 1.0, 0.35, 0.4, m.oak);
      b.span(-3.15, 3.15, 1.05, 1.12, -0.42, 0.5, m.whiteMarble);
      b.span(-3.0, 3.0, 1.0, 1.02, 0.38, 0.44, m.led, { cast: false });
      // espresso machine & bottles
      b.boxB(0.7, 0.45, 0.45, m.blackMetal, -1.6, 1.12, -0.1);
      b.boxB(0.6, 0.06, 0.3, m.brass, -1.6, 1.57, -0.1);
      for (let i = 0; i < 6; i++) b.cyl(0.04, 0.04, 0.32, i % 2 ? m.ceramicCeladon : m.blackMetal, 0.8 + i * 0.12, 1.12, -0.2, 8);
      b.cyl(0.18, 0.14, 0.12, m.ceramicWhite, 2.2, 1.12, 0, 16);
      for (let i = 0; i < 3; i++) b.sphere(0.07, m.fabricRust, 2.15 + i * 0.06, 1.25, 0.02 * i, 10);
    });
    world.add(13.95, 20.45, -11.7, -10.6, -1, 1.2, { cam: false });
    // stools
    for (let i = 0; i < 6; i++) {
      const sx = 14.8 + i * 0.95;
      const sg = b.group(sx, 0, -10.1, Math.PI);
      b.into(sg, () => {
        b.cyl(0.18, 0.2, 0.03, m.blackMetal, 0, 0, 0, 16);
        b.cyl(0.03, 0.03, 0.7, m.brass, 0, 0, 0, 8);
        b.cyl(0.2, 0.18, 0.08, m.leatherCognac, 0, 0.7, 0, 18);
      });
      world.addCentered(sx, -10.1, 0.4, 0.4, -1, 0.8, { cam: false });
    }
    // pendants over the bar
    for (let i = 0; i < 4; i++) {
      const px = 15.0 + i * 1.5;
      b.cyl(0.006, 0.006, 1.35, m.blackMetal, px, 2.75, -11.2, 4, { cast: false });
      b.cyl(0.14, 0.2, 0.32, m.shadeGlow, px, 2.45, -11.2, 20, { cast: false });
      lamps.push(new THREE.Vector3(px, 2.4, -11.2));
    }
    pois.push({ x: 17.2, z: -9.4, ry: Math.PI, kind: 'bar' });
  }
  // dining sets
  const tables = [];
  for (const x of [15.4, 19.2]) {
    for (const z of [-6.4, -1.8, 2.8, 7.4]) {
      diningSet(x, z, 0);
      tables.push({ x, z });
    }
  }
  diningSet(17.3, 12.4, Math.PI / 4);
  tables.push({ x: 17.3, z: 12.4 });

  // floating oak shelves with LED undersides on the east wall (ref 1)
  for (const [zc, w] of [
    [-3.5, 4.2],
    [5.0, 4.2],
  ]) {
    for (let r = 0; r < 4; r++) {
      const y = 0.95 + r * 0.72;
      b.span(L.W - 0.4, L.W, y, y + 0.06, zc - w / 2, zc + w / 2, m.oak);
      b.span(L.W - 0.36, L.W - 0.04, y - 0.015, y, zc - w / 2 + 0.05, zc + w / 2 - 0.05, m.led, { cast: false });
      for (let k = 0; k < 4; k++) {
        const zz = zc - w / 2 + 0.5 + k * ((w - 1) / 3);
        const v = (r + k) % 3;
        if (v === 0) b.cyl(0.07, 0.1, 0.3, m.ceramicWhite, L.W - 0.2, y + 0.06, zz, 14);
        else if (v === 1) b.sphere(0.12, m.ceramicBlack, L.W - 0.2, y + 0.18, zz, 14).scale.set(1, 0.8, 1);
        else b.cyl(0.16, 0.08, 0.1, m.ceramicCeladon, L.W - 0.2, y + 0.06, zz, 16);
      }
    }
    pois.push({ x: L.W - 1.6, z: zc, ry: Math.PI / 2, kind: 'shelf' });
  }
  plant(21.3, 10.9, { tall: true });
  plant(21.3, 14.9, { tall: true });
  plant(13.6, 14.9, {});

  /* ---------- UPPER FLOOR (mezzanine) ---------- */
  const U = L.MEZZ;
  for (const z of [-9, 1.5]) {
    armchair(-13.6, z - 0.7, -Math.PI / 2 + 0.25, { y: U, sit: false });
    armchair(-13.6, z + 0.7, -Math.PI / 2 - 0.25, { y: U, sit: false, fabric: m.fabricIvory });
    coffeeTable(-14.6, z, 0, { w: 0.7, round: true, y: U });
  }
  for (const z of [-12, 7]) {
    armchair(13.6, z - 0.7, Math.PI / 2 - 0.25, { y: U, sit: false });
    armchair(13.6, z + 0.7, Math.PI / 2 + 0.25, { y: U, sit: false, fabric: m.leatherCognac });
    coffeeTable(14.6, z, 0, { w: 0.7, round: true, y: U });
  }
  sofa(-19.5, -8, Math.PI / 2, { y: U, sit: false });
  sofa(19.5, 3, -Math.PI / 2, { y: U, sit: false, fabric: m.fabricSand });
  for (const [x, z] of [
    [-21.2, -15.2],
    [-21.2, 15.0],
    [21.2, -15.2],
    [21.2, 15.0],
    [-8, 15.1],
    [8, 15.1],
    [-13.4, 13.4],
    [13.4, 13.4],
  ]) {
    plant(x, z, { y: U, tall: x % 2 === 0 });
  }
  // gallery art upstairs
  {
    const art = new THREE.MeshStandardMaterial({ map: T.goldLandscapeTexture({ w: 512, h: 384 }), roughness: 0.6 });
    b.plane(2.8, 2.0, art, -L.W + 0.06, U + 2.0, 8, { ry: Math.PI / 2 });
    b.plane(2.8, 2.0, art, L.W - 0.06, U + 2.0, -9, { ry: -Math.PI / 2 });
    const red = new THREE.MeshStandardMaterial({ map: T.redArtTexture({ w: 256, h: 512 }), roughness: 0.6 });
    b.plane(1.3, 2.6, red, -L.W + 0.06, U + 2.0, -11, { ry: Math.PI / 2 });
    b.plane(1.3, 2.6, red, L.W - 0.06, U + 2.0, 9, { ry: -Math.PI / 2 });
  }

  /* ---------- CHANDELIER (crystal sphere cluster, ref 1) ---------- */
  const chandelier = new THREE.Group();
  chandelier.position.set(0, 0, 2);
  chandelier.userData.noMerge = true;
  {
    const sGeo = new THREE.SphereGeometry(1, 12, 8);
    const wGeo = new THREE.CylinderGeometry(0.004, 0.004, 1, 4);
    const items = [];
    const rings = [
      [0.0, 1],
      [0.55, 7],
      [1.1, 12],
      [1.7, 18],
      [2.3, 24],
    ];
    for (const [r, n] of rings) {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + r;
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        const bottom = 6.1 + (r / 2.3) ** 2 * 1.7 + Math.sin(i * 2.7) * 0.2;
        const count = 2 + ((i + Math.round(r * 3)) % 3);
        for (let k = 0; k < count; k++) {
          items.push({ x, y: bottom + k * 0.42 + Math.random() * 0.1, z, s: 0.07 + Math.random() * 0.06 + (k === 0 ? 0.04 : 0) });
        }
        items.push({ wire: true, x, z, y0: bottom, y1: 9.3 });
      }
    }
    const spheres = items.filter((i) => !i.wire);
    const wires = items.filter((i) => i.wire);
    const sMesh = new THREE.InstancedMesh(sGeo, m.crystal, spheres.length);
    const wMesh = new THREE.InstancedMesh(wGeo, m.brass, wires.length);
    const mm = new THREE.Matrix4();
    const qq = new THREE.Quaternion();
    spheres.forEach((s, i) => sMesh.setMatrixAt(i, mm.compose(new THREE.Vector3(s.x, s.y, s.z), qq, new THREE.Vector3(s.s, s.s, s.s))));
    wires.forEach((w, i) => wMesh.setMatrixAt(i, mm.compose(new THREE.Vector3(w.x, (w.y0 + w.y1) / 2, w.z), qq, new THREE.Vector3(1, w.y1 - w.y0, 1))));
    chandelier.add(sMesh, wMesh);
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.04, 8, 96), m.brass);
    hoop.rotation.x = Math.PI / 2;
    hoop.position.y = 9.28;
    chandelier.add(hoop);
    const hoop2 = hoop.clone();
    hoop2.scale.setScalar(0.5);
    chandelier.add(hoop2);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 12), m.shadeGlow);
    core.position.y = 6.7;
    chandelier.add(core);
  }
  scene.add(chandelier);

  // pagoda-style tiered light over the west lounge (ref 2), built from glowing rods
  {
    const g = new THREE.Group();
    g.userData.noMerge = true;
    g.position.set(-17.3, 0, -1.2);
    const rodGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6);
    const tiers = [
      [1.6, 3.2, 28],
      [1.1, 3.55, 20],
    ];
    let count = 0;
    for (const [, , n] of tiers) count += n;
    const rods = new THREE.InstancedMesh(rodGeo, m.rodGlow, count);
    const mm = new THREE.Matrix4();
    let idx = 0;
    for (const [r, y, n] of tiers) {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        rods.setMatrixAt(idx++, mm.makeTranslation(Math.cos(a) * r, y, Math.sin(a) * r));
      }
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.15, r + 0.25, 0.06, 32), m.ceramicWhite);
      plate.position.y = y + 0.28;
      g.add(plate);
    }
    g.add(rods);
    scene.add(g);
  }

  return { seats, pois, lamps, tables, chandelier };
}

// Luggage trolley pushed by the bellhop (kept dynamic).
export function createLuggageCart(m) {
  const g = new THREE.Group();
  const add = (geo, mat, x, y, z) => {
    const o = new THREE.Mesh(geo, mat);
    o.position.set(x, y, z);
    o.castShadow = true;
    g.add(o);
    return o;
  };
  add(new THREE.BoxGeometry(0.62, 0.05, 1.05), m.brass, 0, 0.22, 0);
  add(new THREE.BoxGeometry(0.58, 0.02, 1.0), new THREE.MeshStandardMaterial({ color: 0x5a1e1e, roughness: 0.9 }), 0, 0.255, 0);
  for (const sx of [-0.27, 0.27]) {
    for (const sz of [-0.45, 0.45]) add(new THREE.CylinderGeometry(0.07, 0.07, 0.04, 12), m.blackMetal, sx, 0.08, sz).rotation.z = Math.PI / 2;
    add(new THREE.CylinderGeometry(0.018, 0.018, 1.6, 8), m.brass, sx, 1.02, -0.45);
  }
  const arch = add(new THREE.TorusGeometry(0.27, 0.018, 8, 24, Math.PI), m.brass, 0, 1.82, -0.45);
  arch.rotation.z = 0;
  add(new THREE.CylinderGeometry(0.015, 0.015, 0.54, 8), m.brass, 0, 1.55, -0.45).rotation.z = Math.PI / 2;
  const cases = [
    [0.5, 0.65, 0.22, 0x2d3a4a, 0, 0.6, -0.15],
    [0.42, 0.5, 0.2, 0x8a5a32, 0.02, 0.53, 0.18],
    [0.36, 0.26, 0.48, 0x1e1e1e, 0, 1.06, 0.0],
  ];
  for (const [w, h, d, col, x, y, z] of cases) {
    add(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: col, roughness: 0.6 }), x, y, z);
  }
  return g;
}
