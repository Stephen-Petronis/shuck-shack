// Shuck Shack — trace the shell, pop the lid, fill the order, buy better gear, move up.
(() => {
  'use strict';
  const C = window.SHUCK_CONFIG;
  const SHAPES = window.SHUCK_SHAPES;
  const SHAPE_NAMES = Object.keys(SHAPES);

  // Arm rig measured from the art (mirrored so the arm comes in from the right).
  const ARM = {
    hand: { wrist: [231, 238], tip: [5, 2], glove: [150, 192] },
    cuff: { opening: [27, 50], end: [178, 196] },
    color: '#e4732d', thick: 52,
  };
  // Where things sit in the counter art (1536 x 1024).
  const BG = { w: 1536, h: 1024, boardCx: 768, boardCy: 455, boardW: 795, boardH: 520,
               napkin: { x: 138, y: 372, w: 194, h: 312 } };

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const canvas = $('game');
  let ctx = canvas.getContext('2d');
  const ctxSwap = (c2) => { ctx = c2; };
  const hud = $('hud');
  const els = {
    venue: $('hudVenue'), count: $('hudCount'), earned: $('hudEarned'),
    clockFill: $('clockFill'), clockText: $('clockText'),
    title: $('screenTitle'), hub: $('screenHub'), result: $('screenResult'), pause: $('screenPause'),
    hubBody: $('hubBody'), hubCash: $('hubCash'), hubVenue: $('hubVenue'), hubShift: $('hubShift'),
    btnStart: $('btnStart'), titleSave: $('titleSave'),
    btnMute: $('btnMute'), btnPause: $('btnPause'),
  };
  document.title = C.title;
  if (C.arcadeUrl) document.querySelectorAll('.arcade-link').forEach((a) => { a.href = C.arcadeUrl; a.hidden = false; });
  const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const money = (n) => '$' + Math.round(n).toLocaleString();

  // ---------- Assets ----------
  const IMG = {};
  function loadImg(key, src) {
    return new Promise((res) => {
      const im = new Image();
      im.onload = () => { IMG[key] = im; res(); };
      im.onerror = () => { console.warn('Missing image', src); res(); };
      im.src = src;
    });
  }
  const assetJobs = [
    loadImg('counter', 'assets/counter.webp'),
    loadImg('napkin', 'assets/napkin.webp'),
    loadImg('hand', 'assets/hand.webp'),
    loadImg('cuff', 'assets/cuff.webp'),
    loadImg('lemon_beach', 'assets/lemon_beach.webp'),

    loadImg('lemon_whole', 'assets/lemon_whole.webp'),
    loadImg('lemon_half', 'assets/lemon_half.webp'),
    loadImg('lemon_quarter_a', 'assets/lemon_quarter_a.webp'),
    loadImg('lemon_quarter_b', 'assets/lemon_quarter_b.webp'),
    loadImg('tentacle0', 'assets/tentacle0.webp'),
    loadImg('tentacle1', 'assets/tentacle1.webp'),
    loadImg('tentacle2', 'assets/tentacle2.webp'),
    loadImg('tentacle3', 'assets/tentacle3.webp'),
  ];
  SHAPE_NAMES.forEach((n) => {
    assetJobs.push(loadImg(n + '_top', `assets/oyster_${n}_top.webp`));
    assetJobs.push(loadImg(n + '_bottom', `assets/oyster_${n}_bottom.webp`));
  });
  C.venues.forEach((v) => { if (v.background) assetJobs.push(loadImg('bg_' + v.id, v.background)); });
  C.venues.forEach((v) => { if (v.scenes) Object.entries(v.scenes).forEach(([ph, src]) => assetJobs.push(loadImg(`scene_${v.id}_${ph}`, src))); });

  // Knife colors: repaint the blade part of the hand sprite once per look.
  const KNIFE = {};
  const KNIFE_URL = {};
  function makeKnives() {
    const h = IMG.hand; if (!h) return;
    const base = document.createElement('canvas'); base.width = h.width; base.height = h.height;
    const bx = base.getContext('2d'); bx.drawImage(h, 0, 0);
    const src = bx.getImageData(0, 0, h.width, h.height);
    const [tx, ty] = ARM.hand.tip, ux = ARM.hand.wrist[0] - tx, uy = ARM.hand.wrist[1] - ty, L2 = ux * ux + uy * uy;
    const looks = {
      steel: (l) => [l * 1.04, l * 1.06, l * 1.1],
      blue:  (l) => [l * 0.62, l * 0.82, l * 1.12],
      gold:  (l) => [l * 1.15 + 30, l * 0.9 + 10, l * 0.28],
      rust:  (l, x, y) => { const spot = ((x * 7 + y * 13) % 23 < 6) ? 0.72 : 1; return [l * 0.95 * spot + 20, l * 0.62 * spot, l * 0.38 * spot]; },
      red:    (l) => [l * 1.1 + 30, l * 0.35, l * 0.3],
      black:  (l) => [l * 0.42, l * 0.42, l * 0.48],
      teal:   (l) => [l * 0.45, l * 0.95, l * 0.92],
      copper: (l) => [l * 1.05 + 10, l * 0.62, l * 0.35],
      green:  (l) => [l * 0.5, l * 1.0, l * 0.45],
    };
    Object.entries(looks).forEach(([name, fn]) => {
      const c = document.createElement('canvas'); c.width = h.width; c.height = h.height;
      const x = c.getContext('2d'); const out = x.createImageData(h.width, h.height);
      const s = src.data, d = out.data;
      for (let y = 0; y < h.height; y++) for (let xx = 0; xx < h.width; xx++) {
        const i = (y * h.width + xx) * 4;
        d[i] = s[i]; d[i + 1] = s[i + 1]; d[i + 2] = s[i + 2]; d[i + 3] = s[i + 3];
        if (!s[i + 3]) continue;
        const t = ((xx - tx) * ux + (y - ty) * uy) / L2;
        if (t > 0.37) continue;
        const l = (s[i] + s[i + 1] + s[i + 2]) / 3;
        if (l < 80) continue;                      // keep the ink outline
        const [r, g, b] = fn(l, xx, y);
        d[i] = Math.min(255, r); d[i + 1] = Math.min(255, g); d[i + 2] = Math.min(255, b);
      }
      x.putImageData(out, 0, 0);
      KNIFE[name] = c;
      try { KNIFE_URL[name] = c.toDataURL('image/png'); } catch (e) { KNIFE_URL[name] = ''; }
    });
  }

  // ---------- Save ----------
  const SAVE_KEY = 'shuckshack.save.v1';
  function freshSave() {
    const owned = {}; C.gear.forEach((g) => { owned[g.id] = 0; });
    return { cash: C.startCash || 0, owned, venue: C.venues[0].id, unlocked: [C.venues[0].id],
             shifts: 0, oysters: 0, bestShift: 0, cuts: 0, rep: {},
             xp: { acc: 0, spd: 0, bld: 0 }, perks: { acc: 0, spd: 0, bld: 0 }, xpTotal: 0, radio: 0,
             knives: ['rusty'], knife: 'rusty', supplier: {}, barnOysters: 0,
             lemons: 0, stock: { small: 0, big: 0 }, ice: 10 };
  }
  function loadSave() {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (s && s.owned) { const f = freshSave(); return Object.assign(f, s, { owned: Object.assign(f.owned, s.owned), rep: Object.assign({}, s.rep),
        xp: Object.assign(f.xp, s.xp), perks: Object.assign(f.perks, s.perks), supplier: Object.assign({}, s.supplier),
        stock: Object.assign({ small: 0, big: 0 }, s.stock),
        knives: s.knives || ['rusty', 'steel', 'boston', 'golden'].slice(0, (s.owned && s.owned.knife || 0) + 1),
        knife: s.knife || ['rusty', 'steel', 'boston', 'golden'][Math.min(3, (s.owned && s.owned.knife) || 0)] }); }
    } catch (e) { /* no save yet or storage blocked */ }
    return freshSave();
  }
  function writeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) { /* storage blocked */ } }
  let SAVE = loadSave();
  const gearDef = (id) => C.gear.find((g) => g.id === id);
  const tier = (id) => { const g = gearDef(id); return g.tiers[Math.min(SAVE.owned[id] || 0, g.tiers.length - 1)]; };
  const venue = () => C.venues.find((v) => v.id === SAVE.venue) || C.venues[0];
  // ---- knives: six stats (0..5) turned into how the blade behaves ----
  const KNIFE_STATS = ['steady', 'control', 'quick', 'grip', 'flick', 'safe'];
  const KNIFE_LABEL = { steady: 'Steady', control: 'Control', quick: 'Quick', grip: 'Grip', flick: 'Flick', safe: 'Safe' };
  const knifeDef = (id = SAVE.knife) => C.knives.find((k) => k.id === id) || C.knives[0];
  function knifeStats(id) {
    const k = knifeDef(id), s = Object.assign({ steady: 0, control: 0, quick: 0, grip: 0, flick: 0, safe: 0 }, k.stats);
    return {
      name: k.name, look: k.look,
      wobble: 0.03 * (1 - 0.17 * s.steady),           // shake at full speed (fraction of oyster size)
      idle: Math.max(0, 0.55 - 0.13 * s.steady),      // how much shake is left when you move slowly
      ctrl: 0.45 + 0.3 * s.control,                   // finger speed (screens/sec) where shake is at full
      lag: Math.max(0.008, 0.12 - 0.022 * s.quick),   // seconds the blade drags behind your finger
      grip: 0.8 + 0.07 * s.grip,                      // trace-line forgiveness
      flickSpeed: Math.max(0.55, 1.7 - 0.2 * s.flick),// swipe speed that flicks a barnacle
      flickReach: 1 + 0.12 * s.flick,
      cut: Math.max(0.3, 1 - 0.14 * s.safe),
    };
  }
  const knifeTierOpen = (k) => { const t = C.knifeTiers[k.tier]; return !t.needs || SAVE.unlocked.includes(t.needs); };
  const supplierLv = (vid = venue().id) => (SAVE.supplier && SAVE.supplier[vid]) || 0;
  const supplierOf = (vid) => C.suppliers[supplierLv(vid)] || C.suppliers[0];
  const oysterPrice = (v) => Math.max(1, Math.round(v.pay * (C.oysterCost ?? 0.4) * (1 + 0.25 * supplierLv(v.id))));
  const stockCount = () => (SAVE.stock.small || 0) + (SAVE.stock.big || 0);
  const diveOpen = () => { const i = C.venues.findIndex((v) => v.id === (C.diveFrom || 'boardwalk')); return C.venues.indexOf(venue()) >= i; };
  const SK = C.skills;
  const perk = (tree, n) => (SAVE.perks[tree] || 0) >= n;
  const cutMult = () => knifeStats().cut * (tier('glove').cut ?? 1) * (perk('bld', 2) ? 0.6 : 1);
  const napkinTaps = () => { const t = tier('aid').taps ?? 3; return perk('bld', 1) ? Math.max(1, Math.ceil(t / 2)) : t; };
  const coverageNeeded = () => perk('acc', 3) ? 0.75 : perk('acc', 1) ? 0.85 : C.coverageToFinish;
  const moveMult = () => perk('spd', 3) ? 0.35 : perk('spd', 1) ? 0.65 : 1;
  const perkCost = (tree) => SK.costs[SAVE.perks[tree] || 0];          // undefined when maxed
  const perkReady = (tree) => perkCost(tree) !== undefined && SAVE.xp[tree] >= perkCost(tree);
  function playerLevel() {
    let lv = 1, need = SK.levelXp, left = SAVE.xpTotal || 0;
    while (left >= need) { left -= need; lv++; need = Math.round(need * 1.15); }
    return { lv, into: left, need };
  }
  const timeMult = () => tier('ice').time ?? 1;
  const cashMult = () => tier('jar').cash ?? 1;
  const repOf = (id) => SAVE.rep[id] ?? ((C.venues.find((v) => v.id === id) || {}).startStars || 0);
  const tolNow = () => L.tol * knifeStats().grip * (perk('acc', 4) ? 1.1 : 1);
  const gearOpen = (t) => !t.needs || SAVE.unlocked.includes(t.needs);
  const venueName = (id) => (C.venues.find((v) => v.id === id) || {}).name || id;
  const starsText = (n, of = 5) => { let s = ''; for (let i = 1; i <= of; i++) s += `<i class="st ${n >= i ? 'f' : n >= i - 0.5 ? 'h' : 'e'}">★</i>`; return s; };
  const shiftClock = (n, v = venue()) => Math.round(n * v.secsPerOyster * timeMult() + C.shiftExtraTime);

  // ---------- Sound ----------
  let ac = null, muted = false;
  try { muted = localStorage.getItem('shuckshack.muted') === '1'; } catch (e) { /* ignore */ }
  function audio() {
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  function tone(freq, dur, type = 'square', vol = 0.12, slideTo = 0, delay = 0) {
    if (muted) return; const a = audio(); if (!a) return;
    const t = a.currentTime + delay;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol = 0.15, hp = 800, delay = 0) {
    if (muted) return; const a = audio(); if (!a) return;
    const t = a.currentTime + delay;
    const buf = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate);
    const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const s = a.createBufferSource(); s.buffer = buf;
    const f = a.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
    const g = a.createGain(); g.gain.value = vol;
    s.connect(f).connect(g).connect(a.destination); s.start(t);
  }
  const SFX = {
    pop() { noise(0.12, 0.25, 1500); tone(300, 0.18, 'square', 0.1, 1200); },
    grade(rank) {
      const base = [784, 659, 587, 523, 392, 220][rank] || 330;
      if (rank >= 5) { tone(220, 0.35, 'sawtooth', 0.08, 110); return; }
      [1, 1.25, 1.5].slice(0, 3 - Math.min(2, Math.floor(rank / 2))).forEach((m, i) => tone(base * m, 0.16, 'square', 0.07, 0, i * 0.07));
    },
    ouch() { tone(700, 0.4, 'sawtooth', 0.12, 120); noise(0.15, 0.2, 400); },
    wipe() { noise(0.18, 0.18, 2500); },
    bandage() { [523, 659, 784].forEach((f, i) => tone(f, 0.12, 'triangle', 0.1, 0, i * 0.06)); },
    orderUp() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'square', 0.07, 0, i * 0.09)); },
    late() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.25, 'sawtooth', 0.08, 0, i * 0.16)); },
    slide() { noise(0.1, 0.06, 300); },
    cash() { [1319, 1568, 2093].forEach((f, i) => tone(f, 0.09, 'square', 0.05, 0, i * 0.05)); },
    buy() { [523, 784, 1047, 1568].forEach((f, i) => tone(f, 0.12, 'triangle', 0.09, 0, i * 0.06)); noise(0.08, 0.1, 3000, 0.2); },
    nope() { tone(180, 0.18, 'square', 0.07); },
  };
  function setMuted(m) {
    muted = m; els.btnMute.setAttribute('aria-pressed', String(m));
    els.btnMute.textContent = m ? 'Sound off' : 'Sound on';
    try { localStorage.setItem('shuckshack.muted', m ? '1' : '0'); } catch (e) { /* ignore */ }
  }

  // ---------- Layout ----------
  let W = 0, H = 0, DPR = 1;
  const L = {};
  function layout() {
    const r = canvas.getBoundingClientRect();
    W = r.width; H = r.height; DPR = Math.min(window.devicePixelRatio || 1, 2.5);
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    const top = hud.getBoundingClientRect().bottom - r.top + 6;
    const availH = Math.max(200, H - top - 12);
    L.top = top;
    L.D = Math.min(W * 0.8, availH * 0.7, 460);
    L.cx = W / 2;
    L.cy = top + availH * 0.5;
    L.tol = Math.max(C.minTolerancePx, L.D * C.traceTolerance);

    const s = Math.max(W / BG.w, H / BG.h, (L.D * 1.2) / BG.boardH, (L.D * 1.2) / BG.boardW);
    let ox = L.cx - BG.boardCx * s, oy = L.cy - BG.boardCy * s;
    ox = Math.min(0, Math.max(W - BG.w * s, ox));
    oy = Math.min(0, Math.max(H - BG.h * s, oy));
    L.bg = { s, ox, oy };
    // the background gets clamped to the screen edges, so put the oyster on the board's real center
    L.cx = ox + BG.boardCx * s;
    L.cy = oy + BG.boardCy * s;
    const room = Math.min(L.cy - top - 8, H - 12 - L.cy, L.cx, W - L.cx) * 2 / 1.25;
    if (room > 120 && L.D > room) L.D = room;
    L.D *= C.oysterScale ?? 0.75;   // oysters sit smaller than the board
    L.tol = Math.max(C.minTolerancePx, L.D * C.traceTolerance);

    const n = BG.napkin;
    const nx = ox + n.x * s, ny = oy + n.y * s, nw = n.w * s, nh = n.h * s;
    if (nx >= 2 && nx + nw <= W - 2 && ny >= top && ny + nh <= H - 2 && nw >= 56) {
      L.napkin = { x: nx, y: ny, w: nw, h: nh, painted: true };
    } else {
      const w = Math.max(62, Math.min(104, W * 0.19)), h = w * (324 / 206);
      L.napkin = { x: 12, y: H - h - 14, w, h, painted: false };
    }

    L.armScale = (L.D * 0.46) / Math.hypot(ARM.hand.wrist[0] - ARM.hand.tip[0], ARM.hand.wrist[1] - ARM.hand.tip[1]);
    const as = L.armScale * 1.05;
    L.cuff = { s: as, x: W + 18 * as - ARM.cuff.end[0] * as, y: H + 10 * as - ARM.cuff.end[1] * as };
    L.cuffOpen = { x: L.cuff.x + ARM.cuff.opening[0] * as, y: L.cuff.y + ARM.cuff.opening[1] * as };
    L.rest = { x: W - Math.min(W * 0.2, 120), y: L.cy + L.D * 0.05 };

    if (cur) cur.pts = screenPath(cur);
    lemonLayout();
  }

  // ---------- State ----------
  let state = 'title';      // title | hub | play | result
  let phase = 'idle';       // idle | ready | slideIn | trace | shucked | slideOut
  let paused = false;
  let hurt = null;          // { t, taps }
  let G = null;             // the current shift
  let cur = null;           // the current oyster
  let lastShape = null;
  let T = 0;
  let readyT = 0;
  let hubTab = 'work', gearTab = 'knives';
  const GEAR_TABS = [
    { id: 'knives', name: 'Knives' },
    { id: 'kitchen', name: 'Kitchen', gear: ['glove', 'aid', 'ice', 'radio', 'jar'] },
    { id: 'supplier', name: 'Supplier' },
    { id: 'diving', name: 'Diving', gear: ['fins', 'lungs', 'bag', 'dgrip'] },
    { id: 'ice', name: 'Ice', gear: ['harpoons', 'hhead', 'boat', 'sight'] },
    { id: 'lemons', name: 'Lemons', gear: ['lcrate', 'octo', 'octobtn'] },
  ];
  let resetArmed = false;
  let pendingLapse = null;    // set when a shift ends: the time of day moves on
  const pointer = { x: 0, y: 0, down: false, id: null, tracing: false, lastX: 0, lastY: 0, hover: false, type: 'touch' };
  const fx = { lid: null, stamp: null, popups: [], drops: [], splash: [], flung: [], shake: 0, ouch: null, wipe: 0 };
  let armTip = { x: 0, y: 0 };
  const knife = { x: 0, y: 0 };   // where the blade actually is (lags and wobbles behind your finger)
  let gloveAt = null;              // screen spot of the cut on the glove, for blood drips

  // ---------- Shift ----------
  function pickOrderSize(v) {
    const sizes = []; for (let n = v.orderMin; n <= v.orderMax; n += 6) sizes.push(n);
    return sizes[(Math.random() * sizes.length) | 0];
  }
  // Promotions: pay up front for a bigger crowd. Every oyster now stands for more customers
  // (pay and tips x crowd), but the same dozen has to go out faster.
  const promoOf = () => (C.promos || []).find((p) => p.id === SAVE.promo) || (C.promos || [{ id: 'none', crowd: 1, time: 1, cost: 0 }])[0];
  const promoCost = (p, v = venue()) => Math.round(v.pay * 12 * (p.cost || 0));
  const promoOpen = (p) => !p.needs || SAVE.unlocked.includes(p.needs);
  function startShift() {
    const v = venue();
    const need = pickOrderSize(v);
    let pr = promoOf();
    if (!promoOpen(pr) || (promoCost(pr, v) > SAVE.cash && !SAVE.infiniteCash)) { if (pr.id !== 'none') flash(`Can't afford ${pr.name}: no promotion this shift`); pr = C.promos[0]; }
    const prCost = promoCost(pr, v);
    if (prCost) { SAVE.cash -= prCost; keepInfinite(); writeSave(); }
    G = { venue: v, need, done: 0, clockMax: shiftClock(need, v), clock: 0, par: v.secsPerOyster * C.parFactor * (perk('spd', 4) ? 1.3 : 1), xp: { acc: 0, spd: 0, bld: 0 },
          pay: 0, tips: 0, accSum: 0, cuts: 0, served: 0, bandages: [], fast: 0,
          wounds: 0, tapsDone: 0, stun: 0, lastSlip: -9, dripT: 0, drips: [], splats: [], bloody: 0, bloodLoss: 0,
          bill: 0, fromSupplier: 0, own: 0, ownBig: 0, lemonTips: 0, lemoned: 0, noLemon: 0, flyLemons: [], lemonCd: 0, lemonsCut: 0, streaks: [], swipeUntil: 0, rsp: 0 };
    G.promo = pr; G.promoCost = prCost; G.crowd = pr.crowd || 1;
    G.clockMax = Math.round(G.clockMax * (pr.time || 1)); G.par *= (pr.time || 1);
    G.clock = G.clockMax;
    hudLabels([G.crowd > 1 ? `Crowd x${G.crowd}` : 'Working at', 'Shucked', 'Earned']);
    fx.lid = null; fx.stamp = null; fx.popups = []; fx.drops = []; fx.splash = []; hurt = null; cur = null;
    state = 'play'; phase = 'ready'; readyT = T; paused = false;
    showScreen(null); updateHud(); updateClock();
    SFX.orderUp();
  }

  function pickShape() {
    let s; do { s = SHAPE_NAMES[(Math.random() * SHAPE_NAMES.length) | 0]; } while (SHAPE_NAMES.length > 1 && s === lastShape);
    lastShape = s; return s;
  }
  function nextOyster() {
    const shape = pickShape();
    cur = { shape, flip: Math.random() < 0.5, x: W + L.D, t0: T, startT: 0,
            covered: new Uint8Array(SHAPES[shape].length), nCovered: 0,
            errSum: 0, n: 0, off: 0, trail: [], cutAt: null, blood: [] };
    // after the first shift, oysters land at an angle; the range widens each shift
    const spinDeg = Math.min(C.spinMaxDeg ?? 180, Math.max(0, SAVE.shifts - (C.spinAfterShifts ?? 1) + 1) * (C.spinPerShiftDeg ?? 45));
    cur.rot = (Math.random() * 2 - 1) * spinDeg * Math.PI / 180;
    cur.spin = 0;             // shown angle while it slides in
    cur.pts = screenPath(cur);
    // where did this oyster come from? your own catch first (free), then the supplier (costs money)
    if (SAVE.stock.big > 0) { SAVE.stock.big--; cur.src = 'big'; G.own++; G.ownBig++; fx.popups.push({ text: 'Your big catch!', sub: '', x: L.cx, y: L.cy - L.D * 0.55, t: 0.3, small: true, money: true }); }
    else if (SAVE.stock.small > 0) { SAVE.stock.small--; cur.src = 'small'; G.own++; fx.popups.push({ text: 'Your catch', sub: '', x: L.cx, y: L.cy - L.D * 0.55, t: 0.3, small: true }); }
    else { cur.src = 'supplier'; G.fromSupplier++; G.bill += oysterPrice(G.venue); }
    cur.barn = makeBarnacles(cur);
    if (cur.barn.length && !SAVE.barnTut) {
      SAVE.barnTut = true; writeSave();
      showTip('Barnacles!', 'These spiky barnacles will cut your fingers. Swipe fast across each one to flick it off, then trace the shell like always.', drawTipBarnacle);
    }
    if (G.done >= C.safeOysters && Math.random() < C.randomCutChance * cutMult()) cur.cutAt = 0.3 + Math.random() * 0.5;
    phase = 'slideIn'; pointer.tracing = false;
    SFX.slide();
  }
  // Barnacles (Boardwalk and up): spiky lumps sitting on the shell edge. Flick them off
  // with a fast swipe before tracing; dragging the knife slowly over one cuts you.
  function makeBarnacles(o) {
    const B = G.venue.barnacles; if (!B) return [];
    const srcAdj = o.src === 'small' ? 1 : o.src === 'big' ? -1 : (supplierOf(G.venue.id).barnacles || 0);   // tiny wild ones are crusty, big ones are clean
    let n = B[0] + Math.floor(Math.random() * (B[1] - B[0] + 1)) + srcAdj;
    n = Math.min(n, 1 + Math.floor((SAVE.barnOysters || 0) / (C.barnacleRampEvery ?? 6)));   // start with one, add more as you learn
    if (n <= 0) return [];
    SAVE.barnOysters = (SAVE.barnOysters || 0) + 1;
    const len = o.pts.length, out = [];
    for (let k = 0; k < n; k++) {
      const p = o.pts[Math.floor(((k + 0.2 + Math.random() * 0.6) / n) * len) % len];
      const dx = p.x - L.cx, dy = p.y - L.cy, d = Math.hypot(dx, dy) || 1, pull = L.D * 0.025;
      out.push({ dx: dx - (dx / d) * pull, dy: dy - (dy / d) * pull, r: L.D * (0.045 + Math.random() * 0.02),
                 rot: Math.random() * 6.28, alive: true, nextCut: 0 });
    }
    return out;
  }
  const barnPos = (o, b) => {           // screen position (follows the oyster while it slides and spins in)
    const a = (o.spin || 0) - (o.rot || 0), c = Math.cos(a), s = Math.sin(a);
    return { x: o.x + b.dx * c - b.dy * s, y: L.cy + b.dx * s + b.dy * c };
  };
  function segDist(x1, y1, x2, y2, cx, cy) {
    const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy || 1;
    let t = ((cx - x1) * dx + (cy - y1) * dy) / l2; t = Math.max(0, Math.min(1, t));
    return Math.hypot(x1 + dx * t - cx, y1 + dy * t - cy);
  }
  // returns true when this knife move was a flick (so it shouldn't count as tracing)
  function barnacleCheck(px, py, nx, ny, dt) {
    const o = cur; if (!o || !o.barn || !o.barn.length) return false;
    // flick speed is judged by your finger (the blade lags on cheap knives)
    const speed = Math.hypot(pointer.x - (pointer.prevX ?? pointer.x), pointer.y - (pointer.prevY ?? pointer.y)) / Math.max(dt, 1e-3);
    const ks = knifeStats();
    const fast = speed > Math.min(W, H) * ks.flickSpeed;
    let flicked = false;
    const fx0 = pointer.prevX ?? pointer.x, fy0 = pointer.prevY ?? pointer.y;
    o.barn.forEach((b) => {
      if (!b.alive) return;
      const bp = barnPos(o, b);
      // a fast flick is tested along your finger's path; a slow drag along the blade's
      const hitFlick = fast && segDist(fx0, fy0, pointer.x, pointer.y, bp.x, bp.y) <= b.r * 1.5 * ks.flickReach;
      if (!hitFlick && segDist(px, py, nx, ny, bp.x, bp.y) > b.r * 1.25) return;
      if (hitFlick) {
        b.alive = false; flicked = true;
        const ddx = pointer.x - fx0, ddy = pointer.y - fy0, dl = Math.hypot(ddx, ddy) || 1, ux = ddx / dl, uy = ddy / dl;
        fx.flung.push({ x: bp.x, y: bp.y, vx: ux * L.D * 3.2, vy: uy * L.D * 3.2 - L.D * 1.2, rot: b.rot, vr: 14, r: b.r, t: 0 });
        fx.popups.push({ text: 'FLICK!', sub: '', x: bp.x, y: bp.y - b.r * 1.5, t: 0.2, small: true, money: true });
        G.xp.acc += 2; SAVE.flicks = (SAVE.flicks || 0) + 1;
        tone(1400, 0.06, 'square', 0.06, 2600); noise(0.05, 0.12, 4000);
      } else if (!fast && T > b.nextCut && G.stun <= 0) {
        b.nextCut = T + 0.9;
        fx.popups.push({ text: 'Flick it first!', sub: '', x: bp.x, y: bp.y - b.r * 1.8, t: 0.1, small: true, bad: true });
        if (Math.random() < Math.min(1, 1.2 * cutMult())) cutHand();
      }
    });
    return flicked;
  }
  function drawBarnacle(x, y, r, rot, alpha = 1) {
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.rotate(rot);
    ctx.lineJoin = 'round';
    // spikes
    ctx.fillStyle = '#5b4a6b'; ctx.strokeStyle = '#1d1712'; ctx.lineWidth = Math.max(1.5, r * 0.08);
    ctx.beginPath();
    for (let i = 0; i < 22; i++) { const a = (i / 22) * Math.PI * 2, rr = i % 2 ? r * 0.82 : r * 1.32; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // shell cone
    const gr = ctx.createRadialGradient(-r * 0.25, -r * 0.3, r * 0.1, 0, 0, r);
    gr.addColorStop(0, '#f2eadb'); gr.addColorStop(1, '#a89c8c');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(29,23,18,0.45)'; ctx.lineWidth = Math.max(1, r * 0.05);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3); ctx.lineTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8); ctx.stroke(); }
    // opening
    ctx.fillStyle = '#2b2233'; ctx.strokeStyle = '#1d1712'; ctx.lineWidth = Math.max(1.5, r * 0.08);
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.32, r * 0.22, 0.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  function drawBarnacles(o) {
    if (!o.barn) return;
    o.barn.forEach((b) => { if (b.alive) { const p = barnPos(o, b); drawBarnacle(p.x, p.y, b.r, b.rot + Math.sin(T * 3 + b.rot) * 0.05); } });
  }

  function screenPath(o) {
    const D = L.D, c = Math.cos(o.rot || 0), s = Math.sin(o.rot || 0);
    return SHAPES[o.shape].map(([px, py]) => {
      const lx = ((o.flip ? 1 - px : px) - 0.5) * D, ly = (py - 0.5) * D;
      return { x: L.cx + lx * c - ly * s, y: L.cy + lx * s + ly * c };
    });
  }

  // ---------- Tracing ----------
  function distToPath(pts, x, y) {
    let best = Infinity;
    for (let i = 0, n = pts.length; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      const dx = b.x - a.x, dy = b.y - a.y;
      const len2 = dx * dx + dy * dy || 1;
      let t = ((x - a.x) * dx + (y - a.y) * dy) / len2; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const ex = a.x + dx * t - x, ey = a.y + dy * t - y;
      const d = ex * ex + ey * ey; if (d < best) best = d;
    }
    return Math.sqrt(best);
  }
  function traceTo(x, y) {
    const dx = x - pointer.lastX, dy = y - pointer.lastY;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 5));
    for (let i = 1; i <= steps; i++) {
      if (!pointer.tracing || phase !== 'trace' || G.stun > 0) break;
      sample(pointer.lastX + (dx * i) / steps, pointer.lastY + (dy * i) / steps);
    }
    pointer.lastX = x; pointer.lastY = y;
  }
  function sample(x, y) {
    const o = cur, tol = tolNow(), tol2 = tol * tol;
    const d = distToPath(o.pts, x, y);
    if (d < tol * 1.2) o.engaged = true;
    if (o.engaged) { o.errSum += Math.min(d, tol * 4); o.n++; if (d > tol * 2) o.off++; }
    for (let i = 0; i < o.pts.length; i++) {
      if (o.covered[i]) continue;
      const p = o.pts[i], ex = p.x - x, ey = p.y - y;
      if (ex * ex + ey * ey <= tol2) { o.covered[i] = 1; o.nCovered++; }
    }
    o.trail.push({ x, y, t: T }); if (o.trail.length > 60) o.trail.shift();
    const progress = o.nCovered / o.pts.length;
    if (d < tol * 1.2) o.engaged = true;
    const canCut = G.done >= C.safeOysters && o.engaged && T >= (G.graceUntil || 0);
    if (canCut && d > tol * C.slipDistance && T - G.lastSlip > C.slipCooldown) {
      G.lastSlip = T;
      if (Math.random() < C.slipCutChance * cutMult()) { cutHand(); return; }
    }
    if (o.cutAt !== null && progress >= o.cutAt && canCut) { o.cutAt = null; cutHand(); return; }
    if (progress >= coverageNeeded()) {
      if (o.barn && o.barn.some((b) => b.alive)) { if (!o.barnWarned) { o.barnWarned = true; fx.popups.push({ text: 'Flick the barnacles off!', sub: '', x: L.cx, y: L.cy - L.D * 0.45, t: 0, bad: true }); } }
      else finishOyster();
    }
  }
  function accuracyOf(o) {
    if (!o.n) return 0;
    const mean = o.errSum / o.n / tolNow();
    let a = 1 - (mean - 0.18) / 1.1;
    a *= 1 - 0.55 * (o.off / o.n);
    return Math.max(0, Math.min(1, a));
  }

  function finishOyster() {
    const o = cur;
    pointer.tracing = false;
    const acc = accuracyOf(o);
    const secs = Math.max(0.3, T - o.startT);
    let rank = C.grades.findIndex((g) => acc >= g.minAccuracy); if (rank < 0) rank = C.grades.length - 1;
    const grade = C.grades[rank];
    const bloody = o.blood.length > 0;
    let pay = Math.max(1, Math.round(G.venue.pay * (supplierOf(G.venue.id).pay || 1) * (C.gradePay[rank] ?? 1) * (perk('acc', 4) && rank <= 1 ? 1.25 : 1)));
    let tip = secs <= G.par ? Math.max(1, Math.round(G.venue.pay * C.speedTipFactor * (perk('spd', 4) ? 2 : 1))) : 0;
    G.xp.acc += Math.round(acc * SK.xp.accPerOyster);
    G.xp.spd += secs <= G.par ? SK.xp.spdFast : secs <= G.par * 1.5 ? SK.xp.spdOk : SK.xp.spdSlow;
    let loss = 0;
    if (bloody) { pay = 0; tip = 0; loss = Math.max(1, Math.round(G.venue.pay * C.bloodPenalty)); G.bloody++; G.bloodLoss += loss; G.xp.bld += SK.xp.bldPerBloody; }
    if (!bloody && o.src === 'big') pay = Math.round(pay * (C.bigOysterPay ?? 1.5));
    let lemonTip = 0, lemonNote = '';
    if (!bloody) {
      if (SAVE.lemons > 0) { lemonTip = Math.max(1, Math.round(G.venue.pay * (C.lemonTip ?? 0.5))); G.lemonTips += lemonTip; G.lemoned++; lemonNote = 'lemon tip!'; }
      else if (G.venue.lemonRequired) { pay = Math.max(1, Math.round(pay * 0.5)); G.noLemon++; lemonNote = 'no lemon? half pay'; }
      if (iceNeeded() && !SAVE.ice) { pay = Math.max(1, Math.round(pay * (C.iceWarmPay ?? 0.75))); G.warm = (G.warm || 0) + 1; lemonNote = [lemonNote, 'warm oyster'].filter(Boolean).join(', '); }
    }
    if (G.crowd > 1 && !bloody) {   // a bigger crowd: every oyster feeds more customers
      pay = Math.round(pay * G.crowd); tip = Math.round(tip * G.crowd);
      const extra = Math.round(lemonTip * (G.crowd - 1)); G.lemonTips += extra; lemonTip += extra;
    }
    G.pay += pay; G.tips += tip; if (tip) G.fast++;
    G.done += 1; G.accSum += acc;

    fx.lid = { x: o.x, y: L.cy, vx: (Math.random() < 0.5 ? -1 : 1) * (L.D * (1.2 + Math.random())), vy: -L.D * 4.2,
               rot: o.spin || 0, vr: (Math.random() < 0.5 ? -1 : 1) * (6 + Math.random() * 6), shape: o.shape, flip: o.flip, t: 0 };
    fx.stamp = bloody ? { text: 'YUCK! BLOODY!', color: '#ff6b5b', t: 0, rank: 5 } : { text: grade.name, color: grade.color, t: 0, rank };
    fx.popups.push(bloody
      ? { text: `-${money(loss)}`, sub: 'blood in the oyster!', x: L.cx, y: L.cy + L.D * 0.42, t: 0, bad: true }
      : { text: `+${money(pay + tip + lemonTip)}`, sub: [tip ? 'speedy tip!' : '', lemonNote].filter(Boolean).join(' + '), x: L.cx, y: L.cy + L.D * 0.42, t: 0, money: true });
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2, v = L.D * (0.8 + Math.random() * 1.6);
      fx.splash.push({ x: L.cx, y: L.cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - L.D, r: 2 + Math.random() * 5, t: 0 });
    }
    if (!reduceMotion) fx.shake = 0.12;
    SFX.pop(); setTimeout(() => { if (bloody) SFX.late(); else { SFX.grade(rank); SFX.cash(); } }, 120);
    phase = 'shucked'; o.t0 = T;
    updateHud();
  }

  function endShift(finished) {
    const v = G.venue;
    const bonus = finished ? Math.round(Math.max(0, G.clock) * v.pay * C.timeBonusRate) : 0;
    const sub = G.pay + G.tips + G.lemonTips + bonus;
    const jar = Math.round(sub * (cashMult() - 1));
    const total = Math.max(0, sub + jar - G.bloodLoss - G.bill);
    const stars = shiftStars(finished);
    const repBefore = repOf(v.id);
    let repAfter = repBefore;
    if (stars >= C.starUpAt) repAfter = Math.min(5, repBefore + 1);
    else if (stars <= C.starDownAt) repAfter = Math.max(0, repBefore - 1);
    SAVE.rep[v.id] = repAfter;
    const nextV = C.venues[C.venues.indexOf(v) + 1];
    const justEarned = repAfter >= C.starsToUnlock && repBefore < C.starsToUnlock && nextV && !SAVE.unlocked.includes(nextV.id);
    pendingLapse = true;
    const lvBefore = playerLevel().lv;
    const readyBefore = SK.trees.filter((t) => perkReady(t.id)).length;
    ['acc', 'spd', 'bld'].forEach((k) => { SAVE.xp[k] += G.xp[k]; SAVE.xpTotal = (SAVE.xpTotal || 0) + G.xp[k]; });
    const lvAfter = playerLevel().lv;
    const readyNow = SK.trees.filter((t) => perkReady(t.id));
    SAVE.cash += total; keepInfinite(); SAVE.shifts += 1; SAVE.oysters += G.done; SAVE.cuts += G.cuts;
    const best = total > SAVE.bestShift; if (best) SAVE.bestShift = total;
    writeSave();
    state = 'result'; phase = 'idle'; hurt = null; paused = false; pointer.tracing = false;
    finished ? SFX.orderUp() : SFX.late();

    const row = (label, val, cls = '') => `<div class="line ${cls}"><span>${label}</span><b>${val}</b></div>`;
    const next = cheapestUpgrade();
    $('resultTitle').textContent = finished ? 'Order up!' : 'Out of time!';
    $('resultTag').textContent = finished ? 'Paid in full' : 'Partial pay';
    $('resultBody').innerHTML = `
      <p class="sub">${G.done} of ${G.need} oysters served at ${v.name}</p>
      <div class="review">
        <div class="stars-big" aria-label="${stars} out of 5 stars">${starsText(stars)}</div>
        <p>“${reviewQuote(stars)}”</p>
      </div>
      <div class="receipt">
        ${row(`Oysters (${G.done})`, money(G.pay))}
        ${G.crowd > 1 ? row(`Crowd x${G.crowd} (${G.promo.name})`, 'pay + tips x' + G.crowd) : ''}
        ${row(`Speedy tips (${G.fast})`, money(G.tips))}

        ${G.lemoned ? row(`Lemon tips (${G.lemoned})`, money(G.lemonTips)) : ''}
        ${G.lemonsUsed ? row('Lemon wedges squeezed', G.lemonsUsed) : ''}
        ${G.iceUsed ? row('Ice melted', `${G.iceUsed} bag${G.iceUsed === 1 ? '' : 's'}`) : ''}
        ${G.warm ? row(`Warm oysters, less pay (${G.warm})`, 'no ice!', 'neg') : ''}
        ${row(finished ? 'Time left bonus' : 'Time left bonus (late)', money(bonus))}
        ${jar ? row(`${tier('jar').name}`, money(jar)) : ''}
        ${G.bloodLoss ? row(`Bloody oysters (${G.bloody})`, '-' + money(G.bloodLoss), 'neg') : ''}
        ${G.fromSupplier ? row(`Supplier oysters (${G.fromSupplier})`, '-' + money(G.bill), 'neg') : ''}
        ${G.own ? row(`Your own catch (${G.own}${G.ownBig ? `, ${G.ownBig} big` : ''})`, 'free!') : ''}
        ${row('Total', money(total), 'total')}
      </div>
      <div class="repline"><span>${v.name}</span><b>${starsText(repAfter)}</b>
        <em>${repAfter > repBefore ? '+1 star' : repAfter < repBefore ? '-1 star' : 'no change'}</em></div>
      ${justEarned ? `<p class="nudge">5 stars! ${nextV.name} is ready to open for ${money(nextV.cost)}.</p>` : ''}
      <p class="fine">${G.cuts ? `Cut yourself ${G.cuts === 1 ? 'once' : G.cuts + ' times'}.` : 'No cuts!'}${best ? ' New best shift!' : ''}</p>
      ${xpBlock(G.xp, lvAfter > lvBefore ? lvAfter : 0, readyNow.length > readyBefore ? readyNow : [])}
      ${G.promoCost ? `<p class="fine"><b>${G.promo.name}</b> cost ${money(G.promoCost)} before the shift. After the ad you ${total - G.promoCost >= 0 ? 'made' : 'lost'} <b>${money(Math.abs(total - G.promoCost))}</b>.</p>` : ''}
      <p class="fine">Lemons left: ${SAVE.lemons} · Oysters in the cooler: ${stockCount()}${SAVE.stock.big ? ` (${SAVE.stock.big} big)` : ''}${G.noLemon ? ` · ${G.noLemon} served without lemon` : ''}</p>
      <div class="cashline"><span>Cash</span><strong>${money(SAVE.cash)}</strong></div>
      ${next && SAVE.cash >= next.cost ? `<p class="nudge">You can afford the ${next.name} now.</p>` : ''}`;
    setResultButtons((C.miniGames ?? true) ? 'mini' : 'hub');
    showScreen('result');
  }

  // ---------- Oops ----------
  function cutHand() {
    pointer.tracing = false;
    G.cuts += 1; G.wounds += 1; G.stun = C.cutStun; G.dripT = 0.15; G.xp.bld += SK.xp.bldPerCut;
    G.regenT = 2.5;
    hurt = { t: 0 };
    fx.ouch = { x: armTip.x, y: armTip.y, t: 0 };
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, v = L.D * (0.6 + Math.random());
      fx.drops.push({ x: armTip.x, y: armTip.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 3 + Math.random() * 4, t: 0 });
    }
    if (!reduceMotion) fx.shake = 0.35;
    SFX.ouch();
    if (navigator.vibrate) { try { navigator.vibrate(120); } catch (e) { /* ignore */ } }
  }
  const tapsNeeded = () => napkinTaps() * G.wounds;
  function tapNapkin() {
    if (!G.wounds) return;
    G.tapsDone += 1; fx.wipe = 0.25; SFX.wipe();
    if (G.tapsDone >= tapsNeeded()) {
      for (let k = 0; k < G.wounds; k++) G.bandages.push({ dx: (Math.random() - 0.5) * 50, dy: (Math.random() - 0.5) * 36, rot: -0.6 + Math.random() * 1.2 });
      G.wounds = 0; G.tapsDone = 0; hurt = null; fx.drops = []; SFX.bandage();
      G.graceUntil = T + 1.5;   // a moment to get back on the line before you can slip again
      fx.popups.push({ text: 'Back to work!', sub: '', x: L.cx, y: L.cy - L.D * 0.1, t: 0, big: true });
    }
  }
  function inNapkin(x, y, pad = 14) {
    const n = L.napkin;
    return x >= n.x - pad && x <= n.x + n.w + pad && y >= n.y - pad && y <= n.y + n.h + pad;
  }

  // =====================================================================
  //  OCTOPUS LEMON BUTTON (in-shift at fancier restaurants)
  //  Tap the octopus: a lemon flies up. Swipe it fast to halve it, swipe the
  //  halves to quarter them. Every quarter = 1 wedge for lemon tips.
  // =====================================================================
  const lemonCapN = () => tier('lcrate').cap ?? (C.lemonCap ?? 60);
  const octoCd = () => tier('octobtn').cd ?? (C.lemonButtonCooldown ?? 1.5);
  const tossTime = () => tier('octo').dur ?? (LT.duration ?? 15);
  const octoBtn = () => { const r = Math.max(26, Math.min(36, Math.min(W, H) * 0.06)); return { x: r + 12, y: L.top + r + 14, r }; };
  const lemonBtnOn = () => state === 'play' && G && venue().lemonButton;
  const inOcto = (x, y) => { const b = octoBtn(); return Math.hypot(x - b.x, y - b.y) <= b.r + 10; };
  function octoThrow() {
    if (!G || paused || G.lemonCd > 0) return;
    G.lemonCd = octoCd();
    const m = Math.min(W, H), g = H * 1.1, x = W * (0.2 + Math.random() * 0.6), peak = H * (0.25 + Math.random() * 0.15);
    const vy = -Math.sqrt(2 * g * (H + 40 - peak));
    G.flyLemons.push({ kind: 'whole', x, y: H + 40, vx: (W / 2 - x) * 0.25 + (Math.random() - 0.5) * m * 0.2, vy, g, r: m * 0.06, rot: 0, vr: (Math.random() - 0.5) * 5 });
    noise(0.15, 0.08, 1400); tone(420, 0.1, 'triangle', 0.05, 640);
  }
  function sliceAt(x1, y1, x2, y2) {
    if (!G || !G.flyLemons.length) return false;
    let hit = false;
    const len = Math.hypot(x2 - x1, y2 - y1);
    if (len < Math.min(W, H) * 0.03) return;   // has to be a quick swipe
    const out = [];
    G.flyLemons.forEach((p) => {
      if (p.kind === 'quarter' || p.cutT > T - 0.15) { out.push(p); return; }
      const t = Math.max(0, Math.min(1, ((p.x - x1) * (x2 - x1) + (p.y - y1) * (y2 - y1)) / (len * len)));
      const d = Math.hypot(x1 + (x2 - x1) * t - p.x, y1 + (y2 - y1) * t - p.y);
      if (d > p.r * 1.1) { out.push(p); return; }
      hit = true;
      const nx = -(y2 - y1) / len, ny = (x2 - x1) / len, kick = Math.min(W, H) * 0.35;
      const kind = p.kind === 'whole' ? 'half' : 'quarter';
      for (const s of [-1, 1]) out.push({ ...p, kind, art: s, vx: p.vx + nx * kick * s, vy: Math.min(p.vy, 0) - kick * 0.4 + ny * kick * s * 0.3, r: p.r * 0.8, vr: s * 6, cutT: T });
      for (let k = 0; k < 6; k++) fx.splash.push({ x: p.x, y: p.y, r: 2 + Math.random() * 3, t: 0, vx: (Math.random() - 0.5) * 300, vy: (Math.random() - 0.8) * 300 });
      noise(0.08, 0.12, 2400); tone(900, 0.05, 'square', 0.04, 500);
      if (kind === 'quarter') {
        const cap = lemonCapN(), add = Math.max(0, Math.min(2, cap - (SAVE.lemons || 0)));
        SAVE.lemons = (SAVE.lemons || 0) + add; G.lemonsCut += add;
        fx.popups.push({ text: add ? `+${add} wedges` : 'Wedge bin full', sub: '', x: p.x, y: p.y - 30, t: 0, small: true, money: !!add, bad: !add });
      }
    });
    G.flyLemons = out;
    return hit;
  }
  function updateFly(dt) {
    if (!G) return;
    G.streaks.forEach((s) => { s.t += dt; }); G.streaks = G.streaks.filter((s) => s.t < 0.2);
    G.lemonCd = Math.max(0, (G.lemonCd || 0) - dt);
    const b = octoBtn();
    G.flyLemons.forEach((p) => {
      if (p.kind === 'quarter') {   // quarters zip into the octopus bucket
        p.home = (p.home || 0) + dt * 1.8; const k = Math.min(1, p.home);
        p.x += (b.x - p.x) * k * 0.25; p.y += (b.y - p.y) * k * 0.25; p.r *= 0.985; p.rot += p.vr * dt;
        if (Math.hypot(p.x - b.x, p.y - b.y) < b.r * 0.6) p.gone = true;
        return;
      }
      p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      if (p.y > H + 80 && p.vy > 0) { p.gone = true; fx.popups.push({ text: 'Missed the lemon!', sub: '', x: Math.max(80, Math.min(W - 80, p.x)), y: H - 70, t: 0, small: true, bad: true }); }
    });
    G.flyLemons = G.flyLemons.filter((p) => !p.gone);
  }
  // Customers squeeze lemons nonstop: the wedge pile keeps going down all shift, faster as it gets busy.
  function lemonRate() {
    const v = venue(), i = C.venues.indexOf(v);
    const base = v.lemonDrain ?? (C.lemonDrain || [0.18, 0.24, 0.32, 0.42, 0.55])[Math.min(i, 4)];
    const prog = G ? Math.min(1, G.done / Math.max(1, G.need)) : 0;
    return base * (1 + (C.lemonRush ?? 0.6) * prog) * (G ? Math.sqrt(G.crowd || 1) : 1);   // more customers, more lemons
  }
  function drainLemons(dt) {
    if (!SAVE.lemons) return;
    G.lemonAcc = (G.lemonAcc || 0) + lemonRate() * dt;
    while (G.lemonAcc >= 1 && SAVE.lemons > 0) { G.lemonAcc -= 1; SAVE.lemons--; G.lemonsUsed = (G.lemonsUsed || 0) + 1; G.lemonBlip = T; }
    if (!SAVE.lemons) fx.popups.push({ text: 'Out of lemons!', sub: venue().lemonRequired ? 'half pay until you get more' : 'no more lemon tips', x: L.cx, y: L.top + 70, t: 0, small: true, bad: true });
  }
  function drawLemonGauge() {
    if (!G) return;
    const n = SAVE.lemons || 0, cap = lemonCapN(), x = W - 40, y = L.top + 28, low = n <= 5;
    const blip = Math.max(0, 1 - (T - (G.lemonBlip || -9)) / 0.35);
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(29,23,18,0.78)'; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(-34, -20, 64, 40, 12); else ctx.rect(-34, -20, 64, 40); ctx.fill();
    const im = IMG.lemon_quarter_a;
    if (im) { const w = 26 * (1 + blip * 0.25), h = w * im.height / im.width; ctx.drawImage(im, -30, -h / 2, w, h); }
    // little bar = how full the wedge pile is
    ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(-4, 10, 28, 4);
    ctx.fillStyle = low ? '#ff6b5b' : '#ffe066'; ctx.fillRect(-4, 10, 28 * Math.min(1, n / cap), 4);
    ctx.restore();
    label(String(n), x + 10, y - 3, 17, low && Math.floor(T * 4) % 2 ? '#ff6b5b' : '#fff3d6');
    if (blip > 0) label('-1', x + 10, y - 22 - (1 - blip) * 10, 13, `rgba(255,107,91,${blip})`);
  }
  function drawOcto() {
    if (!G) return;
    const b = octoBtn(), on = venue().lemonButton, n = SAVE.lemons || 0;
    ctx.save(); ctx.translate(b.x, b.y);
    // tentacles
    ctx.strokeStyle = '#2a1408'; ctx.lineCap = 'round';
    for (let k = 0; k < 5; k++) {
      const a = Math.PI * (0.15 + k * 0.175), w = Math.sin(T * 3 + k) * 0.25;
      ctx.lineWidth = 7; ctx.strokeStyle = '#2a1408';
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * b.r * 0.6, Math.sin(a) * b.r * 0.6);
      ctx.quadraticCurveTo(Math.cos(a + w) * b.r * 1.2, Math.sin(a + w) * b.r * 1.2, Math.cos(a - w) * b.r * 1.45, Math.sin(a - w) * b.r * 1.35); ctx.stroke();
      ctx.lineWidth = 4.5; ctx.strokeStyle = on ? '#d9628e' : '#a99';
      ctx.stroke();
    }
    const ready = on && G.lemonCd <= 0 && !G.flyLemons.length;
    const s = ready ? 1 + Math.sin(T * 6) * 0.05 : 1; ctx.scale(s, s);
    ctx.fillStyle = on ? '#ffe066' : '#e8dcb0'; ctx.strokeStyle = '#2a1408'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, b.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    const im = IMG.lemon_whole;
    if (im) { const w = b.r * 1.3, h = w * im.height / im.width; ctx.globalAlpha = on && G.lemonCd > 0 ? 0.45 : 1; ctx.drawImage(im, -w / 2, -h / 2 - 3, w, h); ctx.globalAlpha = 1; }
    if (on && G.lemonCd > 0) { ctx.fillStyle = 'rgba(42,20,8,0.35)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, b.r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (G.lemonCd / (octoCd()))); ctx.fill(); }
    ctx.restore();
    const low = n <= 5;
    if (low && venue().lemonRequired && Math.floor(T * 2) % 2) label(on ? 'Tap for lemons!' : 'No lemons!', b.x + b.r + 58, b.y, 14, '#ff6b5b');
  }
  function drawFly() {
    if (!G) return;
    ctx.save(); ctx.lineCap = 'round';
    G.streaks.forEach((s) => { const a = 1 - s.t / 0.2; ctx.strokeStyle = `rgba(255,255,255,${0.85 * a})`; ctx.lineWidth = 9 * a + 2; ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke(); });
    ctx.restore();
    G.flyLemons.forEach((p) => {
      const art = LEMON_ART[p.kind === 'whole' ? 'whole' : p.kind === 'half' ? 'half' : (p.art > 0 ? 'quarterA' : 'quarterB')], im = IMG[art.key];
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      if (p.kind === 'half' && p.art < 0) ctx.scale(-1, 1);
      if (im) { const w = p.r * art.w, h = w * im.height / im.width; ctx.drawImage(im, -w / 2, -h / 2, w, h); }
      else { ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.arc(0, 0, p.r, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    });
  }
  const swipes = new Map();

  // ---------- Input ----------
  function localPos(e) { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  canvas.addEventListener('pointerdown', (e) => {
    if (state === 'dive') {   // DIVE button works as a second finger while you swim
      const q = localPos(e);
      if (inDiveBtn(q.x, q.y)) { audio(); diveTap(); e.preventDefault(); return; }
    }
    if (state === 'play' && G && !paused) {   // octopus button and lemon slicing work with any finger
      const q = localPos(e);
      swipes.set(e.pointerId, q);
      if (lemonBtnOn() && inOcto(q.x, q.y)) { audio(); octoThrow(); e.preventDefault(); return; }
    }
    if (pointer.id !== null && pointer.id !== e.pointerId) return;
    audio();
    const p = localPos(e);
    pointer.id = e.pointerId; pointer.down = true; pointer.type = e.pointerType; pointer.x = p.x; pointer.y = p.y;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    if (state === 'ice') { if (!paused) iceAimAt(p.x, p.y); e.preventDefault(); return; }
    if (state === 'dive' && V) V.joy = { x: p.x, y: p.y };
    if (state === 'lemon' || state === 'dive') { e.preventDefault(); return; }
    if (state === 'timelapse') { lapse = null; openHub('work'); return; }
    if (state !== 'play' || paused) return;
    if (G.wounds && inNapkin(p.x, p.y, 44)) { tapNapkin(); e.preventDefault(); return; }
    if (G.stun > 0) return;
    if (phase === 'trace') {
      pointer.tracing = true;
      cur.engaged = false;   // no slips until the blade has actually reached the line
      // the blade starts where the arm already is and has to catch up to your finger
      knife.x = p.x; knife.y = p.y; armTip.x = p.x; armTip.y = p.y;
      pointer.prevX = p.x; pointer.prevY = p.y;
      pointer.lastX = knife.x; pointer.lastY = knife.y;
      if (!cur.startT) cur.startT = T;
    }
    e.preventDefault();
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = localPos(e);
    if (state === 'play' && G && G.flyLemons.length && !paused) {
      const q = swipes.get(e.pointerId);
      if (q && sliceAt(q.x, q.y, p.x, p.y) && e.pointerId === pointer.id) G.swipeUntil = T + 0.3;   // slicing a lemon is not shucking
      swipes.set(e.pointerId, p);
    } else swipes.set(e.pointerId, p);
    if (e.pointerType === 'mouse') pointer.hover = true;
    if (pointer.id !== null && pointer.id !== e.pointerId) return;
    pointer.x = p.x; pointer.y = p.y; pointer.type = e.pointerType;
    if (state === 'ice' && pointer.down && !paused) iceAimAt(p.x, p.y);
  });
  function endPointer(e) { swipes.delete(e.pointerId); if (pointer.id !== e.pointerId) return;
    if (V) V.joy = null;
    if (state === 'ice' && e.type === 'pointerup' && !paused) iceThrow(); else if (state === 'ice' && I) I.aim = null; pointer.id = null; pointer.down = false; pointer.tracing = false; }
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') pointer.hover = false; });

  // ---------- Screens ----------
  function showScreen(which) {
    els.title.hidden = which !== 'title';
    els.hub.hidden = which !== 'hub';
    els.result.hidden = which !== 'result';
    els.pause.hidden = which !== 'pause';
    $('screenTip').hidden = which !== 'tip';
    $('screenDev').hidden = which !== 'dev';
    document.body.classList.toggle('in-hub', which === 'hub');
    const dockBtn = document.querySelector('#hubDock .btn');
    if (dockBtn) dockBtn.textContent = SAVE.shifts ? 'Back to work!' : 'Start your first shift!';
    els.btnPause.hidden = !(state === 'play' || state === 'lemon' || state === 'dive' || state === 'ice');
    document.body.classList.toggle('on-shift', state === 'play' || state === 'lemon' || state === 'dive' || state === 'ice');
    const focusBtn = { title: 'btnStart', result: $('btnBackToShack').hidden ? 'btnSkipMini' : 'btnBackToShack', pause: 'btnResume' }[which];
    if (focusBtn) setTimeout(() => { const b = $(focusBtn); if (b) b.focus({ preventScroll: true }); }, 30);
  }

  function refreshTitle() {
    keepInfinite();
    $('btnDev').hidden = !(C.devMode ?? true);
    const has = SAVE.shifts > 0;
    els.btnStart.textContent = has ? 'Back to work' : 'Open the shack';
    els.titleSave.textContent = has ? `${venue().name} · ${money(SAVE.cash)} · ${SAVE.shifts} shift${SAVE.shifts === 1 ? '' : 's'} worked` : '';
  }

  function shiftStars(finished) {
    if (!G.done) return 0.5;
    const avg = G.accSum / G.done;
    let rank = C.grades.findIndex((g) => avg >= g.minAccuracy); if (rank < 0) rank = C.grades.length - 1;
    let s = [5, 4.5, 4, 3, 2, 1][rank] ?? 1;
    if (!finished) s -= 1.5 + 3 * (1 - G.done / G.need);
    s -= 0.5 * G.bloody + 0.5 * G.cuts;
    return Math.max(0.5, Math.min(5, Math.round(s * 2) / 2));
  }
  function reviewQuote(s) {
    if (G.bloody) return ['There was BLOOD in my oyster!', 'Why is my oyster red?!', 'I asked for cocktail sauce, not THAT.'][(Math.random() * 3) | 0];
    if (s >= 5) return ['Perfect half shells. I would sail back for these!', 'Best oysters on the coast!', 'Clean, quick and gorgeous.'][(Math.random() * 3) | 0];
    if (s >= 4) return ['Clean shucks, fast hands.', 'Really good. Coming back Tuesday.'][(Math.random() * 2) | 0];
    if (s >= 3) return ['Pretty good. A little shell in mine.', 'Not bad, kid. Not bad.'][(Math.random() * 2) | 0];
    if (s >= 2) return ['Slow and messy.', 'My oyster looked like it lost a fight.'][(Math.random() * 2) | 0];
    return ['Never again.', 'Is this place even open?'][(Math.random() * 2) | 0];
  }

  function cheapestUpgrade() {
    let best = null;
    C.gear.forEach((g) => {
      const i = SAVE.owned[g.id] || 0; const t = g.tiers[i + 1];
      if (t && gearOpen(t) && (!best || t.cost < best.cost)) best = t;
    });
    C.knives.forEach((k) => { if (!SAVE.knives.includes(k.id) && knifeTierOpen(k) && (!best || k.cost < best.cost)) best = k; });
    const ni = C.venues.findIndex((v) => !SAVE.unlocked.includes(v.id));
    const nv = C.venues[ni];
    if (nv && repOf(C.venues[ni - 1].id) >= C.starsToUnlock && (!best || nv.cost < best.cost)) best = { name: nv.name, cost: nv.cost };
    return best;
  }

  function riskLabel() {
    const m = cutMult();
    return m > 0.8 ? ['High', 'hi'] : m > 0.45 ? ['Medium', 'mid'] : m > 0.2 ? ['Low', 'lo'] : ['Tiny', 'lo'];
  }

  function openHub(tab) {
    state = 'hub'; phase = 'idle'; cur = null; hurt = null;
    if (tab) hubTab = tab;
    resetArmed = false;
    renderHub();
    showScreen('hub');
  }

  const keepInfinite = () => { if (SAVE.infiniteCash) SAVE.cash = 999999; };
  function renderHub() {
    keepInfinite();
    const v = venue();
    els.hubCash.textContent = money(SAVE.cash);
    els.hubVenue.textContent = v.name;
    els.hubShift.textContent = `Shift #${SAVE.shifts + 1} · Level ${playerLevel().lv}`;
    const sb = document.querySelector('#screenHub [data-tab="skills"]');
    if (sb) sb.classList.toggle('badge', SK.trees.some((t) => perkReady(t.id)));
    document.querySelectorAll('#screenHub [data-tab]').forEach((b) => {
      const on = b.dataset.tab === hubTab; b.setAttribute('aria-selected', String(on)); b.classList.toggle('on', on);
    });
    let h = '';
    if (hubTab === 'work') {
      const sizes = v.orderMin === v.orderMax ? `${v.orderMin}` : `${v.orderMin} to ${v.orderMax}`;
      const [risk, rc] = riskLabel();
      h = `
        <h2 class="venue-name">${v.name}</h2>
        <p class="fine">${v.blurb}</p>
        ${repBlock(v)}
        <div class="specs">
          <div><span>Order</span><b>${sizes} oysters</b></div>
          <div><span>Clock</span><b>${shiftClock(v.orderMin, v)}s${v.orderMin !== v.orderMax ? '+' : ''}</b></div>
          <div><span>Pay</span><b>${money(v.pay)} each</b></div>
          <div><span>Cut risk</span><b class="risk ${rc}">${risk}</b></div>
          <div class="wide"><span>Your knife</span><b>${knifeDef().name} · ${knifeFeel()}</b></div>
          <div><span>Lemon wedges</span><b>${SAVE.lemons || 0}${v.lemonRequired && !SAVE.lemons ? ' (need some!)' : ''}</b></div>
          <div><span>Cooler</span><b>${stockCount()} oyster${stockCount() === 1 ? '' : 's'}</b></div>
          <div><span>Ice</span><b>${SAVE.ice || 0} bag${SAVE.ice === 1 ? '' : 's'}${iceNeeded() ? (SAVE.ice ? '' : ' (need some!)') : ' (not needed yet)'}</b></div>
          <div class="wide"><span>Supplier price</span><b>${money(oysterPrice(v))} per oyster · your own catch is free</b></div>
        </div>
        <h3 class="sec">Promotion <span>Pay up front: bigger crowd, bigger pay, less time</span></h3>
        <div class="promos">${(C.promos || []).map((p) => {
          const open = promoOpen(p), on = (SAVE.promo || 'none') === p.id, cost = promoCost(p, v);
          return `<button type="button" class="promo${on ? ' on' : ''}" data-act="promo" data-id="${p.id}" ${open ? '' : 'disabled'}>
            <b>${p.name}</b>${open ? `<span>${p.crowd > 1 ? `Crowd x${p.crowd} · ${Math.round(shiftClock(12, v) * p.time)}s` : `Normal · ${shiftClock(12, v)}s`}</span><em>${cost ? money(cost) + '/shift' : 'free'}</em>`
              : `<span>Opens at ${venueName(p.needs)}</span>`}</button>`;
        }).join('')}</div>
        <p class="fine stats">${SAVE.oysters.toLocaleString()} oyster${SAVE.oysters === 1 ? '' : 's'} shucked · best shift ${money(SAVE.bestShift)}</p>
        <button class="linkbtn" type="button" data-act="reset">${resetArmed ? 'Tap again to wipe your save' : 'Start over'}</button>`;
    } else if (hubTab === 'skills') {
      h = skillsHTML();
    } else if (hubTab === 'gear') {
      const pipRow = (n) => { let o = ''; for (let i = 1; i <= 5; i++) o += `<i class="${i <= n ? 'on' : ''}"></i>`; return o; };
      const knivesHtml = C.knives.map((k) => {
        const owned = SAVE.knives.includes(k.id), using = SAVE.knife === k.id, open = knifeTierOpen(k), tt = C.knifeTiers[k.tier];
        const s = Object.assign({ steady: 0, control: 0, quick: 0, grip: 0, flick: 0, safe: 0 }, k.stats);
        const right = using ? '<span class="here">Using</span>'
          : owned ? `<button class="buy go" type="button" data-act="equip" data-id="${k.id}">Use</button>`
          : !open ? `<span class="locked">Opens at<br>${venueName(tt.needs)}</span>`
          : `<button class="buy" type="button" data-act="buyknife" data-id="${k.id}" ${SAVE.cash < k.cost ? 'data-short="1"' : ''}>${money(k.cost)}</button>`;
        return `<div class="item knife ${using ? 'is-here' : ''} ${!open && !owned ? 'dim' : ''}">
          ${KNIFE_URL[k.look] ? `<img class="knife-pic" src="${KNIFE_URL[k.look]}" alt="">` : ''}
          <div class="item-txt">
            <div class="item-head"><span class="cat">${tt.name}${tt.points ? ` · ${tt.points} pts` : ''}</span></div>
            <b>${k.name}</b><p>${k.desc}</p>
          </div>
          ${right}
          <div class="kstats">${KNIFE_STATS.map((st) => `<span><em>${KNIFE_LABEL[st]}</em><i class="kp">${pipRow(s[st])}</i></span>`).join('')}</div>
        </div>`;
      }).join('');
      const v = venue(), sl = supplierLv(v.id), sCur = C.suppliers[sl], sNext = C.suppliers[sl + 1];
      const sCost = sNext ? v.pay * sNext.costMult : 0;
      const supplierHtml = `<div class="item">
          <div class="item-txt">
            <div class="item-head"><span class="cat">Supplier · ${v.name}</span><span class="pips">${C.suppliers.map((_, k) => `<i class="${k <= sl ? 'on' : ''}"></i>`).join('')}</span></div>
            <b>${sNext ? sNext.name : sCur.name}</b>
            <p>${sNext ? sNext.desc : sCur.desc}</p>
            <p class="have">${sNext ? `You have: ${sCur.name}. Each restaurant has its own supplier.` : 'The best oysters money can buy'}</p>
          </div>
          ${sNext ? `<button class="buy" type="button" data-act="supplier" ${SAVE.cash < sCost ? 'data-short="1"' : ''}>${money(sCost)}</button>` : '<span class="maxed">Maxed</span>'}
        </div>`;
      const gt = GEAR_TABS.find((t) => t.id === gearTab) || GEAR_TABS[0];
      const subTabs = `<div class="subtabs" role="tablist">${GEAR_TABS.map((t) => `<button type="button" role="tab" data-gtab="${t.id}" class="${t.id === gt.id ? 'on' : ''}" aria-selected="${t.id === gt.id}">${t.name}</button>`).join('')}</div>`;
      const blurb = { knives: 'Pick the one that fits the job', kitchen: 'Gloves, first aid, ice bin, radio, tip jar',
                      supplier: 'Where your bought oysters come from', diving: "Barry's dive gear for Barry's Dive",
                      ice: 'Harpoon gear for Iceberg Harpoon. More ice = more full-pay oysters',
                      lemons: 'Octopus training and lemon storage. More wedges = more lemon tips' }[gt.id];
      h = subTabs + `<h3 class="sec">${gt.name} <span>${blurb}</span></h3>` + (gt.id === 'knives' ? knivesHtml : gt.id === 'supplier' ? supplierHtml : '') + C.gear.filter((g) => gt.gear && gt.gear.includes(g.id)).map((g) => {
        const i = SAVE.owned[g.id] || 0, curT = g.tiers[i], next = g.tiers[i + 1];
        const pic = g.id === 'knife' && KNIFE_URL[(next || curT).look] ? `<img class="knife-pic" src="${KNIFE_URL[(next || curT).look]}" alt="">` : '';
        const pips = g.tiers.map((_, k) => `<i class="${k <= i ? 'on' : ''}"></i>`).join('');
        const right = !next ? `<span class="maxed">Maxed</span>`
          : !gearOpen(next) ? `<span class="locked">Opens at<br>${venueName(next.needs)}</span>`
          : `<button class="buy" type="button" data-act="buy" data-id="${g.id}" ${SAVE.cash < next.cost ? 'data-short="1"' : ''}>${money(next.cost)}</button>`;
        return `<div class="item">
          ${pic}
          <div class="item-txt">
            <div class="item-head"><span class="cat">${g.name}</span><span class="pips">${pips}</span></div>
            <b>${next ? next.name : curT.name}</b>
            <p>${next ? next.desc : curT.desc}</p>
            <p class="have">${next ? `You have: ${curT.name}` : 'Top of the line'}</p>
          </div>
          ${right}
        </div>`;
      }).join('');
    } else {
      h = C.venues.map((vv, k) => {
        const open = SAVE.unlocked.includes(vv.id), here = vv.id === SAVE.venue;
        const prev = C.venues[k - 1];
        const prevOpen = k === 0 || SAVE.unlocked.includes(prev.id);
        const starsOk = k === 0 || repOf(prev.id) >= C.starsToUnlock;
        let right;
        if (here) right = `<span class="here">Here now</span>`;
        else if (open) right = `<button class="buy go" type="button" data-act="move" data-id="${vv.id}">Work here</button>`;
        else if (prevOpen && starsOk) right = `<button class="buy" type="button" data-act="unlock" data-id="${vv.id}" ${SAVE.cash < vv.cost ? 'data-short="1"' : ''}>${money(vv.cost)}</button>`;
        else if (prevOpen) right = `<span class="locked">Needs 5★<br>${repOf(prev.id)}/5 now</span>`;
        else right = `<span class="locked">Locked</span>`;
        const sizes = vv.orderMin === vv.orderMax ? `${vv.orderMin}` : `${vv.orderMin}–${vv.orderMax}`;
        return `<div class="item place ${here ? 'is-here' : ''} ${!open && !prevOpen ? 'dim' : ''}">
          <div class="place-no">${k + 1}</div>
          <div class="item-txt">
            <b>${vv.name}</b>
            <p>${sizes} oysters · ${money(vv.pay)} each · ${vv.secsPerOyster}s per oyster</p>
            ${open ? `<p class="stars-sm">${starsText(repOf(vv.id))}</p>` : prevOpen ? `<p class="have">${money(vv.cost)} and 5★ at ${prev.name}</p>` : ''}
          </div>
          ${right}
        </div>`;
      }).join('');
      const nextLocked = C.venues.find((v) => !SAVE.unlocked.includes(v.id));
      if ((C.levelSkipper ?? true) && nextLocked) {
        h += `<button class="linkbtn skipper" type="button" data-act="skip">Level skipper: jump to ${nextLocked.name}</button>`;
      }
    }
    els.hubBody.innerHTML = h;
  }

  function xpBlock(xp, newLevel, readyTrees) {
    const chips = SK.trees.filter((t) => xp[t.id] > 0)
      .map((t) => `<span class="xpchip" style="--c:${t.color}">${t.name} +${xp[t.id]}</span>`).join('');
    return `<div class="xpline">${chips || '<span class="fine">No XP this time.</span>'}</div>
      ${newLevel ? `<p class="nudge">Level up! You're level ${newLevel}.</p>` : ''}
      ${readyTrees.length ? `<p class="nudge skill">New skill ready: ${readyTrees.map((t) => t.perks[SAVE.perks[t.id]].name).join(', ')}! Learn it in Skills.</p>` : ''}`;
  }
  function skillsHTML() {
    const pl = playerLevel();
    return `<div class="lvbox"><b>Level ${pl.lv}</b><div class="bar"><i style="width:${Math.round(pl.into / pl.need * 100)}%"></i></div><span>${pl.into}/${pl.need} XP</span></div>` +
      SK.trees.map((t) => {
        const n = SAVE.perks[t.id] || 0, cost = perkCost(t.id), xp = SAVE.xp[t.id] || 0;
        const pct = cost === undefined ? 100 : Math.min(100, Math.round(xp / cost * 100));
        const rows = t.perks.map((pk, i) => {
          const state = i < n ? 'have' : i === n ? (perkReady(t.id) ? 'ready' : 'next') : 'lock';
          const right = state === 'have' ? '<span class="maxed">Learned</span>'
            : state === 'ready' ? `<button class="buy go" type="button" data-act="learn" data-id="${t.id}">Learn!</button>`
            : state === 'next' ? `<span class="locked">${xp}/${cost} XP</span>` : '<span class="locked">Locked</span>';
          return `<div class="perk p-${state}"><i class="dot"></i><div class="item-txt"><b>${pk.name}</b><p>${pk.desc}</p></div>${right}</div>`;
        }).join('');
        return `<div class="tree" style="--c:${t.color}">
          <div class="tree-head"><b>${t.name}</b><span>${n}/${t.perks.length}</span></div>
          <div class="bar"><i style="width:${pct}%"></i></div>
          <p class="have">${cost === undefined ? 'All perks learned!' : t.how}</p>
          ${rows}</div>`;
      }).join('');
  }

  function knifeFeel() {
    const k = knifeStats(), w = k.wobble * (0.5 + k.idle);
    return w > 0.022 ? 'wobbly' : w > 0.012 ? 'steady-ish' : w > 0.005 ? 'smooth' : 'rock steady';
  }
  function repBlock(v) {
    const n = repOf(v.id), next = C.venues[C.venues.indexOf(v) + 1];
    let note;
    if (!next) note = 'The top of the oyster world.';
    else if (SAVE.unlocked.includes(next.id)) note = `${next.name} is open.`;
    else if (n >= C.starsToUnlock) note = `5 stars! Open ${next.name} for ${money(next.cost)}.`;
    else note = `Get 5 stars to open ${next.name}. Great shifts add a star, bad ones lose one.`;
    return `<div class="rep"><div class="stars-big" aria-label="${n} out of 5 stars">${starsText(n)}</div><p>${note}</p></div>`;
  }

  function flash(msg, bad) {
    const t = $('toast'); t.textContent = msg; t.dataset.bad = bad ? '1' : '0'; t.hidden = false;
    t.classList.remove('pop'); void t.offsetWidth; t.classList.add('pop');
    clearTimeout(flash.tm); flash.tm = setTimeout(() => { t.hidden = true; }, 1800);
  }

  els.hub.addEventListener('click', (e) => {
    const gBtn = e.target.closest('[data-gtab]');
    if (gBtn) { gearTab = gBtn.dataset.gtab; audio(); SFX.slide(); renderHub(); return; }
    const tabBtn = e.target.closest('[data-tab]');
    if (tabBtn) { hubTab = tabBtn.dataset.tab; resetArmed = false; renderHub(); return; }
    const b = e.target.closest('[data-act]'); if (!b) return;
    audio();
    const act = b.dataset.act, id = b.dataset.id;
    if (act === 'shift') { startShift(); return; }
    if (act === 'reset') {
      if (!resetArmed) { resetArmed = true; renderHub(); return; }
      try { localStorage.removeItem(SAVE_KEY); } catch (err) { /* ignore */ }
      SAVE = freshSave(); resetArmed = false; hubTab = 'work'; renderHub(); flash('Fresh start at the Beach Shack');
      return;
    }
    if (act === 'promo') { const p = (C.promos || []).find((x) => x.id === id); if (!p || !promoOpen(p)) return; SAVE.promo = id; writeSave(); SFX.slide(); renderHub(); return; }
    if (act === 'equip') { if (!SAVE.knives.includes(id)) return; SAVE.knife = id; writeSave(); SFX.slide(); flash(`Using the ${knifeDef(id).name}`); renderHub(); return; }
    if (act === 'buyknife') {
      const k = knifeDef(id); if (!k || SAVE.knives.includes(id) || !knifeTierOpen(k)) return;
      if (SAVE.cash < k.cost) { SFX.nope(); flash(`Need ${money(k.cost - SAVE.cash)} more`, true); return; }
      SAVE.cash -= k.cost; SAVE.knives.push(id); SAVE.knife = id; writeSave(); SFX.buy(); flash(`Got the ${k.name}!`);
      renderHub(); return;
    }
    if (act === 'supplier') {
      const v = venue(), sl = supplierLv(v.id), nx = C.suppliers[sl + 1]; if (!nx) return;
      const cost = v.pay * nx.costMult;
      if (SAVE.cash < cost) { SFX.nope(); flash(`Need ${money(cost - SAVE.cash)} more`, true); return; }
      SAVE.cash -= cost; SAVE.supplier[v.id] = sl + 1; writeSave(); SFX.buy(); flash(`New supplier: ${nx.name}!`);
      renderHub(); return;
    }
    if (act === 'buy') {
      const g = gearDef(id), i = SAVE.owned[id] || 0, next = g.tiers[i + 1]; if (!next || !gearOpen(next)) return;
      if (SAVE.cash < next.cost) { SFX.nope(); flash(`Need ${money(next.cost - SAVE.cash)} more`, true); return; }
      SAVE.cash -= next.cost; SAVE.owned[id] = i + 1; writeSave(); SFX.buy(); flash(`Got the ${next.name}!`);
      if (id === 'radio') { updateRadioBtn(); setTimeout(() => setRadio(0), 400); }
      renderHub(); return;
    }
    if (act === 'unlock') {
      const vv = C.venues.find((x) => x.id === id); if (!vv) return;
      const pv = C.venues[C.venues.indexOf(vv) - 1];
      if (pv && repOf(pv.id) < C.starsToUnlock) { SFX.nope(); flash(`Need 5 stars at ${pv.name}`, true); return; }
      if (SAVE.cash < vv.cost) { SFX.nope(); flash(`Need ${money(vv.cost - SAVE.cash)} more`, true); return; }
      SAVE.cash -= vv.cost; SAVE.unlocked.push(id); SAVE.venue = id; writeSave(); SFX.buy();
      flash(`Welcome to ${vv.name}!`); hubTab = 'work'; renderHub(); return;
    }
    if (act === 'learn') {
      if (!perkReady(id)) return;
      SAVE.xp[id] -= perkCost(id); SAVE.perks[id] += 1; writeSave(); SFX.buy();
      const t = SK.trees.find((x) => x.id === id); flash(`Learned ${t.perks[SAVE.perks[id] - 1].name}!`);
      renderHub(); return;
    }
    if (act === 'skip') {   // level skipper (testing): open the next restaurant for free and go there
      const ni = C.venues.findIndex((v) => !SAVE.unlocked.includes(v.id)); if (ni < 1) return;
      const nv = C.venues[ni];
      SAVE.rep[C.venues[ni - 1].id] = Math.max(repOf(C.venues[ni - 1].id), C.starsToUnlock);
      SAVE.unlocked.push(nv.id); SAVE.venue = nv.id; writeSave(); SFX.buy();
      flash(`Skipped ahead to ${nv.name}`); hubTab = 'work'; renderHub(); return;
    }
    if (act === 'move') { SAVE.venue = id; writeSave(); SFX.slide(); hubTab = 'work'; renderHub(); }
  });

  // ---- one-time "new thing!" tips that pause the shift ----
  let tipWasPaused = false;
  function showTip(title, text, art) {
    tipWasPaused = paused; paused = true; pointer.tracing = false;
    $('tipTitle').textContent = title; $('tipText').textContent = text;
    const cv = $('tipArt'), x = cv.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2); cv.width = 260 * dpr; cv.height = 130 * dpr;
    x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, 260, 130);
    if (art) art(x);
    showScreen('tip');
  }
  function drawTipBarnacle(x) {
    drawBarnacleOn(x, 130, 66, 30);
    x.save(); x.lineCap = 'round'; x.lineJoin = 'round';
    for (const [col, w] of [['#2a1408', 12], ['#ffd23f', 7]]) {
      x.strokeStyle = col; x.lineWidth = w;
      x.beginPath(); x.moveTo(60, 112); x.lineTo(200, 22); x.stroke();
      x.beginPath(); x.moveTo(178, 22); x.lineTo(200, 22); x.lineTo(193, 43); x.stroke();
    }
    x.restore();
  }
  function drawBarnacleOn(c2, x, y, r) { const real = ctx; ctxSwap(c2); try { drawBarnacle(x, y, r, 0.3); } finally { ctxSwap(real); } }
  $('btnTipOk').addEventListener('click', () => { paused = tipWasPaused; showScreen(paused ? 'pause' : null); });

  function setPaused(p) {
    if (state !== 'play' && state !== 'lemon' && state !== 'dive' && state !== 'ice') return;
    paused = p; pointer.tracing = false;
    showScreen(p ? 'pause' : null);
  }

  // ---- Dev mode (title screen): pick a restaurant, add cash ----
  function renderDev() {
    keepInfinite();
    $('devVenues').innerHTML = C.venues.map((v, i) => `<button type="button" data-dev="${i}" class="${SAVE.venue === v.id ? 'on' : ''}">${i + 1}. ${v.name}<span>${SAVE.venue === v.id ? 'HERE' : SAVE.unlocked.includes(v.id) ? 'OPEN' : 'LOCKED'}</span></button>`).join('');
    $('btnDevInf').textContent = `Infinite cash: ${SAVE.infiniteCash ? 'on' : 'off'}`;
    $('btnDevInf').setAttribute('aria-pressed', String(!!SAVE.infiniteCash));
    $('devCashLine').textContent = `Cash: ${money(SAVE.cash)}`;
  }
  $('btnDev').addEventListener('click', () => { audio(); renderDev(); showScreen('dev'); });
  $('devVenues').addEventListener('click', (e) => {
    const b = e.target.closest('[data-dev]'); if (!b) return;
    const i = +b.dataset.dev;
    C.venues.forEach((v, k) => {
      if (k <= i && !SAVE.unlocked.includes(v.id)) SAVE.unlocked.push(v.id);
      if (k < i) SAVE.rep[v.id] = Math.max(repOf(v.id), C.starsToUnlock);
    });
    SAVE.venue = C.venues[i].id; writeSave(); SFX.slide(); renderDev(); refreshTitle();
    flash(`Now working at ${C.venues[i].name}`);
  });
  $('btnDevCash').addEventListener('click', () => { SAVE.cash += 10000; writeSave(); SFX.cash(); renderDev(); refreshTitle(); });
  $('btnDevInf').addEventListener('click', () => { SAVE.infiniteCash = !SAVE.infiniteCash; writeSave(); SFX.slide(); renderDev(); refreshTitle(); });
  $('btnDevGo').addEventListener('click', () => { audio(); openHub('work'); });
  $('btnDevBack').addEventListener('click', () => { refreshTitle(); showScreen('title'); });

  els.btnStart.addEventListener('click', () => { audio(); if ((SAVE.owned.radio || 0) >= 1 && SAVE.radio >= 0 && SAVE.radio !== undefined && !RADIO.on && SAVE.radioWasOn) setRadio(SAVE.radio); openHub('work'); });
  $('btnBackToShack').addEventListener('click', (e) => {
    audio();
    if (e.currentTarget.dataset.next === 'mini') startLemons();
    else goToShack();
  });
  $('btnSkipMini').addEventListener('click', () => { audio(); goToShack(); });
  $('btnDive').addEventListener('click', () => { audio(); startDive(); });
  $('prepPick').addEventListener('click', (e) => {
    const b = e.target.closest('[data-prep]'); if (!b || b.disabled) return;
    const p = PREP.find((x) => x.id === b.dataset.prep); if (p && p.go) { audio(); $('prepPick').hidden = true; p.go(); }
  });
  $('btnResume').addEventListener('click', () => setPaused(false));
  $('btnWalkOut').addEventListener('click', () => {
    paused = false;
    if (state === 'lemon') { M.pieces = []; M.arms.forEach((a) => { a.hold = null; }); endLemons(); }
    else if (state === 'dive') endDive();
    else if (state === 'ice') { I.left = 0; I.shot = null; I.bits = []; endIce(); }
    else endShift(false);
  });
  els.btnPause.addEventListener('click', () => setPaused(!paused));
  els.btnMute.addEventListener('click', () => setMuted(!muted));
  document.addEventListener('visibilitychange', () => { if (document.hidden && (state === 'play' || state === 'lemon' || state === 'dive' || state === 'ice') && !paused) setPaused(true); });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.key === 'p') setPaused(!paused);
    if (e.key === 'm') setMuted(!muted);
  });

  function updateHud() {
    const v = G ? G.venue : venue();
    els.venue.textContent = v.name;
    els.count.textContent = G ? `${G.done} / ${G.need}` : '0 / 12';
    els.earned.textContent = money(G ? G.pay + G.tips : 0);
  }
  function updateClock() {
    if (!G) return;
    const f = Math.max(0, G.clock / G.clockMax);
    els.clockFill.style.transform = `scaleX(${f})`;
    els.clockFill.dataset.low = f < 0.25 ? '1' : '0';
    els.clockText.textContent = Math.ceil(Math.max(0, G.clock)) + 's';
  }

  // ---------- Update ----------
  const easeOutBack = (t) => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
  const easeIn = (t) => t * t;

  function update(dt) {
    T += dt;
    if (state === 'play' && !paused) {
      updateFly(dt);
      if (phase !== 'ready') { drainLemons(dt); meltIce(dt); }
      if (phase === 'ready') {
        if (T - readyT >= C.orderUpTime) nextOyster();
      } else {
        G.clock -= dt;
        updateClock();
        if (G.clock <= 0) { endShift(false); return; }
      }
      if (phase === 'slideIn') {
        const k = Math.min(1, (T - cur.t0) / (C.slideInTime * moveMult()));
        cur.x = W + L.D * 0.6 + (L.cx - (W + L.D * 0.6)) * easeOutBack(k);
        cur.spin = cur.rot * easeOutBack(k);
        if (k >= 1) { cur.x = L.cx; cur.spin = cur.rot; phase = 'trace'; cur.startT = 0; }
      } else if (phase === 'shucked') {
        if (T - cur.t0 >= C.shuckedHold * moveMult()) { phase = 'slideOut'; cur.t0 = T; SFX.slide(); }
      } else if (phase === 'slideOut') {
        const k = Math.min(1, (T - cur.t0) / (C.slideOutTime * moveMult()));
        cur.x = L.cx + (-L.D * 0.7 - L.cx) * easeIn(k);
        if (k >= 1) { if (G.done >= G.need) { endShift(true); return; } nextOyster(); }
      }
      if (hurt) hurt.t += dt;
      if (G.stun > 0) { G.stun -= dt; if (G.stun <= 0) hurt = null; }

      // the blade follows your finger with some drag and shake (better knives = less)
      if (pointer.tracing && phase === 'trace' && G.stun <= 0) {
        const kt = knifeStats();
        const lagK = 1 - Math.exp(-dt / Math.max(0.004, kt.lag * (perk('spd', 2) ? 0.5 : 1)));
        knife.x += (pointer.x - knife.x) * lagK; knife.y += (pointer.y - knife.y) * lagK;
        // shake grows with how fast you move; good knives stay calm until you go really fast
        const fsp = Math.hypot(pointer.x - (pointer.wx ?? pointer.x), pointer.y - (pointer.wy ?? pointer.y)) / Math.max(dt, 1e-3);
        pointer.wx = pointer.x; pointer.wy = pointer.y;
        G.fsp = (G.fsp || 0) + (fsp - (G.fsp || 0)) * Math.min(1, dt * 8);
        const speedF = kt.idle + (1 - kt.idle) * Math.min(2.2, G.fsp / (kt.ctrl * Math.min(W, H)));
        const wob = (kt.wobble * speedF * (perk('acc', 2) ? 0.5 : 1) + G.wounds * C.woundWobble) * L.D;
        const nx = knife.x + wob * (Math.sin(T * 6.1) + 0.55 * Math.sin(T * 15.7 + 1.3));
        const ny = knife.y + wob * (Math.cos(T * 5.3 + 0.7) + 0.55 * Math.sin(T * 12.9 + 2.1));
        // DRAWING or SWIPING? Fast finger = swipe (flicks barnacles, slices lemons) and never traces the shell.
        const rawSp = Math.hypot(pointer.x - (pointer.prevX ?? pointer.x), pointer.y - (pointer.prevY ?? pointer.y)) / Math.max(dt, 1e-3);
        G.rsp = (G.rsp || 0) + (rawSp - (G.rsp || 0)) * Math.min(1, dt * 30);
        if (G.rsp > Math.min(W, H) * (C.swipeSpeed ?? 2.2)) G.swipeUntil = T + (C.swipeHold ?? 0.15);
        const flicked = barnacleCheck(armTip.x, armTip.y, nx, ny, dt);
        if (flicked) G.swipeUntil = T + 0.25;
        const swiping = T < (G.swipeUntil || 0);
        if (swiping && rawSp > 30) G.streaks.push({ x1: pointer.prevX ?? pointer.x, y1: pointer.prevY ?? pointer.y, x2: pointer.x, y2: pointer.y, t: 0 });
        pointer.prevX = pointer.x; pointer.prevY = pointer.y;
        if (flicked || swiping) { pointer.lastX = nx; pointer.lastY = ny; } else traceTo(nx, ny);
        armTip.x = nx; armTip.y = ny;
      }

      // Regeneration perk: cuts close by themselves
      if (G.wounds > 0 && perk('bld', 4)) {
        G.regenT -= dt;
        if (G.regenT <= 0) {
          G.wounds -= 1; G.tapsDone = 0; G.regenT = 2.5;
          G.bandages.push({ dx: (Math.random() - 0.5) * 50, dy: (Math.random() - 0.5) * 36, rot: Math.random() - 0.5 });
          fx.popups.push({ text: 'Healed!', sub: '', x: armTip.x, y: armTip.y - L.D * 0.12, t: 0.2, small: true, money: true });
          if (!G.wounds) hurt = null;
        }
      }
      // open cuts drip blood wherever the hand is
      if (G.wounds > 0) {
        G.dripT -= dt;
        if (G.dripT <= 0) {
          G.dripT = (C.dripEvery / G.wounds) * (0.6 + Math.random() * 0.8) * (perk('bld', 4) ? 0.45 : 1);
          const at = gloveAt || armTip;
          G.drips.push({ x: at.x + (Math.random() - 0.5) * 10, y: at.y, t: 0, r: L.D * (0.018 + Math.random() * 0.014) });
        }
      }
      G.drips.forEach((d) => {
        d.t += dt;
        if (d.t >= 0.28 && !d.landed) {
          d.landed = true;
          const onOyster = !perk('bld', 3) && cur && (phase === 'trace' || phase === 'slideIn') && Math.hypot(d.x - cur.x, d.y - L.cy) < L.D * 0.36;
          if (onOyster) { cur.blood.push({ dx: (d.x - cur.x) / L.D, dy: (d.y - L.cy) / L.D, r: d.r / L.D }); fx.popups.push({ text: 'Drip!', sub: '', x: d.x, y: d.y - L.D * 0.08, t: 0.3, bad: true, small: true }); }
          else G.splats.push({ x: d.x, y: d.y, r: d.r, t: 0 });
        }
      });
      G.drips = G.drips.filter((d) => !d.landed);
      G.splats.forEach((s) => { s.t += dt; }); G.splats = G.splats.filter((s) => s.t < 6);
    }

    if (fx.lid) {
      const l = fx.lid; l.t += dt; l.vy += L.D * 9 * dt; l.x += l.vx * dt; l.y += l.vy * dt; l.rot += l.vr * dt;
      if (l.y > H + L.D || l.t > 2) fx.lid = null;
    }
    if (fx.stamp) { fx.stamp.t += dt; if (fx.stamp.t > 1.0) fx.stamp = null; }
    fx.popups.forEach((p) => { p.t += dt; }); fx.popups = fx.popups.filter((p) => p.t < 1.1);
    fx.splash.forEach((s) => { s.t += dt; s.vy += L.D * 5 * dt; s.x += s.vx * dt; s.y += s.vy * dt; }); fx.splash = fx.splash.filter((s) => s.t < 0.8);
    fx.drops.forEach((s) => { s.t += dt; if (s.t < 0.6) { s.vy += L.D * 4 * dt; s.x += s.vx * dt; s.y += s.vy * dt; } });
    if (fx.ouch) { fx.ouch.t += dt; if (fx.ouch.t > 1.4) fx.ouch = null; }
    fx.flung.forEach((f) => { f.t += dt; f.vy += L.D * 6 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.rot += f.vr * dt; });
    fx.flung = fx.flung.filter((f) => f.t < 1.2 && f.y < H + 100);
    fx.shake = Math.max(0, fx.shake - dt);
    fx.wipe = Math.max(0, fx.wipe - dt);

    let tx, ty;
    const knifeDriving = pointer.tracing && state === 'play' && !paused && phase === 'trace' && G && G.stun <= 0;
    const following = (pointer.down || (pointer.hover && pointer.type === 'mouse')) && !hurt && state === 'play' && !paused;
    if (knifeDriving) return;
    if (following) { tx = pointer.x; ty = pointer.y; }
    else if (hurt) { tx = L.rest.x + Math.sin(T * 40) * 6; ty = L.rest.y + L.D * 0.2 + Math.cos(T * 33) * 4; }
    else { tx = L.rest.x + Math.sin(T * 1.6) * 8; ty = L.rest.y + Math.sin(T * 2.3) * 10; }
    const k = following ? 1 - Math.pow(0.0005, dt) : 1 - Math.pow(0.02, dt);
    armTip.x += (tx - armTip.x) * k; armTip.y += (ty - armTip.y) * k;
  }

  // Googly eye spots on each top shell (sprite pixels in a 360x360 sprite: x, y, radius).
  const EYES = window.SHUCK_EYES || {
    round:    [[72.5, 156.3, 15.5], [80.5, 207.3, 15]],
    teardrop: [[124.1, 169.3, 11], [134, 203.5, 9]],
    crescent: [[222.1, 266, 14.5], [262.6, 226.4, 14.5]],
    pointy:   [[230, 216.9, 13], [244.7, 252.1, 11.5]],
  };
  function drawEyes(shape, x, y, flip, rot = 0, scale = 1, seed = 0) {
    const eyes = EYES[shape]; if (!eyes) return;
    const D = L.D * scale, k = D / 360;
    const look = armTip;
    const blink = ((T + seed * 1.7) % 4.2) < 0.13;
    const cr = Math.cos(rot), sr = Math.sin(rot);
    eyes.forEach(([ex, ey, er]) => {
      const lx = (ex - 180) * k * (flip ? -1 : 1), ly = (ey - 180) * k;
      const px = x + lx * cr - ly * sr, py = y + lx * sr + ly * cr;
      const r = er * k;
      ctx.save();
      ctx.fillStyle = '#fbf8ef';
      ctx.beginPath(); ctx.arc(px, py, r * 0.95, 0, Math.PI * 2); ctx.fill();
      if (blink) {
        ctx.fillStyle = '#c9b48d'; ctx.beginPath(); ctx.arc(px, py, r * 0.95, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#1d1712'; ctx.lineWidth = Math.max(1.5, r * 0.18); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(px - r * 0.7, py); ctx.quadraticCurveTo(px, py + r * 0.35, px + r * 0.7, py); ctx.stroke();
      } else {
        const dx = look.x - px, dy = look.y - py, dist = Math.hypot(dx, dy) || 1;
        const reach = r * 0.42 * Math.min(1, dist / (L.D * 0.25));
        const qx = px + (dx / dist) * reach, qy = py + (dy / dist) * reach;
        ctx.fillStyle = '#16100b'; ctx.beginPath(); ctx.arc(qx, qy, r * 0.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(qx - r * 0.17, qy - r * 0.17, r * 0.14, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    });
  }

  // ---------- Draw ----------
  const SIL = {};
  function silhouette(key) {
    if (SIL[key]) return SIL[key];
    const im = IMG[key]; if (!im) return null;
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const x = c.getContext('2d'); x.drawImage(im, 0, 0);
    x.globalCompositeOperation = 'source-in'; x.fillStyle = 'rgb(60,25,5)'; x.fillRect(0, 0, c.width, c.height);
    return (SIL[key] = c);
  }
  function drawShadow(o, x, y) {
    const key = o.shape + (phase === 'slideIn' || phase === 'trace' ? '_top' : '_bottom');
    const s = silhouette(key); if (!s) return;
    const D = L.D;
    ctx.save(); ctx.globalAlpha = 0.3; ctx.translate(x + D * 0.025, y + D * 0.045); ctx.rotate(o.spin || 0); if (o.flip) ctx.scale(-1, 1);
    ctx.drawImage(s, -D / 2, -D / 2, D, D); ctx.restore();
  }
  function drawOysterImg(key, x, y, flip, rot = 0, scale = 1, alpha = 1) {
    const im = IMG[key]; if (!im) return;
    const D = L.D * scale;
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.rotate(rot); if (flip) ctx.scale(-1, 1);
    ctx.drawImage(im, -D / 2, -D / 2, D, D); ctx.restore();
  }
  function drawBloodOn(o) {
    if (!o.blood.length) return;
    ctx.save();
    o.blood.forEach((b, i) => splat(o.x + b.dx * L.D, L.cy + b.dy * L.D, b.r * L.D, i));
    ctx.restore();
  }
  function splat(x, y, r, seed = 0, alpha = 1) {
    ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = '#c4161c'; ctx.strokeStyle = 'rgba(42,20,8,0.7)'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2, rr2 = r * (0.75 + 0.45 * Math.abs(Math.sin(seed * 3.7 + k * 2.3)));
      ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function drawDrips() {
    if (!G) return;
    G.splats.forEach((s, i) => splat(s.x, s.y, s.r, i, Math.min(1, (6 - s.t) / 1.5)));
    G.drips.forEach((d) => {
      const k = d.t / 0.28, rr2 = d.r * (0.5 + 0.5 * k);
      ctx.save(); ctx.fillStyle = '#e8322a'; ctx.strokeStyle = '#2a1408'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(d.x, d.y - (1 - k) * L.D * 0.05, rr2 * 0.8, rr2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
    });
  }

  function drawGuide(o) {
    const pts = o.pts, n = pts.length, dx = o.x - L.cx;
    ctx.save(); ctx.translate(dx, 0); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.setLineDash([L.D * 0.025, L.D * 0.03]); ctx.lineDashOffset = -T * 40;
    ctx.strokeStyle = 'rgba(255,250,235,0.85)'; ctx.lineWidth = Math.max(2.5, L.D * 0.009);
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); ctx.stroke();
    ctx.setLineDash([]);
    const w = Math.max(5, L.D * 0.022);
    for (let pass = 0; pass < 2; pass++) {
      ctx.strokeStyle = pass ? '#ffd23f' : '#3a1d0b'; ctx.lineWidth = pass ? w : w + 4;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        if (o.covered[i] && o.covered[j]) { ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); }
      }
      ctx.stroke();
    }
    ctx.restore();
  }
  function drawTrail(o) {
    if (!o.trail.length) return;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = 1; i < o.trail.length; i++) {
      const a = o.trail[i - 1], b = o.trail[i], age = T - b.t;
      if (age > 0.35) continue;
      ctx.strokeStyle = `rgba(255,255,255,${0.75 * (1 - age / 0.35)})`; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.restore();
  }
  function drawFlickArrow(x, y, sc = 1) {
    const D = L.D * sc, ax = x - D * 0.2, ay = y + D * 0.14, bx = x + D * 0.2, by = y - D * 0.14;
    const k = (T * 1.4) % 1;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const [col, w] of [['#2a1408', D * 0.05], ['#ffd23f', D * 0.03]]) {
      ctx.strokeStyle = col; ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      const ang = Math.atan2(by - ay, bx - ax), hl = D * 0.08;
      ctx.beginPath(); ctx.moveTo(bx - Math.cos(ang - 0.5) * hl, by - Math.sin(ang - 0.5) * hl); ctx.lineTo(bx, by);
      ctx.lineTo(bx - Math.cos(ang + 0.5) * hl, by - Math.sin(ang + 0.5) * hl); ctx.stroke();
    }
    // a "finger" zipping along the arrow
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.strokeStyle = '#2a1408'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(ax + (bx - ax) * k, ay + (by - ay) * k, D * 0.035, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  function drawHint(o) {
    if (o.barn && o.barn.some((b) => b.alive) && (SAVE.flicks || 0) < 8) {
      label('Swipe fast across the barnacles!', L.cx, L.cy - L.D * 0.58, L.D * 0.07, '#fff3d6');
      if ((SAVE.flicks || 0) < 4) { const b = o.barn.find((x) => x.alive), p = barnPos(o, b); drawFlickArrow(p.x, p.y); }
      return;
    }
    if (o.n > 0 || SAVE.oysters + G.done > 1) return;
    const n = o.pts.length, f = (T * 0.35) % 1, i = Math.floor(f * n), p = o.pts[i];
    ctx.save();
    ctx.fillStyle = 'rgba(255,210,63,0.9)'; ctx.strokeStyle = '#3a1d0b'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(p.x, p.y, 9 + Math.sin(T * 8) * 2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    label('Trace around the shell!', L.cx, L.cy - L.D * 0.58, L.D * 0.085, '#fff3d6');
    ctx.restore();
  }
  function label(text, x, y, size, fill, rot = 0, maxW = W * 0.92) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.font = `${size}px "Lilita One", "Arial Black", system-ui, sans-serif`;
    const m = ctx.measureText(text).width; if (m > maxW) { const s = maxW / m; ctx.scale(s, s); }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#2a1408'; ctx.lineWidth = size * 0.22; ctx.strokeText(text, 0, 0);
    ctx.fillStyle = fill; ctx.fillText(text, 0, 0);
    ctx.restore();
  }
  function drawStamp() {
    const s = fx.stamp; if (!s) return;
    let sc;
    if (s.t < 0.16) sc = 2.4 - (2.4 - 0.88) * (s.t / 0.16);
    else if (s.t < 0.3) sc = 0.88 + 0.12 * ((s.t - 0.16) / 0.14);
    else sc = 1;
    const alpha = s.t > 0.8 ? 1 - (s.t - 0.8) / 0.2 : 1;
    ctx.save(); ctx.globalAlpha = Math.max(0, alpha);
    ctx.translate(L.cx, L.cy - L.D * 0.05); ctx.scale(sc, sc);
    if (s.rank <= 1) {
      ctx.save(); ctx.rotate(T * 1.5); ctx.fillStyle = 'rgba(255,230,120,0.35)';
      for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(L.D * 0.08, -L.D * 0.7); ctx.lineTo(-L.D * 0.08, -L.D * 0.7); ctx.fill(); }
      ctx.restore();
    }
    label(s.text, 0, 0, L.D * 0.18, s.color, -0.08, W * 0.94);
    ctx.restore();
  }
  function drawOrderUp() {
    const k = Math.min(1, (T - readyT) / 0.25), sc = 0.5 + 0.5 * easeOutBack(k);
    ctx.save(); ctx.translate(L.cx, L.cy - L.D * 0.08); ctx.scale(sc, sc);
    label('ORDER UP!', 0, 0, L.D * 0.2, '#ffd23f', -0.06);
    label(`${G.need} oysters · ${G.clockMax}s`, 0, L.D * 0.2, L.D * 0.085, '#fff3d6');
    ctx.restore();
  }
  function drawPopups() {
    fx.popups.forEach((p) => {
      const a = p.t > 0.7 ? 1 - (p.t - 0.7) / 0.4 : 1, y = p.y - p.t * L.D * 0.25;
      ctx.save(); ctx.globalAlpha = Math.max(0, a);
      label(p.text, p.x, y, p.small ? L.D * 0.06 : p.big ? L.D * 0.12 : L.D * 0.11, p.bad ? '#ff6b5b' : p.big ? '#8df27a' : p.money ? '#8df27a' : '#fff3d6');
      if (p.sub) label(p.sub, p.x, y + L.D * 0.09, L.D * 0.055, '#ffd23f');
      ctx.restore();
    });
  }
  function drawArm() {
    const knifeLook = knifeStats().look || 'steel';
    const hand = KNIFE[knifeLook] || IMG.hand, cuff = IMG.cuff; if (!hand || !cuff) return;
    const s = L.armScale, Cs = L.cuffOpen, tip = armTip;
    const v0x = ARM.hand.tip[0] - ARM.hand.wrist[0], v0y = ARM.hand.tip[1] - ARM.hand.wrist[1];
    const rot = Math.atan2(tip.y - Cs.y, tip.x - Cs.x) - Math.atan2(v0y, v0x);
    const cr = Math.cos(rot), sr = Math.sin(rot);
    const wx = (ARM.hand.wrist[0] - ARM.hand.tip[0]) * s, wy = (ARM.hand.wrist[1] - ARM.hand.tip[1]) * s;
    const Ws = { x: tip.x + wx * cr - wy * sr, y: tip.y + wx * sr + wy * cr };
    const mx = (Cs.x + Ws.x) / 2, my = (Cs.y + Ws.y) / 2;
    const len = Math.hypot(Ws.x - Cs.x, Ws.y - Cs.y);
    const nx = -(Ws.y - Cs.y) / (len || 1), ny = (Ws.x - Cs.x) / (len || 1);
    const sag = Math.min(len * 0.18, L.D * 0.25) + Math.sin(T * 3) * 3;
    const cx = mx + nx * sag * 0.6, cy = my + Math.abs(ny) * sag + sag * 0.3;
    const th = ARM.thick * s;
    ctx.save(); ctx.lineCap = 'round';
    const hose = () => { ctx.beginPath(); ctx.moveTo(Cs.x, Cs.y); ctx.quadraticCurveTo(cx, cy, Ws.x, Ws.y); };
    hose(); ctx.strokeStyle = '#1b0f08'; ctx.lineWidth = th + 7 * s * 2; ctx.stroke();
    hose(); ctx.strokeStyle = ARM.color; ctx.lineWidth = th; ctx.stroke();
    ctx.save(); ctx.translate(-nx * th * 0.18, -ny * th * 0.18);
    hose(); ctx.strokeStyle = 'rgba(255,190,130,0.45)'; ctx.lineWidth = th * 0.25; ctx.stroke(); ctx.restore();
    ctx.restore();
    ctx.drawImage(cuff, L.cuff.x, L.cuff.y, cuff.width * L.cuff.s, cuff.height * L.cuff.s);
    ctx.save(); ctx.translate(tip.x, tip.y); ctx.rotate(rot); ctx.scale(s, s);
    ctx.drawImage(hand, -ARM.hand.tip[0], -ARM.hand.tip[1]);
    const gx = ARM.hand.glove[0] - ARM.hand.tip[0], gy = ARM.hand.glove[1] - ARM.hand.tip[1];
    if (G && state === 'play') G.bandages.forEach((b) => drawBandage(gx + b.dx, gy + b.dy, b.rot));
    if (G && state === 'play' && G.wounds) {
      for (let k = 0; k < G.wounds; k++) {
        const ox = gx - 10 + k * 22, oy = gy - 6 + (k % 2) * 18, pulse = 1 + 0.12 * Math.sin(T * 10 + k);
        ctx.fillStyle = '#e8322a'; ctx.strokeStyle = '#2a1408'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(ox, oy, 15 * pulse, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
    }
    ctx.restore();
    // remember where the cut is on screen so drips fall from it
    { const px = gx - 10, py = gy - 6; gloveAt = { x: tip.x + (px * cr - py * sr) * s, y: tip.y + (px * sr + py * cr) * s }; }
  }
  function drawBandage(x, y, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.fillStyle = '#e9b98c'; ctx.strokeStyle = '#2a1408'; ctx.lineWidth = 4;
    rr(-46, -15, 92, 30, 14); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f6d5b0'; rr(-14, -11, 28, 22, 5); ctx.fill();
    ctx.fillStyle = 'rgba(120,70,30,0.6)';
    for (const px of [-34, -26, 26, 34]) for (const py of [-5, 5]) { ctx.beginPath(); ctx.arc(px, py, 1.8, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function drawNapkin() {
    const n = L.napkin;
    const bleeding = !!(G && state === 'play' && G.wounds);
    const glow = bleeding ? 0.5 + 0.5 * Math.sin(T * 9) : 0;
    ctx.save();
    if (fx.wipe > 0) { ctx.translate(n.x + n.w / 2, n.y + n.h / 2); ctx.rotate(Math.sin(fx.wipe * 60) * 0.12); ctx.translate(-(n.x + n.w / 2), -(n.y + n.h / 2)); }
    if (bleeding) {
      ctx.shadowColor = `rgba(255,220,80,${0.6 + glow * 0.4})`; ctx.shadowBlur = 18 + glow * 22;
      ctx.strokeStyle = `rgba(255,220,80,${0.7 + glow * 0.3})`; ctx.lineWidth = 5;
      rr(n.x - 6, n.y - 6, n.w + 12, n.h + 12, 12); ctx.stroke();
      ctx.shadowBlur = 0;
    }
    if (!n.painted && IMG.napkin) {
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
      rr(n.x, n.y, n.w, n.h, 8); ctx.clip(); ctx.drawImage(IMG.napkin, n.x, n.y, n.w, n.h); ctx.restore();
    }
    ctx.restore();
    if (bleeding) {
      const left = tapsNeeded() - G.tapsDone;
      label(`TAP ×${left}`, n.x + n.w / 2, n.y - 22, Math.max(20, L.D * 0.07), G.wounds > 1 ? '#ff6b5b' : '#ffd23f', 0, W * 0.4);
    }
  }
  function drawHurt() {
    fx.drops.forEach((d) => {
      ctx.save(); ctx.fillStyle = '#e8322a'; ctx.strokeStyle = '#2a1408'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
    });
    if (fx.ouch) {
      const o = fx.ouch, k = Math.min(1, o.t / 0.15), sc = 0.4 + k * 0.7 + Math.sin(o.t * 30) * 0.03 * (1 - k);
      const ox = Math.min(W * 0.62, Math.max(W * 0.38, o.x)), oy = Math.max(L.top + L.D * 0.18, o.y - L.D * 0.18);
      ctx.save(); ctx.translate(ox, oy); ctx.scale(sc, sc);
      ctx.fillStyle = '#fff3d6'; ctx.strokeStyle = '#2a1408'; ctx.lineWidth = 5;
      ctx.beginPath();
      for (let i = 0; i < 24; i++) { const r = i % 2 ? L.D * 0.2 : L.D * 0.33, a = (i / 24) * Math.PI * 2; ctx.lineTo(Math.cos(a) * r * 1.25, Math.sin(a) * r * 0.8); }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      label('OUCH!', 0, 0, L.D * 0.16, '#e8322a', -0.1);
      ctx.restore();
    }
    if (G && state === 'play' && G.wounds && !pointer.tracing) {
      const msg = G.wounds > 1 ? `${G.wounds} cuts! Bandage up!` : 'Bleeding! Tap the napkin!';
      label(msg, L.cx, L.cy - L.D * 0.58, L.D * 0.075, G.wounds > 1 ? '#ff6b5b' : '#fff3d6');
    }
  }
  function drawCounter() {
    const v = (G && state === 'play') ? G.venue : venue();
    const bg = IMG['bg_' + v.id] || IMG.counter;
    if (bg) ctx.drawImage(bg, L.bg.ox, L.bg.oy, BG.w * L.bg.s, BG.h * L.bg.s);
    else { ctx.fillStyle = '#7b8a96'; ctx.fillRect(0, 0, W, H); }
    if (v.tint && !IMG['bg_' + v.id]) {
      ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = v.tint; ctx.fillRect(0, 0, W, H); ctx.restore();
    }
  }

  function draw() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    if (fx.shake > 0) ctx.translate((Math.random() - 0.5) * 14 * fx.shake * 3, (Math.random() - 0.5) * 14 * fx.shake * 3);
    drawCounter();
    drawNapkin();
    if (state === 'play' && cur) {
      drawShadow(cur, cur.x, L.cy);
      if (phase === 'slideIn' || phase === 'trace') {
        drawOysterImg(cur.shape + '_top', cur.x, L.cy, cur.flip, cur.spin);
        drawEyes(cur.shape, cur.x, L.cy, cur.flip, cur.spin, 1, G.done);
        drawBloodOn(cur);
        drawBarnacles(cur);
        if (phase === 'trace') { drawGuide(cur); drawTrail(cur); drawHint(cur); }
      } else { drawOysterImg(cur.shape + '_bottom', cur.x, L.cy, cur.flip, cur.spin); drawBloodOn(cur); }
    }
    if (state === 'play') drawDrips();
    fx.splash.forEach((s) => {
      ctx.save(); ctx.globalAlpha = 1 - s.t / 0.8; ctx.fillStyle = '#d8eef6'; ctx.strokeStyle = 'rgba(40,70,90,0.6)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
    });
    fx.flung.forEach((f) => drawBarnacle(f.x, f.y, f.r, f.rot, Math.max(0, 1 - f.t / 1.2)));
    if (fx.lid) {
      drawOysterImg(fx.lid.shape + '_top', fx.lid.x, fx.lid.y, fx.lid.flip, fx.lid.rot, 1 + fx.lid.t * 0.5);
      drawEyes(fx.lid.shape, fx.lid.x, fx.lid.y, fx.lid.flip, fx.lid.rot, 1 + fx.lid.t * 0.5, 9);
    }
    if (state === 'play') { drawFly(); if (venue().lemonButton) drawOcto(); drawLemonGauge(); drawIceGauge(); }
    drawArm();
    if (state === 'play' && phase === 'ready' && !paused) drawOrderUp();
    drawStamp();
    drawPopups();
    drawHurt();
    ctx.restore();
  }

  // =====================================================================
  //  MINI GAME: LEMON TOSS
  //  Your octopus buddy throws lemons up with his eight arms. Slice each one
  //  in half, then slice the halves into quarters. Only quarters score.
  // =====================================================================
  const LT = C.lemonToss || {};
  const TENT = [   // tentacle sprites: base (cut end) and tip (top of the curl), in sprite pixels
    { base: [99.2, 403.2], tip: [134.0, 12.7] },
    { base: [116.6, 382.2], tip: [192.4, 11.5] },
    { base: [107.2, 402.6], tip: [210.0, 12.7] },
    { base: [65.4, 355.8], tip: [180.2, 11.3] },
  ];
  // Arm sockets on the beach art (1029 x 1447): x, y, resting angle in degrees, in front of the body?
  const SOCKETS = [
    { x: 450, y: 1110, ang: -150, front: false, sprite: 1 },
    { x: 731, y: 1102, ang: -30,  front: false, sprite: 3 },
    { x: 525, y: 1170, ang: -122, front: false, sprite: 2 },
    { x: 660, y: 1174, ang: -68,  front: false, sprite: 0 },
    { x: 411, y: 1165, ang: -172, front: true,  sprite: 0 },
    { x: 474, y: 1192, ang: -132, front: true,  sprite: 3 },
    { x: 616, y: 1198, ang: -48,  front: true,  sprite: 1 },
    { x: 711, y: 1177, ang: -8,   front: true,  sprite: 2 },
  ];
  const BEACH = { w: 1029, h: 1447, focusX: 570 };
  const LEMON_ART = {
    whole: { key: 'lemon_whole', w: 2.3 },
    half: { key: 'lemon_half', w: 1.95 },
    quarterA: { key: 'lemon_quarter_a', w: 1.55 },
    quarterB: { key: 'lemon_quarter_b', w: 1.55 },
  };
  let M = null;

  function lemonLayout() {
    if (!M) return;
    const s = Math.max(W / BEACH.w, H / BEACH.h);
    let ox = W / 2 - BEACH.focusX * s; ox = Math.min(0, Math.max(W - BEACH.w * s, ox));
    const oy = H - BEACH.h * s;               // keep the sand at the bottom
    M.bg = { s, ox, oy };
    M.R = Math.max(20, Math.min(46, Math.min(W, H) * 0.068));
    M.g = H * 1.45;
    M.armLen = 160 * s;
  }

  function startLemons() {
    state = 'lemon'; phase = 'idle'; paused = false; cur = null; hurt = null;
    M = { t: 0, intro: LT.introTime ?? 1.6, time: tossTime(), timeLeft: tossTime(),
          pieces: [], juice: [], slashes: [], arms: SOCKETS.map((sk, i) => ({ i, phase: 'idle', t: 0, swing: 0, hold: null })),
          spawnT: 0.4, thrown: 0, quartered: 0, quarters: 0, score: 0, combo: 0, bestCombo: 0, comboT: 0,
          dropped: 0, nextId: 1, lemons: {}, prev: null, over: false };
    lemonLayout();
    armTip.x = L.rest.x; armTip.y = L.rest.y;
    showScreen(null);
    hudLabels(['Mini game', 'Quartered', 'Score']);
    els.venue.textContent = 'Lemon Toss';
    lemonHud();
    SFX.orderUp();
  }

  function hudLabels(t) { document.querySelectorAll('#hud .hud-label').forEach((el, i) => { if (t[i]) el.textContent = t[i]; }); }
  function lemonHud() {
    els.count.textContent = String(M.quartered);
    els.earned.textContent = M.score.toLocaleString();
    const f = Math.max(0, M.timeLeft / M.time);
    els.clockFill.style.transform = `scaleX(${f})`;
    els.clockFill.dataset.low = f < 0.2 ? '1' : '0';
    els.clockText.textContent = Math.ceil(Math.max(0, M.timeLeft)) + 's';
  }

  function armPose(a) {
    const sk = SOCKETS[a.i], b = M.bg;
    const ax = b.ox + sk.x * b.s, ay = b.oy + sk.y * b.s;
    let ang = sk.ang * Math.PI / 180 + Math.sin(T * 1.7 + a.i * 1.3) * 0.12;
    const out = sk.ang < -90 ? -1 : 1;          // which way is "outward" for this arm
    if (a.phase === 'wind') ang += out * 0.55 * Math.min(1, a.t / 0.3);
    if (a.phase === 'flick') { const k = Math.min(1, a.t / 0.12); ang += out * (0.55 - 1.15 * k); }
    if (a.phase === 'recover') { const k = Math.min(1, a.t / 0.4); ang += out * (-0.6 * (1 - k)); }
    const tipX = ax + Math.cos(ang) * M.armLen, tipY = ay + Math.sin(ang) * M.armLen;
    return { ax, ay, ang, tipX, tipY, flip: sk.ang < -90 };
  }

  function drawTentacle(a) {
    const sk = SOCKETS[a.i], d = TENT[sk.sprite], im = IMG['tentacle' + sk.sprite]; if (!im) return;
    const p = armPose(a);
    const vx = (d.tip[0] - d.base[0]) * (p.flip ? -1 : 1), vy = d.tip[1] - d.base[1];
    const len = Math.hypot(vx, vy), k = M.armLen / len;
    const rot = p.ang - Math.atan2(vy, vx);
    ctx.save(); ctx.translate(p.ax, p.ay); ctx.rotate(rot); ctx.scale(k * (p.flip ? -1 : 1), k);
    ctx.drawImage(im, -d.base[0], -d.base[1]);
    ctx.restore();
    if (a.hold) drawPiece({ kind: 'whole', x: p.tipX, y: p.tipY, rot: Math.sin(T * 6 + a.i) * 0.2, r: M.R, art: 'whole' });
  }

  function throwLemon() {
    const idle = M.arms.filter((a) => a.phase === 'idle');
    if (!idle.length) return;
    const a = idle[(Math.random() * idle.length) | 0];
    a.phase = 'wind'; a.t = 0; a.hold = true;
  }

  function releaseLemon(a) {
    const p = armPose(a);
    const apexY = H * (0.1 + Math.random() * 0.3);
    const rise = Math.max(H * 0.2, p.tipY - apexY);
    const vy = -Math.sqrt(2 * M.g * rise);
    const tFlight = (-vy / M.g) * 2;
    const tx = W * (0.15 + Math.random() * 0.7);
    const vx = ((tx - p.tipX) / tFlight) * 0.9;
    const id = M.nextId++;
    M.lemons[id] = { quarters: 0 };
    M.pieces.push({ id, kind: 'whole', art: 'whole', x: p.tipX, y: p.tipY, vx, vy, rot: 0, vr: (Math.random() - 0.5) * 6, r: M.R, cool: 0 });
    M.thrown++;
    a.hold = null;
    tone(520 + Math.random() * 120, 0.08, 'triangle', 0.06, 900);
  }

  function segCircle(x1, y1, x2, y2, cx, cy, r) {
    const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy || 1;
    let t = ((cx - x1) * dx + (cy - y1) * dy) / l2; t = Math.max(0, Math.min(1, t));
    const ex = x1 + dx * t - cx, ey = y1 + dy * t - cy;
    return ex * ex + ey * ey <= r * r;
  }

  function slicePiece(pc, sx, sy) {
    const len = Math.hypot(sx, sy) || 1, ux = sx / len, uy = sy / len, nx = -uy, ny = ux;
    const kick = Math.min(W, H) * 0.32;
    const kids = [];
    const child = (sign, kind, art, r) => ({
      id: pc.id, kind, art, r,
      x: pc.x + nx * sign * pc.r * 0.3, y: pc.y + ny * sign * pc.r * 0.3,
      vx: pc.vx * 0.6 + nx * sign * kick + ux * kick * 0.25, vy: Math.min(pc.vy, 0) * 0.5 + ny * sign * kick - kick * 0.6,
      rot: Math.atan2(ny, nx) + (sign > 0 ? 0 : Math.PI), vr: sign * (3 + Math.random() * 4), cool: 0.18,
    });
    if (pc.kind === 'whole') {
      kids.push(child(1, 'half', 'half', M.R * 0.86), child(-1, 'half', 'half', M.R * 0.86));
      fx.popups.push({ text: 'HALF!', sub: '', x: pc.x, y: pc.y - pc.r, t: 0.25, small: true });
    } else {
      kids.push(child(1, 'quarter', 'quarterA', M.R * 0.66), child(-1, 'quarter', 'quarterB', M.R * 0.66));
      const per = LT.pointsPerQuarter ?? 10;
      M.quarters += 2; M.score += per * 2;
      const L2 = M.lemons[pc.id]; if (L2) L2.quarters += 2;
      let text = `+${per * 2}`, sub = '';
      if (L2 && L2.quarters >= 4) {
        M.quartered++; M.score += LT.fullLemonBonus ?? 30; M.xpSpd = (M.xpSpd || 0) + SK.xp.lemonPerQuartered; text = `+${per * 2 + (LT.fullLemonBonus ?? 30)}`; sub = 'QUARTERED!';
        tone(1046, 0.12, 'square', 0.06, 0, 0.05); tone(1568, 0.14, 'square', 0.06, 0, 0.12);
      }
      fx.popups.push({ text, sub, x: pc.x, y: pc.y - pc.r, t: 0, money: true });
    }
    M.combo++; M.comboT = 0.35;
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * Math.PI * 2, v = Math.min(W, H) * (0.2 + Math.random() * 0.6);
      M.juice.push({ x: pc.x, y: pc.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - v * 0.4, r: 2 + Math.random() * 4, t: 0 });
    }
    noise(0.07, 0.22, 2500); tone(900 + Math.random() * 300, 0.06, 'square', 0.05, 400);
    return kids;
  }

  function updateLemons(dt) {
    if (!M) return;
    M.t += dt;
    // knife follows the finger (better knives feel snappier)
    const lag = knifeStats().lag * 0.5 * (perk('spd', 2) ? 0.5 : 1);
    const k = 1 - Math.exp(-dt / Math.max(0.004, lag));
    const tx = pointer.down ? pointer.x : L.rest.x + Math.sin(T * 1.6) * 8;
    const ty = pointer.down ? pointer.y : L.rest.y + Math.sin(T * 2.3) * 10;
    const px = armTip.x, py = armTip.y;
    armTip.x += (tx - armTip.x) * k; armTip.y += (ty - armTip.y) * k;

    if (paused) return;
    const playing = M.t > M.intro && !M.over;
    if (playing) {
      M.timeLeft -= dt;
      const prog = 1 - Math.max(0, M.timeLeft) / M.time;
      if (M.timeLeft > 0) {
        M.spawnT -= dt;
        if (M.spawnT <= 0) {
          throwLemon();
          if (Math.random() < 0.1 + prog * 0.45) throwLemon();
          if (prog > 0.6 && Math.random() < prog * 0.25) throwLemon();
          M.spawnT = (LT.startEvery ?? 1.5) + ((LT.endEvery ?? 0.6) - (LT.startEvery ?? 1.5)) * prog;
        }
      }
    }
    // arms
    M.arms.forEach((a) => {
      a.t += dt;
      if (a.phase === 'wind' && a.t >= 0.32) { a.phase = 'flick'; a.t = 0; releaseLemon(a); }
      else if (a.phase === 'flick' && a.t >= 0.12) { a.phase = 'recover'; a.t = 0; }
      else if (a.phase === 'recover' && a.t >= 0.4) { a.phase = 'idle'; a.t = 0; }
    });
    // slicing: the blade has to be moving fast while your finger is down
    const sx = armTip.x - px, sy = armTip.y - py, speed = Math.hypot(sx, sy) / Math.max(dt, 1e-3);
    const slicing = pointer.down && speed > Math.min(W, H) * (LT.sliceSpeed ?? 1.1);
    if (slicing) M.slashes.push({ x1: px, y1: py, x2: armTip.x, y2: armTip.y, t: 0 });
    const next = [];
    M.pieces.forEach((pc) => {
      pc.cool = Math.max(0, pc.cool - dt);
      if (slicing && pc.kind !== 'quarter' && pc.cool <= 0 && segCircle(px, py, armTip.x, armTip.y, pc.x, pc.y, pc.r * 1.05)) {
        next.push(...slicePiece(pc, sx, sy));
        return;
      }
      pc.vy += M.g * dt; pc.x += pc.vx * dt; pc.y += pc.vy * dt; pc.rot += pc.vr * dt;
      if (pc.y - pc.r > H && pc.vy > 0) {
        if (pc.kind === 'whole') M.dropped++;
        return;
      }
      next.push(pc);
    });
    M.pieces = next;
    M.comboT -= dt;
    if (M.comboT <= 0 && M.combo) {
      if (M.combo >= 3) {
        const bonus = M.combo * (LT.comboBonus ?? 5);
        M.score += bonus;
        fx.popups.push({ text: `${M.combo}-CUT COMBO!`, sub: `+${bonus}`, x: W / 2, y: H * 0.3, t: 0, big: true });
      }
      M.bestCombo = Math.max(M.bestCombo, M.combo); M.combo = 0;
    }
    M.juice.forEach((j) => { j.t += dt; j.vy += M.g * 0.6 * dt; j.x += j.vx * dt; j.y += j.vy * dt; });
    M.juice = M.juice.filter((j) => j.t < 0.7);
    M.slashes.forEach((s) => { s.t += dt; }); M.slashes = M.slashes.filter((s) => s.t < 0.18);
    fx.popups.forEach((p) => { p.t += dt; }); fx.popups = fx.popups.filter((p) => p.t < 1.1);
    lemonHud();
    if (playing && M.timeLeft <= 0 && !M.pieces.length && M.arms.every((a) => !a.hold)) endLemons();
  }

  function drawPiece(pc) {
    const art = LEMON_ART[pc.art], im = IMG[art.key]; if (!im) return;
    const w = pc.r * art.w, h = w * (im.height / im.width);
    ctx.save(); ctx.translate(pc.x, pc.y); ctx.rotate(pc.rot);
    ctx.drawImage(im, -w / 2, -h / 2, w, h); ctx.restore();
  }

  function drawLemons() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const b = M.bg, bg = IMG.lemon_beach;
    if (bg) ctx.drawImage(bg, b.ox, b.oy, BEACH.w * b.s, BEACH.h * b.s);
    else { ctx.fillStyle = '#2a6fc9'; ctx.fillRect(0, 0, W, H); }
    M.arms.filter((a) => !SOCKETS[a.i].front).forEach(drawTentacle);
    M.arms.filter((a) => SOCKETS[a.i].front).forEach(drawTentacle);
    M.pieces.forEach(drawPiece);
    M.juice.forEach((j) => {
      ctx.save(); ctx.globalAlpha = 1 - j.t / 0.7; ctx.fillStyle = '#ffe14d'; ctx.strokeStyle = 'rgba(120,90,0,0.6)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(j.x, j.y, j.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
    });
    ctx.save(); ctx.lineCap = 'round';
    M.slashes.forEach((s) => {
      const a = 1 - s.t / 0.18;
      ctx.strokeStyle = `rgba(255,255,255,${0.9 * a})`; ctx.lineWidth = 10 * a + 2;
      ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke();
    });
    ctx.restore();
    drawArm();
    drawPopups();
    if (M.t < M.intro) {
      const k = Math.min(1, M.t / 0.25), sc = 0.5 + 0.5 * easeOutBack(k);
      ctx.save(); ctx.translate(W / 2, H * 0.32); ctx.scale(sc, sc);
      label('LEMON TOSS!', 0, 0, Math.min(W, H) * 0.12, '#ffd23f', -0.06);
      label('Slice every lemon into quarters', 0, Math.min(W, H) * 0.11, Math.min(W, H) * 0.05, '#fff3d6');
      ctx.restore();
    } else if (M.timeLeft <= 0 && !M.over) {
      label("That's the last lemon!", W / 2, H * 0.3, Math.min(W, H) * 0.065, '#fff3d6');
    }
  }

  function endLemons() {
    M.over = true;
    state = 'result';
    hudLabels(['Working at', 'Shucked', 'Earned']);
    const best = M.score > (SAVE.lemonBest || 0);
    if (best) SAVE.lemonBest = M.score;
    const wedges = Math.min(lemonCapN(), SAVE.lemons + M.quarters) - SAVE.lemons;
    SAVE.lemons += wedges;
    const lvB = playerLevel().lv, rdB = SK.trees.filter((t) => perkReady(t.id)).length;
    const lemonXp = { acc: 0, spd: M.xpSpd || 0, bld: 0 };
    SAVE.xp.spd += lemonXp.spd; SAVE.xpTotal = (SAVE.xpTotal || 0) + lemonXp.spd;
    const lvA = playerLevel().lv, rdA = SK.trees.filter((t) => perkReady(t.id));
    writeSave();
    SFX.orderUp();
    const pct = M.thrown ? Math.round((M.quartered / M.thrown) * 100) : 0;
    const row = (label2, val, cls = '') => `<div class="line ${cls}"><span>${label2}</span><b>${val}</b></div>`;
    $('resultTitle').textContent = 'Lemons prepped!';
    $('resultTag').textContent = 'Just for fun';
    $('resultBody').innerHTML = `
      <p class="sub">Your octopus buddy threw ${M.thrown} lemons</p>
      <div class="receipt">
        ${row('Lemons quartered', `${M.quartered} of ${M.thrown}`)}
        ${row('Quarter pieces', M.quarters)}
        ${row('Best combo', M.bestCombo ? `${M.bestCombo} cuts` : '—')}
        ${row('Dropped whole', M.dropped)}
        ${row('Lemon wedges stocked', `+${wedges} (now ${SAVE.lemons})`)}
        ${row('Score', M.score.toLocaleString(), 'total')}
      </div>
      <p class="fine">${pct >= 90 ? 'Lemon master! The octopus is impressed.' : pct >= 60 ? 'Nice knife work. Enough lemons for a busy night.' : pct >= 30 ? 'Some lemons got away. The seagulls say thanks.' : 'The octopus is going to need more lemons.'}${best ? ' New best!' : ''}</p>
      ${lemonXp.spd ? xpBlock(lemonXp, lvA > lvB ? lvA : 0, rdA.length > rdB ? rdA : []) : ''}
      <div class="cashline"><span>Best</span><strong>${(SAVE.lemonBest || 0).toLocaleString()}</strong></div>`;
    setResultButtons('hub');
    showScreen('result');
  }

  // Between shifts you pick ONE prep game. Each one stocks a different supply.
  const PREP = [
    { id: 'lemons', name: 'Lemon Toss', c: '#ffe066', why: 'Cut lemons with the octopus. More wedges = bigger tips.',
      stat: () => `Wedges: ${SAVE.lemons || 0} / ${lemonCapN()}`, open: () => true, go: () => startLemons() },
    { id: 'dive', name: "Barry's Dive", c: '#7be0ff', why: 'Catch your own oysters. Skip the supplier bill = more profit.',
      stat: () => `Cooler: ${stockCount()} / ${C.stockCap ?? 40}`, open: () => diveOpen(), go: () => startDive() },
    { id: 'ice', name: 'Iceberg Harpoon', c: '#cfeaff', why: 'Harpoon the iceberg: knock the most ice loose. Ice keeps oysters cold = full pay.',
      stat: () => `Ice: ${SAVE.ice || 0} / ${iceCap()}`, open: () => true, go: () => startIce() },
    { id: 'sauce', name: 'Cocktail Sauce', c: '#ff8a7a', why: 'Coming soon: mix sauce for shrimp cocktail orders.', soon: true },
    { id: 'sharpen', name: 'Knife Sharpening', c: '#cfd8dc', why: 'Coming soon: a sharp knife flicks barnacles easier.', soon: true },
  ];
  function setResultButtons(next) {
    const btn = $('btnBackToShack'), skip = $('btnSkipMini'), dive = $('btnDive'), pick = $('prepPick');
    btn.dataset.next = next;
    btn.textContent = 'Back to the shack';
    const mini = next === 'mini';
    btn.hidden = mini; dive.hidden = true; skip.hidden = !mini; pick.hidden = !mini;
    if (mini) {
      pick.innerHTML = `<h3>Prep time! Pick one</h3><p class="why">You only get one between shifts. Choose wisely.</p><div class="cards">${
        PREP.filter((p) => p.soon || p.open()).map((p) => `<button class="pcard${p.soon ? ' soon' : ''}" type="button" data-prep="${p.id}" style="--c:${p.c}"${p.soon ? ' disabled' : ''}>
          <b>${p.name}</b><span>${p.why}</span>${p.stat ? `<em>${p.stat()}</em>` : ''}</button>`).join('')}</div>`;
    }
  }

  // =====================================================================
  //  TIME OF DAY: Barry's Oysters behind the menus, and a timelapse
  //  crossfade between shifts (sunset -> night -> morning -> day -> ...)
  // =====================================================================
  const PHASES = ['day', 'sunset', 'night', 'sunrise'];
  const LAPSE_CAPTIONS = { sunset: 'Closing time…', night: 'Night falls…', sunrise: 'Rise and shine…', day: 'Open for business!' };
  const LAPSE = { hold: 0.45, step: 1.15, after: 0.8 };   // seconds: first hold, each crossfade step, final hold
  let lapse = null;            // { t, venueId }
  const sceneKey = (v, ph) => (v.scenes && v.scenes[ph]) ? `scene_${v.id}_${ph}` : null;
  const venueHasScene = (v = venue()) => !!sceneKey(v, 'day');

  // On tall screens the whole stand is shown, feathered into a blurry copy of itself.
  const SCENE_CACHE = {};
  function sceneParts(key) {
    if (SCENE_CACHE[key]) return SCENE_CACHE[key];
    const im = IMG[key]; if (!im) return null;
    const tiny = document.createElement('canvas'); tiny.width = 30; tiny.height = 20;
    tiny.getContext('2d').drawImage(im, 0, 0, 30, 20);
    const blur = document.createElement('canvas'); blur.width = 240; blur.height = 160;
    const bx = blur.getContext('2d'); bx.imageSmoothingQuality = 'high'; bx.drawImage(tiny, 0, 0, 240, 160);
    const soft = document.createElement('canvas'); soft.width = im.width; soft.height = im.height;
    const sx = soft.getContext('2d'); sx.drawImage(im, 0, 0);
    sx.globalCompositeOperation = 'destination-in';
    const gr = sx.createLinearGradient(0, 0, 0, im.height);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.14, 'rgba(0,0,0,1)');
    gr.addColorStop(0.86, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    sx.fillStyle = gr; sx.fillRect(0, 0, im.width, im.height);
    return (SCENE_CACHE[key] = { im, blur, soft });
  }
  function drawScene(key, alpha = 1, zoom = 1) {
    const P = key && sceneParts(key); if (!P) return;
    const im = P.im;
    ctx.save(); ctx.globalAlpha = alpha;
    const cover = Math.max(W / im.width, H / im.height) * zoom;
    if (W / H >= 1.2) {
      const w = im.width * cover, h = im.height * cover;
      ctx.drawImage(im, (W - w) / 2, Math.min(0, (H - h) * 0.55), w, h);
    } else {
      const cw = im.width * cover * 1.05, ch = im.height * cover * 1.05;
      ctx.drawImage(P.blur, (W - cw) / 2, (H - ch) / 2, cw, ch);
      const s = Math.max((W * 1.3) / im.width, (H * 0.42) / im.height) * zoom;
      const w = im.width * s, h = im.height * s;
      ctx.drawImage(P.soft, (W - w) / 2, H * 0.5 - h / 2, w, h);
    }
    ctx.restore();
  }
  function drawBackdrop() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const v = (lapse && C.venues.find((x) => x.id === lapse.venueId)) || venue();
    if (!venueHasScene(v)) { draw(); return; }
    if (state === 'timelapse' && lapse) {
      // day -> sunset -> night -> sunrise -> day
      const seq = [...PHASES, 'day'];
      const t = Math.max(0, lapse.t - LAPSE.hold);
      const i = Math.min(seq.length - 2, Math.floor(t / LAPSE.step));
      const f = Math.min(1, (t - i * LAPSE.step) / LAPSE.step);
      const ease = f * f * (3 - 2 * f);
      const total = LAPSE.hold + LAPSE.step * (seq.length - 1) + LAPSE.after;
      const zoom = 1 + 0.05 * Math.min(1, lapse.t / total);
      drawScene(sceneKey(v, seq[i]), 1, zoom);
      if (lapse.t > LAPSE.hold) drawScene(sceneKey(v, seq[i + 1]), ease, zoom);
      const showing = lapse.t <= LAPSE.hold ? null : seq[f > 0.35 ? i + 1 : i];
      if (showing && !(showing === 'day' && i === 0)) {
        const size = Math.min(W, H);
        label(LAPSE_CAPTIONS[showing], W / 2, H * 0.15, size * 0.085, '#fff3d6', -0.04);
        if (showing === 'day') label(`Shift #${SAVE.shifts + 1}`, W / 2, H * 0.15 + size * 0.085, size * 0.05, '#ffd23f');
      }
    } else {
      drawScene(sceneKey(v, 'day'), 1, 1);
    }
  }
  function goToShack() {
    M = null; V = null; I = null;
    if (pendingLapse && venueHasScene()) {
      lapse = { t: 0, venueId: venue().id };
      pendingLapse = null;
      state = 'timelapse'; showScreen(null);
      tone(392, 0.6, 'triangle', 0.05, 523); tone(523, 0.7, 'triangle', 0.04, 659, 1.2); tone(659, 0.9, 'triangle', 0.05, 784, 3.4);
    } else { pendingLapse = null; openHub('work'); }
  }
  function updateLapse(dt) {
    if (!lapse) return;
    lapse.t += dt;
    if (lapse.t >= LAPSE.hold + LAPSE.step * PHASES.length + LAPSE.after) { lapse = null; openHub('work'); }
  }

  // =====================================================================
  //  BEACH RADIO: three stations of original 8-bit beach tunes, made live
  //  with the Web Audio API. Each song is a 4-bar loop of 16th-note steps.
  // =====================================================================
  const N = (name) => { // 'C4' -> midi
    const m = /^([A-G])(#|b)?(\d)$/.exec(name); if (!m) return null;
    const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    return 12 * (+m[3] + 1) + base;
  };
  const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
  // melody strings: space-separated tokens per 16th step; '.' = rest, '-' = hold
  const seq = (s) => s.trim().split(/\s+/);
  const STATIONS = [
    // Funky digital dub: popping octave bass, wah clav chops, swung 16ths, echo and laser zaps.
    { name: 'Dub Shack Riddim', bpm: 92, swing: 0.2,
      chords: [['A3', 'C4', 'E4', 'G4'], ['A3', 'C4', 'E4', 'G4'], ['D4', 'F4', 'A4', 'C5'], ['E4', 'G4', 'B4', 'D5']],
      bass: [],
      // x = ghost note (muted pluck)
      riddim: seq(`
        A1 .  A2 x    .  A1 C2 .    E2 x  G2 A2   .  E2 x  G1
        A1 .  A2 x    .  A1 C2 .    E2 x  G2 A2   C3 A2 G2 E2
        D2 .  D3 x    .  D2 F2 .    A2 x  C3 D3   .  A2 x  C2
        E2 .  E3 x    .  E2 G2 .    B2 x  D3 E3   D3 B2 G2 E2`),
      clav: seq(`
        .  .  x  .    x  .  .  x    .  .  x  .    x  .  x  .
        .  .  x  .    x  .  .  x    .  x  .  .    x  .  .  x
        .  .  x  .    x  .  .  x    .  .  x  .    x  .  x  .
        .  .  x  .    x  .  .  x    .  x  .  x    .  x  x  .`),
      lead: seq(`
        .  .  .  .  .  .  .  .    E5 .  .  .  .  .  .  .
        .  .  .  .  A5 .  G5 .    E5 -  -  .  .  .  .  .
        .  .  .  .  .  .  .  .    D5 .  .  .  F5 .  .  .
        .  .  E5 .  .  .  .  .    B4 -  -  -  .  .  .  .`),
      style: 'dub' },
    { name: 'Surf Shack 8-Bit', bpm: 152,
      chords: [['C4', 'E4', 'G4'], ['A3', 'C4', 'E4'], ['F3', 'A3', 'C4'], ['G3', 'B3', 'D4']],
      bass:   ['C2', 'A1', 'F2', 'G2'],
      lead: seq(`
        G5 -  E5 -  G5 -  A5 -    G5 -  E5 -  C5 -  D5 -
        E5 -  C5 -  E5 -  G5 -    A5 -  -  -  G5 -  E5 -
        F5 -  A5 -  C6 -  A5 -    G5 -  F5 -  E5 -  C5 -
        D5 -  E5 -  F5 -  G5 -    A5 -  B5 -  D6 -  -  -`),
      style: 'surf' },
    { name: 'Calypso Coconut', bpm: 116,
      chords: [['F3', 'A3', 'C4'], ['C4', 'E4', 'Bb4'], ['F3', 'A3', 'C4'], ['C4', 'E4', 'G4']],
      bass:   ['F2', 'C2', 'F2', 'C2'],
      lead: seq(`
        C5 .  F5 .  A5 .  G5 F5   .  E5 .  F5 G5 -  .  .
        Bb4 . E5 .  G5 .  F5 E5   .  D5 .  E5 C5 -  .  .
        C5 .  F5 .  A5 .  C6 A5   .  G5 .  A5 F5 -  .  .
        G5 .  F5 .  E5 .  D5 E5   .  F5 .  E5 C5 -  .  .`),
      style: 'calypso' },
  ];
  const RADIO = { on: false, station: 0, step: 0, nextT: 0, timer: null, out: null };
  function radioOut() {
    const a = audio(); if (!a) return null;
    if (!RADIO.out) {
      RADIO.out = a.createGain(); RADIO.out.gain.value = C.radioVolume ?? 0.55; RADIO.out.connect(a.destination);
      // dub echo: send -> delay -> (lowpass -> feedback) -> out
      RADIO.echo = a.createGain(); RADIO.echo.gain.value = 0.7;
      RADIO.delay = a.createDelay(2); RADIO.delay.delayTime.value = 0.3;
      const fb = a.createGain(); fb.gain.value = 0.5;
      const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
      RADIO.echo.connect(RADIO.delay); RADIO.delay.connect(lp); lp.connect(fb); fb.connect(RADIO.delay); lp.connect(RADIO.out);
    }
    return a;
  }
  function rNote(a, type, f, t, dur, vol, glideTo = 0, echo = 0, lowpass = 0) {
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let src = o;
    if (lowpass) { const f2 = a.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = lowpass; f2.Q.value = 4; o.connect(f2); src = f2; }
    src.connect(g); g.connect(RADIO.out);
    if (echo && RADIO.echo) { const s = a.createGain(); s.gain.value = echo; g.connect(s); s.connect(RADIO.echo); }
    o.start(t); o.stop(t + dur + 0.03);
  }
  function rNoise(a, t, dur, vol, type, freq) {
    const buf = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate);
    const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const s = a.createBufferSource(); s.buffer = buf;
    const f = a.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    const g = a.createGain(); g.gain.value = vol;
    s.connect(f).connect(g).connect(RADIO.out); s.start(t);
  }
  const kick = (a, t, v = 0.5) => rNote(a, 'sine', 130, t, 0.16, v, 45);
  const snare = (a, t, v = 0.22) => rNoise(a, t, 0.12, v, 'bandpass', 1800);
  const hat = (a, t, v = 0.07) => rNoise(a, t, 0.03, v, 'highpass', 7000);
  const steel = (a, f, t, v) => { rNote(a, 'sine', f, t, 0.4, v); rNote(a, 'sine', f * 2, t, 0.22, v * 0.35); rNote(a, 'triangle', f * 3, t, 0.08, v * 0.15); };

  function radioStep(a, st, step, t, sd) {
    const bar = Math.floor(step / 16) % 4, s = step % 16;
    const chord = st.chords[bar].map(N), root = st.bass[bar] ? N(st.bass[bar]) : null;
    const tok = st.lead[step % st.lead.length];
    let held = 1; for (let k = step + 1; k < step + 16 && st.lead[k % st.lead.length] === '-'; k++) held++;
    const lead = tok && tok !== '.' && tok !== '-' ? N(tok) : null;
    if (st.style === 'dub') {
      if (RADIO.delay) RADIO.delay.delayTime.setValueAtTime(sd * 3, t);              // dotted-eighth echo
      const bt = st.riddim[step % st.riddim.length];
      if (bt === 'x') rNote(a, 'square', hz(chord[0] - 24), t, 0.035, 0.09, 0, 0, 260);   // ghost pluck
      else if (bt && bt !== '.' && bt !== '-') {
        const m = N(bt), pop = m >= 45;                                               // high notes "pop" like a slap
        rNote(a, 'square', hz(m), t, sd * (pop ? 0.7 : 1.4), pop ? 0.13 : 0.16, 0, 0, pop ? 900 : 380);
        rNote(a, 'sine', hz(m), t, sd * 1.4, 0.2);                                    // sub weight
      }
      if (st.clav[step % st.clav.length] === 'x') {                                  // wah clav chop
        chord.forEach((m) => {
          const o = a.createOscillator(), f = a.createBiquadFilter(), gg = a.createGain();
          o.type = 'square'; o.frequency.value = hz(m);
          f.type = 'bandpass'; f.Q.value = 6; f.frequency.setValueAtTime(500, t); f.frequency.exponentialRampToValueAtTime(2600, t + sd * 0.8);
          gg.gain.setValueAtTime(0.0001, t); gg.gain.linearRampToValueAtTime(0.05, t + 0.004); gg.gain.exponentialRampToValueAtTime(0.0001, t + sd * 0.9);
          o.connect(f).connect(gg).connect(RADIO.out);
          if (s % 8 === 4) { const sendG = a.createGain(); sendG.gain.value = 0.35; gg.connect(sendG); sendG.connect(RADIO.echo); }
          o.start(t); o.stop(t + sd);
        });
      }
      if (s === 0 || s === 6 || s === 10) kick(a, t, s === 0 ? 0.55 : 0.4);          // funky kick pattern
      if (s === 4 || s === 12) { snare(a, t, 0.24); rNote(a, 'square', 1700, t, 0.02, 0.04, 0, 0.5); }
      if (s === 7 || s === 15) snare(a, t, 0.05);                                     // ghost snares
      hat(a, t, s % 4 === 2 ? 0.08 : s % 2 ? 0.025 : 0.045);                          // 16th hats with accents
      if (s === 14) rNoise(a, t, 0.14, 0.05, 'highpass', 6000);                      // open hat
      if (s === 14 && bar === 3) rNote(a, 'square', 2400, t, sd * 2, 0.05, 160, 0.9);   // laser zap
      if (s === 6 && bar === 1) rNote(a, 'sine', 1800, t, sd * 1.5, 0.05, 300, 0.8);
      if (lead) rNote(a, 'square', hz(lead), t, sd * held * 0.8, 0.04, 0, 0.55, 3000);
    } else if (st.style === 'reggae') {
      if (s === 4 || s === 12) chord.forEach((m) => rNote(a, 'square', hz(m + 12), t, sd * 0.7, 0.035));      // the skank
      if (s === 0 || s === 6) rNote(a, 'triangle', hz(root), t, sd * 3, 0.32);
      if (s === 10) rNote(a, 'triangle', hz(root + 7), t, sd * 2, 0.28);
      if (s === 8) { kick(a, t); rNoise(a, t, 0.05, 0.12, 'bandpass', 3000); }                             // one drop
      if (s % 2 === 0) hat(a, t, s % 4 === 2 ? 0.08 : 0.04);
      if (lead) rNote(a, 'square', hz(lead), t, sd * held * 0.9, 0.05);
    } else if (st.style === 'surf') {
      if (s % 2 === 0) rNote(a, 'triangle', hz(root + (s % 8 === 4 ? 7 : 0)), t, sd * 1.6, 0.3);              // driving bass
      if (s % 4 === 2) chord.forEach((m) => rNote(a, 'square', hz(m), t, sd * 0.9, 0.022));
      if (s === 0 || s === 8) kick(a, t, 0.45);
      if (s === 4 || s === 12) snare(a, t);
      if (s % 2 === 0) hat(a, t);
      if (lead) {                                                                                            // twangy lead with a little wobble
        rNote(a, 'square', hz(lead), t, sd * held * 0.95, 0.045);
        rNote(a, 'sawtooth', hz(lead) * 1.005, t, sd * held * 0.6, 0.012);
      }
      if (s === 0) chord.forEach((m) => rNote(a, 'sine', hz(m + 12), t, sd * 15, 0.02));                     // "ooo" pad
    } else {
      if (s === 0 || s === 3 || s === 6 || s === 8 || s === 11 || s === 14) rNote(a, 'triangle', hz(root + (s >= 8 ? 7 : 0)), t, sd * 1.5, 0.3); // tresillo bass
      if (s % 4 === 2) chord.forEach((m) => rNote(a, 'square', hz(m), t, sd * 0.6, 0.02));
      rNoise(a, t, 0.025, s % 2 ? 0.03 : 0.06, 'highpass', 6000);                                             // shaker
      if (s === 0 || s === 8) kick(a, t, 0.35);
      if (s === 6 || s === 14) rNote(a, 'square', 900, t, 0.03, 0.04);                                       // cowbell-ish
      if (lead) steel(a, hz(lead), t, 0.11);
    }
  }
  function radioTick() {
    const a = radioOut(); if (!a || !RADIO.on) return;
    const st = STATIONS[RADIO.station], sd = 60 / st.bpm / 4;
    if (RADIO.nextT < a.currentTime) RADIO.nextT = a.currentTime + 0.05;
    while (RADIO.nextT < a.currentTime + 0.15) {
      if (!muted) radioStep(a, st, RADIO.step, RADIO.nextT + (RADIO.step % 2 ? sd * (st.swing || 0) : 0), sd);
      RADIO.nextT += sd; RADIO.step = (RADIO.step + 1) % 64;
    }
  }
  function setRadio(idx) {   // -1 = off
    if (idx < 0) { RADIO.on = false; clearInterval(RADIO.timer); RADIO.timer = null; }
    else {
      RADIO.station = idx; RADIO.step = 0; RADIO.on = true; RADIO.nextT = 0;
      if (!RADIO.timer) RADIO.timer = setInterval(radioTick, 25);
    }
    SAVE.radio = Math.max(0, idx); SAVE.radioWasOn = idx >= 0; writeSave(); updateRadioBtn();
  }
  function updateRadioBtn() {
    const b = $('btnRadio'); if (!b) return;
    const owned = (SAVE.owned.radio || 0) >= 1;
    b.hidden = !owned;
    const name = RADIO.on ? `Radio: ${STATIONS[RADIO.station].name}` : 'Radio: off';
    b.setAttribute('aria-label', name); b.title = name;
    b.setAttribute('aria-pressed', String(RADIO.on));
  }
  $('btnRadio').addEventListener('click', () => {
    audio();
    const next = RADIO.on ? (RADIO.station + 1 < STATIONS.length ? RADIO.station + 1 : -1) : 0;
    setRadio(next);
    flash(next >= 0 ? `Now playing: ${STATIONS[next].name}` : 'Radio off');
  });

  // =====================================================================
  //  MINI GAME: BARRY'S DIVE (top-down, placeholder art drawn in code)
  //  Barry the walrus paddles around, dives on shadows, and brings oysters
  //  back to the dock. Caught oysters go in the cooler and cost nothing.
  // =====================================================================
  const DV = C.dive || {};
  let V = null;
  const DIVE_ITEMS = {   // weight, shadow size (x min side), chance of bubbles, label
    small:    { w: 40, r: 0.045, bub: 0.6,  name: 'Oyster' },
    big:      { w: 14, r: 0.072, bub: 0.85, name: 'Big oyster' },
    boot:     { w: 10, r: 0.055, bub: 0.12, name: 'Old boot!' },
    glove:    { w: 9,  r: 0.05,  bub: 0.12, name: 'Rubber glove!' },
    starfish: { w: 9,  r: 0.048, bub: 0.1,  name: 'Starfish!' },
    bottle:   { w: 7,  r: 0.045, bub: 0.15, name: 'Old bottle!' },
    crab:     { w: 6,  r: 0.05,  bub: 0.35, name: 'Crab! Pinch!' },
  };
  function diveGear() {
    return { swim: tier('fins').swim ?? 1, breath: tier('lungs').breath ?? 1, bag: tier('bag').bag ?? 3, mash: tier('dgrip').mash ?? 1 };
  }
  function diveArea() {
    const beach = Math.max(70, Math.min(120, H * 0.13));
    return { x0: 10, x1: W - 10, y0: L.top + 64, y1: H - beach, beach,
             dock: { x0: W / 2 - 60, x1: W / 2 + 60, y0: H - beach - 34, y1: H - beach + 10 },
             btn: (() => { const r = Math.min(50, Math.max(40, W * 0.11)); return { x: W - r - 16, y: H - 66 - r, r }; })() };
  }
  function pickItemType() {
    const tot = Object.values(DIVE_ITEMS).reduce((s, d) => s + d.w, 0);
    let x = Math.random() * tot;
    for (const [k, d] of Object.entries(DIVE_ITEMS)) { x -= d.w; if (x <= 0) return k; }
    return 'small';
  }
  function makeItem() {
    const A = diveArea(), type = pickItemType(), d = DIVE_ITEMS[type], m = Math.min(W, H);
    let x, y, tries = 0;
    do { x = A.x0 + 30 + Math.random() * (A.x1 - A.x0 - 60); y = A.y0 + 30 + Math.random() * (A.y1 - A.y0 - 90); tries++; }
    while (V && V.items.some((it) => Math.hypot(it.x - x, it.y - y) < m * 0.16) && tries < 20);
    return { type, x, y, r: d.r * m, rot: Math.random() * 6.28, bub: Math.random() < d.bub, seed: Math.random() * 9, vx: 0, vy: 0 };
  }
  function startDive() {
    state = 'dive'; phase = 'idle'; paused = false; cur = null; hurt = null; M = null;
    const g = diveGear(), A = diveArea();
    V = { t: 0, intro: 1.6, time: DV.duration ?? 45, left: DV.duration ?? 45, breathMax: 100 * g.breath, breath: 100 * g.breath,
          bag: [], bagCap: g.bag, caught: { small: 0, big: 0 }, junk: 0, lost: 0, g,
          x: W / 2, y: A.y1 - 60, vx: 0, vy: 0, ang: -Math.PI / 2, dive: null, mash: null, gasp: 0, sting: 0, wear: null,
          items: [], jelly: [], rings: [], respawn: [], over: false };
    const n = DV.items ?? 12;
    for (let i = 0; i < n; i++) V.items.push(makeItem());
    for (let i = 0; i < (DV.jellyfish ?? 2); i++) V.jelly.push({ x: A.x0 + Math.random() * (A.x1 - A.x0), y: A.y0 + 40 + Math.random() * (A.y1 - A.y0 - 160), ph: Math.random() * 6, sp: 0.3 + Math.random() * 0.4 });
    showScreen(null);
    hudLabels(['Mini game', 'Flipper bag', 'Caught']);
    els.venue.textContent = "Barry's Dive";
    diveHud();
    tone(330, 0.3, 'triangle', 0.06, 660); noise(0.4, 0.1, 600, 0.1);
  }
  function diveHud() {
    els.count.textContent = `${V.bag.length} / ${V.bagCap}`;
    els.earned.textContent = String(V.caught.small + V.caught.big);
    const f = Math.max(0, V.left / V.time);
    els.clockFill.style.transform = `scaleX(${f})`;
    els.clockFill.dataset.low = f < 0.22 ? '1' : '0';
    els.clockText.textContent = Math.ceil(Math.max(0, V.left)) + 's';
  }
  const inDiveBtn = (x, y) => { const b = diveArea().btn; return Math.hypot(x - b.x, y - b.y) <= b.r + 12; };
  function diveTap() {
    if (!V || V.over || paused || V.t < V.intro) return;
    if (V.mash) { V.mash.prog += (DV.mashPer ?? 0.085) * V.g.mash; V.rings.push({ x: V.x, y: V.y, t: 0, small: true }); tone(500 + V.mash.prog * 500, 0.04, 'square', 0.04); return; }
    if (V.dive || V.gasp > 0) return;
    const it = V.items.find((i) => Math.hypot(i.x - V.x, i.y - V.y) < i.r + Math.min(W, H) * 0.05);
    V.breath -= DV.diveCost ?? 16;
    V.dive = { t: 0, item: it || null };
    V.rings.push({ x: V.x, y: V.y, t: 0 });
    noise(0.25, 0.18, 900); tone(220, 0.2, 'sine', 0.08, 110);
  }
  function popText(text, bad, x = V.x, y = V.y - 50) { fx.popups.push({ text, sub: '', x, y, t: 0.2, small: true, bad: !!bad, money: !bad }); }
  function surfaceWith(it) {
    if (!it) { popText('Nothing down there', true); return; }
    if (it.type === 'small' || it.type === 'big') {
      if (V.bag.length >= V.bagCap) { popText('Bag full! Swim to the dock', true); return; }
      if (it.type === 'big') {   // big ones try to get away: smash DIVE
        V.mash = { item: it, prog: 0.3 };
        popText('Big one! Smash DIVE!', false); return;
      }
      V.bag.push('small'); takeItem(it); popText('+1 oyster'); SFX.cash(); return;
    }
    if (it.type === 'crab') {
      V.breath -= 12; if (V.bag.length) { V.bag.pop(); V.lost++; popText('Pinch! Dropped one', true); } else popText('Pinch!', true);
      SFX.ouch(); takeItem(it); return;
    }
    V.junk++; V.wear = { type: it.type, t: 2.2 }; popText(DIVE_ITEMS[it.type].name, true); tone(160, 0.25, 'sawtooth', 0.06, 90); takeItem(it);
  }
  function takeItem(it) { V.items = V.items.filter((x) => x !== it); V.respawn.push(1.2 + Math.random()); }
  function gasp() {
    V.gasp = DV.gaspTime ?? 1.4; V.breath = 0; V.dive = null;
    if (V.mash) { popText('Out of breath! It got away', true); V.mash.item.x += (Math.random() - 0.5) * 120; V.mash = null; }
    else popText('GASP!', true);
    tone(600, 0.3, 'sawtooth', 0.06, 200);
  }
  const joyR = () => Math.max(46, Math.min(70, Math.min(W, H) * 0.13));
  const keys = {};
  window.addEventListener('keydown', (e) => { keys[e.key.toLowerCase()] = true; if (state === 'dive' && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); diveTap(); } });
  window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
  function joyVec() {
    let x = 0, y = 0;
    if (V.joy && pointer.down) {
      const dx = pointer.x - V.joy.x, dy = pointer.y - V.joy.y, d = Math.hypot(dx, dy), R = joyR();
      if (d > R * 0.12) { const k = Math.min(1, d / R); x = dx / d * k; y = dy / d * k; }
    }
    const kx = (keys.arrowright || keys.d ? 1 : 0) - (keys.arrowleft || keys.a ? 1 : 0), ky = (keys.arrowdown || keys.s ? 1 : 0) - (keys.arrowup || keys.w ? 1 : 0);
    if (kx || ky) { const d = Math.hypot(kx, ky); x = kx / d; y = ky / d; }
    return { x, y };
  }
  function drawJoystick() {
    const R = joyR(), on = V.joy && pointer.down;
    const bx = on ? V.joy.x : R + 24, by = on ? V.joy.y : H - R - 70;
    ctx.save();
    ctx.globalAlpha = on ? 0.9 : 0.35 + 0.1 * Math.sin(T * 3);
    ctx.fillStyle = 'rgba(29,23,18,0.35)'; ctx.strokeStyle = '#fff3d6'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(bx, by, R, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    let kx = bx, ky = by;
    if (on) { const dx = pointer.x - bx, dy = pointer.y - by, d = Math.hypot(dx, dy) || 1, k = Math.min(d, R); kx = bx + dx / d * k; ky = by + dy / d * k; }
    ctx.fillStyle = '#ffd23f'; ctx.strokeStyle = '#2a1408';
    ctx.beginPath(); ctx.arc(kx, ky, R * 0.42, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.restore();
    if (!on) label('Drag to swim', bx, by - R - 14, 15, 'rgba(255,243,214,0.85)');
  }
  function updateDive(dt) {
    if (!V) return;
    if (paused) return;
    V.t += dt;
    const A = diveArea(), m = Math.min(W, H);
    const live = V.t > V.intro && !V.over;
    if (live) { V.left -= dt; if (V.left <= 0) { endDive(); return; } }
    // swimming
    const under = V.dive || V.mash;
    // virtual joystick: thumb down anywhere, push the way you want Barry to swim (arrow keys / WASD work too)
    const js = joyVec();
    if (!under && V.gasp <= 0 && (js.x || js.y)) {
      const sp = m * 0.42 * V.g.swim;
      const tvx = js.x * sp, tvy = js.y * sp;
      V.vx += (tvx - V.vx) * Math.min(1, dt * 2.6); V.vy += (tvy - V.vy) * Math.min(1, dt * 2.6);
    } else { V.vx *= Math.pow(0.25, dt); V.vy *= Math.pow(0.25, dt); }
    // current: a gentle push to the right in the middle band
    const midBand = Math.abs(V.y - (A.y0 + A.y1) / 2) < (A.y1 - A.y0) * 0.12;
    if (midBand && !under) V.vx += m * 0.12 * dt;
    V.x = Math.max(A.x0 + 20, Math.min(A.x1 - 20, V.x + V.vx * dt));
    V.y = Math.max(A.y0 + 20, Math.min(A.dock.y1, V.y + V.vy * dt));
    if (Math.hypot(V.vx, V.vy) > 8) { const ta = Math.atan2(V.vy, V.vx); let da = ta - V.ang; da = Math.atan2(Math.sin(da), Math.cos(da)); V.ang += da * Math.min(1, dt * 5); }
    // breath
    if (V.dive) {
      V.dive.t += dt;
      if (V.breath <= 0) gasp();
      else if (V.dive.t >= (DV.diveTime ?? 0.7)) { const it = V.dive.item; V.dive = null; surfaceWith(it); }
    } else if (V.mash) {
      V.mash.prog -= (DV.mashDecay ?? 0.5) * dt; V.breath -= (DV.mashBreath ?? 18) * dt;
      const it = V.mash.item;
      if (V.breath <= 0) gasp();
      else if (V.mash.prog >= 1) { V.mash = null; if (V.bag.length < V.bagCap) { V.bag.push('big'); takeItem(it); popText('Got the big one!'); SFX.orderUp(); } }
      else if (V.mash.prog <= 0) { V.mash = null; popText('It got away!', true); it.x = Math.max(A.x0 + 40, Math.min(A.x1 - 40, it.x + (Math.random() - 0.5) * m * 0.5)); it.y = Math.max(A.y0 + 40, Math.min(A.y1 - 80, it.y + (Math.random() - 0.5) * m * 0.4)); }
    } else if (V.gasp > 0) { V.gasp -= dt; V.breath = Math.min(V.breathMax, V.breath + (DV.refill ?? 14) * dt); }
    else V.breath = Math.min(V.breathMax, V.breath + (DV.refill ?? 14) * dt);
    if (V.breath < 0) V.breath = 0;
    // big oysters scoot away when Barry gets close
    V.items.forEach((it) => {
      if (it.type !== 'big' || (V.mash && V.mash.item === it)) return;
      const d = Math.hypot(it.x - V.x, it.y - V.y);
      if (d < m * 0.18) { it.vx += (it.x - V.x) / d * m * 0.25 * dt; it.vy += (it.y - V.y) / d * m * 0.25 * dt; }
      it.vx *= Math.pow(0.3, dt); it.vy *= Math.pow(0.3, dt);
      it.x = Math.max(A.x0 + 30, Math.min(A.x1 - 30, it.x + it.vx * dt)); it.y = Math.max(A.y0 + 30, Math.min(A.y1 - 70, it.y + it.vy * dt));
    });
    // jellyfish
    V.sting = Math.max(0, V.sting - dt);
    V.jelly.forEach((j) => {
      j.ph += dt * j.sp; j.x += Math.cos(j.ph) * m * 0.05 * dt; j.y += Math.sin(j.ph * 0.7) * m * 0.04 * dt;
      if (!under && V.sting <= 0 && Math.hypot(j.x - V.x, j.y - V.y) < m * 0.075) {
        V.sting = 1.2; V.breath -= 20; const d = Math.hypot(V.x - j.x, V.y - j.y) || 1;
        V.vx = (V.x - j.x) / d * m * 0.6; V.vy = (V.y - j.y) / d * m * 0.6; popText('Sting!', true); SFX.ouch();
      }
    });
    // dock
    if (V.bag.length && V.x > A.dock.x0 && V.x < A.dock.x1 && V.y > A.dock.y0) {
      const n = V.bag.length; V.bag.forEach((b) => { V.caught[b]++; }); V.bag = [];
      popText(`+${n} to the cooler!`); SFX.orderUp();
    }
    V.respawn = V.respawn.map((t) => t - dt).filter((t) => { if (t <= 0) { V.items.push(makeItem()); return false; } return true; });
    if (V.wear) { V.wear.t -= dt; if (V.wear.t <= 0) V.wear = null; }
    V.rings.forEach((r) => { r.t += dt; }); V.rings = V.rings.filter((r) => r.t < 0.9);
    fx.popups.forEach((p) => { p.t += dt; }); fx.popups = fx.popups.filter((p) => p.t < 1.4);
    diveHud();
  }
  // ---- drawing (placeholder shapes) ----
  function diveShape(c, type, r, seed) {
    c.beginPath();
    if (type === 'small' || type === 'big') {
      for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2, rr = r * (0.82 + 0.18 * Math.sin(seed + k * 2.1)); c.lineTo(Math.cos(a) * rr * 1.15, Math.sin(a) * rr * 0.85); }
    } else if (type === 'boot') {
      c.moveTo(-r * 0.4, -r); c.lineTo(r * 0.2, -r); c.lineTo(r * 0.2, r * 0.2); c.lineTo(r * 1.1, r * 0.35); c.lineTo(r * 1.1, r * 0.8); c.lineTo(-r * 0.4, r * 0.8);
    } else if (type === 'glove') {
      c.ellipse(0, r * 0.25, r * 0.6, r * 0.6, 0, 0, Math.PI * 2);
      for (let k = 0; k < 4; k++) { c.moveTo(-r * 0.45 + k * r * 0.3, 0); c.rect(-r * 0.52 + k * r * 0.3, -r, r * 0.22, r * 0.9); }
      c.moveTo(r * 0.5, r * 0.2); c.rect(r * 0.45, -r * 0.1, r * 0.5, r * 0.22);
    } else if (type === 'starfish') {
      for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 - Math.PI / 2, rr = k % 2 ? r * 0.4 : r * 1.1; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    } else if (type === 'bottle') {
      c.rect(-r * 1.0, -r * 0.35, r * 1.4, r * 0.7); c.rect(r * 0.4, -r * 0.16, r * 0.6, r * 0.32);
    } else if (type === 'crab') {
      c.ellipse(0, 0, r * 0.8, r * 0.55, 0, 0, Math.PI * 2);
      c.moveTo(-r * 0.8, -r * 0.3); c.ellipse(-r * 1.0, -r * 0.6, r * 0.28, r * 0.2, 0, 0, Math.PI * 2);
      c.moveTo(r * 0.8, -r * 0.3); c.ellipse(r * 1.0, -r * 0.6, r * 0.28, r * 0.2, 0, 0, Math.PI * 2);
    }
    c.closePath();
  }
  function drawItemShadow(it) {
    ctx.save(); ctx.translate(it.x, it.y + Math.sin(T * 1.3 + it.seed) * 2); ctx.rotate(it.rot);
    ctx.globalAlpha = 0.55; ctx.fillStyle = '#0d2b45';
    diveShape(ctx, it.type, it.r, it.seed); ctx.fill();
    ctx.restore();
    if (it.bub) {
      ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1.5;
      for (let k = 0; k < 3; k++) { const ph = (T * 0.8 + k / 3 + it.seed) % 1, bx = it.x + Math.sin(ph * 6 + k) * 5, by = it.y - it.r * 0.6 - ph * 28; ctx.globalAlpha = 1 - ph; ctx.beginPath(); ctx.arc(bx, by, 2 + k, 0, Math.PI * 2); ctx.stroke(); }
      ctx.restore();
    }
  }
  function drawBarry() {
    const m = Math.min(W, H), s = m * 0.0019;
    const under = V.dive || V.mash;
    ctx.save(); ctx.translate(V.x, V.y); ctx.rotate(V.ang + Math.PI / 2);
    if (under) { ctx.globalAlpha = 0.4; ctx.scale(0.7, 0.7); }
    if (V.sting > 0.9 || (V.gasp > 0 && Math.floor(T * 10) % 2)) ctx.globalAlpha *= 0.5;
    const paddle = Math.sin(T * (Math.hypot(V.vx, V.vy) > 10 ? 9 : 3)) * 0.35;
    ctx.scale(s * 26, s * 26);
    ctx.lineWidth = 0.09; ctx.strokeStyle = '#2a1408';
    // rear flippers
    for (const sd of [-1, 1]) { ctx.save(); ctx.translate(sd * 0.35, 1.25); ctx.rotate(sd * (0.3 + paddle)); ctx.fillStyle = '#6e4a32'; ctx.beginPath(); ctx.ellipse(0, 0.35, 0.22, 0.45, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore(); }
    // front flippers
    for (const sd of [-1, 1]) { ctx.save(); ctx.translate(sd * 0.7, -0.2); ctx.rotate(sd * (0.9 - paddle)); ctx.fillStyle = '#6e4a32'; ctx.beginPath(); ctx.ellipse(0, 0.35, 0.2, 0.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore(); }
    // body + head
    ctx.fillStyle = '#9b6a48'; ctx.beginPath(); ctx.ellipse(0, 0.3, 0.75, 1.15, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#a8775a'; ctx.beginPath(); ctx.ellipse(0, -0.85, 0.55, 0.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e8d8c0'; ctx.beginPath(); ctx.ellipse(0, -1.18, 0.32, 0.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#fffaf0'; ctx.lineWidth = 0.12; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-0.13, -1.2); ctx.lineTo(-0.16, -1.65); ctx.moveTo(0.13, -1.2); ctx.lineTo(0.16, -1.65); ctx.stroke();
    ctx.fillStyle = '#1d1712'; ctx.beginPath(); ctx.arc(-0.22, -0.95, 0.07, 0, Math.PI * 2); ctx.arc(0.22, -0.95, 0.07, 0, Math.PI * 2); ctx.fill();
    if (V.wear) { ctx.save(); ctx.translate(0, -0.7); ctx.fillStyle = '#5a4636'; diveShape(ctx, V.wear.type, 0.45, 1); ctx.fill(); ctx.restore(); }
    ctx.restore();
  }
  function drawLungs(x, y, frac) {
    ctx.save(); ctx.translate(x, y);
    for (const sd of [-1, 1]) {
      ctx.save(); ctx.scale(sd, 1);
      ctx.beginPath(); ctx.moveTo(4, -18); ctx.quadraticCurveTo(26, -20, 26, 4); ctx.quadraticCurveTo(26, 22, 8, 20); ctx.quadraticCurveTo(3, 4, 4, -18); ctx.closePath();
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fill();
      ctx.save(); ctx.clip(); ctx.fillStyle = frac < 0.25 && Math.floor(T * 6) % 2 ? '#ff6b5b' : '#ff96aa';
      ctx.fillRect(0, 22 - 42 * frac, 30, 42 * frac); ctx.restore();
      ctx.strokeStyle = '#2a1408'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore();
    }
    ctx.strokeStyle = '#2a1408'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(0, -6); ctx.stroke();
    ctx.restore();
  }
  function drawDive() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const A = diveArea(), m = Math.min(W, H);
    // water
    const gr = ctx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#1f7fb0'); gr.addColorStop(1, '#3cb7c9');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 2;
    for (let i = 0; i < 26; i++) { const x = (i * 97 + T * 18) % (W + 80) - 40, y = A.y0 + ((i * 61) % Math.max(1, (A.y1 - A.y0))); ctx.beginPath(); ctx.arc(x, y, 18, 3.6, 5.8); ctx.stroke(); }
    ctx.restore();
    // current band
    ctx.save(); ctx.globalAlpha = 0.15; ctx.fillStyle = '#ffffff'; const cy = (A.y0 + A.y1) / 2, ch = (A.y1 - A.y0) * 0.12;
    for (let i = 0; i < 8; i++) { const x = ((i * 120 + T * 60) % (W + 120)) - 60; ctx.fillRect(x, cy - 2 + Math.sin(i) * ch * 0.6, 40, 3); }
    ctx.restore();
    V.items.forEach(drawItemShadow);
    // beach + dock
    ctx.fillStyle = '#e8cf95'; ctx.fillRect(0, A.y1, W, H - A.y1);
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(0, A.y1 - 4, W, 6);
    ctx.fillStyle = '#9b6b3d'; ctx.strokeStyle = '#2a1408'; ctx.lineWidth = 3;
    ctx.fillRect(A.dock.x0, A.dock.y0, A.dock.x1 - A.dock.x0, A.dock.y1 - A.dock.y0 + 20); ctx.strokeRect(A.dock.x0, A.dock.y0, A.dock.x1 - A.dock.x0, A.dock.y1 - A.dock.y0 + 20);
    for (let k = 1; k < 5; k++) { const y = A.dock.y0 + k * 12; ctx.beginPath(); ctx.moveTo(A.dock.x0, y); ctx.lineTo(A.dock.x1, y); ctx.stroke(); }
    label('DOCK', W / 2, A.dock.y0 - 12, 18, '#fff3d6');
    // jellyfish
    V.jelly.forEach((j) => {
      ctx.save(); ctx.translate(j.x, j.y); ctx.globalAlpha = 0.85;
      ctx.fillStyle = 'rgba(255,170,220,0.8)'; ctx.strokeStyle = '#7a2a5a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, m * 0.04, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + Math.sin(T * 2 + k) * 0.2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * m * 0.04, Math.sin(a) * m * 0.04); ctx.lineTo(Math.cos(a) * m * 0.065, Math.sin(a) * m * 0.065); ctx.stroke(); }
      ctx.restore();
    });
    V.rings.forEach((r) => { ctx.save(); ctx.globalAlpha = 1 - r.t / 0.9; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(r.x, r.y, (r.small ? 10 : 18) + r.t * (r.small ? 30 : 70), 0, Math.PI * 2); ctx.stroke(); ctx.restore(); });
    drawBarry();
    // mash meter
    if (V.mash) {
      const w = m * 0.5, x = V.x - w / 2, y = V.y - m * 0.16;
      ctx.save(); ctx.fillStyle = 'rgba(29,23,18,0.8)'; ctx.fillRect(x - 4, y - 4, w + 8, 22); ctx.fillStyle = '#ffd23f'; ctx.fillRect(x, y, w * Math.max(0, Math.min(1, V.mash.prog)), 14); ctx.restore();
      label('SMASH DIVE!', V.x, y - 18, m * 0.055, '#ffd23f');
    }
    // breath (lungs) under the HUD
    drawLungs(40, L.top + 34, Math.max(0, V.breath / V.breathMax));
    label('Breath', 92, L.top + 34, 15, '#fff3d6');
    // DIVE button
    const b = A.btn, ready = V.items.some((i) => Math.hypot(i.x - V.x, i.y - V.y) < i.r + m * 0.05);
    ctx.save();
    const pulse = (ready || V.mash) ? 1 + Math.sin(T * 10) * 0.06 : 1;
    ctx.translate(b.x, b.y); ctx.scale(pulse, pulse);
    ctx.fillStyle = V.gasp > 0 ? '#bbb' : '#ffd23f'; ctx.strokeStyle = '#2a1408'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, 0, b.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.restore();
    label('DIVE', b.x, b.y, b.r * 0.55, '#2a1408');
    if (!V.over) drawJoystick();
    if (V.t < V.intro) {
      const k = Math.min(1, V.t / 0.25), sc = 0.5 + 0.5 * easeOutBack(k);
      ctx.save(); ctx.translate(W / 2, H * 0.36); ctx.scale(sc, sc);
      label('DIVE TIME!', 0, 0, m * 0.12, '#ffd23f', -0.05);
      label('Drag anywhere to swim, tap DIVE on shadows. Bubbles = oysters!', 0, m * 0.1, m * 0.04, '#fff3d6');
      ctx.restore();
    } else if (V.left < 10 && V.bag.length) label('Head to the dock!', W / 2, A.y0 + 20, m * 0.06, '#fff3d6');
    drawPopups();
  }
  function endDive() {
    V.over = true; state = 'result';
    if (V.bag.length) { V.lost += V.bag.length; V.bag = []; }
    hudLabels(['Working at', 'Shucked', 'Earned']);
    const cap = C.stockCap ?? 40;
    const addS = Math.max(0, Math.min(V.caught.small, cap - stockCount()));
    SAVE.stock.small += addS;
    const addB = Math.max(0, Math.min(V.caught.big, cap - stockCount()));
    SAVE.stock.big += addB;
    const n = addS + addB, saved = n * oysterPrice(venue());
    const xp = (V.caught.small + V.caught.big * 3) * 2;
    SAVE.xp.spd += xp; SAVE.xpTotal = (SAVE.xpTotal || 0) + xp;
    writeSave(); SFX.orderUp();
    const row = (l, v, cls = '') => `<div class="line ${cls}"><span>${l}</span><b>${v}</b></div>`;
    $('resultTitle').textContent = `Catch of the day: ${V.caught.small + V.caught.big}`;
    $('resultTag').textContent = 'Into the cooler';
    $('resultBody').innerHTML = `
      <p class="sub">Barry brought home ${V.caught.small + V.caught.big} oyster${V.caught.small + V.caught.big === 1 ? '' : 's'}</p>
      <div class="receipt">
        ${row('Small oysters', V.caught.small)}
        ${row('Big oysters (sell for more)', V.caught.big)}
        ${row('Junk dug up', V.junk)}
        ${V.lost ? row('Lost (pinched or not delivered)', V.lost, 'neg') : ''}
        ${row('Supplier money saved', money(saved), 'total')}
      </div>
      <p class="fine">Your own oysters get shucked first next shift, for free. Small ones are crusty with barnacles; big ones pay more.${n < V.caught.small + V.caught.big ? ' The cooler is full!' : ''}</p>
      <div class="xpline"><span class="xpchip" style="--c:#5cc94a">Speed +${xp}</span></div>
      <div class="cashline"><span>Cooler</span><strong>${stockCount()}</strong></div>`;
    setResultButtons('hub');
    showScreen('result');
  }

  // =====================================================================
  //  MINI GAME: ICEBERG HARPOON
  //  The berg is a web of ice chunks. The bottom row is frozen into the sea.
  //  Barry gets 1+ harpoons (buy more in Gear > Ice). A hit rips out that chunk (and anything joined to it
  //  by a CRACKED line). Anything no longer connected to the bottom falls off.
  //  Every chunk you knock loose = 1 bag of ice.
  // =====================================================================
  const IC = C.iceHarpoon || {};
  let I = null;
  const harpoonN = () => tier('harpoons').n ?? 1;
  const iceImpact = () => tier('hhead').impact ?? 0;
  const iceSway = () => tier('sight').sway ?? (IC.sway ?? 0.35);
  const iceCap = () => tier('boat').cap ?? (C.iceCap ?? 50);
  const bergSize = () => { const b = tier('boat'); return { rows: b.rows ?? IC.rows ?? 11, cols: b.cols ?? IC.cols ?? 9, min: b.min ?? IC.minChunks ?? 45, max: b.max ?? IC.maxChunks ?? 75 }; };
  const iceNeeded = () => C.venues.indexOf(venue()) >= C.venues.findIndex((v) => v.id === (C.iceFrom || 'boardwalk'));
  function hexNb(r, c) {
    const o = r % 2;
    return [[r, c - 1], [r, c + 1], [r - 1, c - 1 + o], [r - 1, c + o], [r + 1, c - 1 + o], [r + 1, c + o]];
  }
  function makeBerg() {   // keep rolling until the berg is a good size
    let best = null;
    for (let t = 0; t < 30; t++) {
      const b = rollBerg(), n = b.cells.size;
      const bs = bergSize(), mid = (bs.min + bs.max) / 2;
      if (n >= bs.min && n <= bs.max) return b;
      if (!best || Math.abs(n - mid) < Math.abs(best.cells.size - mid)) best = b;
    }
    return best;
  }
  function rollBerg() {
    const rows = bergSize().rows, cols = bergSize().cols, cells = new Map(), key = (r, c) => r * 100 + c;
    // bottom row: frozen into the sea
    const b0 = 1 + Math.floor(Math.random() * 2), b1 = cols - 2 - Math.floor(Math.random() * 2);
    for (let c = b0; c <= b1; c++) cells.set(key(rows - 1, c), { r: rows - 1, c, anchor: true });
    for (let r = rows - 2; r >= 0; r--) {
      const up = rows - 1 - r;
      for (let c = 0; c < cols; c++) {
        const below = hexNb(r, c).filter(([rr]) => rr === r + 1).some(([rr, cc]) => cells.has(key(rr, cc)));
        const mid = 1 - Math.abs(c - (cols - 1) / 2) / (cols / 2);
        const p = below ? 0.5 + 0.45 * mid - up * 0.025 : 0;
        if (Math.random() < p) cells.set(key(r, c), { r, c });
      }
      // overhangs: sometimes grow sideways off a chunk in this row
      [...cells.values()].filter((x) => x.r === r).forEach((x) => {
        if (Math.random() < 0.18) { const cc = x.c + (Math.random() < 0.5 ? -1 : 1); if (cc >= 0 && cc < cols) cells.set(key(r, cc), { r, c: cc }); }
      });
    }
    // bonds
    const bonds = new Map(), bk = (a, b) => (a < b ? a + ':' + b : b + ':' + a);
    const solidP = IC.solid ?? 0.5, crackP = IC.cracked ?? 0.2;
    cells.forEach((x, k) => hexNb(x.r, x.c).forEach(([r, c]) => {
      const k2 = key(r, c); if (!cells.has(k2) || bonds.has(bk(k, k2))) return;
      const q = Math.random(); bonds.set(bk(k, k2), q < solidP ? 'solid' : q < solidP + crackP ? 'crack' : 'none');
    }));
    // make sure everything starts attached to the bottom (adds strong bonds where needed = weak necks)
    for (let guard = 0; guard < 200; guard++) {
      const reach = iceReach(cells, bonds, key, bk);
      const loose = [...cells.keys()].filter((k) => !reach.has(k));
      if (!loose.length) break;
      let fixed = false;
      for (const k of loose) {
        const x = cells.get(k);
        const nb = hexNb(x.r, x.c).map(([r, c]) => key(r, c)).find((k2) => reach.has(k2));
        if (nb !== undefined) { bonds.set(bk(k, nb), 'solid'); fixed = true; break; }
      }
      if (!fixed) { loose.forEach((k) => cells.delete(k)); }
    }
    bonds.forEach((v, k) => { if (v === 'none') bonds.delete(k); });
    return { cells, bonds, key, bk, rows, cols };
  }
  function iceReach(cells, bonds, key, bk) {
    const seen = new Set(), q = [];
    cells.forEach((x, k) => { if (x.anchor) { seen.add(k); q.push(k); } });
    while (q.length) {
      const k = q.pop(), x = cells.get(k);
      hexNb(x.r, x.c).forEach(([r, c]) => { const k2 = key(r, c); if (cells.has(k2) && !seen.has(k2) && (bonds.get(bk(k, k2)) || 'none') !== 'none') { seen.add(k2); q.push(k2); } });
    }
    return seen;
  }
  // what one harpoon does (pure: works on copies, used for the real hit and for Barry's "par")
  function iceHit(berg, cells, k0) {
    const { key, bk, bonds } = berg;
    const smash = new Set([k0]), q = [k0];
    // bigger harpoon heads smash more around the hit: 1 = the chunks left and right, 2 = every neighbor
    const imp = iceImpact(), x0 = cells.get(k0);
    if (imp > 0) hexNb(x0.r, x0.c).forEach(([r, c], i) => { if (imp >= 2 || i < 2) { const k2 = key(r, c); if (cells.has(k2) && !smash.has(k2)) { smash.add(k2); q.push(k2); } } });
    while (q.length) {   // cracked lines break along with the chunk you hit
      const k = q.pop(), x = cells.get(k);
      hexNb(x.r, x.c).forEach(([r, c]) => { const k2 = key(r, c); if (cells.has(k2) && !smash.has(k2) && bonds.get(bk(k, k2)) === 'crack') { smash.add(k2); q.push(k2); } });
    }
    const left = new Map(cells); smash.forEach((k) => left.delete(k));
    const reach = iceReach(left, bonds, key, bk);
    const fall = [...left.keys()].filter((k) => !reach.has(k));
    fall.forEach((k) => left.delete(k));
    return { smash: [...smash], fall, left };
  }
  function icePar(berg) {   // Barry's own best guess: greedy, one throw at a time
    let cells = berg.cells, total = 0;
    for (let n = 0; n < harpoonN(); n++) {
      let best = null;
      cells.forEach((_, k) => { const h = iceHit(berg, cells, k); const g = h.smash.length + h.fall.length; if (!best || g > best.g) best = { g, h }; });
      if (!best) break; total += best.g; cells = best.h.left;
    }
    return total;
  }
  function iceGeom() {
    const B = I.berg, seaY = H * 0.68, top = L.top + 70;
    const cr = Math.min((W * 0.94) / ((B.cols + 0.5) * Math.sqrt(3)), (seaY + 10 - top) / (B.rows * 1.5 + 0.5));
    const w = cr * Math.sqrt(3), x0 = W / 2 - (B.cols - 0.5) * w / 2;
    const y0 = seaY + cr * 0.4 - (B.rows - 1) * cr * 1.5;
    return { cr, w, x0, y0, seaY, pos: (r, c) => ({ x: x0 + c * w + (r % 2 ? w / 2 : 0), y: y0 + r * cr * 1.5 }) };
  }
  function startIce() {
    state = 'ice'; phase = 'idle'; paused = false; cur = null; hurt = null; M = null; V = null;
    const berg = makeBerg();
    I = { t: 0, intro: 2.2, berg, cells: berg.cells, start: berg.cells.size, left: harpoonN(), max: harpoonN(), got: 0, par: icePar(berg),
          aim: null, shot: null, bits: [], floats: [], flash: [], over: false, endT: null };
    showScreen(null);
    hudLabels(['Mini game', 'Harpoons', 'Ice']);
    els.venue.textContent = 'Iceberg Harpoon';
    iceHud();
    tone(200, 0.4, 'triangle', 0.06, 120); noise(0.5, 0.08, 400);
  }
  function iceHud() {
    els.count.textContent = `${I.left} / ${I.max}`;
    els.earned.textContent = String(I.got);
    const f = I.left / I.max;
    els.clockFill.style.transform = `scaleX(${f})`; els.clockFill.dataset.low = I.left <= 1 && I.max > 1 && I.left < I.max ? '1' : '0';
    els.clockText.textContent = `Par ${I.par}`;
  }
  function iceAimAt(x, y) { if (I && !I.over) I.aim = { x, y: y - (pointer.type === 'mouse' ? 0 : 70) }; }
  function iceThrow() {
    if (!I || !I.aim || I.shot || I.left <= 0 || I.t < I.intro) { if (I) I.aim = null; return; }
    const g = iceGeom(), sway = g.cr * iceSway();
    const tx = I.aim.x + Math.sin(T * 4.3) * sway, ty = I.aim.y + Math.cos(T * 3.1) * sway * 0.6;
    I.shot = { t: 0, dur: 0.55, fx: W / 2, fy: H - 120, tx, ty };
    I.left--; I.aim = null; iceHud();
    noise(0.2, 0.1, 1800); tone(500, 0.2, 'triangle', 0.05, 900);
  }
  function iceLand(s) {
    const g = iceGeom(); let best = null, bd = Infinity;
    I.cells.forEach((x, k) => { const p = g.pos(x.r, x.c), d = Math.hypot(p.x - s.tx, p.y - s.ty); if (d < bd) { bd = d; best = k; } });
    if (best === null || bd > g.cr * 0.95) {
      I.flash.push({ text: 'Missed!', x: s.tx, y: s.ty, t: 0, bad: true }); tone(140, 0.25, 'sawtooth', 0.05, 90); return;
    }
    const h = iceHit(I.berg, I.cells, best);
    h.smash.forEach((k, i) => { const x = I.cells.get(k), p = g.pos(x.r, x.c); I.bits.push({ x: p.x, y: p.y, vx: (Math.random() - 0.5) * 200, vy: -150 - Math.random() * 150, rot: 0, vr: (Math.random() - 0.5) * 8, t: 0, delay: i * 0.05, cr: g.cr, smash: true }); });
    h.fall.forEach((k) => { const x = I.cells.get(k), p = g.pos(x.r, x.c); I.bits.push({ x: p.x, y: p.y, vx: (Math.random() - 0.5) * 40, vy: 0, rot: 0, vr: (Math.random() - 0.5) * 2, t: 0, delay: 0.25 + Math.random() * 0.25, cr: g.cr }); });
    I.cells = h.left;
    const n = h.smash.length + h.fall.length; I.got += n;
    I.flash.push({ text: h.fall.length >= 4 ? `TIMBER! +${n}` : `+${n} ice`, x: s.tx, y: s.ty - 30, t: 0, big: h.fall.length >= 4 });
    noise(0.35, 0.22, 1200); tone(900, 0.08, 'square', 0.05, 300);
    if (h.fall.length) setTimeout(() => noise(0.6, 0.18, 300), 450);
    iceHud();
  }
  function updateIce(dt) {
    if (!I || paused) return;
    I.t += dt;
    if (I.shot) { I.shot.t += dt; if (I.shot.t >= I.shot.dur) { const s = I.shot; I.shot = null; iceLand(s); } }
    const g = iceGeom();
    I.bits.forEach((b) => {
      if (b.delay > 0) { b.delay -= dt; return; }
      b.t += dt; b.vy += H * 1.6 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.rot += b.vr * dt;
      if (!b.splashed && b.y > g.seaY + 10) { b.splashed = true; if (!b.smash) { I.floats.push({ x: b.x, y: g.seaY + 18 + Math.random() * 30, t: 0, cr: b.cr * 0.8, rot: b.rot }); noise(0.2, 0.08, 700); } }
    });
    I.bits = I.bits.filter((b) => b.y < H + 60);
    I.floats.forEach((f) => { f.t += dt; f.x += (W / 2 - f.x) * dt * 0.4; f.y += (H - 130 - f.y) * dt * 0.25; });
    I.flash.forEach((f) => { f.t += dt; }); I.flash = I.flash.filter((f) => f.t < 1.3);
    if (!I.over && I.left <= 0 && !I.shot && !I.bits.length) { I.endT = (I.endT ?? 1.0) - dt; if (I.endT <= 0) endIce(); }
  }
  function iceHex(x, y, r) { ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } ctx.closePath(); }
  function drawIce() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const g = iceGeom(), B = I.berg;
    const sky = ctx.createLinearGradient(0, 0, 0, g.seaY); sky.addColorStop(0, '#9fd3f0'); sky.addColorStop(1, '#e6f6ff');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, g.seaY);
    const sea = ctx.createLinearGradient(0, g.seaY, 0, H); sea.addColorStop(0, '#2b7fb8'); sea.addColorStop(1, '#174f7a');
    // underwater part of the berg (the anchor)
    ctx.fillStyle = sea; ctx.fillRect(0, g.seaY, W, H - g.seaY);
    const anchors = [...I.cells.values()].filter((x) => x.anchor);
    if (anchors.length) {
      const xs = anchors.map((x) => g.pos(x.r, x.c).x);
      ctx.fillStyle = 'rgba(190,230,250,0.35)';
      ctx.beginPath(); ctx.moveTo(Math.min(...xs) - g.cr, g.seaY); ctx.lineTo(Math.max(...xs) + g.cr, g.seaY); ctx.lineTo(Math.max(...xs) + g.cr * 2.5, H); ctx.lineTo(Math.min(...xs) - g.cr * 2.5, H); ctx.closePath(); ctx.fill();
    }
    // bonds: strong = thick blue, cracked = zigzag
    ctx.save(); ctx.lineCap = 'round';
    B.bonds.forEach((v, k) => {
      const [a, b] = k.split(':').map(Number); if (!I.cells.has(a) || !I.cells.has(b)) return;
      const A = I.cells.get(a), Bc = I.cells.get(b), p = g.pos(A.r, A.c), q = g.pos(Bc.r, Bc.c);
      if (v === 'solid') { ctx.strokeStyle = '#2f6f9e'; ctx.lineWidth = Math.max(3, g.cr * 0.22); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke(); }
      else {
        ctx.strokeStyle = '#d9534f'; ctx.lineWidth = Math.max(2, g.cr * 0.1); ctx.beginPath();
        for (let i = 0; i <= 6; i++) { const t = i / 6, nx = -(q.y - p.y), ny = q.x - p.x, nl = Math.hypot(nx, ny) || 1, z = (i % 2 ? 1 : -1) * g.cr * 0.12 * (i && i < 6 ? 1 : 0); ctx.lineTo(p.x + (q.x - p.x) * t + nx / nl * z, p.y + (q.y - p.y) * t + ny / nl * z); }
        ctx.stroke();
      }
    });
    ctx.restore();
    // chunks
    I.cells.forEach((x) => {
      const p = g.pos(x.r, x.c);
      iceHex(p.x, p.y, g.cr * 0.64);
      ctx.fillStyle = x.anchor ? '#cfeaf7' : '#f2fbff'; ctx.fill();
      ctx.strokeStyle = '#2f6f9e'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.ellipse(p.x - g.cr * 0.25, p.y - g.cr * 0.3, g.cr * 0.2, g.cr * 0.09, -0.5, 0, Math.PI * 2); ctx.fill();
      if (x.anchor) { ctx.fillStyle = 'rgba(47,111,158,0.5)'; ctx.fillRect(p.x - g.cr * 0.4, p.y + g.cr * 0.25, g.cr * 0.8, 3); }
    });
    // waterline over the anchors
    ctx.fillStyle = 'rgba(43,127,184,0.55)'; ctx.fillRect(0, g.seaY, W, g.cr * 0.9);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2; ctx.beginPath();
    for (let x = 0; x <= W; x += 10) ctx.lineTo(x, g.seaY + Math.sin(x * 0.05 + T * 2) * 3); ctx.stroke();
    // falling / smashed chunks
    I.bits.forEach((b) => {
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.rot); if (b.smash) ctx.scale(0.6, 0.6);
      iceHex(0, 0, b.cr * 0.78); ctx.fillStyle = b.smash ? '#ffffff' : '#e6f6ff'; ctx.fill(); ctx.strokeStyle = '#2f6f9e'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    });
    I.floats.forEach((f) => { ctx.save(); ctx.translate(f.x, f.y + Math.sin(T * 2 + f.x) * 2); ctx.rotate(f.rot); ctx.globalAlpha = Math.max(0, 1 - f.t / 2.5); iceHex(0, 0, f.cr * 0.6); ctx.fillStyle = '#e6f6ff'; ctx.fill(); ctx.restore(); });
    // Barry from behind on his ice floe
    const bx = W / 2, by = H - 100;
    const boatLv = SAVE.owned.boat || 0;
    if (boatLv === 0) {   // ice floe
      ctx.fillStyle = '#eaf6ff'; ctx.strokeStyle = '#2f6f9e'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(bx, by + 36, 90, 22, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    } else {              // rowboat (wood) or tug boat (red, with a cabin + stack)
      const tug = boatLv >= 2, bw = tug ? 120 : 100;
      if (tug) {
        ctx.fillStyle = '#f3ead8'; ctx.strokeStyle = '#2a1408'; ctx.lineWidth = 3;
        ctx.fillRect(bx - bw * 0.85, by - 10, 44, 40); ctx.strokeRect(bx - bw * 0.85, by - 10, 44, 40);
        ctx.fillStyle = '#2a1408'; ctx.fillRect(bx - bw * 0.75, by - 34, 14, 26);
        ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(bx - bw * 0.7 + Math.sin(T) * 4, by - 46 - (T * 20 % 20), 8, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = tug ? '#d9534f' : '#9b6b3d'; ctx.strokeStyle = '#2a1408'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(bx - bw, by + 20); ctx.lineTo(bx + bw, by + 20); ctx.lineTo(bx + bw * 0.8, by + 52); ctx.lineTo(bx - bw * 0.8, by + 52); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = tug ? '#fff3d6' : '#6e4a32'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bx - bw * 0.92, by + 30); ctx.lineTo(bx + bw * 0.92, by + 30); ctx.stroke();
    }
    ctx.strokeStyle = '#2a1408'; ctx.lineWidth = 3;
    ctx.fillStyle = '#9b6a48'; ctx.beginPath(); ctx.ellipse(bx, by + 6, 34, 36, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#a8775a'; ctx.beginPath(); ctx.arc(bx, by - 34, 22, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    const ready = !I.shot && I.left > 0;
    if (ready) {   // harpoon held up, pointing at the aim
      const ax = I.aim ? I.aim.x : bx, ay = I.aim ? I.aim.y : by - 200, ang = Math.atan2(ay - (by - 20), ax - (bx + 26));
      ctx.save(); ctx.translate(bx + 26, by - 20); ctx.rotate(ang);
      ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(40, 0); ctx.stroke();
      ctx.fillStyle = '#c9d3dc'; ctx.strokeStyle = '#2a1408'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(40, -7); ctx.lineTo(58, 0); ctx.lineTo(40, 7); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = '#6e4a32'; ctx.beginPath(); ctx.ellipse(bx + 28, by - 4, 10, 20, -0.6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // harpoon in flight: arcs away into the distance
    if (I.shot) {
      const s = I.shot, k = s.t / s.dur, x = s.fx + (s.tx - s.fx) * k, y = s.fy + (s.ty - s.fy) * k - Math.sin(k * Math.PI) * H * 0.12;
      const sc = 1 - 0.55 * k;
      ctx.strokeStyle = 'rgba(80,60,40,0.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(bx + 26, by - 20); ctx.quadraticCurveTo((bx + x) / 2, Math.min(by, y) - H * 0.1, x, y); ctx.stroke();
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(s.ty - s.fy, s.tx - s.fx) + (0.5 - k) * 0.8); ctx.scale(sc, sc);
      ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-40, 0); ctx.lineTo(20, 0); ctx.stroke();
      ctx.fillStyle = '#c9d3dc'; ctx.strokeStyle = '#2a1408'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(20, -7); ctx.lineTo(38, 0); ctx.lineTo(20, 7); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    // aim: crosshair (sways a little; better aim takes practice)
    if (I.aim && !I.shot) {
      const sway = g.cr * iceSway(), ax = I.aim.x + Math.sin(T * 4.3) * sway, ay = I.aim.y + Math.cos(T * 3.1) * sway * 0.6;
      ctx.save(); ctx.strokeStyle = '#d9534f'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(ax, ay, g.cr * 0.6, 0, Math.PI * 2); ctx.moveTo(ax - g.cr, ay); ctx.lineTo(ax + g.cr, ay); ctx.moveTo(ax, ay - g.cr); ctx.lineTo(ax, ay + g.cr); ctx.stroke();
      ctx.setLineDash([6, 8]); ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(bx + 26, by - 20); ctx.quadraticCurveTo((bx + ax) / 2, Math.min(by, ay) - H * 0.1, ax, ay); ctx.stroke(); ctx.restore();
    }
    // harpoons left
    for (let i = 0; i < I.max; i++) {
      const hx = 26 + i * 22, hy = H - 60, on = i < I.left;
      ctx.strokeStyle = on ? '#6b4a2a' : 'rgba(0,0,0,0.25)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(hx, hy + 30); ctx.lineTo(hx, hy - 10); ctx.stroke();
      ctx.fillStyle = on ? '#c9d3dc' : 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.moveTo(hx - 6, hy - 10); ctx.lineTo(hx, hy - 24); ctx.lineTo(hx + 6, hy - 10); ctx.closePath(); ctx.fill();
    }
    // legend
    const ly = L.top + 22;
    ctx.save(); ctx.fillStyle = 'rgba(29,23,18,0.72)'; ctx.fillRect(8, ly - 14, W - 16, 30); ctx.restore();
    ctx.save(); ctx.strokeStyle = '#7fc1ea'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(18, ly + 1); ctx.lineTo(42, ly + 1); ctx.stroke(); ctx.restore();
    label('strong', 72, ly + 1, 14, '#fff3d6');
    ctx.save(); ctx.strokeStyle = '#ff7a72'; ctx.lineWidth = 3; ctx.beginPath(); for (let i = 0; i <= 6; i++) ctx.lineTo(W * 0.42 + i * 4, ly + 1 + (i % 2 ? 4 : -4)); ctx.stroke(); ctx.restore();
    label('cracked (breaks too)', W * 0.42 + 30 + Math.min(W * 0.5, 160) / 2, ly + 1, 14, '#fff3d6', 0, Math.min(W * 0.5, 160));
    I.flash.forEach((f) => { const a = 1 - f.t / 1.3; label(f.text, f.x, f.y - f.t * 40, f.big ? Math.min(W, H) * 0.08 : 24, f.bad ? `rgba(255,107,91,${a})` : `rgba(255,210,63,${a})`); });
    if (I.t < I.intro) {
      const k = Math.min(1, I.t / 0.25), sc = 0.5 + 0.5 * easeOutBack(k);
      ctx.save(); ctx.translate(W / 2, H * 0.3); ctx.scale(sc, sc);
      ctx.fillStyle = 'rgba(29,23,18,0.8)'; ctx.fillRect(-W * 0.45, -60, W * 0.9, 130);
      label('ICEBERG HARPOON', 0, -24, Math.min(W, H) * 0.08, '#7be0ff');
      label(`${I.max} harpoon${I.max === 1 ? '' : 's'}. Hit the weak spots:`, 0, 16, 18, '#fff3d6');
      label("anything not hanging on to the bottom falls off!", 0, 42, 16, '#fff3d6');
      ctx.restore();
    }
  }
  function endIce() {
    I.over = true; state = 'result';
    hudLabels(['Working at', 'Shucked', 'Earned']);
    const cap = iceCap(), add = Math.max(0, Math.min(I.got, cap - (SAVE.ice || 0)));
    SAVE.ice = (SAVE.ice || 0) + add;
    const beat = I.got >= I.par, xp = Math.round(I.got * 0.6) + (beat ? 15 : 0);
    SAVE.xp.acc += xp; SAVE.xpTotal = (SAVE.xpTotal || 0) + xp;
    SAVE.iceBest = Math.max(SAVE.iceBest || 0, I.got);
    writeSave(); SFX.orderUp();
    const row = (l, v, cls = '') => `<div class="line ${cls}"><span>${l}</span><b>${v}</b></div>`;
    $('resultTitle').textContent = beat ? (I.got > I.par ? 'Better than Barry!' : 'Iceberg master!') : `Knocked loose: ${I.got}`;
    $('resultTag').textContent = 'Into the ice bin';
    $('resultBody').innerHTML = `
      <p class="sub">${I.got} of ${I.start} chunks with ${I.max} harpoon${I.max === 1 ? '' : 's'}</p>
      <p class="fine">Want more ice? Gear &rarr; Ice: more harpoons, bigger heads, a bigger boat.</p>
      <div class="receipt">
        ${row('Ice knocked loose', I.got)}
        ${row("Barry's par", I.par)}
        ${row('Ice bags stocked', `+${add} (now ${SAVE.ice})`, 'total')}
      </div>
      <p class="fine">${iceNeeded() ? 'Ice melts all shift long. Run out and you serve warm oysters for less pay.' : 'You don’t need ice at the Beach Shack yet, but from the Boardwalk on it melts all shift. Stock up early!'}${add < I.got ? ' The ice bin is full!' : ''}</p>
      <div class="xpline"><span class="xpchip" style="--c:#4aa3ff">Accuracy +${xp}</span></div>`;
    setResultButtons('hub');
    showScreen('result');
  }
  // ice melts during shifts (from the Boardwalk on)
  function meltIce(dt) {
    if (!iceNeeded() || !SAVE.ice) return;
    const i = C.venues.indexOf(venue());
    G.iceAcc = (G.iceAcc || 0) + (C.iceMelt || [0, 0.1, 0.14, 0.18, 0.22])[Math.min(i, 4)] * dt;
    while (G.iceAcc >= 1 && SAVE.ice > 0) { G.iceAcc -= 1; SAVE.ice--; G.iceUsed = (G.iceUsed || 0) + 1; G.iceBlip = T; }
    if (!SAVE.ice) fx.popups.push({ text: 'Out of ice!', sub: 'warm oysters pay less', x: L.cx, y: L.top + 110, t: 0, small: true, bad: true });
  }
  function drawIceGauge() {
    if (!G || !iceNeeded()) return;
    const n = SAVE.ice || 0, cap = iceCap(), x = W - 40, y = L.top + 74, low = n <= 3;
    const blip = Math.max(0, 1 - (T - (G.iceBlip || -9)) / 0.35);
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(29,23,18,0.78)'; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(-34, -20, 64, 40, 12); else ctx.rect(-34, -20, 64, 40); ctx.fill();
    const r = 10 * (1 + blip * 0.25); iceHex(-17, -2, r); ctx.fillStyle = '#e6f6ff'; ctx.fill(); ctx.strokeStyle = '#7fc1ea'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(-4, 10, 28, 4);
    ctx.fillStyle = low ? '#ff6b5b' : '#7be0ff'; ctx.fillRect(-4, 10, 28 * Math.min(1, n / cap), 4);
    ctx.restore();
    label(String(n), x + 10, y - 3, 17, low && Math.floor(T * 4) % 2 ? '#ff6b5b' : '#fff3d6');
    if (blip > 0) label('-1', x + 10, y - 22 - (1 - blip) * 10, 13, `rgba(127,193,234,${blip})`);
  }

  // ---------- Loop ----------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (state === 'lemon' || (state === 'result' && M && M.over)) { updateLemons(dt); if (M) drawLemons(); }
    else if (state === 'dive' || (state === 'result' && V && V.over)) { T += dt; updateDive(dt); if (V) drawDive(); }
    else if (state === 'ice' || (state === 'result' && I && I.over)) { T += dt; updateIce(dt); if (I) drawIce(); }
    else if (state === 'timelapse') { T += dt; updateLapse(dt); drawBackdrop(); }
    else if (state === 'title' || state === 'hub') { update(dt); drawBackdrop(); }
    else { update(dt); draw(); }
    requestAnimationFrame(frame);
  }

  // Read-only peek for debugging in the console.
  window.__shuck = { get oyster() { return cur && { shape: cur.shape, flip: cur.flip, pts: cur.pts, phase, nCovered: cur.nCovered,
                       barn: (cur.barn || []).map((b) => Object.assign(barnPos(cur, b), { alive: b.alive, r: b.r })) }; },
                     get shift() { return G; }, get save() { return SAVE; }, get lemons() { return M; }, get dive() { return V; }, get ice() { return I; }, iceGeom: () => iceGeom() };

  window.addEventListener('resize', layout);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', layout);

  const fontReady = (document.fonts && document.fonts.load) ? document.fonts.load('40px "Lilita One"').catch(() => {}) : Promise.resolve();
  Promise.all([...assetJobs, fontReady]).then(() => {
    makeKnives();
    document.body.classList.add('ready');
    layout();
    armTip = { x: L.rest.x, y: L.rest.y };
    setMuted(muted);
    updateRadioBtn();
    refreshTitle();
    updateHud();
    showScreen('title');
    requestAnimationFrame((t) => { last = t; frame(t); });
  });
})();
