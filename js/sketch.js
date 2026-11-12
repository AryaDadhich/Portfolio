// sketch.js — a tiny hand-drawn line helper (no dependencies).
// Generates SVG path data with a slight, seeded wobble, and decorates DOM
// elements that carry a data-sketch attribute.

export function rng(seed) {
  let a = (seed >>> 0) || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const f = n => Math.round(n * 10) / 10;

/** A single slightly bowed stroke from (x1,y1) to (x2,y2). */
export function line(x1, y1, x2, y2, { seed = 1, wobble = 1 } = {}) {
  const r = rng(seed), j = () => (r() - 0.5) * 2;
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len, amp = Math.min(len * 0.012, 2.2) * wobble, e = Math.min(1, amp * 0.5);
  const a = j() * amp, b = j() * amp;
  return `M${f(x1 + j() * e)} ${f(y1 + j() * e)}C${f(x1 + dx / 3 + nx * a)} ${f(y1 + dy / 3 + ny * a)} ${f(x1 + dx * 2 / 3 + nx * b)} ${f(y1 + dy * 2 / 3 + ny * b)} ${f(x2 + j() * e)} ${f(y2 + j() * e)}`;
}

/** Smooth open curve through points (Catmull-Rom → cubic Bézier). */
export function curve(pts, closed = false) {
  const n = pts.length, P = i => closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return closed ? d + 'Z' : d;
}

/** Sketchy rectangle: { stroke, fill } path data. */
export function rect(x, y, w, h, { seed = 1, wobble = 1 } = {}) {
  const o = 1.5, s = seed * 7;
  const stroke =
    line(x - o, y, x + w + o, y, { seed: s + 1, wobble }) +
    line(x + w, y - o, x + w, y + h + o, { seed: s + 2, wobble }) +
    line(x + w + o, y + h, x - o, y + h, { seed: s + 3, wobble }) +
    line(x, y + h + o, x, y - o, { seed: s + 4, wobble });
  const fill = `M${f(x)} ${f(y)}L${f(x + w)} ${f(y)}L${f(x + w)} ${f(y + h)}L${f(x)} ${f(y + h)}Z`;
  return { stroke, fill };
}

/** Sketchy circle/ellipse: { stroke, fill }. The stroke slightly overshoots its start, like a pen. */
export function circle(cx, cy, rx, ry = rx, { seed = 1, wobble = 1 } = {}) {
  const r = rng(seed * 13 + 5), n = 9, a0 = r() * Math.PI * 2, pts = [];
  for (let i = 0; i < n; i++) {
    const a = a0 + (i / n) * Math.PI * 2, k = 1 + (r() - 0.5) * 0.045 * wobble;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  const fill = curve(pts, true);
  const over = [...pts, pts[0], [pts[1][0] + (r() - 0.5) * 2, pts[1][1] + (r() - 0.5) * 2]];
  return { stroke: curve(over), fill };
}

// ── small line icons (24×24) ────────────────────────────────────────────────
const ICONS = {
  nodes: 'M6 5a2 2 0 1 0 .01 0M18 4.5a2 2 0 1 0 .01 0M12 16a2 2 0 1 0 .01 0M7 8.8l4 7.4M13.2 16.3l3.9-8M8 6.9l8-.5',
  person: 'M12 4.5a3.3 3.3 0 1 0 .01 0M5 20c.6-4.4 3.2-6.4 7-6.4s6.4 2 7 6.400',
  trail: 'M4 20c5-.4 9-1.600 9-4.200 0-2.600-6-2-6-5 0-2.400 4.600-3 10-3.400M18.600 4.800a1.400 1.400 0 1 0 .01 0',
  mail: 'M4 7h16v11H4zM4.400 7.600 12 13.400l7.600-5.800',
  mountain: 'M2.500 19 9 7.500l3.600 6 2.200-3.200L21.500 19zM7.400 10.600l1.700 1.500 1.500-1.600',
  play: 'M4 6h16v12H4zM10 9.400v5.200l4.600-2.600z',
  curtain: 'M4 4h16M5 4c.4 6-.4 11-1 16M19 4c-.4 6 .4 11 1 16M5 4c1.400 4.600 3.600 7 7 8M19 4c-1.400 4.600-3.600 7-7 8',
  sprout: 'M12 20v-9M12 13c-.6-3.400-2.800-5-6.400-5 .2 3.600 2.400 5.400 6.400 5zM12 11c.4-3 2.400-4.600 6-4.800 0 3.400-2 5-6 4.800z',
  book: 'M4 6c3-1 5.600-.8 8 1 2.400-1.800 5-2 8-1v12c-3-1-5.600-.8-8 1-2.400-1.800-5-2-8-1zM12 7v12',
  camera: 'M4 8h3.400l1.400-2h6.400l1.400 2H20v10H4zM12 10a3 3 0 1 0 .01 0',
  plus: 'M12 6v12M6 12h12',
  minus: 'M6 12h12',
  arrowLeft: 'M19 12H6M11 6.500 5.500 12l5.500 5.500',
  download: 'M12 4v11M7.500 11 12 15.500 16.500 11M5 19.500h14',
  external: 'M9 6H5.500v12.500H18V15M12 12l7-7M14 4.600h5.400V10',
};
export function icon(name, size = 22) {
  return `<svg class="ic" viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" focusable="false"><path d="${ICONS[name] || ICONS.plus}"/></svg>`;
}

// ── DOM decoration ──────────────────────────────────────────────────────────
// <el data-sketch="rect|circle|underline" data-fill="tintSky" data-seed="3">
const NS = 'http://www.w3.org/2000/svg';
const cssVar = name => `var(--${name.replace(/[A-Z]/g, m => '-' + m.toLowerCase())})`;
let autoSeed = 11;

function build(el) {
  const w = el.offsetWidth, h = el.offsetHeight;
  if (!w || !h) return;
  let svg = el.querySelector(':scope > svg.sk');
  if (!svg) {
    svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'sk');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = '<path class="sk-fill"/><path class="sk-line" pathLength="1"/>';
    el.prepend(svg);
    if (!el.dataset.seed) el.dataset.seed = autoSeed++;
  }
  const seed = +el.dataset.seed + (el._skJitter || 0), kind = el.dataset.sketch;
  let p;
  if (kind === 'circle') p = circle(w / 2, h / 2, w / 2 - 1.5, h / 2 - 1.5, { seed });
  else if (kind === 'underline') p = { stroke: line(0, h - 1.500, w, h - 1.500, { seed, wobble: 1.4 }), fill: '' };
  else p = rect(1.5, 1.5, w - 3, h - 3, { seed });
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  const [fillEl, lineEl] = svg.children;
  fillEl.setAttribute('d', p.fill);
  fillEl.style.fill = el.dataset.fill ? cssVar(el.dataset.fill) : 'none';
  lineEl.setAttribute('d', p.stroke);
}

const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(es => es.forEach(e => build(e.target))) : null;
const io = typeof IntersectionObserver !== 'undefined'
  ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('sk-in'); io.unobserve(e.target); } }), { threshold: 0.15 })
  : null;

/** Decorate every [data-sketch] element under root (safe to call repeatedly). */
export function decorate(root = document) {
  const noMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.querySelectorAll('[data-sketch]').forEach(el => {
    if (el._sk) return;
    el._sk = true;
    el.classList.add('sk-host');
    build(el);
    ro?.observe(el);
    if (io) io.observe(el); else el.classList.add('sk-in');
    // a small re-draw wobble on hover / focus for interactive things
    if (!noMotion && el.matches('a, button, [data-wobble]')) {
      const wob = () => {
        clearTimeout(el._skT);
        el._skJitter = 1; build(el);
        el._skT = setTimeout(() => { el._skJitter = 2; build(el); el._skT = setTimeout(() => { el._skJitter = 0; build(el); }, 110); }, 110);
      };
      el.addEventListener('pointerenter', wob);
      el.addEventListener('focus', wob);
    }
  });
}
