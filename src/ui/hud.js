import { HOTEL } from '../config.js';
import { L } from '../core/collision.js';

const MM_SCALE = 5; // px per metre

// Heads-up display: website top bar, interaction prompt, toasts, minimap and quick-travel chips.
export class HUD {
  constructor(root, { onNav, onTravel, isTouch }) {
    this.root = root;
    this.onNav = onNav;
    this.isTouch = isTouch;
    root.insertAdjacentHTML(
      'beforeend',
      `
      <header class="topbar hidden" id="topbar">
        <a class="brand" href="#" data-nav="about"><b>${HOTEL.short}</b><small>HOTEL · ${HOTEL.city.toUpperCase()}</small></a>
        <nav class="nav" id="nav">
          <button data-nav="rooms">Rooms &amp; Suites</button>
          <button data-nav="dining">Dining</button>
          <button data-nav="spa">Spa &amp; Wellness</button>
          <button data-nav="location">Location</button>
          <button data-nav="bookings">My Bookings</button>
          <button data-nav="settings">Settings</button>
        </nav>
        <button class="menu-toggle" id="menuToggle" aria-label="Menu">☰</button>
        <button class="btn" data-nav="book">Book a Stay</button>
      </header>
      <div class="prompt off" id="prompt"><span class="key">${isTouch ? 'Talk' : 'E'}</span><span id="promptText"></span></div>
      <div class="toasts" id="toasts"></div>
      <div class="quickbar hidden" id="quickbar">
        <div class="help-card" id="helpCard">
          <b>Explore the lobby</b><br/>
          <span class="key">W</span><span class="key">A</span><span class="key">S</span><span class="key">D</span> move &nbsp; <span class="key">Shift</span> run<br/>
          <b>Mouse</b> look (click to lock) &nbsp; <span class="key">V</span> 1st/3rd person<br/>
          <span class="key">E</span> talk &nbsp; <span class="key">G</span> wave &nbsp; <span class="key">M</span> map &nbsp; <span class="key">H</span> hide help
        </div>
        <div class="chip-row" id="travel">
          <button class="chip" data-go="reception">Reception</button>
          <button class="chip" data-go="concierge">Concierge</button>
          <button class="chip" data-go="cafe">Café</button>
          <button class="chip" data-go="tea">Tea Pavilion</button>
          <button class="chip" data-go="lounge">Library Lounge</button>
          <button class="chip" data-go="mezzanine">Mezzanine</button>
        </div>
      </div>
      <div class="minimap hidden" id="minimap">
        <div class="mm-title"><span>LOBBY</span><span id="mmLevel">GROUND</span></div>
        <canvas id="mmCanvas" width="${L.W * 2 * MM_SCALE}" height="${L.D * 2 * MM_SCALE}"></canvas>
      </div>
      <div class="lock-hint hidden" id="lockHint">Click to look around</div>
      <div class="crosshair hidden" id="crosshair"></div>
      <div class="fade" id="fade"></div>
      `,
    );
    this.el = {
      topbar: root.querySelector('#topbar'),
      nav: root.querySelector('#nav'),
      prompt: root.querySelector('#prompt'),
      promptText: root.querySelector('#promptText'),
      toasts: root.querySelector('#toasts'),
      quickbar: root.querySelector('#quickbar'),
      help: root.querySelector('#helpCard'),
      minimap: root.querySelector('#minimap'),
      mmLevel: root.querySelector('#mmLevel'),
      canvas: root.querySelector('#mmCanvas'),
      lockHint: root.querySelector('#lockHint'),
      crosshair: root.querySelector('#crosshair'),
      fade: root.querySelector('#fade'),
    };
    root.querySelectorAll('[data-nav]').forEach((b) =>
      b.addEventListener('click', (e) => {
        e.preventDefault();
        this.el.nav.classList.remove('open');
        onNav(b.dataset.nav);
      }),
    );
    root.querySelector('#menuToggle').addEventListener('click', () => this.el.nav.classList.toggle('open'));
    root.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => onTravel(b.dataset.go)));
    this.el.prompt.addEventListener('click', () => this.onPromptClick && this.onPromptClick());
    this.ctx = this.el.canvas.getContext('2d');
    this.mapVisible = true;
    this.promptCurrent = null;
  }

  show() {
    this.el.topbar.classList.remove('hidden');
    this.el.quickbar.classList.remove('hidden');
    if (this.mapVisible) this.el.minimap.classList.remove('hidden');
  }

  toggleMap() {
    this.mapVisible = !this.mapVisible;
    this.el.minimap.classList.toggle('hidden', !this.mapVisible);
  }

  toggleHelp() {
    this.el.help.classList.toggle('hidden');
  }

  setPrompt(text) {
    if (text === this.promptCurrent) return;
    this.promptCurrent = text;
    if (text) {
      this.el.promptText.innerHTML = text;
      this.el.prompt.classList.remove('off');
    } else this.el.prompt.classList.add('off');
  }

  toast(msg, kind = '', ms = 3600) {
    const t = document.createElement('div');
    t.className = `toast ${kind}`;
    t.textContent = msg;
    this.el.toasts.appendChild(t);
    while (this.el.toasts.children.length > 3) this.el.toasts.firstChild.remove();
    setTimeout(() => {
      t.style.transition = 'opacity .4s';
      t.style.opacity = '0';
      setTimeout(() => t.remove(), 450);
    }, ms);
  }

  setMode(mode) {
    this.el.crosshair.classList.toggle('hidden', mode !== 'first');
  }

  showLockHint(v) {
    this.el.lockHint.classList.toggle('hidden', !v || this.isTouch);
  }

  fade(on) {
    this.el.fade.classList.toggle('on', on);
  }

  // Pre-render the static floor plan once.
  buildMinimap(world, labels) {
    const c = document.createElement('canvas');
    c.width = this.el.canvas.width;
    c.height = this.el.canvas.height;
    const g = c.getContext('2d');
    const tx = (x) => (x + L.W) * MM_SCALE;
    const tz = (z) => (z + L.D) * MM_SCALE;
    g.fillStyle = '#2a221a';
    g.fillRect(0, 0, c.width, c.height);
    // atrium
    g.fillStyle = '#3a2f24';
    g.fillRect(tx(-L.AX), tz(-L.D), L.AX * 2 * MM_SCALE, (L.AZS + L.D) * MM_SCALE);
    g.strokeStyle = 'rgba(216,176,106,0.5)';
    g.lineWidth = 1;
    g.strokeRect(tx(-L.AX), tz(-L.D), L.AX * 2 * MM_SCALE, (L.AZS + L.D) * MM_SCALE);
    g.fillStyle = 'rgba(205,190,165,0.55)';
    for (const b of world.boxes) {
      if (!b.nav || b.minY > 1.5 || b.maxY < 0.3) continue;
      const w = (b.maxX - b.minX) * MM_SCALE;
      const h = (b.maxZ - b.minZ) * MM_SCALE;
      if (w > 60 && h > 60) continue;
      g.fillRect(tx(b.minX), tz(b.minZ), Math.max(1, w), Math.max(1, h));
    }
    // stairs
    g.fillStyle = 'rgba(216,176,106,0.45)';
    g.fillRect(tx(L.STAIR.x0), tz(L.STAIR.zLanding), (L.STAIR.x1 - L.STAIR.x0) * MM_SCALE, (L.STAIR.zBottom - L.STAIR.zLanding) * MM_SCALE);
    g.font = '600 10px Manrope, sans-serif';
    g.textAlign = 'center';
    g.fillStyle = 'rgba(240,210,154,0.85)';
    for (const [text, x, z] of labels) g.fillText(text, tx(x), tz(z));
    this.mmBase = c;
  }

  drawMinimap(player, npcs, yaw, upstairs) {
    if (!this.mapVisible || !this.mmBase) return;
    const g = this.ctx;
    g.drawImage(this.mmBase, 0, 0);
    const tx = (x) => (x + L.W) * MM_SCALE;
    const tz = (z) => (z + L.D) * MM_SCALE;
    for (const n of npcs) {
      if (!n.root.visible) continue;
      if (Math.abs(n.position.y - player.position.y) > 2) continue;
      g.fillStyle = n.roleId ? '#e8c27a' : 'rgba(247,241,230,0.8)';
      g.beginPath();
      g.arc(tx(n.position.x), tz(n.position.z), n.roleId ? 3.2 : 2.4, 0, Math.PI * 2);
      g.fill();
    }
    // view cone + player arrow
    const px = tx(player.position.x);
    const pz = tz(player.position.z);
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    const a = Math.atan2(fz, fx);
    g.fillStyle = 'rgba(240,210,154,0.18)';
    g.beginPath();
    g.moveTo(px, pz);
    g.arc(px, pz, 34, a - 0.55, a + 0.55);
    g.closePath();
    g.fill();
    g.save();
    g.translate(px, pz);
    g.rotate(a + Math.PI / 2);
    g.fillStyle = '#ffffff';
    g.strokeStyle = '#1c1611';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(0, -7);
    g.lineTo(5, 5);
    g.lineTo(0, 2.5);
    g.lineTo(-5, 5);
    g.closePath();
    g.fill();
    g.stroke();
    g.restore();
    this.el.mmLevel.textContent = upstairs ? 'MEZZANINE' : 'GROUND';
  }
}
