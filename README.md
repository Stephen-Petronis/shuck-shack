# Shuck Shack

Trace around each oyster to pop its top shell. Every shift is one order on the clock. Neat, fast shucking earns cash and speedy tips. Spend it on better knives, gloves, first aid, a bigger ice bin and a tip jar, then earn a 5-star reputation and save up to move from the Beach Shack to the Boardwalk, Pier 9, Downtown and finally The Pearl Palace. Cheap knives wobble and drag behind your finger; better ones get smooth and fast. Wander off the line and you can cut yourself. Keep working while bleeding and blood can drip into the oysters, which costs money; cut yourself again before bandaging and it takes more napkin taps. Progress saves in the browser.

## Drop into Monster Pizza
Copy this folder into the repo (for example `games/shuck-shack/`) and link the arcade cabinet to `games/shuck-shack/index.html`. To show a "Back to Monster Pizza" link on the title and game-over tickets, set `arcadeUrl` in `config.js` (for example `'../../'`).

## Files
- `config.js` — every tunable: restaurants (order size, clock, pay, unlock cost), gear and prices, grade pay, cut chances.
- `shapes.js` — the trace outline for each oyster, generated from the art.
- `game.js` — the game.
- `assets/` — counter, napkin, arm pieces (hand, cuff), and top/bottom sprites per oyster.

## Adding an oyster shape
Add `assets/oyster_<name>_top.webp` and `_bottom.webp` (square, transparent, same framing) and an outline entry in `shapes.js`.

## Giving a restaurant its own look
Each place in `venues` takes an optional `background` (a counter drawing the same size and layout as `assets/counter.webp`). Without one, the shack counter is shown with that place's `tint`.

## Mini game: Lemon Toss
After every shift's receipt you can take a lemon break (or skip it). Your octopus buddy throws lemons up with his eight arms; swipe fast to slice each lemon in half, then slice the halves into quarters. Only quarters score, and quartering a whole lemon earns a bonus. It's just for fun and keeps a best score. Tune it under `lemonToss` in `config.js`, or set `miniGames: false` to turn it off.
Art: `lemon_beach.webp` (background), `tentacle0-3.webp` (arms), `lemon_whole/half/quarter_a/quarter_b.webp`. Arm sockets and angles are in `SOCKETS` in `game.js`.

## Time of day
Every shift happens in the daytime. Between shifts a timelapse plays: day → sunset → night → sunrise → day ("Closing time… / Night falls… / Rise and shine… / Open for business!"). Tap to skip. Each restaurant can have its own four scenes under `scenes` in `config.js` (day, sunset, night, sunrise); the Beach Shack uses `shack_*.webp`. A place without scenes skips the timelapse.
