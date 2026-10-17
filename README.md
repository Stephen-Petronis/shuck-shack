# Shuck Shack

Trace around each oyster to pop its top shell. Neater traces earn better grades, faster shucks multiply the points. Order N is N dozen, and the clock gets tighter each order.

## Drop into Monster Pizza
Copy this folder into the repo (for example `games/shuck-shack/`) and link the arcade cabinet to `games/shuck-shack/index.html`. To show a "Back to Monster Pizza" link on the title and game-over tickets, set `arcadeUrl` in `config.js` (for example `'../../'`).

## Files
- `config.js` — every tunable: tolerance, par time, clock, grades, cut chances, napkin taps.
- `shapes.js` — the trace outline for each oyster, generated from the art.
- `game.js` — the game.
- `assets/` — counter, napkin, arm pieces (hand, cuff), and top/bottom sprites per oyster.

## Adding an oyster shape
Add `assets/oyster_<name>_top.webp` and `_bottom.webp` (square, transparent, same framing) and an outline entry in `shapes.js`.
