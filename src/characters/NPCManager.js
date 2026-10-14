import * as THREE from 'three';
import { Staff } from './Staff.js';
import { Guest } from './Guest.js';
import { LINES, pick } from './lines.js';
import { createLuggageCart } from '../world/furniture.js';

const NAVY = '#1f2a3d';
const GOLD = '#b8893e';

// Staff roster. Positions are in lobby coordinates (see core/collision.js).
const STAFF = [
  {
    id: 'mei',
    key: 'woman_a',
    name: 'Mei',
    role: 'Front Desk',
    roleId: 'reception',
    home: { x: -3, z: -11.75, ry: 0 },
    tints: { Orange: NAVY, Hair_Blond: '#2b1a10' },
    turnLimit: 1.3,
    greet: LINES.receptionGreet,
    desk: 0,
  },
  {
    id: 'kenji',
    key: 'business_man',
    name: 'Kenji',
    role: 'Front Desk Manager',
    roleId: 'reception',
    home: { x: 0, z: -11.75, ry: 0 },
    tints: { Suit: NAVY, Tie: GOLD },
    turnLimit: 1.3,
    greet: LINES.receptionGreet,
    desk: 1,
  },
  {
    id: 'sofia',
    key: 'woman_b',
    name: 'Sofia',
    role: 'Front Desk',
    roleId: 'reception',
    home: { x: 3, z: -11.75, ry: 0 },
    tints: { LimeGreen: NAVY },
    turnLimit: 1.3,
    greet: LINES.receptionGreet,
    desk: 2,
  },
  {
    id: 'haruto',
    key: 'business_man',
    name: 'Haruto',
    role: 'Concierge',
    roleId: 'concierge',
    home: { x: -3.6, z: 10.3, ry: 0 },
    tints: { Suit: '#4a1a1f', Tie: GOLD, Hair: '#111111' },
    greet: LINES.conciergeGreet,
  },
  {
    id: 'yuki',
    key: 'woman_b',
    name: 'Yuki',
    role: 'Tea Master',
    roleId: 'tea',
    home: { x: -14.55, z: 9.3, ry: Math.PI / 2 },
    tints: { LimeGreen: '#2e5b57', Red: '#1a1210' },
    greet: LINES.teaGreet,
  },
  {
    id: 'luca',
    key: 'business_man',
    name: 'Luca',
    role: 'Café Host',
    roleId: 'waiter',
    home: { x: 13.4, z: -10.2, ry: 0.4 },
    tints: { Suit: '#efe9dd', Tie: '#151515', Hair: '#3b2414' },
    greet: LINES.waiterGreet,
  },
  {
    id: 'taro',
    key: 'worker',
    name: 'Taro',
    role: 'Bellhop',
    roleId: 'bellhop',
    home: { x: 3.2, z: 13.4, ry: Math.PI },
    tints: { Worker_Yellow: '#7a1f24', Worker_Vest: '#7a1f24', Grey: GOLD, LightBrown: '#1c1c1c' },
    greet: LINES.bellhopGreet,
    route: [
      { x: 3.2, z: 13.4, ry: 0, wait: 9 },
      { x: -9.8, z: 9.6, ry: -Math.PI / 2, wait: 3 },
      { x: -17.6, z: -11.2, ry: Math.PI, wait: 7 },
      { x: -10.5, z: -6.5, ry: Math.PI / 2, wait: 2 },
      { x: 4.5, z: 10.8, ry: 0, wait: 3 },
    ],
  },
];

const GUEST_TYPES = [
  { key: 'man_suit', tints: { Shirt: ['#2a2f3a', '#4b3b2e', '#1d1d1d', '#5a5f66', '#3c2a3a'] } },
  { key: 'woman_dress', tints: { Dress: ['#6e1a1a', '#1f3a5a', '#2d5a3a', '#c98b5a', '#151515', '#7a5a8a'] } },
  { key: 'woman_casual', tints: { Shirt: ['#e8e2d6', '#9db0c4', '#c46a4f', '#3b5b4a'], Pants: ['#22252b', '#4a3b2e', '#2f3b4f'] } },
  { key: 'woman', tints: { Jacket: ['#6e1a2a', '#1f3a5a', '#3a3a3a', '#8a6a3a'], LightJacket: ['#e0d4c0', '#c4a484', '#9db0c4'] } },
  { key: 'man_suit', tints: { Shirt: ['#6a5a48', '#2a3a4a', '#8a8070'] } },
  { key: 'woman_dress', tints: { Dress: ['#e8dcc8', '#a8333a', '#2a4a6a'] } },
  { key: 'casual', tints: { White: ['#e8e2d6', '#9db0c4', '#c46a4f', '#2f3b4f', '#6d7a4a'] } },
  { key: 'adventurer', tints: {} },
  { key: 'woman_a', tints: { Orange: ['#c46a4f', '#3d4a5c', '#7a6a52', '#2b2b2b'], White: ['#f2efe8', '#d9c9b0'] } },
  { key: 'business_man', tints: { Suit: ['#55585e', '#3a3226', '#202833'], Tie: ['#8a2a2a', '#2a4a6a', '#c9a25a'] } },
  { key: 'woman_casual', tints: { Shirt: ['#d98a6a', '#f2efe8'], Pants: ['#3b4a6a'] } },
  { key: 'woman_b', tints: { LimeGreen: ['#7a2a3a', '#2a3a5a', '#c9a25a', '#f0ece2'] } },
  { key: 'woman', tints: {} },
  { key: 'man_suit', tints: { Shirt: ['#1d1d1d'] } },
];

const _sep = new THREE.Vector3();

export class NPCManager {
  constructor({ scene, assets, nav, furn, materials }) {
    this.scene = scene;
    this.assets = assets;
    this.nav = nav;
    this.furn = furn;
    this.staff = [];
    this.guests = [];
    this.all = [];
    this.seats = furn.seats;
    this.pois = furn.pois.map((p) => ({ ...p, taken: null }));
    this.desk = [-3, 0, 3].map((x, i) => ({ x, z: -9.35, i, taken: null }));
    this.tables = furn.tables;
    this.materials = materials;
  }

  spawnStaff() {
    for (const s of STAFF) {
      const npc = new Staff(this, s.key, s);
      npc.id = s.id;
      npc.desk = s.desk;
      this.scene.add(npc.root);
      this.staff.push(npc);
      this.all.push(npc);
      if (s.roleId === 'bellhop') {
        const cart = createLuggageCart(this.materials);
        cart.position.set(0, 0, 0.95);
        npc.root.add(cart);
        npc.cart = cart;
        npc.radius = 0.55;
      }
    }
  }

  setGuestCount(n) {
    while (this.guests.length < n) {
      const t = GUEST_TYPES[this.guests.length % GUEST_TYPES.length];
      const tints = {};
      for (const [mat, opts] of Object.entries(t.tints)) tints[mat] = pick(opts);
      const g = new Guest(this, t.key, { tints, heightJitter: 0.06 });
      this.scene.add(g.root);
      this.guests.push(g);
      this.all.push(g);
      if (this.guests.length <= Math.ceil(n * 0.75)) g.spawn(true);
    }
    while (this.guests.length > n) {
      const g = this.guests.pop();
      g.release();
      g.root.removeFromParent();
      this.all.splice(this.all.indexOf(g), 1);
    }
  }

  freeSeats() {
    return this.seats.filter((s) => !s.taken);
  }

  freePois() {
    return this.pois.filter((p) => !p.taken);
  }

  freeDeskSpot() {
    return this.desk.find((d) => !d.taken) || null;
  }

  receptionistFor(spot) {
    return this.staff.find((s) => s.roleId === 'reception' && s.desk === spot.i);
  }

  onDeskArrive(spot, guest) {
    const r = this.receptionistFor(spot);
    if (r) r.serve(guest);
  }

  onDeskFree(spot) {
    const r = this.receptionistFor(spot);
    if (r) r.serving = null;
  }

  onGuestEntered(guest) {
    const c = this.staff.find((s) => s.roleId === 'concierge');
    if (c && !c.engaged && !c.oneShot && Math.random() < 0.5 && c.greetCD < 20) {
      c.setHeading(c.faceAngleTo(guest.position.x, guest.position.z));
      c.play('wave', { once: true, fade: 0.2, onDone: () => c.play(c.idleName, { fade: 0.3 }) });
      c.say(pick(LINES.conciergeWelcomeGuest), 3);
    }
  }

  pickTableForWaiter() {
    const busy = this.seats.filter((s) => s.kind === 'chair' && s.taken && s.taken.state === 'sitting');
    if (busy.length && Math.random() < 0.8) {
      const s = pick(busy);
      let best = null;
      let bd = Infinity;
      for (const t of this.tables) {
        const d = Math.hypot(t.x - s.x, t.z - s.z);
        if (d < bd) {
          bd = d;
          best = t;
        }
      }
      return best;
    }
    return Math.random() < 0.5 ? pick(this.tables) : null;
  }

  waiterServePlayer(player, item, onServed) {
    const w = this.staff.find((s) => s.roleId === 'waiter');
    if (!w) return;
    w.task = { type: 'player', item, onServed };
    if (w.state !== 'home') {
      w.stopMoving();
      w.state = 'home';
    }
  }

  separation(npc) {
    _sep.set(0, 0, 0);
    const p = npc.position;
    for (const o of this.all) {
      if (o === npc || !o.root.visible) continue;
      const dx = p.x - o.position.x;
      const dz = p.z - o.position.z;
      const d2 = dx * dx + dz * dz;
      const r = npc.radius + o.radius + 0.25;
      if (d2 < r * r && d2 > 1e-6) {
        const d = Math.sqrt(d2);
        const w = ((r - d) / r) * (o.moving ? 1.0 : 1.6);
        _sep.x += (dx / d) * w;
        _sep.z += (dz / d) * w;
      }
    }
    return _sep;
  }

  // Nearest staff/guest the player is facing and close to.
  findInteractable(player, fx, fz) {
    let best = null;
    let bestScore = Infinity;
    for (const n of this.all) {
      if (!n.root.visible) continue;
      if (Math.abs(n.position.y - player.position.y) > 1.2) continue;
      const dx = n.position.x - player.position.x;
      const dz = n.position.z - player.position.z;
      const d = Math.hypot(dx, dz);
      const isStaff = n instanceof Staff;
      const reach = isStaff ? (n.roleId === 'reception' ? 3.4 : 2.8) : 2.2;
      if (d > reach) continue;
      const dot = (dx * fx + dz * fz) / (d || 1);
      if (dot < 0.25 && d > 1.0) continue;
      const score = d - dot * 1.2 - (isStaff ? 0.6 : 0);
      if (score < bestScore) {
        bestScore = score;
        best = n;
      }
    }
    return best;
  }

  reactToWave(player) {
    for (const g of this.guests) {
      if (g.root.visible && g.position.distanceTo(player.position) < 7) g.react(player, 'wave');
    }
    for (const s of this.staff) {
      const d = s.position.distanceTo(player.position);
      if (d < 7 && !s.oneShot && !s.moving) {
        s.setHeading(s.clampToHome(s.faceAngleTo(player.position.x, player.position.z)));
        s.play('wave', { once: true, fade: 0.2, onDone: () => s.play(s.idleName, { fade: 0.3 }) });
        s.say(pick(['Hello!', 'Welcome!', 'Good evening!']), 2.4);
        s.greetCD = Math.max(s.greetCD, 20);
      }
    }
  }

  update(dt, player, camera) {
    const cx = camera.position.x;
    const cz = camera.position.z;
    for (const n of this.all) {
      n.update(dt, player);
      if (!n.root.visible) continue;
      // safety net: anyone who wanders outside the building is reset
      const p = n.position;
      if (!(Math.abs(p.x) < 23.5 && p.z > -16.5 && p.z < 20)) {
        if (n instanceof Guest) n.hide();
        else {
          n.stopMoving();
          p.set(n.home.x, 0, n.home.z);
          n.state = 'home';
        }
        continue;
      }
      const d = Math.hypot(n.position.x - cx, n.position.z - cz);
      n.updateMixer(dt, d < 14 ? 1 : d < 24 ? 2 : 3);
      n.updateLabels(dt, Math.hypot(n.position.x - player.position.x, n.position.z - player.position.z));
    }
  }
}
