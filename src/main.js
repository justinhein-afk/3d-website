import * as THREE from 'three';
import './ui/styles.css';
import { QUALITY, PLAYER_AVATARS, HOTEL } from './config.js';
import { createRenderer } from './core/renderer.js';
import { Input } from './core/input.js';
import { CollisionWorld, L } from './core/collision.js';
import { buildWorld } from './world/index.js';
import { NavGrid } from './world/navigation.js';
import { loadCharacterAssets, instantiate } from './characters/assets.js';
import { NPCManager } from './characters/NPCManager.js';
import { Player } from './characters/Player.js';
import { Staff } from './characters/Staff.js';
import { CameraController } from './camera/CameraController.js';
import { HUD } from './ui/hud.js';
import { Dialog, h } from './ui/dialog.js';
import { Booking } from './ui/booking.js';
import { Intro } from './ui/intro.js';
import { openConversation, openInfo } from './ui/services.js';

const uiRoot = document.getElementById('ui');
// Yield so the loading UI can paint; the timeout keeps booting in background tabs where rAF is paused.
const nextFrame = () => new Promise((r) => {
  const t = setTimeout(r, 60);
  requestAnimationFrame(() => {
    clearTimeout(t);
    setTimeout(r, 0);
  });
});

// Places the quick-travel chips and NPC dialogs can send the player to.
const SPOTS = {
  entrance: { x: 0, z: 14, y: 0, yaw: 0 },
  reception: { x: 0, z: -8.7, y: 0, yaw: 0 },
  concierge: { x: -3.6, z: 12.7, y: 0, yaw: 0 },
  cafe: { x: 17.3, z: 10.1, y: 0, yaw: 0 },
  tea: { x: -13.3, z: 11, y: 0, yaw: Math.PI / 2 },
  lounge: { x: -13.1, z: -1.2, y: 0, yaw: Math.PI / 2 },
  elevators: { x: -17.6, z: -10.3, y: 0, yaw: 0 },
  mezzanine: { x: 14.6, z: -3, y: L.MEZZ, yaw: Math.PI / 2 },
  spa: { x: -18.8, z: -2, y: L.MEZZ, yaw: Math.PI / 2 },
};

const MAP_LABELS = [
  ['RECEPTION', 0, -8.4],
  ['LOUNGE', -17.3, -1.2],
  ['TEA', -18.5, 11],
  ['LIFTS', -17.6, -13.8],
  ['CAFÉ', 17.3, 3],
  ['BAR', 17.2, -12.6],
  ['ENTRANCE', 0, 15.2],
  ['STAIRS', 10.9, 3.6],
];

function pickQuality() {
  let saved = null;
  try {
    saved = localStorage.getItem('aurelia.quality');
  } catch {
    /* ignore */
  }
  if (saved && QUALITY[saved]) return { name: saved, auto: false };
  const touch = window.matchMedia('(pointer: coarse)').matches;
  if (touch) return { name: 'low', auto: true };
  const small = Math.min(window.innerWidth, window.innerHeight) < 600;
  return { name: small || window.devicePixelRatio > 1.6 ? 'medium' : 'high', auto: true };
}

// Render a character portrait into a 2D canvas for the avatar picker.
function renderThumb(renderer, assets, key, envTex) {
  const W = 220;
  const H = 253;
  const scene = new THREE.Scene();
  scene.environment = envTex;
  scene.add(new THREE.HemisphereLight(0xfff1de, 0x5a4634, 1.4));
  const dl = new THREE.DirectionalLight(0xffe0b8, 2.2);
  dl.position.set(1.5, 3, 3);
  scene.add(dl);
  const inst = instantiate(assets, key);
  inst.root.rotation.y = 0.35;
  scene.add(inst.root);
  const mixer = new THREE.AnimationMixer(inst.model);
  const clip = inst.clips.idleCalm || inst.clips.idle;
  if (clip) {
    mixer.clipAction(clip).play();
    mixer.update(0.4);
  }
  const cam = new THREE.PerspectiveCamera(28, W / H, 0.1, 20);
  cam.position.set(0, 1.15, 4.4);
  cam.lookAt(0, 0.95, 0);
  const rt = new THREE.WebGLRenderTarget(W, H, { samples: 4 });
  const prevTarget = renderer.getRenderTarget();
  renderer.setRenderTarget(rt);
  renderer.setClearColor(0x000000, 0);
  renderer.clear();
  renderer.render(scene, cam);
  const px = new Uint8Array(W * H * 4);
  renderer.readRenderTargetPixels(rt, 0, 0, W, H, px);
  renderer.setRenderTarget(prevTarget);
  rt.dispose();
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  const img = g.createImageData(W, H);
  for (let y = 0; y < H; y++) img.data.set(px.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);
  // render targets hold linear colour: apply a soft tone curve + sRGB gamma for display
  const lut = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) {
    const v = (i / 255) * 1.15;
    lut[i] = Math.round(255 * Math.pow(v / (1 + v * 0.35), 1 / 2.2));
  }
  for (let i = 0; i < img.data.length; i += 4) {
    img.data[i] = lut[img.data[i]];
    img.data[i + 1] = lut[img.data[i + 1]];
    img.data[i + 2] = lut[img.data[i + 2]];
  }
  g.putImageData(img, 0, 0);
  return c;
}

async function boot() {
  const intro = new Intro(uiRoot);
  intro.setProgress(0.05, 'Polishing the marble…');
  try {
    await Promise.race([
      Promise.all([document.fonts.load('600 40px "Cormorant Garamond"'), document.fonts.load('500 20px "Manrope"')]),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch {
    /* fonts are optional */
  }

  const q = pickQuality();
  let qualityName = q.name;
  let autoQuality = q.auto;
  const rctx = createRenderer(document.getElementById('scene'), document.getElementById('labels'), QUALITY[qualityName]);
  const { renderer, scene, camera } = rctx;
  await nextFrame();

  intro.setProgress(0.15, 'Building the grand lobby…');
  await nextFrame();
  const world = new CollisionWorld();
  const built = buildWorld(rctx, world);
  const nav = new NavGrid(world);

  intro.setProgress(0.35, 'Welcoming the staff…');
  const manager = new THREE.LoadingManager();
  manager.onProgress = (_url, loaded, total) => intro.setProgress(0.35 + 0.45 * (loaded / total), 'Welcoming the staff…');
  let assets;
  try {
    assets = await loadCharacterAssets(manager);
  } catch (err) {
    console.error(err);
    intro.setProgress(1, 'Could not load the characters. Please refresh the page.');
    return;
  }

  intro.setProgress(0.85, 'Opening the doors…');
  await nextFrame();
  const npcs = new NPCManager({ scene, assets, nav, furn: built.furn, materials: built.m });
  npcs.spawnStaff();
  npcs.setGuestCount(QUALITY[qualityName].guests);

  const input = new Input(renderer.domElement);
  const cam = new CameraController(camera, world);
  const dialog = new Dialog(uiRoot, {
    onOpen: () => {
      input.setEnabled(false);
      if (app.player) app.player.locked = true;
      hud.setPrompt(null);
      hud.showLockHint(false);
    },
    onClose: () => {
      if (app.engaged) app.engaged.disengage();
      app.engaged = null;
      if (state === 'playing') {
        input.setEnabled(true);
        if (app.player) app.player.locked = false;
        hud.showLockHint(!document.pointerLockElement);
      }
    },
  });
  const hud = new HUD(uiRoot, {
    isTouch: input.isTouch,
    onNav: (id) => nav_(id),
    onTravel: (id) => travel(id),
  });
  hud.buildMinimap(world, MAP_LABELS);
  const booking = new Booking(dialog, hud, {
    onConfirmed: (b, speaker) => {
      const desk = npcs.staff.find((s) => s.name === speaker?.name) || npcs.staff.find((s) => s.roleId === 'reception');
      if (desk) {
        desk.say(`All set! Your booking ${b.ref} is confirmed.`, 4.5);
        desk.play('wave', { once: true, fade: 0.2, onDone: () => desk.play(desk.idleName, { fade: 0.3 }) });
      }
    },
  });

  const app = { dialog, hud, booking, npcs, player: null, engaged: null, travel: (id) => travel(id) };
  let state = 'intro';

  function nav_(id) {
    if (id === 'rooms' || id === 'book') booking.open();
    else if (id === 'bookings') booking.openMyBookings();
    else if (id === 'settings') openSettings();
    else openInfo(app, id);
  }

  function travel(id) {
    const s = SPOTS[id];
    if (!s || !app.player) return;
    if (dialog.isOpen) dialog.close();
    hud.fade(true);
    setTimeout(() => {
      const p = app.player;
      p.position.set(s.x, s.y, s.z);
      p.y = s.y;
      p.vel.set(0, 0, 0);
      cam.yaw = s.yaw;
      cam.pitch = cam.mode === 'third' ? 0.3 : 0.02;
      p.setHeading(s.yaw + Math.PI);
      cam.target.set(s.x, s.y + 1.7, s.z);
      cam.curDist = cam.dist;
      hud.fade(false);
    }, 380);
  }

  function setQuality(name, auto = false) {
    qualityName = name;
    autoQuality = auto;
    const qq = QUALITY[name];
    rctx.applyQuality(qq);
    built.lights.key.castShadow = !!qq.shadows;
    npcs.setGuestCount(qq.guests);
    if (!auto) {
      try {
        localStorage.setItem('aurelia.quality', name);
      } catch {
        /* ignore */
      }
    }
  }

  function openSettings() {
    const wrap = h('div');
    const seg = (name, opts, cur) =>
      `<div class="seg" data-seg="${name}">${opts.map(([v, l]) => `<button data-v="${v}" class="${v === cur ? 'on' : ''}">${l}</button>`).join('')}</div>`;
    wrap.innerHTML = `
      <div class="settings-row"><span>Graphics quality${autoQuality ? ' <small style="color:var(--ink-mute)">(auto)</small>' : ''}</span>${seg('q', [['low', 'Low'], ['medium', 'Medium'], ['high', 'High']], qualityName)}</div>
      <div class="settings-row"><span>Camera</span>${seg('cam', [['third', '3rd person'], ['first', '1st person']], cam.mode)}</div>
      <div class="settings-row"><span>Look sensitivity</span><input type="range" min="0.0012" max="0.005" step="0.0002" value="${cam.sensitivity}" id="sens"></div>
      <div class="settings-row"><span>Minimap</span>${seg('map', [['on', 'On'], ['off', 'Off']], hud.mapVisible ? 'on' : 'off')}</div>
      <p style="font-size:12.5px;margin-top:14px">Tip: press <b>V</b> to switch views, <b>G</b> to wave at people, <b>M</b> for the map.</p>`;
    wrap.querySelectorAll('.seg').forEach((sg) =>
      sg.addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        sg.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
        const v = b.dataset.v;
        if (sg.dataset.seg === 'q') setQuality(v);
        if (sg.dataset.seg === 'cam' && v !== cam.mode) toggleView();
        if (sg.dataset.seg === 'map' && (v === 'on') !== hud.mapVisible) hud.toggleMap();
      }),
    );
    wrap.querySelector('#sens').addEventListener('input', (e) => (cam.sensitivity = Number(e.target.value)));
    dialog.open({ eyebrow: HOTEL.name, title: 'Settings', content: wrap, narrow: true });
  }

  function toggleView() {
    cam.toggle();
    if (app.player) app.player.setFirstPerson(cam.mode === 'first');
    hud.setMode(cam.mode);
    hud.toast(cam.mode === 'first' ? 'First-person view' : 'Third-person view', '', 1400);
  }

  // ----- input actions -----
  let target = null;
  input.on('interact', () => {
    if (state !== 'playing' || dialog.isOpen || !target) return;
    if (target instanceof Staff) {
      app.engaged = target;
      target.engage(app.player);
      openConversation(app, target);
    } else {
      target.react(app.player, 'talk');
    }
  });
  hud.onPromptClick = () => input.emit('interact');
  input.on('wave', () => {
    if (state !== 'playing' || dialog.isOpen) return;
    app.player.wave();
    npcs.reactToWave(app.player);
  });
  input.on('toggleView', () => state === 'playing' && !dialog.isOpen && toggleView());
  input.on('map', () => state === 'playing' && hud.toggleMap());
  input.on('help', () => state === 'playing' && hud.toggleHelp());
  input.on('menu', () => {
    if (state !== 'playing') return;
    if (dialog.isOpen) dialog.close();
    else openSettings();
  });
  input.on('lockchange', (locked) => hud.showLockHint(state === 'playing' && !locked && !dialog.isOpen));

  // ----- intro: cinematic camera while choosing an avatar -----
  const avatars = PLAYER_AVATARS.map((a) => ({ ...a, thumb: renderThumb(renderer, assets, a.model, scene.environment) }));
  intro.setProgress(0.95, 'Warming up the lights…');
  renderer.compile(scene, camera);
  intro.setProgress(1, 'Ready');

  const farAway = { position: new THREE.Vector3(999, 0, 999), heading: 0 };
  const startGame = (avatarId, thenBook = false) => {
    if (state !== 'intro') return;
    const av = PLAYER_AVATARS.find((a) => a.id === avatarId) || PLAYER_AVATARS[0];
    const player = new Player(assets, av.model);
    player.position.set(SPOTS.entrance.x, 0, SPOTS.entrance.z);
    player.setHeading(Math.PI);
    scene.add(player.root);
    app.player = player;
    cam.yaw = 0;
    cam.target.set(player.position.x, 1.7, player.position.z);
    state = 'playing';
    intro.hide();
    hud.show();
    input.setEnabled(true);
    input.buildTouchControls(uiRoot);
    if (input.isTouch) document.body.classList.add('touch-on');
    hud.showLockHint(!input.isTouch);
    fpsWindow = { t: 0, frames: 0 };
    hud.toast(`Welcome to ${HOTEL.name}. Walk up to the front desk to book a room.`, '', 5200);
    if (thenBook) booking.open();
  };
  intro.showReady({
    avatars,
    isTouch: input.isTouch,
    onEnter: (id) => startGame(id),
    onBook: (id) => startGame(id, true),
  });

  // ----- main loop -----
  let introT = 0;
  let fpsWindow = null;
  let mmT = 0;
  let last = performance.now();

  function tick(dt) {
    if (state === 'intro') {
      introT += dt;
      const a = introT * 0.06 + 0.4;
      camera.position.set(Math.sin(a) * 9, 3.2 + Math.sin(introT * 0.2) * 0.6, 2 + Math.cos(a) * 9);
      camera.lookAt(0, 3.4, -2);
      npcs.update(dt, farAway, camera);
      return;
    }

    const player = app.player;
    cam.handleInput(input);
    player.update(dt, input, cam.yaw, world, npcs.all);
    npcs.update(dt, player, camera);
    cam.update(dt, player);

    // interaction target
    if (!dialog.isOpen) {
      let fx;
      let fz;
      if (cam.mode === 'first' || player.speed < 0.2) {
        const f = cam.forward();
        fx = f.x;
        fz = f.z;
      } else {
        fx = Math.sin(player.heading);
        fz = Math.cos(player.heading);
      }
      target = npcs.findInteractable(player, fx, fz);
      if (target) {
        const verb = target instanceof Staff ? `Talk to <em>${target.name}</em> · ${target.role}` : 'Say hello';
        hud.setPrompt(verb);
      } else hud.setPrompt(null);
    }

    mmT += dt;
    if (mmT > 0.1) {
      mmT = 0;
      hud.drawMinimap(player, npcs.all, cam.yaw, player.y > L.MEZZ * 0.5);
    }
  }

  // automatic quality: after a warm-up, step down if real frame rate is low.
  // Frames with long gaps (hidden tab, throttling, hitches) are ignored.
  function monitorQuality(realDt) {
    if (!fpsWindow || !autoQuality || document.hidden) return;
    if (realDt > 0.25) return;
    fpsWindow.warm = (fpsWindow.warm || 0) + realDt;
    if (fpsWindow.warm < 1.5) return;
    fpsWindow.t += realDt;
    fpsWindow.frames++;
    if (fpsWindow.t > 4) {
      const fps = fpsWindow.frames / fpsWindow.t;
      if (fps < 30 && qualityName !== 'low') {
        setQuality(qualityName === 'high' ? 'medium' : 'low', true);
        hud.toast('Adjusted graphics for smoother play', '', 2500);
        fpsWindow = { t: 0, frames: 0 };
      } else fpsWindow = null;
    }
  }

  renderer.setAnimationLoop(() => {
    const now = performance.now();
    let dt = (now - last) / 1000;
    last = now;
    // guard against clock jumps (tab switches, debugger pauses)
    if (!(dt > 0)) dt = 0;
    tick(Math.min(dt, 0.05));
    rctx.render();
    if (state === 'playing') monitorQuality(dt);
  });

  // debugging handle (dev server only)
  if (import.meta.env.DEV) window.__aurelia = { rctx, world, nav, npcs, app, cam, built, travel, setQuality, tick, input };
}

boot();
