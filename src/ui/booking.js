import { HOTEL, ROOMS } from '../config.js';
import { h } from './dialog.js';

const STORE_KEY = 'aurelia.bookings.v1';
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: HOTEL.currency, maximumFractionDigits: 0 });

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (d, n) => {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
};
const nightsBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
const pretty = (s) => new Date(`${s}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function loadBookings() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveBookings(list) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

function makeRef() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `${HOTEL.bookingPrefix}-${s}`;
}

export function quote(room, nights) {
  const subtotal = room.rate * nights;
  const tax = Math.round(subtotal * HOTEL.taxRate);
  const fee = HOTEL.serviceFee;
  return { subtotal, tax, fee, total: subtotal + tax + fee };
}

// Small illustrated room thumbnail (SVG) tinted with the room's colours.
function roomArt(room) {
  const [a, b] = room.hues;
  return `<svg viewBox="0 0 200 96" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs><linearGradient id="g${room.id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
    <rect width="200" height="96" fill="url(#g${room.id})"/>
    <rect x="118" y="14" width="64" height="44" rx="2" fill="#f6e7c8" opacity=".85"/>
    <path d="M118 50 L136 34 L150 44 L164 30 L182 46 L182 58 L118 58Z" fill="${b}" opacity=".55"/>
    <rect x="18" y="56" width="92" height="22" rx="4" fill="#f4efe6"/>
    <rect x="18" y="46" width="92" height="12" rx="4" fill="#e7dccb"/>
    <rect x="24" y="40" width="26" height="10" rx="4" fill="#fffaf1"/>
    <rect x="56" y="40" width="26" height="10" rx="4" fill="#fffaf1"/>
    <rect x="14" y="30" width="100" height="16" rx="3" fill="${b}" opacity=".8"/>
    <rect x="0" y="80" width="200" height="16" fill="#000" opacity=".18"/>
    <circle cx="160" cy="24" r="5" fill="#fff6d8"/>
  </svg>`;
}

export class Booking {
  constructor(dialog, hud, { onConfirmed } = {}) {
    this.dialog = dialog;
    this.hud = hud;
    this.onConfirmed = onConfirmed;
    this.resetDraft();
  }

  resetDraft() {
    const today = new Date();
    this.draft = {
      roomId: null,
      checkIn: iso(addDays(today, 7)),
      checkOut: iso(addDays(today, 10)),
      guests: 2,
      name: '',
      email: '',
      requests: '',
    };
  }

  room() {
    return ROOMS.find((r) => r.id === this.draft.roomId);
  }

  steps(n) {
    return `<div class="steps">${[1, 2, 3, 4].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</div>`;
  }

  open(speaker, preselect) {
    this.speaker = speaker || null;
    if (preselect) this.draft.roomId = preselect;
    this.stepRooms();
  }

  // Step 1: choose a room
  stepRooms() {
    const wrap = h('div');
    wrap.innerHTML = `${this.steps(1)}<div class="grid-cards" role="list"></div>`;
    const grid = wrap.querySelector('.grid-cards');
    for (const r of ROOMS) {
      const card = h(
        'button',
        { class: `card${this.draft.roomId === r.id ? ' sel' : ''}`, role: 'listitem' },
        `<div class="art">${roomArt(r)}</div><div class="body"><div class="title">${r.name}</div>
         <div class="meta">${r.size} · ${r.bed} · ${r.view}</div><p style="font-size:13px;margin:8px 0 0">${r.blurb}</p>
         <div class="price">${money.format(r.rate)} <small>/ night</small></div></div>`,
      );
      card.addEventListener('click', () => {
        this.draft.roomId = r.id;
        this.draft.guests = Math.min(this.draft.guests, r.maxGuests);
        this.stepDates();
      });
      grid.appendChild(card);
    }
    this.dialog.open({
      eyebrow: this.speaker ? `${this.speaker.name} · ${this.speaker.role}` : 'Reservations',
      title: 'Rooms & Suites',
      text: 'Choose a room to see availability and pricing for your dates.',
      content: wrap,
    });
  }

  // Step 2: dates and guests
  stepDates() {
    const r = this.room();
    const today = iso(new Date());
    const wrap = h('div');
    wrap.innerHTML = `${this.steps(2)}
      <div class="form-grid">
        <label class="field">Check-in<input type="date" name="in" min="${today}" value="${this.draft.checkIn}" required></label>
        <label class="field">Check-out<input type="date" name="out" min="${today}" value="${this.draft.checkOut}" required></label>
        <label class="field">Guests<select name="guests">${Array.from({ length: r.maxGuests }, (_, i) => `<option value="${i + 1}" ${this.draft.guests === i + 1 ? 'selected' : ''}>${i + 1} ${i ? 'guests' : 'guest'}</option>`).join('')}</select></label>
        <label class="field">Room<input value="${r.name}" disabled></label>
        <div class="field full"><span class="err" id="dateErr"></span></div>
      </div>
      <div class="summary" id="sum"></div>
      <div class="actions"><button class="btn-ghost" id="back">← Rooms</button><button class="btn" id="next">Continue</button></div>`;
    const $ = (s) => wrap.querySelector(s);
    const update = () => {
      this.draft.checkIn = $('[name=in]').value;
      this.draft.checkOut = $('[name=out]').value;
      this.draft.guests = Number($('[name=guests]').value);
      const err = this.validateDates();
      $('#dateErr').textContent = err || '';
      $('#next').disabled = !!err;
      if (!err) {
        const n = nightsBetween(this.draft.checkIn, this.draft.checkOut);
        const q = quote(r, n);
        $('#sum').innerHTML = `
          <div class="row"><span>${money.format(r.rate)} × ${n} night${n > 1 ? 's' : ''}</span><span>${money.format(q.subtotal)}</span></div>
          <div class="row"><span>Taxes (${Math.round(HOTEL.taxRate * 100)}%)</span><span>${money.format(q.tax)}</span></div>
          <div class="row"><span>Service fee</span><span>${money.format(q.fee)}</span></div>
          <div class="row total"><span>Total</span><span>${money.format(q.total)}</span></div>`;
      } else $('#sum').innerHTML = '<div class="row"><span>Pick valid dates to see the price.</span></div>';
    };
    wrap.querySelectorAll('input,select').forEach((el) => el.addEventListener('input', update));
    $('[name=in]').addEventListener('change', () => {
      // keep check-out after check-in
      if (this.draft.checkOut <= $('[name=in]').value) {
        $('[name=out]').value = iso(addDays(new Date(`${$('[name=in]').value}T12:00:00`), 1));
      }
      update();
    });
    $('#back').addEventListener('click', () => this.stepRooms());
    $('#next').addEventListener('click', () => !this.validateDates() && this.stepDetails());
    this.dialog.open({ eyebrow: 'Reservations', title: r.name, text: `${r.size} · ${r.bed} · up to ${r.maxGuests} guests`, content: wrap });
    update();
  }

  validateDates() {
    const { checkIn, checkOut } = this.draft;
    const today = iso(new Date());
    if (!checkIn || !checkOut) return 'Please choose both dates.';
    if (checkIn < today) return 'Check-in can’t be in the past.';
    const n = nightsBetween(checkIn, checkOut);
    if (!(n >= 1)) return 'Check-out must be at least one night after check-in.';
    if (n > 30) return 'For stays longer than 30 nights, please contact us directly.';
    return '';
  }

  // Step 3: guest details
  stepDetails() {
    const wrap = h('div');
    wrap.innerHTML = `${this.steps(3)}
      <form class="form-grid" novalidate>
        <label class="field">Full name<input name="name" autocomplete="name" value="${esc(this.draft.name)}" placeholder="e.g. Alex Morgan"><span class="err" data-err="name"></span></label>
        <label class="field">Email<input name="email" type="email" autocomplete="email" value="${esc(this.draft.email)}" placeholder="you@example.com"><span class="err" data-err="email"></span></label>
        <label class="field full">Special requests (optional)<textarea name="requests" rows="3" placeholder="High floor, extra pillows, anniversary…">${esc(this.draft.requests)}</textarea></label>
      </form>
      <p style="font-size:12.5px">Demo booking — details stay in this browser only. No payment is taken.</p>
      <div class="actions"><button class="btn-ghost" id="back">← Dates</button><button class="btn" id="next">Review booking</button></div>`;
    const $ = (s) => wrap.querySelector(s);
    const read = () => {
      this.draft.name = $('[name=name]').value.trim();
      this.draft.email = $('[name=email]').value.trim();
      this.draft.requests = $('[name=requests]').value.trim();
    };
    const validate = () => {
      read();
      let ok = true;
      const nameErr = this.draft.name.length < 2 ? 'Please enter your name.' : '';
      const emailErr = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.draft.email) ? '' : 'Please enter a valid email.';
      $('[data-err=name]').textContent = nameErr;
      $('[data-err=email]').textContent = emailErr;
      if (nameErr || emailErr) ok = false;
      return ok;
    };
    $('form').addEventListener('submit', (e) => {
      e.preventDefault();
      if (validate()) this.stepReview();
    });
    $('#back').addEventListener('click', () => {
      read();
      this.stepDates();
    });
    $('#next').addEventListener('click', () => validate() && this.stepReview());
    this.dialog.open({ eyebrow: 'Reservations', title: 'Guest details', content: wrap });
  }

  // Step 4: review & confirm
  stepReview() {
    const r = this.room();
    const d = this.draft;
    const n = nightsBetween(d.checkIn, d.checkOut);
    const q = quote(r, n);
    const wrap = h('div');
    wrap.innerHTML = `${this.steps(4)}
      <div class="summary">
        <div class="row"><span>Room</span><span>${r.name}</span></div>
        <div class="row"><span>Check-in</span><span>${pretty(d.checkIn)} · from 3:00 pm</span></div>
        <div class="row"><span>Check-out</span><span>${pretty(d.checkOut)} · by 11:00 am</span></div>
        <div class="row"><span>Guests</span><span>${d.guests}</span></div>
        <div class="row"><span>Lead guest</span><span>${esc(d.name)}</span></div>
        <div class="row"><span>Email</span><span>${esc(d.email)}</span></div>
        ${d.requests ? `<div class="row"><span>Requests</span><span style="text-align:right">${esc(d.requests)}</span></div>` : ''}
        <div class="row"><span>${money.format(r.rate)} × ${n} night${n > 1 ? 's' : ''}</span><span>${money.format(q.subtotal)}</span></div>
        <div class="row"><span>Taxes &amp; fees</span><span>${money.format(q.tax + q.fee)}</span></div>
        <div class="row total"><span>Total due at hotel</span><span>${money.format(q.total)}</span></div>
      </div>
      <p style="font-size:12.5px">Free cancellation until 48 hours before arrival.</p>
      <div class="actions"><button class="btn-ghost" id="back">← Details</button><button class="btn" id="confirm">Confirm reservation</button></div>`;
    wrap.querySelector('#back').addEventListener('click', () => this.stepDetails());
    wrap.querySelector('#confirm').addEventListener('click', () => this.confirm());
    this.dialog.open({ eyebrow: 'Reservations', title: 'Review your stay', content: wrap });
  }

  confirm() {
    const r = this.room();
    const d = this.draft;
    const n = nightsBetween(d.checkIn, d.checkOut);
    const q = quote(r, n);
    const booking = {
      ref: makeRef(),
      roomId: r.id,
      roomName: r.name,
      checkIn: d.checkIn,
      checkOut: d.checkOut,
      nights: n,
      guests: d.guests,
      name: d.name,
      email: d.email,
      requests: d.requests,
      total: q.total,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    };
    const list = loadBookings();
    list.unshift(booking);
    const saved = saveBookings(list);
    const wrap = h('div');
    wrap.innerHTML = `
      <p>Thank you, ${esc(d.name.split(' ')[0])}. Your reservation is confirmed.</p>
      <div class="ref">${booking.ref}</div>
      <div class="summary">
        <div class="row"><span>${r.name}</span><span>${n} night${n > 1 ? 's' : ''}</span></div>
        <div class="row"><span>${pretty(d.checkIn)}</span><span>→ ${pretty(d.checkOut)}</span></div>
        <div class="row total"><span>Total</span><span>${money.format(q.total)}</span></div>
      </div>
      ${saved ? '' : '<p class="err">Note: your browser blocked storage, so this booking won’t be remembered after reload.</p>'}
      <div class="actions"><button class="btn-ghost" id="mine">View my bookings</button><button class="btn" id="done">Back to the lobby</button></div>`;
    wrap.querySelector('#mine').addEventListener('click', () => this.openMyBookings());
    wrap.querySelector('#done').addEventListener('click', () => this.dialog.close());
    this.dialog.open({ eyebrow: 'Booking confirmed', title: 'See you soon ✦', content: wrap, narrow: true });
    this.hud.toast(`Reservation ${booking.ref} confirmed`, 'ok');
    const cb = this.onConfirmed;
    this.resetDraft();
    if (cb) cb(booking, this.speaker);
  }

  openMyBookings() {
    const list = loadBookings();
    const wrap = h('div');
    if (!list.length) {
      wrap.innerHTML = `<p>No reservations yet.</p><div class="actions"><span></span><button class="btn" id="book">Book a stay</button></div>`;
      wrap.querySelector('#book').addEventListener('click', () => this.open(this.speaker));
    } else {
      wrap.innerHTML = '<div class="booking-list"></div>';
      const l = wrap.querySelector('.booking-list');
      for (const b of list) {
        const row = h(
          'div',
          { class: `booking-item${b.status === 'cancelled' ? ' cancelled' : ''}` },
          `<div><div class="t">${esc(b.roomName)}</div>
           <div class="s">${esc(b.ref)} · ${pretty(b.checkIn)} → ${pretty(b.checkOut)} · ${b.guests} guest${b.guests > 1 ? 's' : ''} · ${money.format(b.total)}</div></div>
           <div style="display:flex;gap:8px;align-items:center"><span class="tag ${b.status === 'confirmed' ? 'ok' : ''}">${b.status}</span></div>`,
        );
        if (b.status === 'confirmed') {
          const btn = h('button', { class: 'btn-ghost' }, 'Cancel');
          btn.addEventListener('click', () => {
            if (btn.dataset.armed !== '1') {
              btn.dataset.armed = '1';
              btn.textContent = 'Tap again to cancel';
              return;
            }
            const all = loadBookings();
            const it = all.find((x) => x.ref === b.ref);
            if (it) it.status = 'cancelled';
            saveBookings(all);
            this.hud.toast(`Reservation ${b.ref} cancelled`);
            this.openMyBookings();
          });
          row.lastElementChild.appendChild(btn);
        }
        l.appendChild(row);
      }
    }
    this.dialog.open({ eyebrow: 'Reservations', title: 'My bookings', content: wrap });
  }
}
