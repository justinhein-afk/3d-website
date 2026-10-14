import { NPC } from './NPC.js';
import { wrapAngle } from './Character.js';
import { LINES, pick } from './lines.js';

const rand = (a, b) => a + Math.random() * (b - a);

// Hotel staff: stationary hosts (reception, concierge, tea) and roaming roles (bellhop, waiter).
export class Staff extends NPC {
  constructor(mgr, key, opts) {
    super(mgr, key, { ...opts, walkSpeed: opts.walkSpeed ?? 1.1 });
    this.roleId = opts.roleId;
    this.home = opts.home;
    this.greetLines = opts.greet || LINES.staffGreet;
    this.turnLimit = opts.turnLimit ?? Math.PI;
    this.greetCD = rand(0, 3);
    this.engaged = false;
    this.serving = null;
    this.serveT = 0;
    this.task = null;
    this.timer = rand(3, 8);
    this.route = opts.route || null;
    this.routeI = 0;
    this.position.set(this.home.x, 0, this.home.z);
    this.setHeading(this.home.ry);
    this.attachLabel(this.rig === 'A' ? 2.02 : 2.0);
    this.play(this.idleName);
    this.state = 'home';
  }

  engage(player) {
    this.engaged = true;
    this.engagePlayer = player;
    if (!this.oneShot && !this.moving) this.play('interact', { once: true, fade: 0.2, onDone: () => this.play(this.idleName, { fade: 0.3 }) });
  }

  disengage() {
    this.engaged = false;
  }

  serve(guest) {
    this.serving = guest;
    this.serveT = 1.2;
  }

  canGreet(player) {
    return this.greetCD <= 0 && !this.engaged && !this.moving && !this.oneShot;
  }

  greet(player) {
    this.greetCD = rand(35, 50);
    this.setHeading(this.clampToHome(this.faceAngleTo(player.position.x, player.position.z)));
    this.play('wave', { once: true, fade: 0.2, onDone: () => this.play(this.idleName, { fade: 0.35 }) });
    this.say(pick(this.greetLines), 3.6);
  }

  clampToHome(a) {
    const d = wrapAngle(a - this.home.ry);
    return this.home.ry + Math.max(-this.turnLimit, Math.min(this.turnLimit, d));
  }

  // Stationary behaviour: face whoever is nearby, otherwise face the default direction.
  hostIdle(dt, player) {
    const dx = player.position.x - this.position.x;
    const dz = player.position.z - this.position.z;
    const d = Math.hypot(dx, dz);
    const sameFloor = Math.abs(player.position.y - this.position.y) < 1.2;
    let targetRy = this.home.ry;
    if (this.engaged) targetRy = this.clampToHome(Math.atan2(dx, dz));
    else if (this.serving && this.serving.root.visible) {
      targetRy = this.clampToHome(this.faceAngleTo(this.serving.position.x, this.serving.position.z));
      this.serveT -= dt;
      if (this.serveT <= 0) {
        this.serveT = rand(3.5, 5.5);
        if (!this.oneShot) this.play('interact', { once: true, fade: 0.25, onDone: () => this.play(this.idleName, { fade: 0.3 }) });
        if (Math.random() < 0.6) this.say(pick(LINES.receptionServe), 3.2);
      }
    } else if (sameFloor && d < 4.2) {
      targetRy = this.clampToHome(Math.atan2(dx, dz));
      const facing = Math.abs(wrapAngle(Math.atan2(-dx, -dz) - player.heading)) < 1.7;
      if (facing && this.canGreet(player)) this.greet(player);
    }
    this.turnTowards(targetRy, dt, 3.2);
    if (!this.oneShot) this.play(this.idleName, { fade: 0.35 });
  }

  update(dt, player) {
    this.greetCD -= dt;
    switch (this.roleId) {
      case 'bellhop':
        return this.updateBellhop(dt, player);
      case 'waiter':
        return this.updateWaiter(dt, player);
      default:
        return this.hostIdle(dt, player);
    }
  }

  // Bellhop pushes a luggage trolley around a loop with pauses.
  updateBellhop(dt, player) {
    if (this.moving) {
      this.updateMove(dt, player);
      return;
    }
    if (this.state === 'wait') {
      this.timer -= dt;
      const stop = this.route[this.routeI];
      this.turnTowards(stop.ry, dt, 2.5);
      if (player && this.position.distanceTo(player.position) < 3.6 && this.canGreet(player)) this.greet(player);
      if (!this.oneShot) this.play(this.idleName, { fade: 0.35 });
      if (this.timer <= 0) {
        this.routeI = (this.routeI + 1) % this.route.length;
        const n = this.route[this.routeI];
        this.state = 'walk';
        this.goTo(n.x, n.z, () => {
          this.state = 'wait';
          this.timer = n.wait ?? rand(4, 8);
        }, { speed: 0.95 });
      }
      return;
    }
    this.state = 'wait';
    this.timer = 2;
  }

  // Waiter shuttles between the bar and tables, or brings the player's order.
  updateWaiter(dt, player) {
    if (this.moving) {
      this.updateMove(dt, player);
      return;
    }
    const m = this.mgr;
    switch (this.state) {
      case 'home': {
        this.hostIdle(dt, player);
        this.timer -= dt;
        if (this.task && this.task.type === 'player') {
          const t = this.task;
          const dx = this.position.x - player.position.x;
          const dz = this.position.z - player.position.z;
          const d = Math.hypot(dx, dz) || 1;
          this.state = 'toTarget';
          this.goTo(player.position.x + (dx / d) * 1.0, player.position.z + (dz / d) * 1.0, () => {
            this.state = 'serving';
            this.timer = 2.6;
            this.setHeading(this.faceAngleTo(player.position.x, player.position.z));
            this.play('interact', { once: true, fade: 0.2 });
            this.say(`Your ${t.item.name} — enjoy!`, 3.5);
            if (t.onServed) t.onServed();
          });
        } else if (this.timer <= 0) {
          const table = m.pickTableForWaiter();
          if (!table) {
            this.timer = 4;
            break;
          }
          const ax = table.x - 1.25;
          const az = table.z + 0.4;
          this.state = 'toTarget';
          this.task = { type: 'table', table };
          this.goTo(ax, az, (ok) => {
            this.state = 'serving';
            this.timer = 2.8;
            if (ok) {
              this.setHeading(this.faceAngleTo(table.x, table.z));
              this.play('interact', { once: true, fade: 0.2 });
              if (Math.random() < 0.7) this.say(pick(LINES.waiterServe), 3);
            }
          });
        }
        break;
      }
      case 'serving':
        this.timer -= dt;
        if (!this.oneShot) this.play(this.idleName, { fade: 0.3 });
        if (this.timer <= 0) {
          this.task = null;
          this.state = 'returning';
          this.goTo(this.home.x, this.home.z, () => {
            this.state = 'home';
            this.timer = rand(5, 10);
          });
        }
        break;
      case 'returning':
      case 'toTarget':
        // path failed → reset
        this.state = 'home';
        this.timer = rand(3, 6);
        break;
      default:
        this.state = 'home';
    }
  }
}
