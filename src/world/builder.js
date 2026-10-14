import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Small helper for placing primitives. Coordinates are the object's centre unless noted.
export class Builder {
  constructor(parent, mats, world) {
    this.parent = parent;
    this.m = mats;
    this.world = world;
    this._geoCache = new Map();
  }

  _geo(key, make) {
    let g = this._geoCache.get(key);
    if (!g) {
      g = make();
      this._geoCache.set(key, g);
    }
    return g;
  }

  add(mesh, { x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0, cast = true, receive = true, parent, noMerge = false } = {}) {
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz);
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    if (noMerge) mesh.userData.noMerge = true;
    (parent || this.parent).add(mesh);
    return mesh;
  }

  box(w, h, d, mat, x, y, z, opts = {}) {
    const g = this._geo(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d));
    return this.add(new THREE.Mesh(g, mat), { x, y, z, ...opts });
  }

  // box resting on yBottom
  boxB(w, h, d, mat, x, yb, z, opts = {}) {
    return this.box(w, h, d, mat, x, yb + h / 2, z, opts);
  }

  // axis aligned box from min/max corners
  span(x0, x1, y0, y1, z0, z1, mat, opts = {}) {
    return this.box(x1 - x0, y1 - y0, z1 - z0, mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, opts);
  }

  rbox(w, h, d, r, mat, x, yb, z, opts = {}) {
    const g = this._geo(`r${w},${h},${d},${r}`, () => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2)));
    return this.add(new THREE.Mesh(g, mat), { x, y: yb + h / 2, z, ...opts });
  }

  cyl(rt, rb, h, mat, x, yb, z, seg = 24, opts = {}) {
    const g = this._geo(`c${rt},${rb},${h},${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg));
    return this.add(new THREE.Mesh(g, mat), { x, y: yb + h / 2, z, ...opts });
  }

  sphere(r, mat, x, y, z, seg = 16, opts = {}) {
    const g = this._geo(`s${r},${seg}`, () => new THREE.SphereGeometry(r, seg, Math.max(8, seg * 0.75)));
    return this.add(new THREE.Mesh(g, mat), { x, y, z, ...opts });
  }

  plane(w, h, mat, x, y, z, opts = {}) {
    const g = new THREE.PlaneGeometry(w, h);
    return this.add(new THREE.Mesh(g, mat), { cast: false, x, y, z, ...opts });
  }

  mesh(geo, mat, x, y, z, opts = {}) {
    return this.add(new THREE.Mesh(geo, mat), { x, y, z, ...opts });
  }

  group(x = 0, y = 0, z = 0, ry = 0, parent) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = ry;
    (parent || this.parent).add(g);
    return g;
  }

  // Temporarily build into another parent (e.g. a furniture group that is later rotated).
  into(parent, fn) {
    const prev = this.parent;
    this.parent = parent;
    try {
      fn();
    } finally {
      this.parent = prev;
    }
    return parent;
  }
}

// Merge every static mesh under `root` by material to cut draw calls.
export function mergeStatic(root) {
  root.updateMatrixWorld(true);
  const buckets = new Map();
  const remove = [];
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || o.userData.noMerge) return;
    let skip = false;
    o.traverseAncestors((a) => {
      if (a.userData && a.userData.noMerge) skip = true;
    });
    if (skip) return;
    const mat = o.material;
    if (Array.isArray(mat)) return;
    const key = `${mat.uuid}|${o.castShadow ? 1 : 0}|${o.receiveShadow ? 1 : 0}`;
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const name of Object.keys(g.attributes)) {
      if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
    }
    if (!g.attributes.uv) {
      g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    }
    if (!g.attributes.normal) g.computeVertexNormals();
    g.applyMatrix4(o.matrixWorld);
    if (!buckets.has(key)) buckets.set(key, { mat, cast: o.castShadow, receive: o.receiveShadow, geos: [] });
    buckets.get(key).geos.push(g);
    remove.push(o);
  });
  for (const o of remove) o.removeFromParent();
  const out = new THREE.Group();
  out.name = 'merged-static';
  for (const { mat, cast, receive, geos } of buckets.values()) {
    const merged = mergeGeometries(geos, false);
    if (!merged) continue;
    merged.computeBoundingSphere();
    merged.computeBoundingBox();
    const mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    mesh.matrixAutoUpdate = false;
    out.add(mesh);
  }
  // matrixWorld already baked; root may contain remaining (non merged) objects
  root.add(out);
  const empties = [];
  root.traverse((o) => {
    if (o.isGroup && o !== root && o !== out && o.children.length === 0) empties.push(o);
  });
  for (const o of empties) o.removeFromParent();
  return out;
}
