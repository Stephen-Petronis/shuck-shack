# Shuck Shack

Trace around each oyster to pop its top shell. Every shift is one order on the clock. Neat, fast shucking earns cash and speedy tips. Spend it on better knives, gloves, first aid, a bigger ice bin and a tip jar, then save up to move from the Beach Shack to the Boardwalk, Pier 9, Downtown and finally The Pearl Palace. Progress saves in the browser.

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
