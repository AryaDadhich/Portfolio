// home.js — "From one dot to me": one full-screen scene, zoomed through 5 stages.
// The drawing is a pure function of a single number `t` (0…4) that springs
// towards the target stage, so input can interrupt it at any time.
import { content as C, initPage, reduced, esc, icon, decorate, tint } from './common.js';
import { rng } from './sketch.js';

const companion = initPage('index');
const P = C.person;
const $ = s => document.querySelector(s);
const scene = $('#scene'), canvas = $('#stage'), ctx = canvas.getContext('2d');
const finale = $('#finale'), hint = $('#hint'), caption = $('#caption'), skip = $('#skip'), sr = $('#sr');
const LAST = 4;
const NAMES = ['One dot', 'Data points', 'Neural network', 'Mountain trail', P.name];

// ── DOM for the final stage and the controls ────────────────────────────────
finale.innerHTML = `
  <div class="f-col">
    <div class="portrait sk-top" data-sketch="circle" data-seed="4">
      <img src="${esc(P.photo)}" alt="Portrait of ${esc(P.name)} on a mountain trek" width="560" height="560">
      <span class="ring2 sk-top" data-sketch="circle" data-seed="9"></span>
    </div>
    <h1>${esc(P.name)}</h1>
    <p class="headline"><span class="vh">${esc(P.headline)}</span><span class="typed" aria-hidden="true"></span><span class="rest" aria-hidden="true">${esc(P.headline)}</span></p>
    <nav aria-label="Sections"><ul class="bullets">
      ${C.home.bullets.map((b, i) => `<li><a class="bullet" href="${esc(b.href)}" data-zoom="in" data-tint="${esc(b.tint)}">
        <span class="b-dot" data-sketch="circle" data-fill="${esc(b.tint)}" data-seed="${20 + i * 3}" data-wobble>${icon(b.icon, 24)}</span>
        <span class="b-label">${esc(b.label)}</span></a></li>`).join('')}
    </ul></nav>
  </div>`;
hint.firstElementChild.textContent = C.home.hint;
$('#zout').insertAdjacentHTML('beforeend', icon('minus', 20));
$('#zin').insertAdjacentHTML('beforeend', icon('plus', 20));
const stagesEl = $('#stages');
stagesEl.innerHTML = NAMES.map((n, i) => `<li><button type="button" data-stage="${i}" aria-label="Stage ${i + 1} of ${LAST + 1}: ${esc(n)}"></button></li>`).join('');
decorate();
const typed = finale.querySelector('.typed'), rest = finale.querySelector('.rest');

// ── scene data (virtual units, origin at the centre) ────────────────────────
const N = 20;
const r0 = rng(7), OFF = Array.from({ length: 256 }, () => r0() * 2 - 1), O = i => OFF[i & 255];
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const ease = x => x * x * (3 - 2 * x);
const lerp = (a, b, k) => a + (b - a) * k;

// 2 · scattered data points (loose upward trend, like a scatter plot)
const rs = rng(21);
const P1 = Array.from({ length: N }, (_, i) => {
  const x = -340 + (680 * (i + 0.5)) / N + (rs() - 0.5) * 40;
  return [x, clamp(-x * 0.42 + (rs() - 0.5) * 230, -230, 205)];
});
// 3 · neural network
const LAYERS = [3, 5, 5, 4, 3], P2 = [], LAYER_OF = [], EDGES = [];
{
  let idx = 0; const starts = [];
  LAYERS.forEach((n, l) => {
    starts.push(idx);
    const chunk = P1.slice(idx, idx + n).sort((a, b) => a[1] - b[1]);
    chunk.forEach((p, k) => { P1[idx + k] = p; });
    for (let k = 0; k < n; k++) { P2.push([-340 + l * 170, (k - (n - 1) / 2) * 86]); LAYER_OF.push(l); }
    idx += n;
  });
  for (let l = 0; l < LAYERS.length - 1; l++)
    for (let a = 0; a < LAYERS[l]; a++) for (let b = 0; b < LAYERS[l + 1]; b++) EDGES.push({ a: starts[l] + a, b: starts[l + 1] + b, l });
}
// 4 · mountain trail
const SUMMIT = [150, -270];
const P3 = Array.from({ length: N }, (_, i) => {
  const s = i / (N - 1);
  return [lerp(-120, SUMMIT[0], s) + 150 * Math.pow(1 - s, 1.2) * Math.sin(s * Math.PI * 5), lerp(300, SUMMIT[1], s)];
});
const MAIN = [[-560, 330], [-330, 60], [-250, 120], [-90, -90], [-30, -40], SUMMIT, [250, -120], [310, -170], [470, 90], [560, 330]];
const FAR = [[-640, 330], [-480, 0], [-400, 90], [-340, 40], [-200, 210], [200, 210], [360, -10], [430, -70], [520, 60], [640, 330]];
const SNOW = [[92, -196], [118, -214], [146, -190], [176, -216], [206, -186]];

// ── canvas ──────────────────────────────────────────────────────────────────
let w = 0, h = 0, ux = 1, uy = 1, u = 1, cx = 0, cy = 0, col = {};
const X = x => cx + x * ux, Y = y => cy + y * uy;
function resize() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  w = scene.clientWidth; h = scene.clientHeight;
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ux = (Math.min(w, 1150) / 1000) * 0.92; uy = (Math.min(h, 860) / 1000) * 0.92;
  u = Math.max(0.55, Math.min(ux, uy)); cx = w / 2; cy = h * 0.5;
  col = { ink: tint('ink'), paper: tint('paper'), sky: tint('tintSky'), meadow: tint('tintMeadow'), sand: tint('tintSand'), accent: tint('accent') };
  dirty = true;
}

// slightly bowed stroke; p < 1 draws only the first part of it
function wline(x1, y1, x2, y2, seed, p = 1) {
  const len = Math.hypot(x2 - x1, y2 - y1) || 1, amp = Math.min(len * 0.02, 3) * O(seed);
  const mx = (x1 + x2) / 2 - ((y2 - y1) / len) * amp, my = (y1 + y2) / 2 + ((x2 - x1) / len) * amp;
  ctx.moveTo(x1, y1);
  if (p >= 1) return ctx.quadraticCurveTo(mx, my, x2, y2);
  const ax = lerp(x1, mx, p), ay = lerp(y1, my, p), bx = lerp(mx, x2, p), by = lerp(my, y2, p);
  ctx.quadraticCurveTo(ax, ay, lerp(ax, bx, p), lerp(ay, by, p));
}
function wcircle(x, y, r, seed) {
  const n = 8, pts = [];
  for (let k = 0; k < n; k++) {
    const a = O(seed) * 3 + (k / n) * Math.PI * 2, rr = r * 1.06 * (1 + O(seed + k + 1) * 0.045);
    pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
  }
  ctx.moveTo((pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2);
  for (let k = 0; k < n; k++) { const a = pts[k], b = pts[(k + 1) % n]; ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); }
}
function wpoly(pts, seed, p = 1) {
  let total = 0; const L = [];
  for (let i = 0; i < pts.length - 1; i++) { const d = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); L.push(d); total += d; }
  let left = total * p;
  for (let i = 0; i < L.length && left > 0; i++) {
    wline(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], seed + i, Math.min(1, left / L[i]));
    left -= L[i];
  }
}
const scr = pts => pts.map(p => [X(p[0]), Y(p[1])]);
function fillPoly(pts) { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.fill(); }

function nodePos(i, t) {
  let a, b, k;
  if (t <= 1) { a = [0, 0]; b = P1[i]; k = ease(clamp((t - 0.45) / 0.55)); }
  else if (t <= 2) { a = P1[i]; b = P2[i]; k = ease(t - 1); }
  else { a = P2[i]; b = P3[i]; k = ease(clamp(t - 2)); }
  return [X(lerp(a[0], b[0], k)), Y(lerp(a[1], b[1], k))];
}

function trekker(x, y, now) {
  const k = Math.max(1, u * 1.35), still = reduced.matches;
  const bob = still ? 0 : Math.sin(now / 260) * 0.7 * k, sw = still ? 2.2 * k : Math.sin(now / 210) * 3 * k;
  ctx.beginPath();
  ctx.moveTo(x + 3.2 * k, y - 21 * k + bob); ctx.arc(x, y - 21 * k + bob, 3.2 * k, 0, Math.PI * 2);
  ctx.moveTo(x, y - 17.600 * k + bob); ctx.lineTo(x - 0.5 * k, y - 8 * k + bob);
  ctx.lineTo(x - 0.5 * k + sw, y); ctx.moveTo(x - 0.5 * k, y - 8 * k + bob); ctx.lineTo(x - 0.5 * k - sw, y);
  ctx.moveTo(x, y - 15 * k + bob); ctx.lineTo(x + 5 * k, y - 11 * k + bob); ctx.lineTo(x + 6.500 * k, y + 1);
  ctx.rect(x - 5.200 * k, y - 17 * k + bob, 3.600 * k, 6.500 * k);
  ctx.stroke();
}

function draw(now) {
  ctx.clearRect(0, 0, w, h);
  if (t >= 3.985) return;
  ctx.save();
  let alpha = 1, lw = 1;
  if (t > 3) {                                   // zoom into the summit
    const z = t - 3, k = 1 + Math.pow(z, 2.2) * 18, sx = X(SUMMIT[0]), sy = Y(SUMMIT[1]);
    alpha = 1 - ease(clamp((z - 0.3) / 0.5));
    ctx.translate(sx, sy); ctx.scale(k, k); ctx.translate(-sx, -sy); lw = 1 / Math.sqrt(k);
  }
  const A = a => { ctx.globalAlpha = clamp(alpha * a); };
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = col.ink;

  // 1 · the dot
  if (t < 0.75) {
    const pulse = reduced.matches ? 0 : Math.sin(now / 700) * 0.06 * (1 - clamp(t * 4));
    A(1 - clamp((t - 0.45) / 0.28));
    ctx.fillStyle = col.ink; ctx.beginPath(); wcircle(X(0), Y(0), (6 + 40 * ease(clamp(t / 0.45))) * u * (1 + pulse), 3); ctx.fill();
  }
  // 2 · axes behind the data points
  if (t > 0.55 && t < 1.7) {
    const p = clamp((t - 0.55) / 0.45);
    A(0.55 * (t < 1.15 ? 1 : 1 - clamp((t - 1.15) / 0.5))); ctx.lineWidth = 1.1 * lw; ctx.beginPath();
    wline(X(-400), Y(250), X(410), Y(250), 40, p); wline(X(-400), Y(250), X(-400), Y(-260), 41, p); ctx.stroke();
  }
  // 4 · mountains (drawn first so the trail sits on top)
  if (t > 2) {
    const m = ease(clamp(t - 2)), far = scr(FAR), main = scr(MAIN), snow = scr(SNOW), s = [X(SUMMIT[0]), Y(SUMMIT[1])];
    A(m * 0.9); ctx.fillStyle = col.sand; ctx.beginPath(); wcircle(X(-330), Y(-250), 44 * u, 60); ctx.fill();
    A(m * 0.7); ctx.lineWidth = 1.1 * lw; ctx.beginPath(); wcircle(X(-330), Y(-250), 44 * u, 60); ctx.stroke();
    A(m * 0.85); ctx.fillStyle = col.sky; fillPoly(far);
    A(0.5); ctx.beginPath(); wpoly(far, 70, clamp(m * 1.3)); ctx.stroke();
    A(m); ctx.fillStyle = col.meadow; fillPoly(main);
    ctx.fillStyle = col.paper; fillPoly([snow[0], s, snow[snow.length - 1], ...snow.slice(1, -1).reverse()]);
    A(1); ctx.lineWidth = 1.3 * lw; ctx.beginPath(); wpoly(main, 90, clamp((m - 0.08) * 1.3)); ctx.stroke();
    A(m * 0.8); ctx.lineWidth = 1 * lw; ctx.beginPath(); wpoly(snow, 110, clamp((m - 0.5) * 2)); ctx.stroke();
  }
  // 3 · network edges
  if (t > 1 && t < 2.5) {
    const v = ease(clamp(t - 1)), fade = t > 2 ? 1 - clamp((t - 2) / 0.45) : 1;
    A(0.36 * fade); ctx.lineWidth = 1 * lw; ctx.beginPath();
    EDGES.forEach((e, i) => {
      const p = clamp(v * 1.9 - e.l * 0.22);
      if (p <= 0) return;
      const a = nodePos(e.a, t), b = nodePos(e.b, t);
      wline(a[0], a[1], b[0], b[1], 120 + i, p);
    });
    ctx.stroke();
  }
  // nodes: data points → neurons → trail waypoints
  if (t > 0.45) {
    const pts = Array.from({ length: N }, (_, i) => nodePos(i, t));
    if (t > 2.4) {                               // dashed trail through the waypoints
      A(clamp((t - 2.4) / 0.5) * 0.8); ctx.lineWidth = 1.2 * lw; ctx.setLineDash([5 * lw, 5 * lw]);
      ctx.beginPath(); wpoly(pts, 200); ctx.stroke(); ctx.setLineDash([]);
    }
    const net = t <= 1 ? 0 : t <= 2 ? ease(t - 1) : 1 - ease(clamp(t - 2));
    const r = (t <= 1 ? lerp(3, 5, clamp((t - 0.45) / 0.55)) : lerp(t <= 2 ? 5 : 3.4, 10.500, net)) * u;
    const layerFill = [col.sand, col.meadow, col.sky, col.meadow, col.accent];
    pts.forEach((p, i) => {
      ctx.beginPath(); wcircle(p[0], p[1], r, 300 + i * 9);
      A(clamp((t - 0.45) * 5) * (1 - net)); ctx.fillStyle = col.ink; ctx.fill();
      if (net > 0.01) {
        A(net); ctx.fillStyle = col.paper; ctx.fill(); ctx.fillStyle = layerFill[LAYER_OF[i]]; ctx.fill();
        ctx.lineWidth = 1.2 * lw; ctx.stroke();
      }
    });
    // the trekker walks up the trail
    if (t > 2.4) {
      const s = t < 3 ? 0.8 * ease(clamp((t - 2.35) / 0.65)) : 0.8 + 0.2 * clamp((t - 3) / 0.45);
      const f = s * (N - 1), i = Math.min(N - 2, Math.floor(f)), k = f - i;
      A(clamp((t - 2.4) / 0.25)); ctx.lineWidth = 1.25 * lw;
      trekker(lerp(pts[i][0], pts[i + 1][0], k), lerp(pts[i][1], pts[i + 1][1], k), now);
    }
  }
  ctx.restore();
}

// ── state: t springs towards the target stage ───────────────────────────────
let t = 0, vel = 0, target = 0, dirty = true, fadeT = 0, typing = 0, typedDone = false, lastStage = -1;

function setStage(n, { instant = false } = {}) {
  n = clamp(Math.round(n), 0, LAST);
  if (n === target && !instant) return;
  target = n;
  if (instant) { t = n; vel = 0; dirty = true; }
  else if (reduced.matches) {                    // soft cross-fade instead of a zoom
    scene.classList.add('fading'); clearTimeout(fadeT);
    fadeT = setTimeout(() => { t = target; vel = 0; dirty = true; scene.classList.remove('fading'); }, 230);
  }
  ui();
}
const step = d => setStage(target + d);

function ui() {
  stagesEl.querySelectorAll('button').forEach((b, i) => (i === target ? b.setAttribute('aria-current', 'step') : b.removeAttribute('aria-current')));
  $('#zout').disabled = target === 0; $('#zin').disabled = target === LAST;
  skip.textContent = target === LAST ? 'replay intro' : 'skip intro';
  finale.inert = target !== LAST;
  hint.style.opacity = target === 0 ? 1 : 0;
  const cap = C.home.captions[target] || '';
  if (cap) caption.textContent = cap;
  caption.style.opacity = cap ? 1 : 0;
  if (target !== lastStage) {
    sr.textContent = `Stage ${target + 1} of ${LAST + 1}: ${NAMES[target]}`;
    if (lastStage !== -1) companion.hop();
    lastStage = target;
  }
  if (target === LAST) { try { sessionStorage.setItem('introSeen', '1'); } catch {} }
  // the companion sits beside the dot at the start, then follows the visitor
  if (target === 0) companion.park(() => ({ x: cx + 16 + 44 * u, y: cy + 30 }));
  else companion.release();
}

function typeHeadline() {
  if (typing || typedDone) return;
  const full = P.headline;
  if (reduced.matches) { typed.textContent = full; rest.textContent = ''; typedDone = true; return; }
  let i = 0;
  typing = setInterval(() => {
    i++; typed.textContent = full.slice(0, i); rest.textContent = full.slice(i);
    if (i >= full.length) { clearInterval(typing); typing = 0; typedDone = true; }
  }, 24);
}
function resetHeadline() {
  clearInterval(typing); typing = 0; typedDone = false; typed.textContent = ''; rest.textContent = P.headline;
}

function dom() {
  const p = ease(clamp((t - 3.45) / 0.55));
  finale.style.setProperty('--p', p.toFixed(3));
  finale.style.visibility = p > 0.001 ? 'visible' : 'hidden';
  const live = target === LAST && t > 3.75;
  finale.classList.toggle('live', live);
  if (live) typeHeadline(); else if (t < 3.3 && (typedDone || typing)) resetHeadline();
  document.querySelector('.wordmark').style.opacity = 1 - p;
}

let last = performance.now();
function tick(now) {
  let rem = Math.min(0.3, (now - last) / 1000); last = now;
  if (!reduced.matches && (t !== target || vel !== 0)) {
    // fixed sub-steps keep the spring stable and equally fast at any frame rate
    while (rem > 0) { const dt = Math.min(rem, 1 / 120); vel += ((target - t) * 38 - vel * 12.4) * dt; t += vel * dt; rem -= dt; }
    if (Math.abs(target - t) < 0.0008 && Math.abs(vel) < 0.01) { t = target; vel = 0; }
    dirty = true;
  }
  if (!reduced.matches && (t < 0.3 || (t > 2.4 && t < 3.7))) dirty = true;   // idle motion: dot pulse, trekker
  if (dirty) { dirty = false; draw(now); dom(); }
  requestAnimationFrame(tick);
}

// ── input: wheel, pinch, keys, swipe, buttons ───────────────────────────────
let acc = 0, accT = 0, lockUntil = 0;
addEventListener('wheel', e => {
  e.preventDefault();                            // the home scene never scrolls
  const now = performance.now();
  let d = e.deltaY || e.deltaX;
  if (e.deltaMode === 1) d *= 30;
  if (e.ctrlKey) d = -d * 6;                     // trackpad pinch: spreading fingers zooms in
  if (now < lockUntil) return;
  acc += d; clearTimeout(accT); accT = setTimeout(() => { acc = 0; }, 220);
  if (Math.abs(acc) >= 40) { step(acc > 0 ? 1 : -1); acc = 0; lockUntil = now + 520; }
}, { passive: false });
// Safari trackpad pinch
let gScale = 1;
addEventListener('gesturestart', e => { e.preventDefault(); gScale = 1; }, { passive: false });
addEventListener('gesturechange', e => {
  e.preventDefault();
  if (e.scale / gScale > 1.25) { step(1); gScale = e.scale; } else if (e.scale / gScale < 0.8) { step(-1); gScale = e.scale; }
}, { passive: false });

addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '')) return;
  const k = e.key;
  if (['ArrowDown', 'ArrowRight', 'PageDown', '+', '='].includes(k)) { step(1); e.preventDefault(); }
  else if (['ArrowUp', 'ArrowLeft', 'PageUp', '-', '_'].includes(k)) { step(-1); e.preventDefault(); }
  else if (k === 'Home') { setStage(0); e.preventDefault(); }
  else if (k === 'End') { setStage(LAST); e.preventDefault(); }
});

let ts = null, pinch = 0, gestureDone = false;
const dist = e => Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
addEventListener('touchstart', e => {
  if (e.touches.length === 1) { ts = { x: e.touches[0].clientX, y: e.touches[0].clientY }; gestureDone = false; }
  else if (e.touches.length === 2) { pinch = dist(e); ts = null; }
}, { passive: true });
addEventListener('touchmove', e => {
  if (e.touches.length === 2 && pinch && !gestureDone) {
    const r = dist(e) / pinch;
    if (r > 1.25) { step(1); gestureDone = true; } else if (r < 0.8) { step(-1); gestureDone = true; }
  }
}, { passive: true });
addEventListener('touchend', e => {
  if (ts && !gestureDone && e.changedTouches.length) {
    const dx = e.changedTouches[0].clientX - ts.x, dy = e.changedTouches[0].clientY - ts.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) > 42) step(Math.abs(dy) >= Math.abs(dx) ? (dy < 0 ? 1 : -1) : (dx < 0 ? 1 : -1));
  }
  ts = null; if (!e.touches.length) pinch = 0;
}, { passive: true });

$('#zin').addEventListener('click', () => step(1));
$('#zout').addEventListener('click', () => step(-1));
stagesEl.addEventListener('click', e => { const b = e.target.closest('button'); if (b) setStage(+b.dataset.stage); });
skip.addEventListener('click', () => setStage(target === LAST ? 0 : LAST));

// ── start ───────────────────────────────────────────────────────────────────
addEventListener('resize', resize);
resize();
let seen = false;
try { seen = sessionStorage.getItem('introSeen') === '1'; } catch {}
if (seen || location.hash === '#home') setStage(LAST, { instant: true });
ui(); dom();
document.fonts?.ready.then(() => { dirty = true; });
requestAnimationFrame(tick);

// for tests / debugging in the console
window.__home = { setStage, get stage() { return target; }, get t() { return t; } };
