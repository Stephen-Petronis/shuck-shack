# Shuck Shack roadmap

The same core game (trace the shell, pop the top) gets a little harder and faster at each restaurant,
and each restaurant teaches one new thing before the next one stacks on top.

## Stage 1: Beach Shack (tutorial) — DONE
- Fresh oysters, orders of a dozen, lots of time. About 4 good shifts gets you to 5 stars
  (you start at 1 star here) and enough cash to open the Boardwalk ($200).
- After each shift: Lemon Toss (15 seconds).

## Stage 2: Boardwalk Raw Bar — barnacles DONE, diving TODO
- Oysters aren't the freshest: **barnacles** on the shell. Flick them off with a fast swipe before you
  trace. Dragging the knife slowly over one cuts you.
- Oysters keep spinning.
- **Diving for oysters** mini game (TODO). You collect your own oysters for the day, which is why they
  have barnacles. Alternates with Lemon Toss to start; later, how many you catch = your inventory.

## Oyster supply: buy it or catch it yourself (design)
Oysters have to come from somewhere, and that's the choice between shifts:
- **Pay the supplier.** Upgrading the supplier (already in the game) means cleaner, pricier oysters, but it
  costs money every shift.
- **Catch them yourself in Barry's Dive.** It's cheaper: every oyster you catch is one you don't have to buy,
  so diving always subsidizes the supplier bill, even after you've upgraded the supplier.
- Skip diving and the oysters you get are the small, easy, cheap ones, which come with more barnacles.
- **Oyster size:** small ones are easy to grab but barnacle-y and cheap. Big ones are worth more money and
  fewer barnacles, but they get away fast: you have to smash the DIVE/GRAB button to hold on, and at
  first you basically can't land them until you buy better dive gear.
- **Dive gear (Gear tab):** flippers (swim faster), bigger lungs (more breath), bigger flipper bag, longer
  dive clock, stronger grip for big oysters. Could also be its own skill tree.
- Late game you can lean on a great supplier and dive less, but diving stays worth doing.
- Long-term goal: keep stacking jobs until it's a big multitasking game: dive, chop lemons, shuck,
  and eventually run the whole raw bar.

## Barry's Dive (mini game) — blueprint in docs/diving-blueprint.png
- Top-down like Animal Crossing. Barry the walrus paddles on the surface; shadows and bubbles show what's
  below; DIVE on a shadow. Lungs instead of an air tank; flipper bag; dock to drop off; jellyfish and currents.
- Big oysters flee: smash the button to catch them (see Oyster supply above).
- **Spot the oyster:** the water is full of look-alike junk in similar colors but different shapes: old
  shoes, starfish, rubber gloves, bottles, rocks. Part of getting good is learning which shadow/shape/color
  is really an oyster. Diving on junk wastes breath (and is funny: Barry pops up wearing a boot).

## Stage 3: Pier 9 — TODO
- **Timer mode:** no more fixed orders. Shuck as many as you can before the clock runs out.
- **Pearls and pea crabs:** sometimes something shows up inside an opened oyster for a very short
  moment. A pearl is bonus money. A pea crab pinches you (cut) if you tap it. About 50/50, so look closely.
- **Lemon gauge:** it drains while you shuck. When it runs out you can't serve oysters. A new button
  switches between the shucking board and the lemon station; you decide how long to chop before going back.

## Stage 4: final restaurant — TODO
- **Mayhem:** dive for oyster inventory, chop lemons, and shuck, switching between all three.
- Oysters are smaller, so you have to be more accurate.
- Mini game: **the nightmare.** Oysters chase you around your apartment; run and jump over the
  furniture until the timer runs out.
- (We have five restaurants today; decide whether Stage 4 is Downtown, The Pearl Palace, or both.)

## Radio upgrades — TODO
- Boombox → Walkman → a made-up music player → Bluetooth speaker. Each upgrade unlocks more stations.
  Stephen will bring new music ideas.

## Knives — DONE (first pass)
- 12 knives across Starter / Tier 1 (4 pts) / Tier 2 (6 pts) / Tier 3 (8 pts). Six stats: Steady, Control,
  Quick, Grip, Flick, Safe. Wobble now depends on how fast you move; good knives stay calm at speed.
  Pick which knife to use in Gear.
- TODO: special knife skills at higher tiers; more knives.

## Suppliers — DONE (first pass)
- Each restaurant has its own supplier to upgrade: fewer barnacles and oysters sell for more.
- TODO: new, harder oyster shapes from better (or weirder) suppliers.

## The whole raw bar (long-term)
- Lemons and oysters at the same time: one finger slicing lemons, one shucking.
- Then add shrimp cocktail, cherrystone clams, and more, until by the end you run a whole raw bar at once.

## Tuning notes
- Leveling slowed down again: perk costs 250 / 600 / 1200 / 2000 XP, player level every 400 XP (growing).
- Barnacles ramp in: one per oyster at first, one more every 6 barnacle oysters, up to the restaurant's max.
