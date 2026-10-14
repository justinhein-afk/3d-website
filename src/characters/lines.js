import { HOTEL } from '../config.js';

export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const LINES = {
  staffGreet: [
    `Welcome to ${HOTEL.name}!`,
    'Good evening, welcome!',
    'Irasshaimase! Welcome!',
    'Hello! How may I help you?',
  ],
  receptionGreet: ['Welcome! Checking in today?', 'Good evening! May I help with a reservation?', 'Welcome — the front desk is just here.'],
  conciergeGreet: ['Welcome! Need a restaurant or a car?', 'Good evening! Ask me anything about Kyoto.', `Welcome to ${HOTEL.name}!`],
  teaGreet: ['Welcome to our tea pavilion.', 'Would you like to join a tea ceremony?'],
  waiterGreet: ['Café Aurelia is open — take any table!', 'Good evening! Something to drink?'],
  bellhopGreet: ['Mind the trolley, please!', 'Welcome! Need help with your luggage?'],
  receptionServe: [
    'Here is your key card — room 1208.',
    'Your suite is ready. Breakfast is from 7am.',
    'May I see your passport, please?',
    'Late checkout until 2pm? Of course.',
    'The spa is on the mezzanine level.',
  ],
  guestToDesk: ['Hi, checking in please.', 'Good evening! A reservation for two.', 'Could I get a late checkout?', 'Is the spa open tonight?'],
  guestSmallTalk: [
    'What a stunning lobby!',
    'Have you tried the matcha latte?',
    'That chandelier is beautiful.',
    'The tea ceremony was lovely.',
    'Our room has a river view!',
    'Hello there!',
    'Lovely evening, isn’t it?',
    'We’re off to Gion for dinner.',
  ],
  guestWaveBack: ['Hi!', 'Hello!', 'Konbanwa!', 'Hey there!'],
  waiterServe: ['Your matcha latte — enjoy!', 'One yuzu tonic, enjoy!', 'Black sesame cheesecake for you.', 'Anything else I can bring?'],
  conciergeWelcomeGuest: ['Welcome back!', 'Good evening, welcome!', 'Welcome! Reception is straight ahead.'],
};
