import { NPC } from './NPC.js';
import { LINES, pick } from './lines.js';

const SIT = {
  sofa: { approach: 0.95, seat: 0.28 },
  banquette: { approach: 0.85, seat: 0.12 },
  bench: { approach: 0.85, seat: 0.12 },
  chair: { approach: -0.8, seat: 0.0 },
};

const rand = (a, b) => a + Math.random() * (b - a);

// A hotel guest with a simple activity loop.
export class Guest extends NPC {
  constructor(mgr, key, opts) {
    super(mgr, key, opts);
    this.state = 'hidden';
    this.timer = rand(0.5, 6);
    this.activities = 0;
    this.seat = null;
    this.poi = null;
    this.spot = null;
    this.root.visible = false;
    this.reactT = 0;
    this.lookAtPlayerT = 0;
  }

  release() {
    if (this.seat) this.seat.taken = null;
    if (this.poi) this.poi.taken = null;
    if (this.spot) {
      this.spot.taken = null;
      this.mgr.onDeskFree(this.spot);
    }
    this.seat = this.poi = this.spot = null;
  }

  spawn(initial = false) {
    const m = this.mgr;
    this.release();
    this.root.visible = true;
    this.activities = 0;
    if (initial) {
      // start somewhere in the lobby already doing something
      const p = m.nav.randomFree({ x0: -18, x1: 18, z0: -7, z1: 13 });
      this.position.set(p.x, 0, p.z);
      this.setHeading(Math.random() * Math.PI * 2);
      this.next(true);
      return;
    }
    if (Math.random() < 0.65) {
      const x = rand(-1.4, 1.4);
      this.position.set(x, 0, 18.5);
      this.setHeading(Math.PI);
      this.state = 'walking';
      this.goTo(x * 0.5, 13.8, () => {
        this.mgr.onGuestEntered(this);
        this.next();
      }, { direct: true });
    } else {
      const ex = pick([-19.6, -15.6]);
      this.position.set(ex, 0, -15.1);
      this.setHeading(0);
      this.state = 'pause';
      this.timer = 0.6;
    }
  }

  next(initial = false) {
    const m = this.mgr;
    this.release();
    this.activities++;
    const opts = [];
    const freeSeats = this.rig === 'B' ? m.freeSeats() : [];
    if (freeSeats.length) opts.push(['sit', initial ? 7 : 5]);
    if (m.freePois().length) opts.push(['browse', 3]);
    if (m.freeDeskSpot() && !initial) opts.push(['desk', 1.4]);
    opts.push(['wander', 1.6]);
    if (this.activities > 3) opts.push(['leave', 0.8 + this.activities * 0.3]);
    let total = opts.reduce((s, o) => s + o[1], 0);
    let r = Math.random() * total;
    let choice = opts[0][0];
    for (const [k, w] of opts) {
      if ((r -= w) <= 0) {
        choice = k;
        break;
      }
    }
    this[`do_${choice}`](initial, freeSeats);
  }

  do_sit(initial, freeSeats) {
    const seat = pick(freeSeats);
    const cfg = SIT[seat.kind] || SIT.sofa;
    seat.taken = this;
    this.seat = seat;
    const fx = Math.sin(seat.ry);
    const fz = Math.cos(seat.ry);
    const ax = seat.x + fx * cfg.approach;
    const az = seat.z + fz * cfg.approach;
    this.sitPos = { x: seat.x + fx * cfg.seat, z: seat.z + fz * cfg.seat };
    if (initial) {
      // already seated when the page opens
      this.position.set(this.sitPos.x, 0, this.sitPos.z);
      this.setHeading(seat.ry);
      this.play('sit', { once: true, clamp: true, fade: 0 });
      this.current.time = this.current.getClip().duration - 0.05;
      this.state = 'sitting';
      this.timer = rand(8, 40);
      return;
    }
    this.state = 'walking';
    this.goTo(ax, az, (ok) => {
      if (!ok) return this.fail();
      this.state = 'sitAlign';
      this.timer = 0.6;
    });
  }

  do_browse() {
    const poi = pick(this.mgr.freePois());
    poi.taken = this;
    this.poi = poi;
    const jx = rand(-0.3, 0.3);
    const jz = rand(-0.3, 0.3);
    this.state = 'walking';
    this.goTo(poi.x + jx, poi.z + jz, (ok) => {
      if (!ok) return this.fail();
      this.state = 'browse';
      this.timer = rand(8, 16);
    });
  }

  do_desk() {
    const spot = this.mgr.freeDeskSpot();
    spot.taken = this;
    this.spot = spot;
    this.state = 'walking';
    this.goTo(spot.x, spot.z, (ok) => {
      if (!ok) return this.fail();
      this.state = 'desk';
      this.timer = rand(8, 13);
      this.say(pick(LINES.guestToDesk), 3);
      this.mgr.onDeskArrive(spot, this);
    });
  }

  do_wander() {
    const zones = [
      { x0: -11, x1: 11, z0: -8, z1: 13 },
      { x0: -21, x1: -13.5, z0: -8, z1: 5 },
      { x0: 13.5, x1: 21, z0: -9, z1: 14 },
    ];
    const p = this.mgr.nav.randomFree(pick(zones));
    this.state = 'walking';
    this.goTo(p.x, p.z, () => {
      this.state = 'pause';
      this.timer = rand(3, 7);
    });
  }

  do_leave() {
    this.state = 'walking';
    if (Math.random() < 0.6) {
      const x = rand(-1.2, 1.2);
      this.goTo(x, 14.6, (ok) => {
        if (!ok) return this.hide();
        this.goTo(x, 18.6, () => this.hide(), { direct: true });
      });
    } else {
      const ex = pick([-19.6, -15.6]);
      this.goTo(ex, -15.0, (ok) => {
        if (!ok) return this.hide();
        this.state = 'elevator';
        this.timer = 2.2;
      });
    }
  }

  fail() {
    this.release();
    this.state = 'pause';
    this.timer = rand(0.8, 2);
  }

  hide() {
    this.release();
    this.stopMoving();
    this.root.visible = false;
    this.state = 'hidden';
    this.timer = rand(4, 14);
  }

  // Player waved or said hello
  react(player, kind) {
    if (!this.root.visible) return;
    const d = this.position.distanceTo(player.position);
    if (d > 8) return;
    this.reactT = kind === 'talk' ? 0 : rand(0.2, 0.9);
    this.reactKind = kind;
  }

  update(dt, player) {
    if (this.state === 'hidden') {
      this.timer -= dt;
      if (this.timer <= 0) this.spawn(false);
      return;
    }
    if (this.reactT > 0) {
      this.reactT -= dt;
      if (this.reactT <= 0) this.doReact(player);
    } else if (this.reactKind) this.doReact(player);

    switch (this.state) {
      case 'walking':
        this.updateMove(dt, player);
        break;
      case 'pause':
        this.timer -= dt;
        this.idle();
        if (this.timer <= 0) this.next();
        break;
      case 'browse':
        this.timer -= dt;
        this.turnTowards(this.poi ? this.poi.ry : this.heading, dt, 3);
        this.idle();
        if (this.timer <= 0) this.next();
        break;
      case 'desk':
        this.timer -= dt;
        this.turnTowards(Math.PI, dt, 4);
        this.idle();
        if (this.timer <= 0) {
          if (Math.random() < 0.5) {
            this.release();
            this.do_leave();
          } else this.next();
        }
        break;
      case 'sitAlign': {
        this.turnTowards(this.seat.ry, dt, 6);
        const d = this.slideTo(this.sitPos.x, this.sitPos.z, dt, 6);
        this.idle();
        this.timer -= dt;
        if (this.timer <= 0 && d < 0.08) {
          this.position.x = this.sitPos.x;
          this.position.z = this.sitPos.z;
          this.setHeading(this.seat.ry);
          this.state = 'sitting';
          this.timer = rand(30, 70);
          this.play('sit', { once: true, clamp: true, fade: 0.3 });
        }
        break;
      }
      case 'sitting':
        this.timer -= dt;
        if (this.timer <= 0) {
          this.state = 'standing';
          this.play('stand', {
            once: true,
            clamp: true,
            fade: 0.2,
            onDone: () => {
              this.state = 'leaveSeat';
              this.timer = 0.7;
            },
          });
        }
        break;
      case 'standing':
        break;
      case 'leaveSeat': {
        const cfg = SIT[this.seat?.kind] || SIT.sofa;
        const s = this.seat;
        if (s) {
          const tx = s.x + Math.sin(s.ry) * cfg.approach;
          const tz = s.z + Math.cos(s.ry) * cfg.approach;
          this.slideTo(tx, tz, dt, 4);
          this.play('walk', { fade: 0.25 });
          this.setTimeScale(0.6);
        }
        this.timer -= dt;
        if (this.timer <= 0) this.next();
        break;
      }
      case 'elevator':
        this.timer -= dt;
        this.turnTowards(Math.PI, dt, 4);
        this.idle();
        if (this.timer <= 0) this.hide();
        break;
      default:
        break;
    }
  }

  idle() {
    if (!this.oneShot) this.play(this.idleName, { fade: 0.35 });
  }

  doReact(player) {
    const kind = this.reactKind;
    this.reactKind = null;
    const busy = this.state === 'walking' || this.state === 'standing' || this.state === 'sitAlign';
    const seated = this.state === 'sitting';
    if (kind === 'wave') {
      if (!busy && !seated && this.rig === 'A' && !this.oneShot) {
        this.facePlayerAndHold(player);
        this.play('wave', { once: true, fade: 0.2, onDone: () => this.play(this.idleName, { fade: 0.3 }) });
      }
      this.say(pick(LINES.guestWaveBack), 2.2);
    } else {
      if (!busy && !seated) this.facePlayerAndHold(player);
      this.say(pick(LINES.guestSmallTalk), 3.5);
    }
  }

  facePlayerAndHold(player) {
    this.setHeading(this.faceAngleTo(player.position.x, player.position.z));
    if (this.state === 'pause' || this.state === 'browse') this.timer = Math.max(this.timer, 3);
  }
}
