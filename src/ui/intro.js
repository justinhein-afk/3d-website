import { HOTEL } from '../config.js';

// Loading screen that turns into the welcome / avatar selection screen.
export class Intro {
  constructor(root) {
    this.el = document.createElement('div');
    this.el.className = 'intro';
    this.el.innerHTML = `
      <div class="intro-inner">
        <div class="crest">${HOTEL.short[0]}</div>
        <div class="eyebrow">${HOTEL.city}</div>
        <h1>${HOTEL.short}</h1>
        <div class="tagline">${HOTEL.tagline}</div>
        <div id="introLoad">
          <div class="loadbar"><i id="introBar"></i></div>
          <div class="load-text" id="introText">Preparing the lobby…</div>
        </div>
        <div id="introReady" class="hidden">
          <div class="eyebrow" style="margin-bottom:10px">Choose your guest</div>
          <div class="avatar-pick" id="introAvatars"></div>
          <div class="intro-actions">
            <button class="btn" id="introEnter">Enter the lobby</button>
            <button class="btn-ghost" id="introBook">Just book a room</button>
          </div>
          <div class="controls-line" id="introControls"></div>
        </div>
      </div>`;
    root.appendChild(this.el);
    this.bar = this.el.querySelector('#introBar');
    this.text = this.el.querySelector('#introText');
  }

  setProgress(p, text) {
    this.bar.style.width = `${Math.round(Math.max(0, Math.min(1, p)) * 100)}%`;
    if (text) this.text.textContent = text;
  }

  showReady({ avatars, isTouch, onEnter, onBook }) {
    this.el.querySelector('#introLoad').classList.add('hidden');
    this.el.querySelector('#introReady').classList.remove('hidden');
    const box = this.el.querySelector('#introAvatars');
    let selected = avatars[0].id;
    avatars.forEach((a, i) => {
      const b = document.createElement('button');
      b.className = `avatar-card${i === 0 ? ' sel' : ''}`;
      b.setAttribute('aria-label', a.label);
      if (a.thumb) b.appendChild(a.thumb);
      b.insertAdjacentHTML('beforeend', `<span>${a.label}</span>`);
      b.addEventListener('click', () => {
        selected = a.id;
        box.querySelectorAll('.avatar-card').forEach((c) => c.classList.remove('sel'));
        b.classList.add('sel');
      });
      b.addEventListener('dblclick', () => onEnter(a.id));
      box.appendChild(b);
    });
    this.el.querySelector('#introControls').innerHTML = isTouch
      ? 'Left stick to walk · drag to look · <b>Talk</b> to staff to book'
      : '<span class="key">W A S D</span> walk &nbsp;·&nbsp; <span class="key">Shift</span> run &nbsp;·&nbsp; mouse to look &nbsp;·&nbsp; <span class="key">E</span> talk &nbsp;·&nbsp; <span class="key">V</span> first / third person';
    this.el.querySelector('#introEnter').addEventListener('click', () => onEnter(selected));
    this.el.querySelector('#introBook').addEventListener('click', () => onBook(selected));
    setTimeout(() => this.el.querySelector('#introEnter').focus(), 50);
  }

  hide() {
    this.el.classList.add('gone');
    setTimeout(() => this.el.remove(), 700);
  }
}
