// Shuck Shack — tunable game variables.
window.SHUCK_CONFIG = {
  title: 'Shuck Shack',
  arcadeUrl: null,            // e.g. 'https://stephen-petronis.github.io/monster-pizza/' to show a "Back to Monster Pizza" link

  // ---------------- Career ----------------
  startCash: 0,
  devMode: true,               // shows "Dev mode" on the title screen (pick restaurant, add cash); set false to hide
  levelSkipper: true,          // shows "Level skipper" in the Move up tab (for testing); set false to hide

  // Restaurants, in order. Each shift is one order. Moving up costs cash.
  //   orderMin/orderMax: oysters per order (picked in steps of 6)
  //   secsPerOyster:     clock you get per oyster (before the ice bin)
  //   pay:               dollars per oyster for an "OKAY" grade
  //   background:        optional counter art for this place (falls back to the shack counter)
  //   tint:              color wash over the counter so each place feels different
  //   barnacles:         [min, max] barnacles per oyster that must be flicked off first
  //   startStars:        reputation you start with there
  //   lemonRequired:     oysters served without a lemon pay half
  //   lemonButton:       the octopus lemon button shows up during shifts (tap it, slice the lemon for more wedges)
  //   scenes:            the place from outside at day / sunset / night / sunrise; shown behind the menus
  //                      and as a timelapse between shifts. Leave out to skip the timelapse.
  venues: [
    { id: 'shack',     name: 'Beach Shack',        cost: 0,    startStars: 1,    orderMin: 12, orderMax: 12, secsPerOyster: 9,   pay: 3,
      blurb: 'A cooler, a cutting board and the ocean breeze. Locals want a dozen.', tint: null,
      scenes: { day: 'assets/shack_day.webp', sunset: 'assets/shack_sunset.webp',
                night: 'assets/shack_night.webp', sunrise: 'assets/shack_sunrise.webp' } },
    { id: 'boardwalk', name: 'Boardwalk Raw Bar',  cost: 200,  barnacles: [2, 3],  orderMin: 12, orderMax: 18, secsPerOyster: 7,   pay: 5,
      blurb: 'Not the freshest oysters. Flick the barnacles off before you shuck, or ouch.', tint: '#ffd9b0' },
    { id: 'pier', lemonRequired: true, lemonButton: true,      name: 'Pier 9 Oyster House', cost: 1200, barnacles: [2, 4], orderMin: 18, orderMax: 24, secsPerOyster: 5.5, pay: 8,
      blurb: 'A real restaurant with real tables. Two dozen at a time.', tint: '#cfe3ff' },
    { id: 'downtown', lemonRequired: true, lemonButton: true,  name: 'Downtown Oyster Bar', cost: 3500, barnacles: [3, 5], orderMin: 24, orderMax: 36, secsPerOyster: 4.5, pay: 12,
      blurb: 'After-work crowd, big platters, no patience.', tint: '#e6d2ff' },
    { id: 'palace', lemonRequired: true, lemonButton: true,    name: 'The Pearl Palace',    cost: 9000, barnacles: [3, 5], orderMin: 36, orderMax: 48, secsPerOyster: 3.6, pay: 18,
      blurb: 'Chandeliers and fancy hats. Four dozen, perfect, right now.', tint: '#ffe7a0' },
  ],

  // Things to buy. Tier 0 is what you start with.
  //   cut:   multiplies the chance of cutting your hand (lower is safer)
  //   taps:  napkin taps to bandage up
  //   time:  multiplies the shift clock
  //   cash:  multiplies everything you earn in a shift
  //   needs: a restaurant you must have opened before you can buy this
  gear: [
    { id: 'glove', name: 'Glove', tiers: [
      { name: 'Cotton Glove',     cost: 0,    cut: 1.0,  desc: 'Better than nothing. Barely.' },
      { name: 'Rubber Glove',     cost: 90,   cut: 0.75, desc: 'Cuts 25% less often.' },
      { name: 'Chainmail Glove',  cost: 450,  cut: 0.45, needs: 'boardwalk', desc: 'Real shuckers wear these. Cuts about half as often.' },
    ] },
    { id: 'aid', name: 'First aid', tiers: [
      { name: 'Paper Napkin',     cost: 0,    taps: 4, desc: '4 taps per cut to bandage up.' },
      { name: 'Bandage Box',      cost: 50,   taps: 3, desc: '3 taps per cut to bandage up.' },
      { name: 'First-Aid Kit',    cost: 180,  taps: 2, needs: 'boardwalk', desc: '2 taps per cut to bandage up.' },
      { name: 'Super Kit',        cost: 600,  taps: 1, needs: 'pier', desc: 'One tap per cut and you are back to work.' },
    ] },
    { id: 'ice', name: 'Ice bin', tiers: [
      { name: 'Small Cooler',     cost: 0,    time: 1.0,  desc: 'Normal shift clock.' },
      { name: 'Big Ice Bin',      cost: 140,  time: 1.15, desc: '15% more time every shift.' },
      { name: 'Walk-in Cooler',   cost: 700,  time: 1.3,  needs: 'pier', desc: '30% more time every shift.' },
    ] },
    { id: 'radio', name: 'Radio', tiers: [
      { name: 'No Radio',    cost: 0,  desc: 'Just the waves.' },
      { name: 'Beach Radio', cost: 40, desc: 'Three stations of 8-bit beach tunes. Tap the Radio button to switch.' },
    ] },
    { id: 'fins', name: 'Flippers', tiers: [
      { name: 'Bare Flippers',   cost: 0,   swim: 1.0,  desc: "Barry's own flippers. Slow and floaty." },
      { name: 'Swim Fins',       cost: 120, swim: 1.3,  needs: 'boardwalk', desc: 'Barry swims 30% faster.' },
      { name: 'Turbo Fins',      cost: 500, swim: 1.65, needs: 'pier', desc: 'Zoom. 65% faster.' },
    ] },
    { id: 'lungs', name: 'Lungs', tiers: [
      { name: 'Normal Lungs',    cost: 0,   breath: 1.0, desc: 'A few dives, then he needs air.' },
      { name: 'Breathing Lessons', cost: 150, breath: 1.35, needs: 'boardwalk', desc: '35% more breath per dive trip.' },
      { name: 'Big Walrus Lungs', cost: 600, breath: 1.8, needs: 'pier', desc: 'Almost twice the breath.' },
    ] },
    { id: 'bag', name: 'Flipper bag', tiers: [
      { name: 'Small Net Bag',   cost: 0,   bag: 3, desc: 'Holds 3 oysters before the dock.' },
      { name: 'Big Net Bag',     cost: 100, bag: 5, needs: 'boardwalk', desc: 'Holds 5 oysters.' },
      { name: 'Huge Basket',     cost: 450, bag: 8, needs: 'pier', desc: 'Holds 8 oysters.' },
    ] },
    { id: 'dgrip', name: 'Dive grip', tiers: [
      { name: 'Bare Tusks',      cost: 0,   mash: 1.0, desc: 'Big oysters usually get away.' },
      { name: 'Tusk Polish',     cost: 140, mash: 1.6, needs: 'boardwalk', desc: 'Each smash counts 60% more on big oysters.' },
      { name: 'Oyster Tongs',    cost: 550, mash: 2.3, needs: 'pier', desc: 'Big oysters barely stand a chance.' },
    ] },
    { id: 'jar', name: 'Tip jar', tiers: [
      { name: 'Paper Cup',        cost: 0,    cash: 1.0,  desc: 'No extra tips.' },
      { name: 'Glass Jar',        cost: 120,  cash: 1.2,  desc: '20% more cash every shift.' },
      { name: 'Giant Fishbowl',   cost: 900,  cash: 1.5,  needs: 'pier', desc: '50% more cash every shift.' },
    ] },
  ],

  // ---------------- Knives ----------------
  // Every knife has six stats from 0 to 5. Higher tiers have more points to spread around,
  // so each knife is good at something and you pick the one that fits the job.
  //   steady:  less shake overall (a 5 barely shakes, even moving fast)
  //   control: how fast you can move before the shake kicks in
  //   quick:   how closely the blade keeps up with your finger (less drag)
  //   grip:    how forgiving the trace line is
  //   flick:   how easy barnacles are to flick off (slower swipes count, bigger reach)
  //   safe:    how rarely you cut yourself
  // Tier points: tier 1 = 4, tier 2 = 6, tier 3 = 8.  needs: a restaurant that must be open first.
  knifeTiers: [
    { name: 'Starter', points: 1 },
    { name: 'Tier 1', points: 4 },
    { name: 'Tier 2', points: 6, needs: 'boardwalk' },
    { name: 'Tier 3', points: 8, needs: 'pier' },
  ],
  knives: [
    { id: 'rusty',     tier: 0, cost: 0,    look: 'rust',   name: 'Rusty Knife',      stats: { flick: 1 },
      desc: 'Wobbly, dull and slow. It came with the shack.' },
    { id: 'steel',     tier: 1, cost: 60,   look: 'steel',  name: 'Steel Shucker',    stats: { steady: 1, control: 1, quick: 1, grip: 1 },
      desc: 'A little better at everything.' },
    { id: 'buster',    tier: 1, cost: 70,   look: 'red',    name: 'Barnacle Buster',  stats: { flick: 3, quick: 1 },
      desc: 'Barnacles fly off with a lazy swipe. Still shaky.' },
    { id: 'reliable',  tier: 1, cost: 70,   look: 'black',  name: 'Old Reliable',     stats: { steady: 2, safe: 2 },
      desc: 'Steady and safe, as long as you take your time.' },
    { id: 'boston',    tier: 2, cost: 260,  look: 'blue',   name: 'Pro Boston Knife', stats: { steady: 2, control: 1, quick: 2, grip: 1 },
      desc: 'The all-rounder real shuckers use.' },
    { id: 'surgeon',   tier: 2, cost: 300,  look: 'teal',   name: 'The Surgeon',      stats: { steady: 3, grip: 3 },
      desc: 'Pinpoint traces. Drags behind a fast finger.' },
    { id: 'speedster', tier: 2, cost: 300,  look: 'copper', name: 'Speedster',        stats: { control: 3, quick: 3 },
      desc: 'Built for going fast. Hard to be precise.' },
    { id: 'flicker',   tier: 2, cost: 280,  look: 'green',  name: 'Flick Master',     stats: { flick: 4, quick: 1, safe: 1 },
      desc: 'Barnacles? What barnacles?' },
    { id: 'golden',    tier: 3, cost: 1500, look: 'gold',   name: 'Golden Shucker',   stats: { steady: 2, control: 2, quick: 2, grip: 1, safe: 1 },
      desc: 'Shiny and great at everything.' },
    { id: 'scalpel',   tier: 3, cost: 1600, look: 'teal',   name: 'The Scalpel',      stats: { steady: 4, grip: 4 },
      desc: 'Perfect lines, every time. Slow and draggy.' },
    { id: 'lightning', tier: 3, cost: 1600, look: 'blue',   name: 'Lightning',        stats: { quick: 4, control: 4 },
      desc: 'Zero drag, zero shake at full speed. Line is strict.' },
    { id: 'flickking', tier: 3, cost: 1500, look: 'green',  name: 'Flick King',       stats: { flick: 5, quick: 2, safe: 1 },
      desc: 'Barnacles leave on their own when they see it.' },
  ],

  // ---------------- Suppliers ----------------
  // Bought separately at each restaurant. Better oysters: fewer barnacles and they sell for more.
  // cost = that restaurant's pay x costMult
  suppliers: [
    { name: 'Bucket off the Dock', barnacles: 0,  pay: 1.0,  costMult: 0,   desc: 'Whatever washed up.' },
    { name: 'Local Fisherman',     barnacles: -1, pay: 1.1,  costMult: 25,  desc: 'Fewer barnacles. Oysters sell for 10% more.' },
    { name: 'Oyster Farm',         barnacles: -2, pay: 1.2,  costMult: 70,  desc: 'Clean shells. Oysters sell for 20% more.' },
    { name: 'Premium Farm',        barnacles: -3, pay: 1.35, costMult: 160, desc: 'Spotless and famous. Oysters sell for 35% more.' },
  ],

  // ---------------- Lemons and oyster supply ----------------
  // Lemon Toss stocks lemon wedges. Every oyster served with a lemon earns a lemon tip.
  // Oysters come from your own catch first (free, from Barry's Dive), then the supplier (costs money).
  lemonTip: 0.5,               // lemon tip = restaurant pay x this, per oyster served with a lemon
  lemonCap: 60,                // most lemon wedges you can keep
  oysterCost: 0.4,             // supplier price per oyster = restaurant pay x this (x1.25 per supplier upgrade)
  bigOysterPay: 1.5,           // big oysters you caught yourself sell for this much more
  stockCap: 40,
  lemonButtonCooldown: 1.5,
  swipeSpeed: 2.2,            // finger faster than this (screen-widths per second) = a SWIPE: flicks barnacles and
                              // slices lemons but never traces the shell. Slower = drawing (shucking).
  swipeHold: 0.15,            // seconds a swipe stays a swipe after you slow down   // seconds between octopus lemon throws                // most caught oysters the cooler holds
  diveFrom: 'shack',           // Barry's Dive shows up as a prep choice from this restaurant on

  // Money
  gradePay: [2.0, 1.6, 1.3, 1.0, 0.7, 0.35],   // pay multiplier for each grade below, best first
  speedTipFactor: 0.5,         // extra pay when an oyster is shucked under par
  parFactor: 0.6,              // par = secsPerOyster * this
  timeBonusRate: 0.1,          // finish early: seconds left * pay * this
  shiftExtraTime: 5,           // free seconds added to every shift clock

  // ---------------- Tracing ----------------
  spinAfterShifts: 1,          // oysters start landing at an angle after this many shifts
  spinPerShiftDeg: 45,         // how much wider the angle range gets each shift (either direction)
  spinMaxDeg: 180,             // 180 = any angle
  traceTolerance: 0.075,       // how close to the line counts, as a fraction of oyster size
  coverageToFinish: 0.97,      // share of the outline you must trace before it pops
  minTolerancePx: 14,

  // Grades, best first. minAccuracy is 0..1.
  grades: [
    { name: 'SUPER SHUCKER!', minAccuracy: 0.88, color: '#ffd23f' },
    { name: 'FANTASTIC!',     minAccuracy: 0.76, color: '#7be0ff' },
    { name: 'GREAT!',         minAccuracy: 0.62, color: '#8df27a' },
    { name: 'OKAY',           minAccuracy: 0.46, color: '#fff3d6' },
    { name: 'PASSABLE',       minAccuracy: 0.28, color: '#f6b26b' },
    { name: 'TERRIBLE',       minAccuracy: 0,    color: '#ff6b5b' },
  ],

  // ---------------- Reputation ----------------
  starsToUnlock: 5,            // reputation stars needed at a place before the next one can be bought
  starUpAt: 4,                 // a shift rated this many stars or more adds a reputation star
  starDownAt: 2,               // a shift rated this or less takes one away

  // ---------------- Oops! ----------------
  safeOysters: 1,              // no cuts on the first oysters of each shift
  randomCutChance: 0.05,       // chance per oyster of a random slip (before knife and glove)
  slipCutChance: 0.55,         // chance each time the knife wanders far off the line
  slipDistance: 2.4,           // "far off" = this many tolerances away
  flickSpeed: 1.4,             // how fast a swipe must be to flick a barnacle (screen sizes per second)
  slipCooldown: 0.6,           // seconds between slip checks
  cutStun: 0.6,                // seconds you can't shuck after a cut
  woundWobble: 0.012,          // extra knife shake per open cut
  dripEvery: 1.1,              // seconds between blood drips with one open cut (faster with more)
  bloodPenalty: 1.0,           // a bloody oyster pays nothing and costs this many times its pay

  // ---------------- Skills ----------------
  // Each tree fills from its own kind of play. A full bar lets you learn that tree's next perk.
  skills: {
    costs: [250, 600, 1200, 2000],          // XP for perk 1, 2, 3, 4 in every tree
    xp: { accPerOyster: 10,              // times accuracy (0..1)
          spdFast: 8, spdOk: 4, spdSlow: 1,   // per oyster: under par / under 1.5x par / slower
          bldPerCut: 25, bldPerBloody: 5,
          lemonPerQuartered: 3 },        // Lemon Toss gives Speed XP
    levelXp: 400,                        // overall player level: every this much total XP (grows a little each level)
    trees: [
      { id: 'acc', name: 'Accuracy', color: '#4fc3e8', how: 'Earn it with clean, close traces.', perks: [
        { name: 'Sharp Eye',   desc: 'Oysters pop after tracing 85% of the shell.' },
        { name: 'Steady Hand', desc: 'Your knife shakes half as much.' },
        { name: 'Eagle Eye',   desc: 'Oysters pop after tracing just 75%.' },
        { name: 'Bullseye',    desc: 'Fantastic and Super Shucker oysters pay 25% more, and the line is more forgiving.' },
      ] },
      { id: 'spd', name: 'Speed', color: '#5cc94a', how: 'Earn it by shucking under par.', perks: [
        { name: 'Fast Grabber',   desc: 'Oysters slide in and out 35% faster.' },
        { name: 'Quick Hands',    desc: 'Your knife keeps right up with your finger.' },
        { name: 'Faster Grabber', desc: 'Oysters slide in and out 65% faster.' },
        { name: 'Speed Demon',    desc: 'Speedy tips are easier to get and pay double.' },
      ] },
      { id: 'bld', name: 'Bleeding', color: '#e8322a', how: 'Earn it by cutting yourself. Ouch.', perks: [
        { name: 'Quick Healer', desc: 'Bandages work twice as fast (half the taps).' },
        { name: 'Thick Skin',   desc: 'Takes a lot more to cut you. 40% fewer cuts.' },
        { name: 'Pro Bleeder',  desc: 'Your blood never lands on the oysters.' },
        { name: 'Regeneration', desc: 'Cuts heal on their own, no bandages needed. Blood goes everywhere. Except the oysters.' },
      ] },
    ],
  },

  // ---------------- Barry's Dive ----------------
  dive: {
    duration: 45,              // seconds
    items: 12,                 // shadows in the water at once (oysters and look-alike junk)
    jellyfish: 2,
    diveCost: 16,              // breath per dive (out of 100)
    diveTime: 0.7,             // seconds underwater per dive
    refill: 14,                // breath back per second while floating
    mashPer: 0.085,            // progress per DIVE smash on a big oyster (x dive grip)
    mashDecay: 0.5,            // big oyster pulls away this fast
    mashBreath: 18,            // breath per second while wrestling a big one
    gaspTime: 1.4,
  },

  // ---------------- Mini games (between shifts, just for fun) ----------------
  miniGames: true,             // offer a mini game after every shift
  lemonToss: {
    duration: 15,              // seconds of lemon throwing
    introTime: 1.6,
    startEvery: 0.9,           // seconds between throws at the start...
    endEvery: 0.45,            // ...and at the end
    sliceSpeed: 1.1,           // how fast the blade must move to slice (screen sizes per second)
    pointsPerQuarter: 10,
    fullLemonBonus: 30,        // all four quarters of one lemon
    comboBonus: 5,             // per cut, for 3+ cuts in one swipe
  },

  // Animation timings (seconds)
  orderUpTime: 1.4,
  slideInTime: 0.6,            // oysters arrive a bit slowly; Speed perks make this snappier
  shuckedHold: 1.0,
  slideOutTime: 0.45,
};
