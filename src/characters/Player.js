import * as THREE from 'three';
import { Character } from './Character.js';

const WALK_REF = 1.5; // m/s at animation timeScale 1
const RUN_REF = 4.2;

export class Player extends Character {
  constructor(assets, modelKey) {
    super(assets, modelKey, { name: 'You', role: 'Guest' });
    this.walkSpeed = 1.7;
    this.runSpeed = 4.3;
    this.vel = new THREE.Vector3();
    this.y = 0;
    this.waving = false;
    this.firstPerson = false;
    this.locked = false; // movement frozen (dialogs)
    this.play(this.idleName);
  }

  setFirstPerson(v) {
    this.firstPerson = v;
    this.model.visible = !v;
  }

  wave() {
    if (this.waving) return;
    this.waving = true;
    this.play('wave', {
      once: true,
      fade: 0.2,
      onDone: () => {
        this.waving = false;
        this.play(this.idleName, { fade: 0.3 });
      },
    });
  }

  update(dt, input, camYaw, world, npcs) {
    const ax = this.locked ? { x: 0, y: 0 } : input.axes();
    const run = input.running();
    const fx = -Math.sin(camYaw);
    const fz = -Math.cos(camYaw);
    const rx = Math.cos(camYaw);
    const rz = -Math.sin(camYaw);
    let dx = fx * ax.y + rx * ax.x;
    let dz = fz * ax.y + rz * ax.x;
    const mag = Math.hypot(dx, dz);
    let speed = 0;
    if (mag > 0.05) {
      dx /= mag;
      dz /= mag;
      speed = (run ? this.runSpeed : this.walkSpeed) * Math.min(1, mag);
      if (this.waving) {
        this.waving = false;
        this.oneShot = null;
      }
    }
    const k = 1 - Math.exp(-(speed > 0 ? 10 : 14) * dt);
    this.vel.x += (dx * speed - this.vel.x) * k;
    this.vel.z += (dz * speed - this.vel.z) * k;

    const p = this.position;
    p.x += this.vel.x * dt;
    p.z += this.vel.z * dt;
    world.resolve(p, this.radius, this.y);
    // gently push out of NPCs
    for (const n of npcs) {
      if (!n.root.visible || Math.abs(n.position.y - this.y) > 1) continue;
      const ddx = p.x - n.position.x;
      const ddz = p.z - n.position.z;
      const d = Math.hypot(ddx, ddz);
      const min = this.radius + n.radius;
      if (d < min && d > 1e-4) {
        p.x += (ddx / d) * (min - d);
        p.z += (ddz / d) * (min - d);
      }
    }
    world.resolve(p, this.radius, this.y);

    const gh = world.groundHeight(p.x, p.z, this.y);
    this.y += (gh - this.y) * Math.min(1, dt * 14);
    if (Math.abs(gh - this.y) < 0.002) this.y = gh;
    p.y = this.y;

    const hs = Math.hypot(this.vel.x, this.vel.z);
    if (this.firstPerson) this.setHeading(camYaw + Math.PI);
    else if (hs > 0.15) this.turnTowards(Math.atan2(this.vel.x, this.vel.z), dt, 11);

    if (!this.waving) {
      if (hs < 0.18) this.play(this.idleName, { fade: 0.25 });
      else if (hs < 2.7) {
        this.play('walk', { fade: 0.2 });
        this.setTimeScale(Math.max(0.5, hs / WALK_REF));
      } else {
        this.play('run', { fade: 0.2 });
        this.setTimeScale(Math.max(0.7, hs / RUN_REF));
      }
    }
    this.updateMixer(dt, 1);
    this.speed = hs;
  }
}
