import { HOTEL, ROOMS, CONCIERGE_SERVICES, CAFE_MENU, TEA_SLOTS } from '../config.js';
import { h } from './dialog.js';

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: HOTEL.currency, maximumFractionDigits: 0 });
const REQ_KEY = 'aurelia.requests.v1';

function saveRequest(r) {
  try {
    const list = JSON.parse(localStorage.getItem(REQ_KEY) || '[]');
    list.unshift({ ...r, at: new Date().toISOString() });
    localStorage.setItem(REQ_KEY, JSON.stringify(list.slice(0, 50)));
  } catch {
    /* storage unavailable: request still confirmed for this session */
  }
}

const speakerOf = (s) => ({ name: s.name, role: s.role });

// Conversation trees for each staff role.
export function openConversation(app, staff) {
  const { dialog } = app;
  const sp = speakerOf(staff);
  const bye = { label: 'Thank you, that’s all.', onSelect: () => dialog.close() };
  switch (staff.roleId) {
    case 'reception':
      return dialog.open({
        speaker: sp,
        text: `Welcome to ${HOTEL.name}! How may I help you this evening?`,
        choices: [
          { label: 'I’d like to book a room', sub: 'See rooms, dates and prices', onSelect: () => app.booking.open(sp) },
          { label: 'Show my reservations', sub: 'View or cancel a booking', onSelect: () => app.booking.openMyBookings() },
          { label: 'What are the check-in times?', onSelect: () => checkInInfo(app, staff) },
          { label: 'Tell me about the hotel', onSelect: () => openInfo(app, 'about', staff) },
          bye,
        ],
      });
    case 'concierge':
      return dialog.open({
        speaker: sp,
        text: 'Good evening! I can arrange anything you need during your stay.',
        choices: [
          ...CONCIERGE_SERVICES.map((s) => ({ label: `${s.icon}  ${s.name}`, sub: s.detail, onSelect: () => serviceRequest(app, staff, s) })),
          { label: 'Show me around the lobby', sub: 'Jump to a place', onSelect: () => tour(app, staff) },
          bye,
        ],
      });
    case 'waiter':
      return cafeMenu(app, staff);
    case 'tea':
      return dialog.open({
        speaker: sp,
        text: 'Welcome to the Tea Pavilion. Our ceremony takes about 45 minutes, with seasonal wagashi sweets.',
        choices: [
          ...TEA_SLOTS.map((t) => ({
            label: `Reserve the ${t} ceremony`,
            sub: 'Complimentary for hotel guests',
            onSelect: () => {
              saveRequest({ type: 'tea', slot: t });
              staff.say(`See you at ${t}!`, 3);
              app.hud.toast(`Tea ceremony reserved for ${t} (demo)`, 'ok');
              dialog.close();
            },
          })),
          {
            label: 'Tell me about the tea',
            onSelect: () =>
              dialog.open({
                speaker: sp,
                text: 'We whisk ceremonial-grade matcha from Uji, just south of Kyoto. The water is heated in an iron kettle and served in hand-thrown raku bowls.',
                choices: [{ label: 'Back', onSelect: () => openConversation(app, staff) }, bye],
              }),
          },
          bye,
        ],
      });
    case 'bellhop':
      return dialog.open({
        speaker: sp,
        text: 'Good evening! Can I help you with your luggage?',
        choices: [
          {
            label: 'Please send my bags to my room',
            onSelect: () => {
              saveRequest({ type: 'luggage' });
              staff.say('Right away!', 2.5);
              app.hud.toast('Your luggage will be delivered within 15 minutes (demo)', 'ok');
              dialog.close();
            },
          },
          {
            label: 'Where are the elevators?',
            onSelect: () =>
              dialog.open({
                speaker: sp,
                text: 'The elevators are in the west wing, past the library lounge — just beyond the lattice screens.',
                choices: [{ label: 'Take me there', onSelect: () => (dialog.close(), app.travel('elevators')) }, bye],
              }),
          },
          bye,
        ],
      });
    default:
      return dialog.close();
  }
}

function checkInInfo(app, staff) {
  app.dialog.open({
    speaker: speakerOf(staff),
    text: 'Check-in is from 3:00 pm and check-out is by 11:00 am. Please bring a photo ID. Early check-in and late check-out can be arranged when available.',
    choices: [
      { label: 'Book a room', onSelect: () => app.booking.open(speakerOf(staff)) },
      { label: 'Back', onSelect: () => openConversation(app, staff) },
    ],
  });
}

function serviceRequest(app, staff, service) {
  const wrap = h('div');
  const times = ['Today 18:00', 'Today 19:30', 'Today 21:00', 'Tomorrow 09:00', 'Tomorrow 14:00'];
  wrap.innerHTML = `
    <div class="form-grid">
      <label class="field">When<select name="when">${times.map((t) => `<option>${t}</option>`).join('')}</select></label>
      <label class="field">Guests<select name="n">${[1, 2, 3, 4].map((n) => `<option ${n === 2 ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <label class="field full">Notes (optional)<input name="notes" placeholder="Anything we should know?"></label>
    </div>
    <div class="actions"><button class="btn-ghost" id="back">← Back</button><button class="btn" id="go">Request</button></div>`;
  wrap.querySelector('#back').addEventListener('click', () => openConversation(app, staff));
  wrap.querySelector('#go').addEventListener('click', () => {
    const when = wrap.querySelector('[name=when]').value;
    const n = wrap.querySelector('[name=n]').value;
    saveRequest({ type: service.id, when, guests: n, notes: wrap.querySelector('[name=notes]').value });
    staff.say('Consider it done!', 2.8);
    app.hud.toast(`${service.name} requested for ${when} (${n} guest${n > 1 ? 's' : ''}) — demo`, 'ok');
    app.dialog.close();
  });
  app.dialog.open({ speaker: speakerOf(staff), text: service.detail, content: wrap });
}

function tour(app, staff) {
  const places = [
    ['reception', 'Front desk', 'Check in and book rooms'],
    ['cafe', 'Café Aurelia', 'Coffee, matcha and light bites'],
    ['tea', 'Tea Pavilion', 'Tea ceremony by the moon gate'],
    ['lounge', 'Library lounge', 'Quiet sofas and books'],
    ['elevators', 'Elevators', 'To the guest floors'],
    ['mezzanine', 'Mezzanine', 'Spa, ballroom and rooftop grill doors'],
  ];
  app.dialog.open({
    speaker: speakerOf(staff),
    text: 'Where would you like to go?',
    choices: places.map(([id, label, sub]) => ({ label, sub, onSelect: () => (app.dialog.close(), app.travel(id)) })),
  });
}

function cafeMenu(app, staff) {
  const wrap = h('div', { class: 'menu-list' });
  for (const item of CAFE_MENU) {
    const row = h('div', { class: 'menu-item' }, `<span class="name">${item.name}</span><span style="display:flex;align-items:center"><span class="price">${money.format(item.price)}</span></span>`);
    const btn = h('button', { class: 'btn-ghost' }, 'Order');
    btn.addEventListener('click', () => {
      app.dialog.close();
      app.hud.toast(`${item.name} ordered — ${staff.name} is on the way`, 'ok');
      app.npcs.waiterServePlayer(app.player, item, () => app.hud.toast(`Enjoy your ${item.name}! (added to your room bill — demo)`));
    });
    row.lastElementChild.appendChild(btn);
    wrap.appendChild(row);
  }
  app.dialog.open({ speaker: speakerOf(staff), text: 'Welcome to Café Aurelia! What can I bring you?', content: wrap });
}

// Website information pages (top navigation).
export function openInfo(app, page, staff) {
  const { dialog } = app;
  const back = staff ? [{ label: 'Back', onSelect: () => openConversation(app, staff) }] : [];
  switch (page) {
    case 'about':
      return dialog.open({
        eyebrow: HOTEL.city,
        title: HOTEL.name,
        text: `${HOTEL.tagline} A modern ryokan-inspired hotel on the Kamogawa river, with 186 rooms and suites, a kaiseki restaurant, a rooftop grill, an onsen spa and a tea pavilion. Walk around our lobby, meet the team, and book your stay with the front desk.`,
        choices: [
          { label: 'See rooms & suites', onSelect: () => app.booking.open() },
          { label: 'Credits', sub: 'Models and libraries used on this site', onSelect: () => openInfo(app, 'credits') },
          ...back,
        ],
      });
    case 'dining': {
      const wrap = h('div');
      wrap.innerHTML = `
        <h3>Café Aurelia · Lobby east wing</h3><p>Matcha, single-origin coffee, pastries and light bites. 7am – 11pm.</p>
        <h3>Kaiseki Aurelia · Level 2</h3><p>Seasonal multi-course Kyoto cuisine. Dinner 6pm – 10pm, reservations recommended.</p>
        <h3>Rooftop Grill · Level 14</h3><p>Robata grill and cocktails with views over Higashiyama. 5pm – midnight.</p>`;
      return dialog.open({
        eyebrow: 'Dining',
        title: 'Eat & drink',
        content: wrap,
        choices: [
          { label: 'Take me to the café', onSelect: () => (dialog.close(), app.travel('cafe')) },
          { label: 'Ask the concierge for a table', onSelect: () => (dialog.close(), app.travel('concierge')) },
        ],
      });
    }
    case 'spa': {
      const wrap = h('div');
      wrap.innerHTML = `<p>Aurelia Spa on the mezzanine offers private onsen baths, shiatsu, and hinoki aromatherapy. Open 9am – 10pm.</p>
        <div class="summary"><div class="row"><span>Shiatsu · 60 min</span><span>${money.format(140)}</span></div>
        <div class="row"><span>Private onsen · 45 min</span><span>${money.format(90)}</span></div>
        <div class="row"><span>Hinoki ritual · 90 min</span><span>${money.format(210)}</span></div></div>`;
      return dialog.open({
        eyebrow: 'Wellness',
        title: 'Spa & Wellness',
        content: wrap,
        choices: [
          { label: 'Show me the spa entrance', onSelect: () => (dialog.close(), app.travel('spa')) },
          { label: 'Book through the concierge', onSelect: () => (dialog.close(), app.travel('concierge')) },
        ],
      });
    }
    case 'location': {
      const wrap = h('div');
      wrap.innerHTML = `<div class="summary">
        <div class="row"><span>Address</span><span style="text-align:right">${HOTEL.address}</span></div>
        <div class="row"><span>Phone</span><span>${HOTEL.phone}</span></div>
        <div class="row"><span>Email</span><span>${HOTEL.email}</span></div>
        <div class="row"><span>Kyoto Station</span><span>15 min by taxi</span></div>
        <div class="row"><span>Kansai Airport</span><span>75 min by private car</span></div></div>`;
      return dialog.open({ eyebrow: 'Getting here', title: 'Location & contact', content: wrap });
    }
    case 'credits': {
      const wrap = h('div');
      wrap.innerHTML = `<p>Character models: <b>Quaternius</b> (CC0) via Poly Pizza — Business Man, Animated Woman, Casual Character, Adventurer, Worker, Man in Suit, Woman in Dress, Woman Casual, Woman.</p>
        <p>3D engine: three.js (MIT). Fonts: Cormorant Garamond &amp; Manrope (SIL OFL). All lobby textures are generated in code.</p>
        <p>This is a demo site: bookings and requests are stored only in your browser.</p>`;
      return dialog.open({ eyebrow: 'About this site', title: 'Credits', content: wrap, narrow: true });
    }
    default:
      return null;
  }
}

export function roomCount() {
  return ROOMS.length;
}
