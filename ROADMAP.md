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

## Prep time: pick your mini game — DONE (first pass)
- After every shift you pick ONE prep game. Each one feeds a different supply, so the choice is the strategy.
  - **Lemon Toss** → lemon wedges. Customers squeeze them nonstop all shift (faster as it gets busy). Any oyster
    served while you still have lemons earns a lemon tip. Fewer lemons, fewer tips.
    From Pier 9 on, an oyster with no lemon only pays half.
  - **Barry's Dive** → your own oysters in the cooler. They get shucked first and cost nothing; supplier oysters
    come off your pay. Small ones carry more barnacles; big ones pay 1.5×.
  - Coming: Cocktail Sauce, Knife Sharpening, and more. Later the menu fills up based on what you did that shift.
- **Octopus lemon button** (Pier 9 and up): tap the octopus during a shift, a lemon flies up, slice it to halves and
  then quarters with any finger. Each quarter = 1 wedge. The multitasking starts here.
- Dive gear in the shop: Flippers (swim speed), Lungs (breath), Flipper bag (how many you carry), Dive grip (big oysters).
- TODO: real art for Barry, the water and the junk (placeholders now); shrimp cocktail building during shifts.

## Expeditions (Stephen's idea) — TODO
- Spend big money on a trip — part vacation, part Anthony Bourdain adventure. You don't know what you'll find
  until you pay for it: rare knives and one-of-a-kind gear only come from expeditions.
- Every expedition has its own mini game. Beat it and you unlock the prize. Lose and the money's gone: pay again
  to go back and try again. ("Mental is metal.")
- Make leveling stretch out so it feels earned; the tip jar stays, expeditions sit on top as the big money sink.

## Ice — DONE (first pass): Iceberg Harpoon
- Stephen's pick: the berg is a web of chunks joined by lines, bottom row frozen into the sea. Barry gets 3 harpoons;
  a hit rips out that chunk plus anything joined by CRACKED lines, and whatever isn't connected to the bottom falls
  off (like Puzzle Bobble). Find the weak necks. Barry's "par" is his own greedy best.
- Ice melts all shift from the Boardwalk on; out of ice = warm oysters at 75% pay. Ice gauge under the lemon gauge.

## Ice — original ideas
- What ice does: keeps the cooler oysters fresh and the raw bar looking good. It melts all shift like lemons drain.
  Run out and cooler oysters spoil / customers pay less.
- Mini game ideas:
  - **Harpoon the iceberg** (Stephen's): artillery-style. Set angle + power, lob a harpoon over the water at
    drifting icebergs (far = bigger chunk). Wind, waves, and seals in the way.
  - **Chip the block**: a giant ice block with crack lines; swipe along the cracks to chip off cubes into a bucket.
    Hit wrong and it shatters into slush.
  - **Barry's belly slide**: Barry slides down a glacier collecting ice chunks, dodging rocks and penguins.
  - Combo: harpoon a berg, tow it back, then chip it.

## Gear menu — DONE
- Gear tab split into Knives / Kitchen / Supplier / Diving / Ice / Lemons.

## RULE (Stephen): every mini game gets its own upgrade tab
- Every mini game, every new edition, needs money you can spend to get better at it and push the numbers up.
  Barry makes more money the more he puts back in. Keep repeating and amplifying the same gameplay.
  - Ice: harpoons (start with 1, up to 5), harpoon head (wide / Big Bertha), boat (bigger bergs + bigger ice bin), sight.
  - Lemons: lemon crate (wedge cap), octopus stamina (longer Lemon Toss), octopus buddy (faster in-shift throws).
  - Diving: flippers, lungs, flipper bag, dive grip.

## Franchise mode (Stephen's idea) — TODO
- Run 2, then 4, then 6 shucking windows at once. Everything gets smaller and harder; tap a window to zoom in.

## The whole raw bar (long-term)
- Lemons and oysters at the same time: one finger slicing lemons, one shucking.
- Then add shrimp cocktail, cherrystone clams, and more, until by the end you run a whole raw bar at once.

## Tuning notes
- Leveling slowed down again: perk costs 250 / 600 / 1200 / 2000 XP, player level every 400 XP (growing).
- Barnacles ramp in: one per oyster at first, one more every 6 barnacle oysters, up to the restaurant's max.
