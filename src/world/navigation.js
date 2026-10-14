import { L } from '../core/collision.js';

// Ground-floor occupancy grid + A* path finding for NPCs.
export class NavGrid {
  constructor(world) {
    const { grid, nx, nz, cell } = world.buildNavGrid(0.5, 0.42);
    this.grid = grid;
    this.nx = nx;
    this.nz = nz;
    this.cell = cell;
    const n = nx * nz;
    this.g = new Float32Array(n);
    this.f = new Float32Array(n);
    this.came = new Int32Array(n);
    this.stamp = new Uint32Array(n);
    this.closed = new Uint32Array(n);
    this.gen = 1;
    this.heap = new Int32Array(n * 8);
  }

  toCell(x, z) {
    const ix = Math.max(0, Math.min(this.nx - 1, Math.floor((x + L.W) / this.cell)));
    const iz = Math.max(0, Math.min(this.nz - 1, Math.floor((z + L.D) / this.cell)));
    return [ix, iz];
  }

  center(ix, iz) {
    return { x: -L.W + (ix + 0.5) * this.cell, z: -L.D + (iz + 0.5) * this.cell };
  }

  free(ix, iz) {
    return ix >= 0 && iz >= 0 && ix < this.nx && iz < this.nz && this.grid[iz * this.nx + ix] === 0;
  }

  freeAt(x, z) {
    const [ix, iz] = this.toCell(x, z);
    return this.free(ix, iz);
  }

  nearestFree(ix, iz, maxR = 12) {
    if (this.free(ix, iz)) return [ix, iz];
    for (let r = 1; r <= maxR; r++) {
      let best = null;
      let bd = Infinity;
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          if (this.free(ix + dx, iz + dz)) {
            const d = dx * dx + dz * dz;
            if (d < bd) {
              bd = d;
              best = [ix + dx, iz + dz];
            }
          }
        }
      }
      if (best) return best;
    }
    return null;
  }

  // Line of sight across free cells (samples every quarter cell).
  los(ax, az, bx, bz) {
    const d = Math.hypot(bx - ax, bz - az);
    const steps = Math.ceil(d / (this.cell * 0.25));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (!this.freeAt(ax + (bx - ax) * t, az + (bz - az) * t)) return false;
    }
    return true;
  }

  findPath(sx, sz, tx, tz) {
    let s = this.nearestFree(...this.toCell(sx, sz));
    let t = this.nearestFree(...this.toCell(tx, tz));
    if (!s || !t) return null;
    const nx = this.nx;
    const start = s[1] * nx + s[0];
    const goal = t[1] * nx + t[0];
    const gen = ++this.gen;
    const { g, f, came, stamp, closed, heap } = this;
    let hs = 0;
    const h = (i) => {
      const dx = Math.abs((i % nx) - t[0]);
      const dz = Math.abs(((i / nx) | 0) - t[1]);
      return (dx + dz + (Math.SQRT2 - 2) * Math.min(dx, dz)) * this.cell;
    };
    const push = (i) => {
      let k = hs++;
      heap[k] = i;
      while (k > 0) {
        const p = (k - 1) >> 1;
        if (f[heap[p]] <= f[heap[k]]) break;
        [heap[p], heap[k]] = [heap[k], heap[p]];
        k = p;
      }
    };
    const pop = () => {
      const top = heap[0];
      heap[0] = heap[--hs];
      let k = 0;
      for (;;) {
        const l = k * 2 + 1;
        const r = l + 1;
        let m = k;
        if (l < hs && f[heap[l]] < f[heap[m]]) m = l;
        if (r < hs && f[heap[r]] < f[heap[m]]) m = r;
        if (m === k) break;
        [heap[m], heap[k]] = [heap[k], heap[m]];
        k = m;
      }
      return top;
    };
    stamp[start] = gen;
    g[start] = 0;
    f[start] = h(start);
    came[start] = -1;
    push(start);
    let found = false;
    let iter = 0;
    while (hs > 0 && iter++ < 20000) {
      const cur = pop();
      if (closed[cur] === gen) continue;
      closed[cur] = gen;
      if (cur === goal) {
        found = true;
        break;
      }
      const cx = cur % nx;
      const cz = (cur / nx) | 0;
      for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dz) continue;
          const ex = cx + dx;
          const ez = cz + dz;
          if (!this.free(ex, ez)) continue;
          if (dx && dz && (!this.free(cx + dx, cz) || !this.free(cx, cz + dz))) continue;
          const ni = ez * nx + ex;
          if (closed[ni] === gen) continue;
          const cost = g[cur] + (dx && dz ? Math.SQRT2 : 1) * this.cell;
          if (stamp[ni] !== gen || cost < g[ni]) {
            stamp[ni] = gen;
            g[ni] = cost;
            f[ni] = cost + h(ni);
            came[ni] = cur;
            if (hs < heap.length) push(ni);
          }
        }
      }
    }
    if (!found) return null;
    const cells = [];
    for (let i = goal; i !== -1; i = came[i]) cells.push(i);
    cells.reverse();
    const pts = cells.map((i) => this.center(i % nx, (i / nx) | 0));
    // replace last point with exact target when it is reachable in a straight line
    const end = { x: tx, z: tz };
    if (this.los(pts[pts.length - 1].x, pts[pts.length - 1].z, tx, tz) || Math.hypot(pts[pts.length - 1].x - tx, pts[pts.length - 1].z - tz) < 0.9) {
      pts.push(end);
    }
    // string-pull smoothing
    const out = [{ x: sx, z: sz }];
    let anchor = out[0];
    for (let i = 1; i < pts.length; i++) {
      const next = pts[i + 1];
      if (next && this.los(anchor.x, anchor.z, next.x, next.z)) continue;
      out.push(pts[i]);
      anchor = pts[i];
    }
    out.shift();
    return out;
  }

  randomFree(rect) {
    for (let i = 0; i < 60; i++) {
      const x = rect ? rect.x0 + Math.random() * (rect.x1 - rect.x0) : -L.W + Math.random() * L.W * 2;
      const z = rect ? rect.z0 + Math.random() * (rect.z1 - rect.z0) : -L.D + Math.random() * L.D * 2;
      if (this.freeAt(x, z)) return { x, z };
    }
    return { x: 0, z: 8 };
  }
}
