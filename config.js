// Shuck Shack — tunable game variables.
window.SHUCK_CONFIG = {
  title: 'Shuck Shack',
  arcadeUrl: null,            // e.g. 'https://stephen-petronis.github.io/monster-pizza/' to show a "Back to Monster Pizza" link

  // ---------------- Career ----------------
  startCash: 0,

  // Restaurants, in order. Each shift is one order. Moving up costs cash.
  //   orderMin/orderMax: oysters per order (picked in steps of 6)
  //   secsPerOyster:     clock you get per oyster (before the ice bin)
  //   pay:               dollars per oyster for an "OKAY" grade
  //   background:        optional counter art for this place (falls back to the shack counter)
  //   tint:              color wash over the counter so each place feels different
  //   scenes:            the place from outside at day / sunset / night / sunrise; shown behind the menus
  //                      and as a timelapse between shifts. Leave out to skip the timelapse.
  venues: [
    { id: 'shack',     name: 'Beach Shack',        cost: 0,    orderMin: 12, orderMax: 12, secsPerOyster: 9,   pay: 3,
      blurb: 'A cooler, a cutting board and the ocean breeze. Locals want a dozen.', tint: null,
      scenes: { day: 'assets/shack_day.webp', sunset: 'assets/shack_sunset.webp',
                night: 'assets/shack_night.webp', sunrise: 'assets/shack_sunrise.webp' } },
    { id: 'boardwalk', name: 'Boardwalk Raw Bar',  cost: 300,  orderMin: 12, orderMax: 18, secsPerOyster: 7,   pay: 5,
      blurb: 'Tourists, seagulls and a neon sign. Busier, and the tips are better.', tint: '#ffd9b0' },
    { id: 'pier',      name: 'Pier 9 Oyster House', cost: 1200, orderMin: 18, orderMax: 24, secsPerOyster: 5.5, pay: 8,
      blurb: 'A real restaurant with real tables. Two dozen at a time.', tint: '#cfe3ff' },
    { id: 'downtown',  name: 'Downtown Oyster Bar', cost: 3500, orderMin: 24, orderMax: 36, secsPerOyster: 4.5, pay: 12,
      blurb: 'After-work crowd, big platters, no patience.', tint: '#e6d2ff' },
    { id: 'palace',    name: 'The Pearl Palace',    cost: 9000, orderMin: 36, orderMax: 48, secsPerOyster: 3.6, pay: 18,
      blurb: 'Chandeliers and fancy hats. Four dozen, perfect, right now.', tint: '#ffe7a0' },
  ],

  // Things to buy. Tier 0 is what you start with.
  //   cut:   multiplies the chance of cutting your hand (lower is safer)
  //   taps:  napkin taps to bandage up
  //   time:  multiplies the shift clock
  //   cash:  multiplies everything you earn in a shift
  //   look:  knife color (rust, steel, blue, gold)
  //   wobble: how much the knife shakes (fraction of oyster size)
  //   lag:   how far the knife drags behind your finger (seconds)
  //   grip:  how forgiving the trace line is (multiplies traceTolerance)
  //   needs: a restaurant you must have opened before you can buy this
  gear: [
    { id: 'knife', name: 'Knife', tiers: [
      { name: 'Rusty Knife',      cost: 0,    cut: 1.0,  look: 'rust',  wobble: 0.035, lag: 0.12,  grip: 0.8,
        desc: 'Wobbly, dull and slow. Slips a lot.' },
      { name: 'Steel Shucker',    cost: 60,   cut: 0.7,  look: 'steel', wobble: 0.02,  lag: 0.07,  grip: 0.92,
        desc: 'Steadier and quicker. Cuts 30% less often.' },
      { name: 'Pro Boston Knife', cost: 260,  cut: 0.45, look: 'blue',  wobble: 0.009, lag: 0.035, grip: 1.05, needs: 'boardwalk',
        desc: 'Smooth and fast. Cuts about half as often.' },
      { name: 'Golden Shucker',   cost: 1500, cut: 0.25, look: 'gold',  wobble: 0.002, lag: 0.01,  grip: 1.15, needs: 'pier',
        desc: 'Glides like butter. Hardly ever slips.' },
    ] },
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
    { id: 'jar', name: 'Tip jar', tiers: [
      { name: 'Paper Cup',        cost: 0,    cash: 1.0,  desc: 'No extra tips.' },
      { name: 'Glass Jar',        cost: 120,  cash: 1.2,  desc: '20% more cash every shift.' },
      { name: 'Giant Fishbowl',   cost: 900,  cash: 1.5,  needs: 'pier', desc: '50% more cash every shift.' },
    ] },
  ],

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
  slipCooldown: 0.6,           // seconds between slip checks
  cutStun: 0.6,                // seconds you can't shuck after a cut
  woundWobble: 0.012,          // extra knife shake per open cut
  dripEvery: 1.1,              // seconds between blood drips with one open cut (faster with more)
  bloodPenalty: 1.0,           // a bloody oyster pays nothing and costs this many times its pay

  // ---------------- Mini games (between shifts, just for fun) ----------------
  miniGames: true,             // offer a mini game after every shift
  lemonToss: {
    duration: 40,              // seconds of lemon throwing
    introTime: 1.6,
    startEvery: 1.5,           // seconds between throws at the start...
    endEvery: 0.6,             // ...and at the end
    sliceSpeed: 1.1,           // how fast the blade must move to slice (screen sizes per second)
    pointsPerQuarter: 10,
    fullLemonBonus: 30,        // all four quarters of one lemon
    comboBonus: 5,             // per cut, for 3+ cuts in one swipe
  },

  // Animation timings (seconds)
  orderUpTime: 1.4,
  slideInTime: 0.35,
  shuckedHold: 0.8,
  slideOutTime: 0.3,
};
