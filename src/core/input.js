// Keyboard, mouse (pointer lock or drag), wheel and touch controls.
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.lookDX = 0;
    this.lookDY = 0;
    this.wheel = 0;
    this.enabled = false;
    this.listeners = {};
    this.joy = { x: 0, y: 0, active: false };
    this.runToggle = false;
    this.dragging = false;
    this.isTouch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

    const actionKeys = {
      KeyE: 'interact',
      Enter: 'interact',
      KeyG: 'wave',
      KeyV: 'toggleView',
      KeyM: 'map',
      KeyH: 'help',
      Escape: 'menu',
    };

    window.addEventListener('keydown', (e) => {
      if (isTyping(e.target)) return;
      if (actionKeys[e.code] && !e.repeat) {
        // Escape also exits pointer lock natively; only treat it as "menu" when not locked
        if (e.code === 'Escape' && document.pointerLockElement) return;
        this.emit(actionKeys[e.code]);
      }
      if (!this.enabled) return;
      this.keys.add(e.code);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());

    canvas.addEventListener('click', () => {
      if (!this.enabled || this.isTouch) return;
      if (document.pointerLockElement !== canvas && canvas.requestPointerLock) {
        const p = canvas.requestPointerLock();
        if (p && p.catch) p.catch(() => {});
      }
    });
    document.addEventListener('pointerlockchange', () => this.emit('lockchange', !!document.pointerLockElement));
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0 || e.button === 2) this.dragging = true;
    });
    window.addEventListener('mouseup', () => (this.dragging = false));
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('mousemove', (e) => {
      if (!this.enabled) return;
      if (document.pointerLockElement === canvas || this.dragging) {
        this.lookDX += e.movementX || 0;
        this.lookDY += e.movementY || 0;
      }
    });
    canvas.addEventListener(
      'wheel',
      (e) => {
        if (!this.enabled) return;
        this.wheel += Math.sign(e.deltaY);
        e.preventDefault();
      },
      { passive: false },
    );

    // touch-look: any touch on the canvas that isn't on the joystick
    let lookId = null;
    let lx = 0;
    let ly = 0;
    canvas.addEventListener(
      'touchstart',
      (e) => {
        for (const t of e.changedTouches) {
          if (lookId === null) {
            lookId = t.identifier;
            lx = t.clientX;
            ly = t.clientY;
          }
        }
      },
      { passive: true },
    );
    canvas.addEventListener(
      'touchmove',
      (e) => {
        if (!this.enabled) return;
        for (const t of e.changedTouches) {
          if (t.identifier === lookId) {
            this.lookDX += (t.clientX - lx) * 1.6;
            this.lookDY += (t.clientY - ly) * 1.6;
            lx = t.clientX;
            ly = t.clientY;
          }
        }
      },
      { passive: true },
    );
    const endTouch = (e) => {
      for (const t of e.changedTouches) if (t.identifier === lookId) lookId = null;
    };
    canvas.addEventListener('touchend', endTouch);
    canvas.addEventListener('touchcancel', endTouch);
  }

  on(name, fn) {
    (this.listeners[name] ||= []).push(fn);
  }

  emit(name, arg) {
    (this.listeners[name] || []).forEach((fn) => fn(arg));
  }

  setEnabled(v) {
    this.enabled = v;
    if (!v) {
      this.keys.clear();
      this.joy.x = this.joy.y = 0;
      this.lookDX = this.lookDY = 0;
      if (document.pointerLockElement) document.exitPointerLock();
    }
  }

  // Movement axes: x = strafe (right +), y = forward (+)
  axes() {
    let x = 0;
    let y = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.joy.active) {
      x = this.joy.x;
      y = this.joy.y;
    }
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    return { x, y };
  }

  running() {
    return this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.runToggle || (this.joy.active && Math.hypot(this.joy.x, this.joy.y) > 0.92);
  }

  consumeLook() {
    const d = { x: this.lookDX, y: this.lookDY };
    this.lookDX = this.lookDY = 0;
    return d;
  }

  consumeWheel() {
    const w = this.wheel;
    this.wheel = 0;
    return w;
  }

  // On-screen joystick + buttons for touch devices
  buildTouchControls(root) {
    if (!this.isTouch) return;
    const wrap = document.createElement('div');
    wrap.className = 'touch-controls';
    wrap.innerHTML = `
      <div class="joy"><div class="joy-knob"></div></div>
      <div class="touch-buttons">
        <button data-act="interact" class="tb tb-main">Talk</button>
        <button data-act="wave" class="tb">Wave</button>
        <button data-act="toggleView" class="tb">View</button>
        <button data-act="run" class="tb">Run</button>
      </div>`;
    root.appendChild(wrap);
    const joy = wrap.querySelector('.joy');
    const knob = wrap.querySelector('.joy-knob');
    let id = null;
    let cx = 0;
    let cy = 0;
    const R = 46;
    joy.addEventListener(
      'touchstart',
      (e) => {
        e.preventDefault();
        const t = e.changedTouches[0];
        id = t.identifier;
        const r = joy.getBoundingClientRect();
        cx = r.left + r.width / 2;
        cy = r.top + r.height / 2;
        this.joy.active = true;
        move(t);
      },
      { passive: false },
    );
    const move = (t) => {
      let dx = t.clientX - cx;
      let dy = t.clientY - cy;
      const len = Math.hypot(dx, dy);
      if (len > R) {
        dx = (dx / len) * R;
        dy = (dy / len) * R;
      }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      this.joy.x = dx / R;
      this.joy.y = -dy / R;
    };
    joy.addEventListener(
      'touchmove',
      (e) => {
        e.preventDefault();
        for (const t of e.changedTouches) if (t.identifier === id) move(t);
      },
      { passive: false },
    );
    const end = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === id) {
          id = null;
          this.joy.active = false;
          this.joy.x = this.joy.y = 0;
          knob.style.transform = '';
        }
      }
    };
    joy.addEventListener('touchend', end);
    joy.addEventListener('touchcancel', end);
    wrap.querySelectorAll('.tb').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const act = btn.dataset.act;
        if (act === 'run') {
          this.runToggle = !this.runToggle;
          btn.classList.toggle('on', this.runToggle);
        } else this.emit(act);
      });
    });
    this.touchRoot = wrap;
  }
}

function isTyping(el) {
  return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
}
