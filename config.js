// Shuck Shack — tunable game variables.
window.SHUCK_CONFIG = {
  title: 'Shuck Shack',
  arcadeUrl: null,            // e.g. '../../' to show a "Back to Monster Pizza" button

  // Orders: order N is N dozen oysters.
  oystersPerDozen: 12,

  // Tracing
  traceTolerance: 0.075,      // how close to the line counts, as a fraction of oyster size
  coverageToFinish: 0.97,     // share of the outline you must trace before it pops
  minTolerancePx: 14,

  // Speed. Par time is how long one oyster "should" take; it shrinks every order.
  parTime: 5.0,               // seconds per oyster on order 1
  parShrink: 0.9,             // multiply par by this each new order
  minParTime: 1.8,
  orderTimeFactor: 1.7,       // order clock = oysters * par * this + orderTimeBonus
  orderTimeBonus: 6,
  speedMultMin: 0.5,
  speedMultMax: 3.0,

  // Scoring: points = (basePoints + accuracy * accuracyPoints) * speed multiplier
  basePoints: 20,
  accuracyPoints: 180,

  // Grades, best first. minAccuracy is 0..1.
  grades: [
    { name: 'SUPER SHUCKER!', minAccuracy: 0.88, color: '#ffd23f' },
    { name: 'FANTASTIC!',     minAccuracy: 0.76, color: '#7be0ff' },
    { name: 'GREAT!',         minAccuracy: 0.62, color: '#8df27a' },
    { name: 'OKAY',           minAccuracy: 0.46, color: '#fff3d6' },
    { name: 'PASSABLE',       minAccuracy: 0.28, color: '#f6b26b' },
    { name: 'TERRIBLE',       minAccuracy: 0,    color: '#ff6b5b' },
  ],

  // Oops! Cut hand
  safeOysters: 4,             // no cuts during the first few oysters of a game
  randomCutChance: 0.05,      // chance per oyster of a random slip
  slipCutChance: 0.18,        // chance when your finger wanders far off the line
  slipDistance: 3.2,          // "far off" = this many tolerances away
  napkinTaps: 3,              // taps on the napkin to bandage up

  // Animation timings (seconds)
  slideInTime: 0.35,
  shuckedHold: 0.8,
  slideOutTime: 0.3,
};
