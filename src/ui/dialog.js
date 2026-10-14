// Modal panel used for conversations, booking steps and info pages.
export class Dialog {
  constructor(root, { onOpen, onClose } = {}) {
    this.root = root;
    this.onOpen = onOpen;
    this.onClose = onClose;
    this.el = null;
    this.choiceFns = [];
    window.addEventListener('keydown', (e) => {
      if (!this.el) return;
      if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        if (e.key === 'Escape') this.close();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
      } else if (/^[1-9]$/.test(e.key)) {
        const fn = this.choiceFns[Number(e.key) - 1];
        if (fn) {
          e.preventDefault();
          fn();
        }
      }
    });
  }

  get isOpen() {
    return !!this.el;
  }

  // opts: { eyebrow, title, speaker:{name, role}, text, choices:[{label, sub, onSelect}], content, narrow, onClose }
  open(opts) {
    const wasOpen = this.isOpen;
    if (this.el) this.el.remove();
    this.closeCb = opts.onClose || null;
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    const panel = document.createElement('div');
    panel.className = `panel${opts.narrow ? ' narrow' : ''}`;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    let html = '<button class="panel-close" aria-label="Close">✕</button>';
    if (opts.speaker) {
      const initial = (opts.speaker.name || '?')[0];
      html += `<div class="speaker"><div class="avatar">${initial}</div><div><div class="eyebrow">${opts.speaker.role || ''}</div><h2 style="margin:2px 0 0">${opts.speaker.name}</h2></div></div>`;
    } else {
      if (opts.eyebrow) html += `<div class="eyebrow">${opts.eyebrow}</div>`;
      if (opts.title) html += `<h2>${opts.title}</h2>`;
    }
    if (opts.text) html += `<div class="${opts.speaker ? 'say' : ''}">${opts.speaker ? `“${opts.text}”` : `<p>${opts.text}</p>`}</div>`;
    panel.innerHTML = html;
    if (opts.content) panel.appendChild(opts.content);
    this.choiceFns = [];
    if (opts.choices && opts.choices.length) {
      const list = document.createElement('div');
      list.className = 'choices';
      opts.choices.forEach((c, i) => {
        const b = document.createElement('button');
        b.className = 'choice';
        b.innerHTML = `<span class="n">${i + 1}</span><span>${c.label}${c.sub ? `<small>${c.sub}</small>` : ''}</span>`;
        const fn = () => c.onSelect();
        b.addEventListener('click', fn);
        this.choiceFns.push(fn);
        list.appendChild(b);
      });
      panel.appendChild(list);
    }
    overlay.appendChild(panel);
    overlay.addEventListener('mousedown', (e) => {
      if (e.target === overlay) this.close();
    });
    panel.querySelector('.panel-close').addEventListener('click', () => this.close());
    this.root.appendChild(overlay);
    this.el = overlay;
    this.panel = panel;
    if (!wasOpen && this.onOpen) this.onOpen();
    const focusable = panel.querySelector('.choice, input, select, .btn');
    if (focusable) setTimeout(() => focusable.focus({ preventScroll: true }), 30);
    return panel;
  }

  close() {
    if (!this.el) return;
    this.el.remove();
    this.el = null;
    this.choiceFns = [];
    const cb = this.closeCb;
    this.closeCb = null;
    if (cb) cb();
    if (this.onClose) this.onClose();
  }
}

export function h(tag, attrs = {}, html = '') {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v);
  }
  if (html) el.innerHTML = html;
  return el;
}
