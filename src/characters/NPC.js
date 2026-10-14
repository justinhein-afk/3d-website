import * as THREE from 'three';
import { Character, wrapAngle } from './Character.js';

const WALK_REF = { A: 1.5, B: 1.3 };

// Character that can follow a nav-grid path with simple crowd avoidance.
export class NPC extends Character {
  constructor(mgr, key, opts = {}) {
    super(mgr.assets, key, opts);
    this.mgr = mgr;
    this.walkSpeed = opts.walkSpeed ?? 1.15 + Math.random() * 0.25;
    this.vel = new THREE.Vector3();
    this.path = null;
    this.pathI = 0;
    this.onArrive = null;
    this.moveSpeed = this.walkSpeed;
    this.arriveDist = 0.18;
    this.stuckT = 0;
    this.bestD = Infinity;
    this.lod = 1;
    this.speed = 0;
  }

  goTo(x, z, onArrive, { speed, arriveDist = 0.18, direct = false } = {}) {
    let path = direct ? [{ x, z }] : this.mgr.nav.findPath(this.position.x, this.position.z, x, z);
    if (!path || !path.length) {
      this.path = null;
      if (onArrive) onArrive(false);
      return false;
    }
    this.path = path;
    this.pathI = 0;
    this.onArrive = onArrive;
    this.moveSpeed = speed ?? this.walkSpeed;
    this.arriveDist = arriveDist;
    this.stuckT = 0;
    this.bestD = Infinity;
    this.finalX = x;
    this.finalZ = z;
    return true;
  }

  stopMoving() {
    this.path = null;
    this.onArrive = null;
    this.vel.set(0, 0, 0);
  }

  get moving() {
    return !!this.path;
  }

  // Returns true while walking.
  updateMove(dt, player) {
    if (!this.path) {
      this.vel.multiplyScalar(Math.max(0, 1 - dt * 10));
      this.speed = this.vel.length();
      return false;
    }
    const p = this.position;
    const tgt = this.path[this.pathI];
    const dx = tgt.x - p.x;
    const dz = tgt.z - p.z;
    const d = Math.hypot(dx, dz);
    const last = this.pathI === this.path.length - 1;
    if (d < (last ? this.arriveDist : 0.4)) {
      if (last) {
        this.path = null;
        this.vel.set(0, 0, 0);
        this.speed = 0;
        const cb = this.onArrive;
        this.onArrive = null;
        if (cb) cb(true);
        return false;
      }
      this.pathI++;
      return true;
    }
    let sp = this.moveSpeed;
    if (last && d < 0.9) sp *= Math.max(0.4, d / 0.9);
    let vx = (dx / d) * sp;
    let vz = (dz / d) * sp;

    // separation from other people
    const sep = this.mgr.separation(this);
    vx += sep.x;
    vz += sep.z;
    // yield to the player when they are right in front
    if (player) {
      const px = player.position.x - p.x;
      const pz = player.position.z - p.z;
      const pd = Math.hypot(px, pz);
      if (pd < 1.4 && Math.abs(player.position.y - p.y) < 1) {
        const ahead = (px * vx + pz * vz) / (pd * Math.max(0.01, Math.hypot(vx, vz)));
        if (ahead > 0.6) {
          // step to the side
          vx += (-pz / pd) * 0.6;
          vz += (px / pd) * 0.6;
          vx *= 0.6;
          vz *= 0.6;
        }
      }
    }
    const k = 1 - Math.exp(-dt * 8);
    this.vel.x += (vx - this.vel.x) * k;
    this.vel.z += (vz - this.vel.z) * k;
    p.x += this.vel.x * dt;
    p.z += this.vel.z * dt;
    const hs = Math.hypot(this.vel.x, this.vel.z);
    this.speed = hs;
    if (hs > 0.05) this.turnTowards(Math.atan2(this.vel.x, this.vel.z), dt, 7);
    this.play('walk', { fade: 0.3 });
    this.setTimeScale(Math.max(0.55, hs / WALK_REF[this.rig]));

    // stuck detection against the final destination
    const fd = Math.hypot(this.finalX - p.x, this.finalZ - p.z);
    if (fd < this.bestD - 0.15) {
      this.bestD = fd;
      this.stuckT = 0;
    } else {
      this.stuckT += dt;
      if (this.stuckT > 4) {
        const cb = this.onArrive;
        this.path = null;
        this.onArrive = null;
        if (cb) cb(false);
        return false;
      }
    }
    return true;
  }

  // Smoothly slide to a point (used to settle into seats / spots)
  slideTo(x, z, dt, rate = 5) {
    const k = 1 - Math.exp(-dt * rate);
    this.position.x += (x - this.position.x) * k;
    this.position.z += (z - this.position.z) * k;
    return Math.hypot(x - this.position.x, z - this.position.z);
  }

  angleTo(target) {
    return wrapAngle(this.faceAngleTo(target.position ? target.position.x : target.x, target.position ? target.position.z : target.z) - this.heading);
  }
}
