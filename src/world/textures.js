import * as THREE from 'three';

// All surface textures are painted on canvases at startup, so the site ships no image files.

let seed = 1337;
export function rand() {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
}
const rr = (a, b) => a + rand() * (b - a);

let maxAniso = 8;
export function setMaxAnisotropy(v) {
  maxAniso = v;
}

function canvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function toTexture(c, { repeat = [1, 1], srgb = true, wrap = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = maxAniso;
  t.needsUpdate = true;
  return t;
}

function grain(ctx, w, h, amount = 10) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() - 0.5) * amount;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

// Wandering veins drawn as soft polylines; blur gives the milky marble look.
function veins(ctx, w, h, { count, color, width, alpha, angle = rand() * Math.PI, wobble = 0.35, blur = 2 }) {
  ctx.save();
  ctx.filter = `blur(${blur}px)`;
  for (let i = 0; i < count; i++) {
    let x = rand() * w;
    let y = rand() * h;
    let a = angle + rr(-0.5, 0.5);
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha * rr(0.4, 1);
    ctx.lineWidth = width * rr(0.3, 1.4);
    ctx.beginPath();
    ctx.moveTo(x, y);
    const steps = 40 + Math.floor(rand() * 60);
    for (let s = 0; s < steps; s++) {
      a += rr(-wobble, wobble);
      x += Math.cos(a) * w * 0.02;
      y += Math.sin(a) * h * 0.02;
      ctx.lineTo(x, y);
      if (rand() < 0.04) {
        ctx.stroke();
        ctx.lineWidth *= 0.7;
        ctx.beginPath();
        ctx.moveTo(x, y);
      }
    }
    ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function cloudy(ctx, w, h, colors, count = 60, alpha = 0.08) {
  ctx.save();
  ctx.filter = 'blur(18px)';
  for (let i = 0; i < count; i++) {
    ctx.globalAlpha = alpha * rr(0.3, 1);
    ctx.fillStyle = colors[Math.floor(rand() * colors.length)];
    ctx.beginPath();
    ctx.ellipse(rand() * w, rand() * h, rr(20, w / 4), rr(20, h / 4), rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

// Polished floor: 2x2 large-format marble tiles per texture repeat, each with its own vein direction.
export function marbleFloorTexture({ base = '#e9e4dc', vein = '#8f8a84', size = 1024, tiles = 2 } = {}) {
  const [c, ctx] = canvas(size);
  const ts = size / tiles;
  for (let ty = 0; ty < tiles; ty++) {
    for (let tx = 0; tx < tiles; tx++) {
      const [tc, tctx] = canvas(ts);
      tctx.fillStyle = base;
      tctx.fillRect(0, 0, ts, ts);
      cloudy(tctx, ts, ts, ['#ffffff', '#d8d2c8', '#cfc8bd'], 30, 0.18);
      veins(tctx, ts, ts, { count: 7, color: vein, width: 2.2, alpha: 0.55, blur: 1.2 });
      veins(tctx, ts, ts, { count: 14, color: '#b9b3aa', width: 1, alpha: 0.4, blur: 0.6 });
      ctx.drawImage(tc, tx * ts, ty * ts);
    }
  }
  grain(ctx, size, size, 6);
  // grout lines
  ctx.strokeStyle = 'rgba(120,110,100,0.35)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= tiles; i++) {
    ctx.beginPath();
    ctx.moveTo(i * ts, 0);
    ctx.lineTo(i * ts, size);
    ctx.moveTo(0, i * ts);
    ctx.lineTo(size, i * ts);
    ctx.stroke();
  }
  return toTexture(c);
}

export function marbleTexture({ base = '#f1eee9', vein = '#9a948c', size = 512, dark = false } = {}) {
  const [c, ctx] = canvas(size);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  if (dark) {
    cloudy(ctx, size, size, ['#2a231d', '#120f0c', '#3a2f25'], 40, 0.4);
    veins(ctx, size, size, { count: 9, color: vein, width: 2, alpha: 0.7, blur: 0.8 });
    veins(ctx, size, size, { count: 20, color: '#6b5a44', width: 0.8, alpha: 0.5, blur: 0.4 });
  } else {
    cloudy(ctx, size, size, ['#ffffff', '#ddd7ce'], 30, 0.2);
    veins(ctx, size, size, { count: 8, color: vein, width: 2.5, alpha: 0.5, blur: 1.5, angle: 0.6 });
    veins(ctx, size, size, { count: 16, color: '#bdb6ad', width: 1, alpha: 0.35, blur: 0.5, angle: 0.6 });
  }
  grain(ctx, size, size, 5);
  return toTexture(c);
}

export function woodTexture({ base = '#5a3a22', dark = '#3b2414', light = '#7a5233', size = 512, vertical = true } = {}) {
  const [c, ctx] = canvas(size);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 180; i++) {
    const x = rand() * size;
    ctx.strokeStyle = rand() < 0.5 ? dark : light;
    ctx.globalAlpha = rr(0.08, 0.35);
    ctx.lineWidth = rr(0.5, 3);
    ctx.beginPath();
    let px = x;
    ctx.moveTo(px, 0);
    for (let y = 0; y <= size; y += 16) {
      px += rr(-1.2, 1.2);
      ctx.lineTo(px, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // a few knots / cathedral grain arcs
  for (let k = 0; k < 4; k++) {
    const cx = rand() * size;
    const cy = rand() * size;
    ctx.strokeStyle = dark;
    for (let r = 4; r < 40; r += 4) {
      ctx.globalAlpha = 0.12;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * 0.5, r * 2.5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  grain(ctx, size, size, 8);
  const t = toTexture(c);
  if (!vertical) t.rotation = Math.PI / 2;
  return t;
}

export function stoneReliefTexture({ size = 1024 } = {}) {
  const [c, ctx] = canvas(size);
  ctx.fillStyle = '#d9d4cb';
  ctx.fillRect(0, 0, size, size);
  // rough travertine pits
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = rand() < 0.5 ? 'rgba(90,80,70,0.25)' : 'rgba(255,255,255,0.35)';
    const s = rr(0.5, 3.2);
    ctx.fillRect(rand() * size, rand() * size, s, s * rr(0.6, 1.4));
  }
  cloudy(ctx, size, size, ['#c9c2b6', '#ebe6de', '#bfb7aa'], 50, 0.25);
  // large panel joints
  ctx.strokeStyle = 'rgba(60,52,44,0.6)';
  ctx.lineWidth = 3;
  const cols = 3;
  const rows = 4;
  for (let i = 1; i < cols; i++) {
    ctx.beginPath();
    ctx.moveTo((i * size) / cols, 0);
    ctx.lineTo((i * size) / cols, size);
    ctx.stroke();
  }
  for (let j = 1; j < rows; j++) {
    ctx.beginPath();
    ctx.moveTo(0, (j * size) / rows);
    ctx.lineTo(size, (j * size) / rows);
    ctx.stroke();
  }
  return toTexture(c);
}

// Beige stone wall panels with fine horizontal joints (refs 2 & 4)
export function wallPanelTexture({ base = '#d6c9b5', size = 512, joints = 4 } = {}) {
  const [c, ctx] = canvas(size);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  cloudy(ctx, size, size, ['#e2d7c5', '#cbbba3', '#d9ccb8'], 40, 0.25);
  veins(ctx, size, size, { count: 6, color: '#b8a78e', width: 1.2, alpha: 0.35, blur: 1, angle: 0.1, wobble: 0.15 });
  grain(ctx, size, size, 5);
  ctx.strokeStyle = 'rgba(80,64,46,0.45)';
  ctx.lineWidth = 2;
  for (let j = 0; j <= joints; j++) {
    ctx.beginPath();
    ctx.moveTo(0, (j * size) / joints);
    ctx.lineTo(size, (j * size) / joints);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, size);
  ctx.stroke();
  return toTexture(c);
}

// Alpha map for a square lattice screen. White = solid.
export function latticeAlpha({ size = 512, cells = 8, bar = 0.16, diamond = true } = {}) {
  const [c, ctx] = canvas(size);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#fff';
  const cs = size / cells;
  const b = cs * bar;
  for (let i = 0; i <= cells; i++) {
    ctx.fillRect(i * cs - b / 2, 0, b, size);
    ctx.fillRect(0, i * cs - b / 2, size, b);
  }
  if (diamond) {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = b * 0.6;
    for (let i = 0; i < cells; i++) {
      for (let j = 0; j < cells; j++) {
        const cx = i * cs + cs / 2;
        const cy = j * cs + cs / 2;
        const r = cs * 0.28;
        ctx.beginPath();
        ctx.moveTo(cx, cy - r);
        ctx.lineTo(cx + r, cy);
        ctx.lineTo(cx, cy + r);
        ctx.lineTo(cx - r, cy);
        ctx.closePath();
        ctx.stroke();
      }
    }
  }
  return toTexture(c, { srgb: false });
}

// Ref 1: crimson abstract canvas with drifting white blossoms
export function redArtTexture({ w = 512, h = 1024 } = {}) {
  const [c, ctx] = canvas(w, h);
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#7a0f12');
  g.addColorStop(0.5, '#a3171b');
  g.addColorStop(1, '#5a090c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  cloudy(ctx, w, h, ['#c4261f', '#5e070a', '#d0472b'], 70, 0.25);
  ctx.save();
  for (let i = 0; i < 900; i++) {
    const t = rand();
    const x = w * (0.2 + 0.6 * Math.sin(t * 6 + rand() * 0.6) * 0.5 + 0.3 * rand());
    const y = h * t;
    ctx.globalAlpha = rr(0.25, 0.9);
    ctx.fillStyle = rand() < 0.85 ? '#fff4ec' : '#f2c9a0';
    ctx.beginPath();
    ctx.arc(x, y, rr(1, 4.5), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  return toTexture(c, { wrap: false });
}

// Ref 2: gold-leaf mountain landscape
export function goldLandscapeTexture({ w = 1024, h = 768 } = {}) {
  const [c, ctx] = canvas(w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#f6dc9a');
  g.addColorStop(0.55, '#d9a94e');
  g.addColorStop(1, '#8a5a1e');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // gold leaf squares
  for (let i = 0; i < 260; i++) {
    ctx.globalAlpha = rr(0.04, 0.14);
    ctx.fillStyle = rand() < 0.5 ? '#fff1c4' : '#b07a2a';
    const s = rr(30, 80);
    ctx.fillRect(rand() * w, rand() * h, s, s);
  }
  ctx.globalAlpha = 1;
  const layers = [
    ['#7a4a1a', 0.45, 0.22],
    ['#5c3412', 0.58, 0.18],
    ['#3d220b', 0.72, 0.14],
    ['#2a1606', 0.86, 0.1],
  ];
  layers.forEach(([col, base, amp], li) => {
    ctx.fillStyle = col;
    ctx.globalAlpha = 0.75 - li * 0.08;
    ctx.beginPath();
    ctx.moveTo(0, h);
    const f1 = rr(2, 4);
    const f2 = rr(6, 11);
    const ph = rand() * 10;
    for (let x = 0; x <= w; x += 4) {
      const t = x / w;
      const y = h * (base - amp * (0.55 * Math.abs(Math.sin(t * f1 + ph)) + 0.25 * Math.sin(t * f2 + ph * 2) + 0.2 * rand() * 0.2));
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
    // mist band
    const mg = ctx.createLinearGradient(0, h * (base - 0.02), 0, h * (base + 0.08));
    mg.addColorStop(0, 'rgba(255,240,205,0)');
    mg.addColorStop(1, 'rgba(255,240,205,0.35)');
    ctx.fillStyle = mg;
    ctx.globalAlpha = 1;
    ctx.fillRect(0, h * (base - 0.02), w, h * 0.12);
  });
  // sun
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = '#fff3d0';
  ctx.beginPath();
  ctx.arc(w * 0.72, h * 0.2, h * 0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  return toTexture(c, { wrap: false });
}

export function logoTexture(text, { w = 2048, h = 512, color = '#e8c77e', sub = '', weight = 600 } = {}) {
  const [c, ctx] = canvas(w, h);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${weight} ${h * 0.42}px "Cormorant Garamond", Georgia, serif`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${h * 0.08}px`;
  ctx.fillText(text, w / 2, h * (sub ? 0.42 : 0.5));
  if (sub) {
    ctx.font = `500 ${h * 0.11}px "Manrope", Arial, sans-serif`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${h * 0.05}px`;
    ctx.fillText(sub, w / 2, h * 0.82);
  }
  return toTexture(c, { wrap: false });
}

export function rugTexture({ size = 1024 } = {}) {
  const [c, ctx] = canvas(size);
  const cx = size / 2;
  ctx.fillStyle = '#cdbb9e';
  ctx.beginPath();
  ctx.arc(cx, cx, cx, 0, Math.PI * 2);
  ctx.fill();
  const rings = [
    [0.98, '#8d6b45'],
    [0.94, '#d9c9ad'],
    [0.78, '#b89a72'],
    [0.76, '#e1d3bb'],
    [0.5, '#c6ad88'],
    [0.47, '#e5d8c2'],
  ];
  rings.forEach(([r, col]) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(cx, cx, cx * r, 0, Math.PI * 2);
    ctx.fill();
  });
  // wave motif ring (seigaiha)
  ctx.strokeStyle = '#a2845e';
  ctx.lineWidth = 3;
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const x = cx + Math.cos(a) * cx * 0.86;
    const y = cx + Math.sin(a) * cx * 0.86;
    for (let r = 10; r < 34; r += 8) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  grain(ctx, size, size, 14);
  return toTexture(c, { wrap: false });
}

export function rectRugTexture({ w = 1024, h = 640, base = '#6d5a44', border = '#c8b08a' } = {}) {
  const [c, ctx] = canvas(w, h);
  ctx.fillStyle = border;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = base;
  ctx.fillRect(w * 0.05, h * 0.08, w * 0.9, h * 0.84);
  ctx.strokeStyle = border;
  ctx.lineWidth = 4;
  ctx.strokeRect(w * 0.09, h * 0.15, w * 0.82, h * 0.7);
  cloudy(ctx, w, h, ['#8a7558', '#5a4a38'], 40, 0.15);
  grain(ctx, w, h, 18);
  return toTexture(c, { wrap: false });
}

export function bookSpinesTexture({ w = 512, h = 128 } = {}) {
  const [c, ctx] = canvas(w, h);
  ctx.fillStyle = '#2a1d12';
  ctx.fillRect(0, 0, w, h);
  let x = 0;
  const palette = ['#e9e1d3', '#c9b48f', '#8b6b4a', '#3e4a3c', '#7a2e25', '#d8cdb8', '#4a5463', '#b9925b'];
  while (x < w) {
    const bw = rr(6, 18);
    const bh = rr(h * 0.6, h * 0.98);
    if (rand() < 0.12) {
      x += rr(12, 40); // gap or decor
      continue;
    }
    ctx.fillStyle = palette[Math.floor(rand() * palette.length)];
    ctx.fillRect(x, h - bh, bw - 1, bh);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(x + 1, h - bh + 6, bw - 3, 2);
    x += bw;
  }
  return toTexture(c, { wrap: false });
}

export function bambooTexture({ w = 1024, h = 1024 } = {}) {
  const [c, ctx] = canvas(w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#dfe8cf');
  g.addColorStop(1, '#8fa36f');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  for (let layer = 0; layer < 3; layer++) {
    const n = 14 + layer * 6;
    for (let i = 0; i < n; i++) {
      const x = rand() * w;
      const bw = rr(10, 22) * (1 - layer * 0.25);
      ctx.fillStyle = ['#5f7a3a', '#4a6430', '#7d9852'][layer];
      ctx.globalAlpha = 0.5 + layer * 0.2;
      ctx.fillRect(x, 0, bw, h);
      ctx.fillStyle = 'rgba(30,40,15,0.5)';
      for (let y = rr(0, 120); y < h; y += rr(110, 170)) ctx.fillRect(x - 1, y, bw + 2, 4);
      // leaves
      ctx.fillStyle = ['#6e8f3c', '#58782c', '#8fb056'][layer];
      for (let k = 0; k < 10; k++) {
        const ly = rand() * h * 0.7;
        ctx.beginPath();
        ctx.ellipse(x + rr(-40, 40), ly, rr(18, 34), rr(4, 7), rr(-0.8, 0.8), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.globalAlpha = 1;
  return toTexture(c, { wrap: false });
}

export function skyTexture({ w = 1024, h = 512 } = {}) {
  const [c, ctx] = canvas(w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#1f2a4a');
  g.addColorStop(0.45, '#6a5a7a');
  g.addColorStop(0.7, '#e09a6a');
  g.addColorStop(1, '#f4c27f');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // distant skyline
  ctx.fillStyle = '#2b2533';
  for (let x = 0; x < w; ) {
    const bw = rr(20, 70);
    const bh = rr(40, 170);
    ctx.fillRect(x, h - bh, bw, bh);
    ctx.fillStyle = 'rgba(255,214,150,0.7)';
    for (let wy = h - bh + 8; wy < h - 10; wy += 12) {
      for (let wx = x + 5; wx < x + bw - 5; wx += 9) if (rand() < 0.3) ctx.fillRect(wx, wy, 3, 5);
    }
    ctx.fillStyle = '#2b2533';
    x += bw + rr(2, 12);
  }
  return toTexture(c, { wrap: false });
}

export function plantWallTexture({ w = 1024, h = 1024 } = {}) {
  const [c, ctx] = canvas(w, h);
  ctx.fillStyle = '#1f3318';
  ctx.fillRect(0, 0, w, h);
  const greens = ['#2f5a24', '#3f7330', '#5a8f3a', '#77a84a', '#2a4a1e', '#8fbf5a'];
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = greens[Math.floor(rand() * greens.length)];
    ctx.globalAlpha = rr(0.6, 1);
    ctx.beginPath();
    ctx.ellipse(rand() * w, rand() * h, rr(6, 20), rr(3, 9), rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  return toTexture(c);
}

export function radialGlowTexture({ size = 256, inner = 'rgba(255,214,150,1)', outer = 'rgba(255,214,150,0)' } = {}) {
  const [c, ctx] = canvas(size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return toTexture(c, { wrap: false });
}

// Vertical wash: bright at the bottom (or top) fading out — fakes uplighting on walls.
export function washTexture({ w = 64, h = 256, color = '255,200,140', fromTop = false } = {}) {
  const [c, ctx] = canvas(w, h);
  const g = ctx.createLinearGradient(0, fromTop ? 0 : h, 0, fromTop ? h : 0);
  g.addColorStop(0, `rgba(${color},0.9)`);
  g.addColorStop(0.35, `rgba(${color},0.25)`);
  g.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  return toTexture(c, { wrap: false });
}

export function contactShadowTexture({ size = 128 } = {}) {
  const [c, ctx] = canvas(size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(0,0,0,0.55)');
  g.addColorStop(0.6, 'rgba(0,0,0,0.25)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return toTexture(c, { wrap: false, srgb: false });
}
