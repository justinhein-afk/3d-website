# The Aurelia — 3D hotel lobby website

This is a hotel website you explore like an open-world game. You walk around a luxury lobby, meet the staff, watch guests come and go, and book a room at the front desk.

## Run it

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually http://localhost:5173).

To make a production build:

```bash
npm run build
```

`npm run preview` serves the build from `dist/`, which you can upload to any static host.

> The npm scripts call `node node_modules/vite/bin/vite.js` directly because the `&` in this folder's path breaks npm's Windows `.cmd` shims.

## Controls

| Action | Desktop | Touch |
| --- | --- | --- |
| Move | W A S D / arrow keys | Left joystick |
| Run | Shift | Push the stick fully, or tap **Run** |
| Look | Mouse (click to lock), or drag | Drag anywhere |
| Talk to staff / greet guests | E | **Talk** |
| Wave | G | **Wave** |
| First / third person | V | **View** |
| Map / help / menu | M / H / Esc | — |

## What's inside

- **Lobby** (`src/world/`): a two-storey atrium modelled on the reference photos. It has polished reflective marble, a backlit walnut coffered ceiling, LED coves, a crystal chandelier, sculptural bonsai on lit plinths, and a feature wall with the logo and gold landscape art. The west wing holds the library lounge, the elevators and a tea pavilion with a moon gate. The east wing holds a café with a plant wall and floating shelves. A staircase leads up to the mezzanine.
- **Staff** (`src/characters/Staff.js`, roster in `NPCManager.js`):
  - Mei, Kenji and Sofia work the front desk.
  - Haruto is the concierge.
  - Yuki runs the tea pavilion.
  - Luca serves café orders and walks your order over to you.
  - Taro pushes a luggage trolley around the lobby.
  
  Staff turn towards you, wave and speak when you come close.
- **Guests** (`src/characters/Guest.js`): they arrive through the entrance or the elevators, wander around, admire the art, sit on sofas and café chairs, queue at the desk, and leave. Path finding uses an A* grid built from the collision boxes (`src/world/navigation.js`).
- **Booking** (`src/ui/booking.js`): pick a room, dates and guests, enter your details, review, and get a confirmation reference like `AUR-7XK2Q9`. Bookings are saved in `localStorage` and can be viewed or cancelled under **My Bookings**.

## Customising

- **Hotel name, city, contact, rooms, prices, menus, tea times:** `src/config.js`
- **Staff names, uniforms and positions:** the `STAFF` list in `src/characters/NPCManager.js`
- **Guest looks:** `GUEST_TYPES` in the same file
- **Quality presets** (reflections, bloom, shadows, guest count): `QUALITY` in `src/config.js`. "Auto" picks a preset and steps down if the frame rate drops.

## Connecting a real booking backend

`Booking.confirm()` in `src/ui/booking.js` builds the booking object and saves it locally. To use a real backend, replace `saveBookings()` and `loadBookings()` with calls to your API, for example Supabase or your own server. The rest of the flow doesn't change.

## Credits

See [CREDITS.md](CREDITS.md). The characters are CC0 models by Quaternius.
