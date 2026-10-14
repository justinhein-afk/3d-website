import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { instantiate } from './assets.js';

const FALLBACK = {
  idleCalm: ['idleCalm', 'idle'],
  wave: ['wave', 'clap', 'idle'],
  interact: ['interact', 'idle'],
  sit: ['sit', 'idle'],
  stand: ['stand', 'idle'],
  clap: ['clap', 'wave', 'idle'],
};

export function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

// A skinned, animated person: mixer, cross-faded actions, heading and optional labels.
export class Character {
  constructor(assets, modelKey, { tints, heightJitter = 0, name = '', role = '' } = {}) {
    const inst = instantiate(assets, modelKey, { tints, heightJitter });
    this.modelKey = modelKey;
    this.root = inst.root;
    this.model = inst.model;
    this.rig = inst.rig;
    this.name = name;
    this.role = role;
    this.mixer = new THREE.AnimationMixer(this.model);
    this.actions = {};
    for (const [k, clip] of Object.entries(inst.clips)) this.actions[k] = this.mixer.clipAction(clip);
    this.idleName = this.actions.idleCalm ? 'idleCalm' : 'idle';
    this.current = null;
    this.currentName = '';
    this.heading = 0;
    this.radius = 0.32;
    this.position = this.root.position;
    this.velocity = new THREE.Vector3();
    this.mixerAccum = 0;
    this.oneShot = null;
    this.bubbleTimer = 0;
    this.mixer.addEventListener('finished', (e) => {
      if (this.oneShot && e.action === this.oneShot.action) {
        const cb = this.oneShot.onDone;
        this.oneShot = null;
        if (cb) cb();
      }
    });
  }

  resolveClip(name) {
    if (this.actions[name]) return name;
    for (const alt of FALLBACK[name] || []) if (this.actions[alt]) return alt;
    return 'idle';
  }

  play(name, { fade = 0.25, timeScale = 1, once = false, clamp = false, onDone, force = false } = {}) {
    const key = this.resolveClip(name);
    const action = this.actions[key];
    if (!action) return;
    action.setEffectiveTimeScale(timeScale);
    if (this.currentName === key && !force && !once) return;
    action.reset();
    action.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    action.clampWhenFinished = clamp;
    action.enabled = true;
    action.setEffectiveWeight(1);
    if (this.current && this.current !== action) action.crossFadeFrom(this.current, fade, false);
    action.play();
    this.current = action;
    this.currentName = key;
    this.oneShot = once ? { action, onDone } : null;
  }

  setTimeScale(ts) {
    if (this.current) this.current.setEffectiveTimeScale(ts);
  }

  // Rotate heading towards target angle at `rate` rad/s.
  turnTowards(target, dt, rate = 6) {
    const d = wrapAngle(target - this.heading);
    const step = rate * dt;
    this.heading = wrapAngle(this.heading + Math.max(-step, Math.min(step, d)));
    this.root.rotation.y = this.heading;
    return Math.abs(d);
  }

  setHeading(a) {
    this.heading = wrapAngle(a);
    this.root.rotation.y = this.heading;
  }

  faceAngleTo(x, z) {
    return Math.atan2(x - this.position.x, z - this.position.z);
  }

  updateMixer(dt, lod = 1) {
    // distant characters update their animation less often
    this.mixerAccum += dt;
    if (this.mixerAccum >= (lod - 0.5) / 60) {
      this.mixer.update(this.mixerAccum);
      this.mixerAccum = 0;
    }
  }

  attachLabel(height = 2.05) {
    const el = document.createElement('div');
    el.className = 'npc-label';
    el.innerHTML = `<b>${this.name}</b><span>${this.role}</span>`;
    el.style.opacity = '0';
    this.label = new CSS2DObject(el);
    this.label.position.set(0, height, 0);
    this.root.add(this.label);
    const bel = document.createElement('div');
    bel.className = 'bubble';
    bel.style.opacity = '0';
    this.bubble = new CSS2DObject(bel);
    this.bubble.position.set(0, height + 0.42, 0);
    this.root.add(this.bubble);
  }

  say(text, seconds = 3.8) {
    if (!this.bubble) this.attachLabel();
    this.bubble.element.textContent = text;
    this.bubble.element.style.opacity = '1';
    this.bubble.visible = true;
    this.bubbleTimer = seconds;
  }

  updateLabels(dt, distToCam) {
    if (this.bubbleTimer > 0) {
      this.bubbleTimer -= dt;
      if (this.bubbleTimer <= 0) this.bubble.element.style.opacity = '0';
    }
    if (this.label) {
      const show = distToCam < 9;
      this.label.element.style.opacity = show ? String(Math.min(1, (9 - distToCam) / 2.5)) : '0';
      this.label.visible = distToCam < 12;
      this.bubble.visible = this.bubbleTimer > 0 && distToCam < 22;
    }
  }
}
