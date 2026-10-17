// Shuck Shack — trace the shell, pop the lid, fill the order.
(() => {
  'use strict';
  const C = window.SHUCK_CONFIG;
  const SHAPES = window.SHUCK_SHAPES;
  const SHAPE_NAMES = Object.keys(SHAPES);

  // Arm rig measured from the art (mirrored so the arm comes in from the right).
  const ARM = {
    hand: { wrist: [231, 238], tip: [5, 2], glove: [150, 192] },
    cuff: { opening: [27, 50], end: [178, 196] },
    color: '#e4732d', shade: '#b9531c', thick: 52,
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
    order: $('hudOrder'), count: $('hudCount'), score: $('hudScore'),
    clockFill: $('clockFill'), clockText: $('clockText'),
    title: $('screenTitle'), intro: $('screenOrder'), over: $('screenOver'), pause: $('screenPause'),
    introTitle: $('orderTitle'), introSub: $('orderSub'), introStats: $('orderStats'),
    overTitle: $('overTitle'), overScore: $('overScore'), overBest: $('overBest'), overDetail: $('overDetail'),
    titleBest: $('titleBest'),
    btnMute: $('btnMute'), btnPause: $('btnPause'),
  };
  document.querySelectorAll('[data-title]').forEach((n) => { n.textContent = C.title; });
  document.title = C.title;
  if (C.arcadeUrl) document.querySelectorAll('.arcade-link').forEach((a) => { a.href = C.arcadeUrl; a.hidden = false; });

  const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  // ---------- Best score ----------
  const BEST_KEY = 'shuckshack.best';
  function getBest() { try { return +localStorage.getItem(BEST_KEY) || 0; } catch (e) { return 0; } }
  function setBest(v) { try { localStorage.setItem(BEST_KEY, String(v)); } catch (e) { /* storage blocked */ } }

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
    grade(rank) { // rank 0 = best
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
  };
  function setMuted(m) {
    muted = m; els.btnMute.setAttribute('aria-pressed', String(m));
    els.btnMute.querySelector('.ico').textContent = m ? 'Sound off' : 'Sound on';
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

    // Counter background: cover the screen, keep the cutting board under the oyster.
    const s = Math.max(W / BG.w, H / BG.h, (L.D * 1.2) / BG.boardH, (L.D * 1.2) / BG.boardW);
    let ox = L.cx - BG.boardCx * s, oy = L.cy - BG.boardCy * s;
    ox = Math.min(0, Math.max(W - BG.w * s, ox));
    oy = Math.min(0, Math.max(H - BG.h * s, oy));
    L.bg = { s, ox, oy };

    // Napkin: use the one painted on the counter when it's on screen, otherwise a sprite.
    const n = BG.napkin;
    const nx = ox + n.x * s, ny = oy + n.y * s, nw = n.w * s, nh = n.h * s;
    if (nx >= 2 && nx + nw <= W - 2 && ny >= top && ny + nh <= H - 2 && nw >= 56) {
      L.napkin = { x: nx, y: ny, w: nw, h: nh, painted: true };
    } else {
      const w = Math.max(62, Math.min(104, W * 0.19)), h = w * (324 / 206);
      L.napkin = { x: 12, y: H - h - 14, w, h, painted: false };
    }

    // Arm: cuff pinned to the bottom-right corner.
    L.armScale = (L.D * 0.46) / Math.hypot(ARM.hand.wrist[0] - ARM.hand.tip[0], ARM.hand.wrist[1] - ARM.hand.tip[1]);
    const as = L.armScale * 1.05;
    L.cuff = { s: as, x: W + 18 * as - ARM.cuff.end[0] * as, y: H + 10 * as - ARM.cuff.end[1] * as };
    L.cuffOpen = { x: L.cuff.x + ARM.cuff.opening[0] * as, y: L.cuff.y + ARM.cuff.opening[1] * as };
    L.rest = { x: W - Math.min(W * 0.2, 120), y: L.cy + L.D * 0.05 };

    if (cur) cur.pts = screenPath(cur);
  }

  // ---------- Game state ----------
  let state = 'title';      // title | intro | play | over
  let phase = 'idle';       // idle | slideIn | trace | shucked | slideOut
  let paused = false;
  let hurt = null;          // { phase: 'ouch'|'napkin', t, taps }
  let G = null;             // run data
  let cur = null;           // current oyster
  let lastShape = null;
  let T = 0;                // seconds since load
  const pointer = { x: 0, y: 0, down: false, id: null, tracing: false, lastX: 0, lastY: 0, hover: false, type: 'touch' };
  const fx = { lid: null, stamp: null, popups: [], drops: [], splash: [], shake: 0, ouch: null, wipe: 0 };
  let armTip = { x: 0, y: 0 };

  function newGame() {
    G = { order: 0, score: 0, shuckedTotal: 0, bandages: [], oystersSinceStart: 0, orderStats: null };
    fx.lid = null; fx.stamp = null; fx.popups = []; fx.drops = []; fx.splash = []; hurt = null;
    startOrderIntro();
  }

  function parFor(order) { return Math.max(C.minParTime, C.parTime * Math.pow(C.parShrink, order - 1)); }

  function startOrderIntro() {
    G.order += 1;
    G.need = G.order * C.oystersPerDozen;
    G.done = 0;
    G.par = parFor(G.order);
    G.clockMax = G.need * G.par * C.orderTimeFactor + C.orderTimeBonus;
    G.clock = G.clockMax;
    G.orderAccSum = 0;
    const dz = G.order === 1 ? 'A dozen' : `${G.order} dozen`;
    els.introTitle.textContent = `Order #${G.order}`;
    els.introSub.textContent = `${dz} on the half shell`;
    let stats = `${G.need} oysters, ${Math.round(G.clockMax)} seconds on the clock.`;
    if (G.orderStats) stats = `${G.orderStats} Next up: ` + stats;
    els.introStats.textContent = stats;
    state = 'intro'; phase = 'idle'; cur = null;
    showScreen('intro');
    updateHud();
  }

  function beginOrder() {
    state = 'play';
    showScreen(null);
    nextOyster();
  }

  function pickShape() {
    let s; do { s = SHAPE_NAMES[(Math.random() * SHAPE_NAMES.length) | 0]; } while (SHAPE_NAMES.length > 1 && s === lastShape);
    lastShape = s; return s;
  }

  function nextOyster() {
    const shape = pickShape();
    cur = {
      shape, flip: Math.random() < 0.5, x: W + L.D, t0: T, startT: 0,
      covered: new Uint8Array(SHAPES[shape].length), nCovered: 0,
      errSum: 0, n: 0, off: 0, trail: [], slipRolled: false,
      cutAt: null,
    };
    cur.pts = screenPath(cur);
    const canCut = G.oystersSinceStart >= C.safeOysters;
    if (canCut && Math.random() < C.randomCutChance) cur.cutAt = 0.3 + Math.random() * 0.5;
    phase = 'slideIn';
    pointer.tracing = false;
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
      if (!pointer.tracing || phase !== 'trace' || hurt) break;
      sample(pointer.lastX + (dx * i) / steps, pointer.lastY + (dy * i) / steps);
    }
    pointer.lastX = x; pointer.lastY = y;
  }

  function sample(x, y) {
    const o = cur, tol = L.tol, tol2 = tol * tol;
    const d = distToPath(o.pts, x, y);
    o.errSum += Math.min(d, tol * 4); o.n++;
    if (d > tol * 2) o.off++;
    for (let i = 0; i < o.pts.length; i++) {
      if (o.covered[i]) continue;
      const p = o.pts[i], ex = p.x - x, ey = p.y - y;
      if (ex * ex + ey * ey <= tol2) { o.covered[i] = 1; o.nCovered++; }
    }
    o.trail.push({ x, y, t: T });
    if (o.trail.length > 60) o.trail.shift();

    const progress = o.nCovered / o.pts.length;
    const canCut = G.oystersSinceStart >= C.safeOysters;
    if (canCut && !o.slipRolled && d > tol * C.slipDistance) {
      o.slipRolled = true;
      if (Math.random() < C.slipCutChance) { cutHand(); return; }
    }
    if (o.cutAt !== null && progress >= o.cutAt) { o.cutAt = null; cutHand(); return; }
    if (progress >= C.coverageToFinish) finishOyster();
  }

  function accuracyOf(o) {
    if (!o.n) return 0;
    const mean = o.errSum / o.n / L.tol;            // in tolerances
    let a = 1 - (mean - 0.18) / 1.1;
    a *= 1 - 0.55 * (o.off / o.n);
    return Math.max(0, Math.min(1, a));
  }

  function finishOyster() {
    const o = cur;
    pointer.tracing = false;
    const acc = accuracyOf(o);
    const secs = Math.max(0.3, T - o.startT);
    const speed = Math.max(C.speedMultMin, Math.min(C.speedMultMax, G.par / secs));
    const pts = Math.round((C.basePoints + acc * C.accuracyPoints) * speed);
    G.score += pts; G.done += 1; G.shuckedTotal += 1; G.oystersSinceStart += 1; G.orderAccSum += acc;
    let rank = C.grades.findIndex((g) => acc >= g.minAccuracy); if (rank < 0) rank = C.grades.length - 1;
    const grade = C.grades[rank];

    fx.lid = { x: o.x, y: L.cy, vx: (Math.random() < 0.5 ? -1 : 1) * (L.D * (1.2 + Math.random())), vy: -L.D * 4.2,
               rot: 0, vr: (Math.random() < 0.5 ? -1 : 1) * (6 + Math.random() * 6), shape: o.shape, flip: o.flip, t: 0 };
    fx.stamp = { text: grade.name, color: grade.color, t: 0, rank };
    fx.popups.push({ text: `+${pts}`, sub: speed >= 1.15 ? `×${speed.toFixed(1)} speedy` : speed < 0.85 ? `×${speed.toFixed(1)} slow` : '', x: L.cx, y: L.cy + L.D * 0.42, t: 0 });
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2, v = L.D * (0.8 + Math.random() * 1.6);
      fx.splash.push({ x: L.cx, y: L.cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - L.D, r: 2 + Math.random() * 5, t: 0 });
    }
    if (!reduceMotion) fx.shake = 0.12;
    SFX.pop(); setTimeout(() => SFX.grade(rank), 120);
    phase = 'shucked'; o.t0 = T;
    updateHud();
  }

  // ---------- Oops ----------
  function cutHand() {
    pointer.tracing = false;
    hurt = { phase: 'ouch', t: 0, taps: 0 };
    fx.ouch = { x: armTip.x, y: armTip.y, t: 0 };
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, v = L.D * (0.6 + Math.random());
      fx.drops.push({ x: armTip.x, y: armTip.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 3 + Math.random() * 4, t: 0 });
    }
    if (!reduceMotion) fx.shake = 0.35;
    SFX.ouch();
    if (navigator.vibrate) { try { navigator.vibrate(120); } catch (e) { /* ignore */ } }
  }

  function tapNapkin() {
    if (!hurt) return;
    hurt.phase = 'napkin';
    hurt.taps += 1; fx.wipe = 0.25; SFX.wipe();
    if (hurt.taps >= C.napkinTaps) {
      G.bandages.push({ dx: (Math.random() - 0.5) * 40, dy: (Math.random() - 0.5) * 30, rot: -0.6 + Math.random() * 1.2 });
      hurt = null; fx.drops = []; SFX.bandage();
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
    if (hurt) { if (inNapkin(p.x, p.y)) tapNapkin(); return; }
    if (phase === 'trace') {
      pointer.tracing = true; pointer.lastX = p.x; pointer.lastY = p.y;
      if (!cur.startT) cur.startT = T;
      sample(p.x, p.y);
    }
    e.preventDefault();
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = localPos(e);
    if (e.pointerType === 'mouse') pointer.hover = true;
    if (pointer.id !== null && pointer.id !== e.pointerId) return;
    pointer.x = p.x; pointer.y = p.y; pointer.type = e.pointerType;
    if (pointer.tracing && state === 'play' && !paused) {
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      for (const ce of evs) { const q = localPos(ce); traceTo(q.x, q.y); }
    }
  });
  function endPointer(e) {
    if (pointer.id !== e.pointerId) return;
    pointer.id = null; pointer.down = false; pointer.tracing = false;
  }
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') pointer.hover = false; });

  // ---------- Screens ----------
  function showScreen(which) {
    els.title.hidden = which !== 'title';
    els.intro.hidden = which !== 'intro';
    els.over.hidden = which !== 'over';
    els.pause.hidden = which !== 'pause';
    const focusBtn = { title: 'btnStart', intro: 'btnGo', over: 'btnAgain', pause: 'btnResume' }[which];
    if (focusBtn) setTimeout(() => { const b = $(focusBtn); if (b) b.focus({ preventScroll: true }); }, 30);
  }

  function gameOver() {
    state = 'over'; phase = 'idle'; hurt = null; SFX.late();
    const best = Math.max(getBest(), G.score); setBest(best);
    els.overTitle.textContent = 'Order late!';
    els.overScore.textContent = G.score.toLocaleString();
    els.overBest.textContent = best.toLocaleString();
    const left = G.need - G.done;
    els.overDetail.textContent = `${G.shuckedTotal} ${G.shuckedTotal === 1 ? 'oyster' : 'oysters'} shucked. Order #${G.order} came up ${left} short.`;
    showScreen('over');
  }

  function setPaused(p) {
    if (state !== 'play') return;
    paused = p; pointer.tracing = false;
    showScreen(p ? 'pause' : null);
  }

  $('btnStart').addEventListener('click', () => { audio(); newGame(); });
  $('btnGo').addEventListener('click', () => { audio(); beginOrder(); });
  $('btnAgain').addEventListener('click', () => { audio(); newGame(); });
  $('btnResume').addEventListener('click', () => setPaused(false));
  $('btnQuit').addEventListener('click', () => { paused = false; state = 'title'; phase = 'idle'; cur = null; hurt = null; refreshTitle(); showScreen('title'); });
  els.btnPause.addEventListener('click', () => setPaused(!paused));
  els.btnMute.addEventListener('click', () => setMuted(!muted));
  document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'play' && !paused) setPaused(true); });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.key === 'p') setPaused(!paused);
    if (e.key === 'm') setMuted(!muted);
  });

  function refreshTitle() { const b = getBest(); els.titleBest.textContent = b ? `Best: ${b.toLocaleString()}` : ''; }

  function updateHud() {
    if (!G) { els.order.textContent = '—'; els.count.textContent = '0 / 12'; els.score.textContent = '0'; return; }
    els.order.textContent = `#${G.order} · ${G.order === 1 ? '1 dozen' : G.order + ' dozen'}`;
    els.count.textContent = `${G.done} / ${G.need}`;
    els.score.textContent = G.score.toLocaleString();
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
      G.clock -= dt;
      updateClock();
      if (G.clock <= 0) { gameOver(); return; }

      if (phase === 'slideIn') {
        const k = Math.min(1, (T - cur.t0) / C.slideInTime);
        cur.x = W + L.D * 0.6 + (L.cx - (W + L.D * 0.6)) * easeOutBack(k);
        if (k >= 1) { cur.x = L.cx; phase = 'trace'; cur.startT = 0; }
      } else if (phase === 'shucked') {
        if (T - cur.t0 >= C.shuckedHold) { phase = 'slideOut'; cur.t0 = T; SFX.slide(); }
      } else if (phase === 'slideOut') {
        const k = Math.min(1, (T - cur.t0) / C.slideOutTime);
        cur.x = L.cx + (-L.D * 0.7 - L.cx) * easeIn(k);
        if (k >= 1) {
          if (G.done >= G.need) {
            const avg = G.orderAccSum / G.need;
            let rank = C.grades.findIndex((g) => avg >= g.minAccuracy); if (rank < 0) rank = C.grades.length - 1;
            const spare = Math.max(0, Math.round(G.clock)), bonus = spare * 10;
            const gname = C.grades[rank].name.replace(/!$/, '').toLowerCase();
            G.orderStats = `${gname.charAt(0).toUpperCase() + gname.slice(1)} work with ${spare}s to spare, +${bonus.toLocaleString()} bonus.`;
            G.score += bonus;
            SFX.orderUp();
            startOrderIntro();
          } else nextOyster();
        }
      }
      if (hurt) hurt.t += dt;
    }

    // effects keep moving even between states
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

    // Arm target
    let tx, ty;
    const following = (pointer.down || (pointer.hover && pointer.type === 'mouse')) && !hurt && state === 'play' && !paused;
    if (following) { tx = pointer.x; ty = pointer.y; }
    else if (hurt) { tx = L.rest.x + Math.sin(T * 40) * 6; ty = L.rest.y + L.D * 0.2 + Math.cos(T * 33) * 4; }
    else { tx = L.rest.x + Math.sin(T * 1.6) * 8; ty = L.rest.y + Math.sin(T * 2.3) * 10; }
    const k = following ? 1 - Math.pow(0.0005, dt) : 1 - Math.pow(0.02, dt);
    armTip.x += (tx - armTip.x) * k; armTip.y += (ty - armTip.y) * k;
    if (following && pointer.tracing) { armTip.x = tx; armTip.y = ty; }
  }

  // ---------- Draw ----------
  function drawOysterImg(key, x, y, flip, rot = 0, scale = 1, alpha = 1) {
    const im = IMG[key]; if (!im) return;
    const D = L.D * scale;
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.rotate(rot); if (flip) ctx.scale(-1, 1);
    ctx.drawImage(im, -D / 2, -D / 2, D, D); ctx.restore();
  }

  // Shell-shaped drop shadows, made once from each sprite.
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

  function drawGuide(o) {
    const pts = o.pts, n = pts.length, dx = o.x - L.cx;
    ctx.save(); ctx.translate(dx, 0); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // dashed guide
    ctx.setLineDash([L.D * 0.025, L.D * 0.03]); ctx.lineDashOffset = -T * 40;
    ctx.strokeStyle = 'rgba(255,250,235,0.85)'; ctx.lineWidth = Math.max(2.5, L.D * 0.009);
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); ctx.stroke();
    ctx.setLineDash([]);
    // covered = cut line
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
    // a glowing dot that runs the outline until the player starts
    if (o.n > 0 || G.shuckedTotal > 1) return;
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
    const size = L.D * 0.18;
    ctx.save(); ctx.globalAlpha = Math.max(0, alpha);
    ctx.translate(L.cx, L.cy - L.D * 0.05); ctx.scale(sc, sc);
    if (s.rank <= 1) { // burst rays for the top grades
      ctx.save(); ctx.rotate(T * 1.5); ctx.fillStyle = 'rgba(255,230,120,0.35)';
      for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(L.D * 0.08, -L.D * 0.7); ctx.lineTo(-L.D * 0.08, -L.D * 0.7); ctx.fill(); }
      ctx.restore();
    }
    label(s.text, 0, 0, size, s.color, -0.08, W * 0.94);
    ctx.restore();
  }

  function drawPopups() {
    fx.popups.forEach((p) => {
      const a = p.t > 0.7 ? 1 - (p.t - 0.7) / 0.4 : 1, y = p.y - p.t * L.D * 0.25;
      ctx.save(); ctx.globalAlpha = Math.max(0, a);
      label(p.text, p.x, y, p.big ? L.D * 0.12 : L.D * 0.1, p.big ? '#8df27a' : '#fff3d6');
      if (p.sub) label(p.sub, p.x, y + L.D * 0.09, L.D * 0.055, '#ffd23f');
      ctx.restore();
    });
  }

  function drawArm() {
    const hand = IMG.hand, cuff = IMG.cuff; if (!hand || !cuff) return;
    const s = L.armScale, Cs = L.cuffOpen;
    const tip = armTip;
    const v0x = ARM.hand.tip[0] - ARM.hand.wrist[0], v0y = ARM.hand.tip[1] - ARM.hand.wrist[1];
    const ang0 = Math.atan2(v0y, v0x);
    let ang1 = Math.atan2(tip.y - Cs.y, tip.x - Cs.x);
    const rot = ang1 - ang0;
    const cr = Math.cos(rot), sr = Math.sin(rot);
    const wx = (ARM.hand.wrist[0] - ARM.hand.tip[0]) * s, wy = (ARM.hand.wrist[1] - ARM.hand.tip[1]) * s;
    const Ws = { x: tip.x + wx * cr - wy * sr, y: tip.y + wx * sr + wy * cr };

    // rubber-hose forearm
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

    // cuff
    ctx.drawImage(cuff, L.cuff.x, L.cuff.y, cuff.width * L.cuff.s, cuff.height * L.cuff.s);

    // hand + knife, tip pinned to the finger
    ctx.save(); ctx.translate(tip.x, tip.y); ctx.rotate(rot); ctx.scale(s, s);
    ctx.drawImage(hand, -ARM.hand.tip[0], -ARM.hand.tip[1]);
    // bandages
    const gx = ARM.hand.glove[0] - ARM.hand.tip[0], gy = ARM.hand.glove[1] - ARM.hand.tip[1];
    G && G.bandages.forEach((b) => drawBandage(gx + b.dx, gy + b.dy, b.rot));
    if (hurt) { // cartoon boo-boo
      ctx.fillStyle = '#e8322a'; ctx.strokeStyle = '#2a1408'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(gx - 10, gy - 6, 16, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
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
    const glow = hurt ? 0.5 + 0.5 * Math.sin(T * 9) : 0;
    ctx.save();
    if (fx.wipe > 0) { ctx.translate(n.x + n.w / 2, n.y + n.h / 2); ctx.rotate(Math.sin(fx.wipe * 60) * 0.12); ctx.translate(-(n.x + n.w / 2), -(n.y + n.h / 2)); }
    if (hurt) {
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
    if (hurt) {
      const left = C.napkinTaps - hurt.taps;
      label(`TAP ×${left}`, n.x + n.w / 2, n.y - 22, Math.max(20, L.D * 0.07), '#ffd23f', 0, W * 0.4);
    }
  }

  function drawHurt() {
    fx.drops.forEach((d) => {
      ctx.save(); ctx.fillStyle = '#e8322a'; ctx.strokeStyle = '#2a1408'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
    });
    if (fx.ouch) {
      const o = fx.ouch, k = Math.min(1, o.t / 0.15), sc = 0.4 + k * 0.7 + Math.sin(o.t * 30) * 0.03 * (1 - k);
      ctx.save(); ctx.translate(Math.min(W * 0.62, Math.max(W * 0.38, o.x)), Math.max(L.top + L.D * 0.18, o.y - L.D * 0.18)); ctx.scale(sc, sc);
      // starburst
      ctx.fillStyle = '#fff3d6'; ctx.strokeStyle = '#2a1408'; ctx.lineWidth = 5;
      ctx.beginPath();
      for (let i = 0; i < 24; i++) { const r = i % 2 ? L.D * 0.2 : L.D * 0.33, a = (i / 24) * Math.PI * 2; ctx.lineTo(Math.cos(a) * r * 1.25, Math.sin(a) * r * 0.8); }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
      ctx.save(); ctx.translate(Math.min(W * 0.62, Math.max(W * 0.38, o.x)), Math.max(L.top + L.D * 0.18, o.y - L.D * 0.18)); ctx.scale(sc, sc);
      label('OUCH!', 0, 0, L.D * 0.16, '#e8322a', -0.1);
      ctx.restore();
    }
    if (hurt && hurt.t > 0.7) {
      label('Grab the napkin!', L.cx, L.cy - L.D * 0.58, L.D * 0.08, '#fff3d6');
    }
  }

  function draw() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    if (fx.shake > 0) ctx.translate((Math.random() - 0.5) * 14 * fx.shake * 3, (Math.random() - 0.5) * 14 * fx.shake * 3);

    if (IMG.counter) ctx.drawImage(IMG.counter, L.bg.ox, L.bg.oy, BG.w * L.bg.s, BG.h * L.bg.s);
    else { ctx.fillStyle = '#7b8a96'; ctx.fillRect(0, 0, W, H); }

    drawNapkin();

    if (state === 'play' && cur) {
      drawShadow(cur, cur.x, L.cy);
      if (phase === 'slideIn' || phase === 'trace') {
        drawOysterImg(cur.shape + '_top', cur.x, L.cy, cur.flip);
        if (phase === 'trace') { drawGuide(cur); drawTrail(cur); drawHint(cur); }
      } else {
        drawOysterImg(cur.shape + '_bottom', cur.x, L.cy, cur.flip);
      }
    }
    fx.splash.forEach((s) => {
      ctx.save(); ctx.globalAlpha = 1 - s.t / 0.8; ctx.fillStyle = '#d8eef6'; ctx.strokeStyle = 'rgba(40,70,90,0.6)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
    });
    if (fx.lid) drawOysterImg(fx.lid.shape + '_top', fx.lid.x, fx.lid.y, fx.lid.flip, fx.lid.rot, 1 + fx.lid.t * 0.5);

    drawArm();
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
  window.__shuck = { get oyster() { return cur && { shape: cur.shape, flip: cur.flip, pts: cur.pts, phase }; }, get run() { return G; } };

  window.addEventListener('resize', layout);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', layout);

  const fontReady = (document.fonts && document.fonts.load) ? document.fonts.load('40px "Lilita One"').catch(() => {}) : Promise.resolve();
  Promise.all([...assetJobs, fontReady]).then(() => {
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
