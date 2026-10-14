import * as THREE from 'three';

// Lobby layout constants (metres). +z points to the entrance (south), -z to reception (north).
export const L = {
  W: 22, // half width  (x: -22 .. 22)
  D: 16, // half depth  (z: -16 .. 16)
  H: 10, // ceiling height
  MEZZ: 4.5, // mezzanine floor height
  SLAB: 0.4,
  AX: 12, // atrium half width
  AZS: 12, // atrium south edge (bridge above entrance from z=12..16)
  STAIR: { x0: 9.8, x1: 12, zBottom: 2.5, zTop: -5.5, zLanding: -7.5 },
  TEA: { x0: -21.8, x1: -15.2, z0: 6.6, z1: 15.6, h: 0.3 },
};

const _v = new THREE.Vector3();

export class CollisionWorld {
  constructor() {
    this.boxes = []; // movement blockers: {minX,maxX,minZ,maxZ,minY,maxY,cam}
    this.camBoxes = []; // extra camera-only blockers (slabs, ceilings)
  }

  add(minX, maxX, minZ, maxZ, minY = -1, maxY = 30, { cam = true, nav = true } = {}) {
    const b = { minX, maxX, minZ, maxZ, minY, maxY, cam, nav };
    this.boxes.push(b);
    return b;
  }

  addCentered(x, z, w, d, minY = -1, maxY = 30, opts) {
    return this.add(x - w / 2, x + w / 2, z - d / 2, z + d / 2, minY, maxY, opts);
  }

  addFromObject(obj, { pad = 0, minY, maxY, cam = false, nav = true } = {}) {
    obj.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(obj);
    return this.add(
      box.min.x - pad,
      box.max.x + pad,
      box.min.z - pad,
      box.max.z + pad,
      minY ?? box.min.y,
      maxY ?? box.max.y,
      { cam, nav },
    );
  }

  addCam(minX, maxX, minY, maxY, minZ, maxZ) {
    this.camBoxes.push({ minX, maxX, minY, maxY, minZ, maxZ });
  }

  isUpstairs(y) {
    return y > L.MEZZ * 0.5;
  }

  inStair(x, z) {
    const s = L.STAIR;
    return x > s.x0 && x < s.x1 && z < s.zBottom && z > s.zLanding;
  }

  stairHeight(z) {
    const s = L.STAIR;
    if (z <= s.zTop) return L.MEZZ;
    const t = (s.zBottom - z) / (s.zBottom - s.zTop);
    // quantise to steps for a subtle stepping motion, smoothed
    const steps = 25;
    const q = Math.round(t * steps) / steps;
    return THREE.MathUtils.lerp(t, q, 0.35) * L.MEZZ;
  }

  inMezzanine(x, z) {
    return (x < -L.AX || x > L.AX || z > L.AZS) && Math.abs(x) < L.W && Math.abs(z) < L.D;
  }

  groundHeight(x, z, currentY = 0) {
    if (this.inStair(x, z)) return this.stairHeight(z);
    if (this.isUpstairs(currentY) && this.inMezzanine(x, z)) return L.MEZZ;
    const t = L.TEA;
    if (!this.isUpstairs(currentY) && x > t.x0 && x < t.x1 && z > t.z0 && z < t.z1) return t.h;
    return 0;
  }

  // Push a circle (x,z,r) out of blocking boxes overlapping the body span [y+0.35, y+1.6].
  resolve(pos, radius, y) {
    const y0 = y + 0.35;
    const y1 = y + 1.6;
    for (let iter = 0; iter < 3; iter++) {
      let moved = false;
      for (const b of this.boxes) {
        if (b.maxY < y0 || b.minY > y1) continue;
        const cx = Math.max(b.minX, Math.min(pos.x, b.maxX));
        const cz = Math.max(b.minZ, Math.min(pos.z, b.maxZ));
        let dx = pos.x - cx;
        let dz = pos.z - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 > radius * radius) continue;
        if (d2 > 1e-8) {
          const d = Math.sqrt(d2);
          const push = radius - d;
          pos.x += (dx / d) * push;
          pos.z += (dz / d) * push;
        } else {
          // centre inside the box: exit along the shallowest axis
          const l = pos.x - b.minX;
          const r = b.maxX - pos.x;
          const f = pos.z - b.minZ;
          const k = b.maxZ - pos.z;
          const m = Math.min(l, r, f, k);
          if (m === l) pos.x = b.minX - radius;
          else if (m === r) pos.x = b.maxX + radius;
          else if (m === f) pos.z = b.minZ - radius;
          else pos.z = b.maxZ + radius;
        }
        moved = true;
      }
      if (!moved) break;
    }
  }

  // Distance along a ray before hitting a camera blocker (slab test on AABBs).
  raycastCamera(origin, dir, maxDist) {
    let best = maxDist;
    const test = (minX, maxX, minY, maxY, minZ, maxZ) => {
      let tmin = 0;
      let tmax = best;
      const o = [origin.x, origin.y, origin.z];
      const d = [dir.x, dir.y, dir.z];
      const mn = [minX, minY, minZ];
      const mx = [maxX, maxY, maxZ];
      for (let i = 0; i < 3; i++) {
        if (Math.abs(d[i]) < 1e-9) {
          if (o[i] < mn[i] || o[i] > mx[i]) return;
        } else {
          let t1 = (mn[i] - o[i]) / d[i];
          let t2 = (mx[i] - o[i]) / d[i];
          if (t1 > t2) [t1, t2] = [t2, t1];
          tmin = Math.max(tmin, t1);
          tmax = Math.min(tmax, t2);
          if (tmin > tmax) return;
        }
      }
      if (tmin > 0.05 && tmin < best) best = tmin;
    };
    for (const b of this.boxes) if (b.cam) test(b.minX, b.maxX, b.minY, b.maxY, b.minZ, b.maxZ);
    for (const b of this.camBoxes) test(b.minX, b.maxX, b.minY, b.maxY, b.minZ, b.maxZ);
    return best;
  }

  // Occupancy grid for NPC path finding on the ground floor.
  buildNavGrid(cell = 0.5, inflate = 0.45) {
    const nx = Math.ceil((L.W * 2) / cell);
    const nz = Math.ceil((L.D * 2) / cell);
    const grid = new Uint8Array(nx * nz);
    for (let iz = 0; iz < nz; iz++) {
      for (let ix = 0; ix < nx; ix++) {
        const x = -L.W + (ix + 0.5) * cell;
        const z = -L.D + (iz + 0.5) * cell;
        let blocked = Math.abs(x) > L.W - 0.6 || Math.abs(z) > L.D - 0.6;
        if (!blocked && this.inStair(x, z)) blocked = true;
        if (!blocked) {
          for (const b of this.boxes) {
            if (!b.nav || b.minY > 1.5 || b.maxY < 0.3) continue;
            if (x > b.minX - inflate && x < b.maxX + inflate && z > b.minZ - inflate && z < b.maxZ + inflate) {
              blocked = true;
              break;
            }
          }
        }
        grid[iz * nx + ix] = blocked ? 1 : 0;
      }
    }
    return { grid, nx, nz, cell };
  }
}

export function v3(x, y, z) {
  return _v.set(x, y, z);
}
