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
  const ctx = canvas.getContext('2d');
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
  ];
  SHAPE_NAMES.forEach((n) => {
    assetJobs.push(loadImg(n + '_top', `assets/oyster_${n}_top.webp`));
    assetJobs.push(loadImg(n + '_bottom', `assets/oyster_${n}_bottom.webp`));
  });
  C.venues.forEach((v) => { if (v.background) assetJobs.push(loadImg('bg_' + v.id, v.background)); });

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
             shifts: 0, oysters: 0, bestShift: 0, cuts: 0, rep: {} };
  }
  function loadSave() {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (s && s.owned) { const f = freshSave(); return Object.assign(f, s, { owned: Object.assign(f.owned, s.owned), rep: Object.assign({}, s.rep) }); }
    } catch (e) { /* no save yet or storage blocked */ }
    return freshSave();
  }
  function writeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) { /* storage blocked */ } }
  let SAVE = loadSave();
  const gearDef = (id) => C.gear.find((g) => g.id === id);
  const tier = (id) => { const g = gearDef(id); return g.tiers[Math.min(SAVE.owned[id] || 0, g.tiers.length - 1)]; };
  const venue = () => C.venues.find((v) => v.id === SAVE.venue) || C.venues[0];
  const cutMult = () => (tier('knife').cut ?? 1) * (tier('glove').cut ?? 1);
  const napkinTaps = () => tier('aid').taps ?? 3;
  const timeMult = () => tier('ice').time ?? 1;
  const cashMult = () => tier('jar').cash ?? 1;
  const repOf = (id) => SAVE.rep[id] || 0;
  const tolNow = () => L.tol * (tier('knife').grip ?? 1);
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
    L.cy = top + availH * 0.47;
    L.tol = Math.max(C.minTolerancePx, L.D * C.traceTolerance);

    const s = Math.max(W / BG.w, H / BG.h, (L.D * 1.2) / BG.boardH, (L.D * 1.2) / BG.boardW);
    let ox = L.cx - BG.boardCx * s, oy = L.cy - BG.boardCy * s;
    ox = Math.min(0, Math.max(W - BG.w * s, ox));
    oy = Math.min(0, Math.max(H - BG.h * s, oy));
    L.bg = { s, ox, oy };

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
  let hubTab = 'work';
  let resetArmed = false;
  const pointer = { x: 0, y: 0, down: false, id: null, tracing: false, lastX: 0, lastY: 0, hover: false, type: 'touch' };
  const fx = { lid: null, stamp: null, popups: [], drops: [], splash: [], shake: 0, ouch: null, wipe: 0 };
  let armTip = { x: 0, y: 0 };
  const knife = { x: 0, y: 0 };   // where the blade actually is (lags and wobbles behind your finger)
  let gloveAt = null;              // screen spot of the cut on the glove, for blood drips

  // ---------- Shift ----------
  function pickOrderSize(v) {
    const sizes = []; for (let n = v.orderMin; n <= v.orderMax; n += 6) sizes.push(n);
    return sizes[(Math.random() * sizes.length) | 0];
  }
  function startShift() {
    const v = venue();
    const need = pickOrderSize(v);
    G = { venue: v, need, done: 0, clockMax: shiftClock(need, v), clock: 0, par: v.secsPerOyster * C.parFactor,
          pay: 0, tips: 0, accSum: 0, cuts: 0, served: 0, bandages: [], fast: 0,
          wounds: 0, tapsDone: 0, stun: 0, lastSlip: -9, dripT: 0, drips: [], splats: [], bloody: 0, bloodLoss: 0 };
    G.clock = G.clockMax;
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
    cur.pts = screenPath(cur);
    if (G.done >= C.safeOysters && Math.random() < C.randomCutChance * cutMult()) cur.cutAt = 0.3 + Math.random() * 0.5;
    phase = 'slideIn'; pointer.tracing = false;
    SFX.slide();
  }
  function screenPath(o) {
    const D = L.D, x0 = L.cx - D / 2, y0 = L.cy - D / 2;
    return SHAPES[o.shape].map(([px, py]) => ({ x: x0 + (o.flip ? 1 - px : px) * D, y: y0 + py * D }));
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
    o.errSum += Math.min(d, tol * 4); o.n++;
    if (d > tol * 2) o.off++;
    for (let i = 0; i < o.pts.length; i++) {
      if (o.covered[i]) continue;
      const p = o.pts[i], ex = p.x - x, ey = p.y - y;
      if (ex * ex + ey * ey <= tol2) { o.covered[i] = 1; o.nCovered++; }
    }
    o.trail.push({ x, y, t: T }); if (o.trail.length > 60) o.trail.shift();
    const progress = o.nCovered / o.pts.length;
    if (G.done >= C.safeOysters && d > tol * C.slipDistance && T - G.lastSlip > C.slipCooldown) {
      G.lastSlip = T;
      if (Math.random() < C.slipCutChance * cutMult()) { cutHand(); return; }
    }
    if (o.cutAt !== null && progress >= o.cutAt) { o.cutAt = null; cutHand(); return; }
    if (progress >= C.coverageToFinish) finishOyster();
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
    let pay = Math.max(1, Math.round(G.venue.pay * (C.gradePay[rank] ?? 1)));
    let tip = secs <= G.par ? Math.max(1, Math.round(G.venue.pay * C.speedTipFactor)) : 0;
    let loss = 0;
    if (bloody) { pay = 0; tip = 0; loss = Math.max(1, Math.round(G.venue.pay * C.bloodPenalty)); G.bloody++; G.bloodLoss += loss; }
    G.pay += pay; G.tips += tip; if (tip) G.fast++;
    G.done += 1; G.accSum += acc;

    fx.lid = { x: o.x, y: L.cy, vx: (Math.random() < 0.5 ? -1 : 1) * (L.D * (1.2 + Math.random())), vy: -L.D * 4.2,
               rot: 0, vr: (Math.random() < 0.5 ? -1 : 1) * (6 + Math.random() * 6), shape: o.shape, flip: o.flip, t: 0 };
    fx.stamp = bloody ? { text: 'YUCK! BLOODY!', color: '#ff6b5b', t: 0, rank: 5 } : { text: grade.name, color: grade.color, t: 0, rank };
    fx.popups.push(bloody
      ? { text: `-${money(loss)}`, sub: 'blood in the oyster!', x: L.cx, y: L.cy + L.D * 0.42, t: 0, bad: true }
      : { text: `+${money(pay + tip)}`, sub: tip ? 'speedy tip!' : '', x: L.cx, y: L.cy + L.D * 0.42, t: 0, money: true });
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
    const sub = G.pay + G.tips + bonus;
    const jar = Math.round(sub * (cashMult() - 1));
    const total = Math.max(0, sub + jar - G.bloodLoss);
    const stars = shiftStars(finished);
    const repBefore = repOf(v.id);
    let repAfter = repBefore;
    if (stars >= C.starUpAt) repAfter = Math.min(5, repBefore + 1);
    else if (stars <= C.starDownAt) repAfter = Math.max(0, repBefore - 1);
    SAVE.rep[v.id] = repAfter;
    const nextV = C.venues[C.venues.indexOf(v) + 1];
    const justEarned = repAfter >= C.starsToUnlock && repBefore < C.starsToUnlock && nextV && !SAVE.unlocked.includes(nextV.id);
    SAVE.cash += total; SAVE.shifts += 1; SAVE.oysters += G.done; SAVE.cuts += G.cuts;
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
        ${row(`Speedy tips (${G.fast})`, money(G.tips))}
        ${row(finished ? 'Time left bonus' : 'Time left bonus (late)', money(bonus))}
        ${jar ? row(`${tier('jar').name}`, money(jar)) : ''}
        ${G.bloodLoss ? row(`Bloody oysters (${G.bloody})`, '-' + money(G.bloodLoss), 'neg') : ''}
        ${row('Total', money(total), 'total')}
      </div>
      <div class="repline"><span>${v.name}</span><b>${starsText(repAfter)}</b>
        <em>${repAfter > repBefore ? '+1 star' : repAfter < repBefore ? '-1 star' : 'no change'}</em></div>
      ${justEarned ? `<p class="nudge">5 stars! ${nextV.name} is ready to open for ${money(nextV.cost)}.</p>` : ''}
      <p class="fine">${G.cuts ? `Cut yourself ${G.cuts === 1 ? 'once' : G.cuts + ' times'}.` : 'No cuts!'}${best ? ' New best shift!' : ''}</p>
      <div class="cashline"><span>Cash</span><strong>${money(SAVE.cash)}</strong></div>
      ${next && SAVE.cash >= next.cost ? `<p class="nudge">You can afford the ${next.name} now.</p>` : ''}`;
    showScreen('result');
  }

  // ---------- Oops ----------
  function cutHand() {
    pointer.tracing = false;
    G.cuts += 1; G.wounds += 1; G.stun = C.cutStun; G.dripT = 0.15;
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
      fx.popups.push({ text: 'Back to work!', sub: '', x: L.cx, y: L.cy - L.D * 0.1, t: 0, big: true });
    }
  }
  function inNapkin(x, y) {
    const n = L.napkin, pad = 14;
    return x >= n.x - pad && x <= n.x + n.w + pad && y >= n.y - pad && y <= n.y + n.h + pad;
  }

  // ---------- Input ----------
  function localPos(e) { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  canvas.addEventListener('pointerdown', (e) => {
    if (pointer.id !== null && pointer.id !== e.pointerId) return;
    audio();
    const p = localPos(e);
    pointer.id = e.pointerId; pointer.down = true; pointer.type = e.pointerType; pointer.x = p.x; pointer.y = p.y;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    if (state !== 'play' || paused) return;
    if (G.wounds && inNapkin(p.x, p.y)) { tapNapkin(); e.preventDefault(); return; }
    if (G.stun > 0) return;
    if (phase === 'trace') {
      pointer.tracing = true;
      // the blade starts where the arm already is and has to catch up to your finger
      if (Math.hypot(armTip.x - p.x, armTip.y - p.y) > L.D * 0.5) { knife.x = p.x; knife.y = p.y; }
      else { knife.x = armTip.x; knife.y = armTip.y; }
      pointer.lastX = knife.x; pointer.lastY = knife.y;
      if (!cur.startT) cur.startT = T;
    }
    e.preventDefault();
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = localPos(e);
    if (e.pointerType === 'mouse') pointer.hover = true;
    if (pointer.id !== null && pointer.id !== e.pointerId) return;
    pointer.x = p.x; pointer.y = p.y; pointer.type = e.pointerType;
  });
  function endPointer(e) { if (pointer.id !== e.pointerId) return; pointer.id = null; pointer.down = false; pointer.tracing = false; }
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') pointer.hover = false; });

  // ---------- Screens ----------
  function showScreen(which) {
    els.title.hidden = which !== 'title';
    els.hub.hidden = which !== 'hub';
    els.result.hidden = which !== 'result';
    els.pause.hidden = which !== 'pause';
    els.btnPause.hidden = state !== 'play';
    document.body.classList.toggle('on-shift', state === 'play');
    const focusBtn = { title: 'btnStart', result: 'btnBackToShack', pause: 'btnResume' }[which];
    if (focusBtn) setTimeout(() => { const b = $(focusBtn); if (b) b.focus({ preventScroll: true }); }, 30);
  }

  function refreshTitle() {
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

  function renderHub() {
    const v = venue();
    els.hubCash.textContent = money(SAVE.cash);
    els.hubVenue.textContent = v.name;
    els.hubShift.textContent = `Shift #${SAVE.shifts + 1}`;
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
          <div class="wide"><span>Your knife</span><b>${tier('knife').name} · ${knifeFeel()}</b></div>
        </div>
        <button class="btn" type="button" data-act="shift">Start shift</button>
        <p class="fine stats">${SAVE.oysters.toLocaleString()} oyster${SAVE.oysters === 1 ? '' : 's'} shucked · best shift ${money(SAVE.bestShift)}</p>
        <button class="linkbtn" type="button" data-act="reset">${resetArmed ? 'Tap again to wipe your save' : 'Start over'}</button>`;
    } else if (hubTab === 'gear') {
      h = C.gear.map((g) => {
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
    }
    els.hubBody.innerHTML = h;
  }

  function knifeFeel() {
    const w = tier('knife').wobble ?? 0;
    return w > 0.03 ? 'wobbly' : w > 0.015 ? 'steady-ish' : w > 0.005 ? 'smooth' : 'perfect';
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
    if (act === 'buy') {
      const g = gearDef(id), i = SAVE.owned[id] || 0, next = g.tiers[i + 1]; if (!next || !gearOpen(next)) return;
      if (SAVE.cash < next.cost) { SFX.nope(); flash(`Need ${money(next.cost - SAVE.cash)} more`, true); return; }
      SAVE.cash -= next.cost; SAVE.owned[id] = i + 1; writeSave(); SFX.buy(); flash(`Got the ${next.name}!`);
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
    if (act === 'move') { SAVE.venue = id; writeSave(); SFX.slide(); hubTab = 'work'; renderHub(); }
  });

  function setPaused(p) {
    if (state !== 'play') return;
    paused = p; pointer.tracing = false;
    showScreen(p ? 'pause' : null);
  }

  els.btnStart.addEventListener('click', () => { audio(); openHub('work'); });
  $('btnBackToShack').addEventListener('click', () => { audio(); openHub('work'); });
  $('btnResume').addEventListener('click', () => setPaused(false));
  $('btnWalkOut').addEventListener('click', () => { paused = false; endShift(false); });
  els.btnPause.addEventListener('click', () => setPaused(!paused));
  els.btnMute.addEventListener('click', () => setMuted(!muted));
  document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'play' && !paused) setPaused(true); });
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
      if (phase === 'ready') {
        if (T - readyT >= C.orderUpTime) nextOyster();
      } else {
        G.clock -= dt;
        updateClock();
        if (G.clock <= 0) { endShift(false); return; }
      }
      if (phase === 'slideIn') {
        const k = Math.min(1, (T - cur.t0) / C.slideInTime);
        cur.x = W + L.D * 0.6 + (L.cx - (W + L.D * 0.6)) * easeOutBack(k);
        if (k >= 1) { cur.x = L.cx; phase = 'trace'; cur.startT = 0; }
      } else if (phase === 'shucked') {
        if (T - cur.t0 >= C.shuckedHold) { phase = 'slideOut'; cur.t0 = T; SFX.slide(); }
      } else if (phase === 'slideOut') {
        const k = Math.min(1, (T - cur.t0) / C.slideOutTime);
        cur.x = L.cx + (-L.D * 0.7 - L.cx) * easeIn(k);
        if (k >= 1) { if (G.done >= G.need) { endShift(true); return; } nextOyster(); }
      }
      if (hurt) hurt.t += dt;
      if (G.stun > 0) { G.stun -= dt; if (G.stun <= 0) hurt = null; }

      // the blade follows your finger with some drag and shake (better knives = less)
      if (pointer.tracing && phase === 'trace' && G.stun <= 0) {
        const kt = tier('knife');
        const lagK = 1 - Math.exp(-dt / Math.max(0.004, kt.lag ?? 0.01));
        knife.x += (pointer.x - knife.x) * lagK; knife.y += (pointer.y - knife.y) * lagK;
        const wob = ((kt.wobble ?? 0) + G.wounds * C.woundWobble) * L.D;
        const nx = knife.x + wob * (Math.sin(T * 6.1) + 0.55 * Math.sin(T * 15.7 + 1.3));
        const ny = knife.y + wob * (Math.cos(T * 5.3 + 0.7) + 0.55 * Math.sin(T * 12.9 + 2.1));
        traceTo(nx, ny);
        armTip.x = nx; armTip.y = ny;
      }

      // open cuts drip blood wherever the hand is
      if (G.wounds > 0) {
        G.dripT -= dt;
        if (G.dripT <= 0) {
          G.dripT = (C.dripEvery / G.wounds) * (0.6 + Math.random() * 0.8);
          const at = gloveAt || armTip;
          G.drips.push({ x: at.x + (Math.random() - 0.5) * 10, y: at.y, t: 0, r: L.D * (0.018 + Math.random() * 0.014) });
        }
      }
      G.drips.forEach((d) => {
        d.t += dt;
        if (d.t >= 0.28 && !d.landed) {
          d.landed = true;
          const onOyster = cur && (phase === 'trace' || phase === 'slideIn') && Math.hypot(d.x - cur.x, d.y - L.cy) < L.D * 0.36;
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
    ctx.save(); ctx.globalAlpha = 0.3; ctx.translate(x + D * 0.025, y + D * 0.045); if (o.flip) ctx.scale(-1, 1);
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
  function drawHint(o) {
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
    const knifeLook = tier('knife').look || 'steel';
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
        drawOysterImg(cur.shape + '_top', cur.x, L.cy, cur.flip);
        drawBloodOn(cur);
        if (phase === 'trace') { drawGuide(cur); drawTrail(cur); drawHint(cur); }
      } else { drawOysterImg(cur.shape + '_bottom', cur.x, L.cy, cur.flip); drawBloodOn(cur); }
    }
    if (state === 'play') drawDrips();
    fx.splash.forEach((s) => {
      ctx.save(); ctx.globalAlpha = 1 - s.t / 0.8; ctx.fillStyle = '#d8eef6'; ctx.strokeStyle = 'rgba(40,70,90,0.6)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
    });
    if (fx.lid) drawOysterImg(fx.lid.shape + '_top', fx.lid.x, fx.lid.y, fx.lid.flip, fx.lid.rot, 1 + fx.lid.t * 0.5);
    drawArm();
    if (state === 'play' && phase === 'ready' && !paused) drawOrderUp();
    drawStamp();
    drawPopups();
    drawHurt();
    ctx.restore();
  }

  // ---------- Loop ----------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    update(dt); draw();
    requestAnimationFrame(frame);
  }

  // Read-only peek for debugging in the console.
  window.__shuck = { get oyster() { return cur && { shape: cur.shape, flip: cur.flip, pts: cur.pts, phase }; },
                     get shift() { return G; }, get save() { return SAVE; } };

  window.addEventListener('resize', layout);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', layout);

  const fontReady = (document.fonts && document.fonts.load) ? document.fonts.load('40px "Lilita One"').catch(() => {}) : Promise.resolve();
  Promise.all([...assetJobs, fontReady]).then(() => {
    makeKnives();
    document.body.classList.add('ready');
    layout();
    armTip = { x: L.rest.x, y: L.rest.y };
    setMuted(muted);
    refreshTitle();
    updateHud();
    showScreen('title');
    requestAnimationFrame((t) => { last = t; frame(t); });
  });
})();
