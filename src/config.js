// Central place for hotel content. Change the name, rooms or prices here.

export const HOTEL = {
  name: 'The Aurelia',
  short: 'AURELIA',
  tagline: 'A grand lobby, a quiet welcome.',
  city: 'Kyoto Riverside',
  phone: '+81 75 000 1234',
  email: 'stay@aurelia-hotel.example',
  address: '12 Kamogawa Promenade, Higashiyama, Kyoto',
  currency: 'USD',
  taxRate: 0.1,
  serviceFee: 25,
  bookingPrefix: 'AUR',
};

export const ROOMS = [
  {
    id: 'deluxe-king',
    name: 'Deluxe King',
    rate: 240,
    size: '38 m²',
    maxGuests: 2,
    bed: '1 King bed',
    view: 'City view',
    blurb: 'Warm oak, linen and a rain shower. Our most-loved room for two.',
    hues: ['#c9a675', '#5b4630'],
  },
  {
    id: 'premier-twin',
    name: 'Premier Twin',
    rate: 280,
    size: '42 m²',
    maxGuests: 3,
    bed: '2 Queen beds',
    view: 'Garden view',
    blurb: 'Two queen beds, a reading nook and a view over the bamboo garden.',
    hues: ['#9fb38a', '#3e4a33'],
  },
  {
    id: 'zen-suite',
    name: 'Zen Garden Suite',
    rate: 460,
    size: '68 m²',
    maxGuests: 3,
    bed: '1 King bed + tatami lounge',
    view: 'Private garden',
    blurb: 'A tatami lounge, hinoki soaking tub and a private moss garden.',
    hues: ['#d8c7a8', '#6b5a41'],
  },
  {
    id: 'presidential',
    name: 'Aurelia Presidential',
    rate: 1250,
    size: '160 m²',
    maxGuests: 4,
    bed: '2 King bedrooms',
    view: 'River panorama',
    blurb: 'Two bedrooms, a dining salon, butler service and a river panorama.',
    hues: ['#e3c27a', '#3b2a17'],
  },
];

export const CONCIERGE_SERVICES = [
  { id: 'spa', name: 'Spa & Onsen', detail: 'Book a 60-min massage or private onsen session.', icon: '♨' },
  { id: 'dinner', name: 'Restaurant Reservation', detail: 'A table at Kaiseki Aurelia or the Rooftop Grill.', icon: '🍽' },
  { id: 'airport', name: 'Airport Transfer', detail: 'Private car to Kansai or Itami airport.', icon: '🚘' },
  { id: 'tour', name: 'City Tour', detail: 'Half-day guided tour of Gion and Higashiyama.', icon: '⛩' },
  { id: 'laundry', name: 'Laundry & Pressing', detail: 'Same-day laundry, pressing and shoe shine.', icon: '👔' },
];

export const CAFE_MENU = [
  { id: 'matcha', name: 'Ceremonial Matcha Latte', price: 9 },
  { id: 'espresso', name: 'Double Espresso', price: 6 },
  { id: 'yuzu', name: 'Yuzu Sparkling Tonic', price: 8 },
  { id: 'cake', name: 'Black Sesame Cheesecake', price: 11 },
  { id: 'sando', name: 'Wagyu Katsu Sando', price: 24 },
];

export const TEA_SLOTS = ['10:00', '13:00', '15:30', '18:00'];

// Quality presets. "auto" picks one from the device and measured frame rate.
export const QUALITY = {
  low: { pixelRatio: 1, reflector: false, bloom: false, shadows: false, guests: 6, shadowSize: 1024 },
  medium: { pixelRatio: 1.25, reflector: true, reflectorScale: 0.5, bloom: true, shadows: true, guests: 10, shadowSize: 1024 },
  high: { pixelRatio: 2, reflector: true, reflectorScale: 0.75, bloom: true, shadows: true, guests: 14, shadowSize: 2048 },
};

export const PLAYER_AVATARS = [
  { id: 'casual', model: 'casual', label: 'Traveller' },
  { id: 'woman_a', model: 'woman_a', label: 'Explorer' },
  { id: 'adventurer', model: 'adventurer', label: 'Backpacker' },
];
