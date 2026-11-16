// experience.js — a winding hand-drawn trail of roles and education.
// The text is ordinary flowing HTML; the path and circles are measured from it
// and drawn behind. The line draws itself in as the page scrolls.
import { content as C, initPage, txt, esc, tags, decorate, icon, reduced } from './common.js';

initPage('experience');
const $ = s => document.querySelector(s);
const trail = $('#trail'), list = $('#stops');
const cvBtn = `<a class="btn" href="${esc(C.person.cv)}" download data-sketch="rect" data-fill="tintSky">${icon('download', 18)} Download CV (PDF)</a>`;
$('#cv-top').innerHTML = cvBtn; $('#cv-bottom').innerHTML = cvBtn;

list.innerHTML = C.timeline.map((s, i) => `
  <li class="stop" id="stop-${i}">
    <span class="kind">${txt(s.kind)}</span>
    <h2>${txt(s.title)}</h2>
    <p class="org">${txt(s.org)}</p>
    <p class="when">${txt(s.when)}${s.where ? ' · ' + txt(s.where) : ''}</p>
    <ul class="pts">${s.points.map(p => `<li>${txt(p)}</li>`).join('')}</ul>
    ${tags(s.tags)}
  </li>`).join('');

// Achievements, Leadership, Volunteering, Certifications…: one card each, each in its own tint
const CARD_TINTS = ['tintSand', 'tintSky', 'tintMeadow', 'paperDeep'];
$('#extras').innerHTML = C.extras.map((g, n) => `
  <div class="xcard" data-sketch="rect" data-fill="${esc(g.tint || CARD_TINTS[n % CARD_TINTS.length])}" data-seed="${70 + n * 4}">
    <h3>${esc(g.heading)}</h3>${g.items.map(i => `
    <div class="it"><strong>${txt(i.title)}</strong><span class="small muted">${txt(i.meta)}</span>${i.text ? `<p>${txt(i.text)}</p>` : ''}</div>`).join('')}
  </div>`).join('');
decorate();

// ── draw the trail ──────────────────────────────────────────────────────────
const NS = 'http://www.w3.org/2000/svg';
const svg = document.createElementNS(NS, 'svg');
svg.setAttribute('aria-hidden', 'true');
trail.prepend(svg);
let pathEl = null, len = 0, H = 0, drawn = 0;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const kebab = k => k.replace(/[A-Z]/g, m => '-' + m.toLowerCase());

function build() {
  const W = trail.clientWidth; H = trail.clientHeight;
  if (!W || !H) return;
  const mobile = matchMedia('(max-width: 700px)').matches;
  const stops = [...list.children].map(li => ({ top: li.offsetTop + list.offsetTop, h: li.offsetHeight }));
  let d = '', circles = '';
  const circle = (x, y, r, i) => `<circle class="t-circ" cx="${x}" cy="${y}" r="${r}" fill="var(--${kebab(C.timeline[i].tint || 'tintSky')})"/><text x="${x}" y="${y}" ${r < 30 ? 'style="font-size:20px"' : ''}>${String(i + 1).padStart(2, '0')}</text>`;
  if (mobile) {
    d = `M28 6V${H - 10}`;
    stops.forEach((s, i) => { circles += circle(28, s.top + 44, 20, i); });
  } else {
    const g = 16;
    stops.forEach((s, i) => {
      const left = i % 2 === 0, cx = W * (left ? 0.2 : 0.8), R = clamp(Math.min(s.h / 2 - 26, W * 0.13), 44, 104);
      const xv = left ? cx - R - g : cx + R + g, rc = Math.min(s.h / 2, R + g), dir = left ? 1 : -1, sw = left ? 0 : 1, y0 = s.top, y1 = s.top + s.h;
      d += i === 0
        ? `M${xv} ${y0 - 40}V${y1 - rc}A${rc} ${rc} 0 0 ${sw} ${xv + dir * rc} ${y1}`
        : `H${xv + dir * rc}A${rc} ${rc} 0 0 ${sw} ${xv} ${y0 + rc}V${y1 - rc}A${rc} ${rc} 0 0 ${sw} ${xv + dir * rc} ${y1}`;
      circles += circle(cx, s.top + s.h / 2, R, i);
    });
    const last = stops[stops.length - 1], lastLeft = (stops.length - 1) % 2 === 0, rc = 30, mid = W / 2;
    d += `H${mid + (lastLeft ? -rc : rc)}A${rc} ${rc} 0 0 ${lastLeft ? 1 : 0} ${mid} ${last.top + last.h + rc}V${H - 8}`;
  }
  svg.setAttribute('width', W); svg.setAttribute('height', H); svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  // a gentle displacement filter gives the geometric path its hand-drawn wobble
  svg.innerHTML = `
    <defs><filter id="wob" x="-5%" y="-2%" width="110%" height="104%">
      <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed="4" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="R" yChannelSelector="G"/>
    </filter></defs>
    <g filter="url(#wob)"><path class="t-line" pathLength="1" d="${d}"/>${circles}</g>`;
  pathEl = svg.querySelector('.t-line'); len = pathEl.getTotalLength();
  onScroll();
}
// y increases monotonically along the path, so a binary search finds the length at a given height
function lengthAtY(y) {
  let lo = 0, hi = len;
  for (let i = 0; i < 18; i++) { const mid = (lo + hi) / 2; if (pathEl.getPointAtLength(mid).y < y) lo = mid; else hi = mid; }
  return hi;
}
// the line is drawn as far as the reader has scrolled (it never un-draws); CSS eases each step
function onScroll() {
  if (!pathEl) return;
  const y = clamp(innerHeight * 0.7 - trail.getBoundingClientRect().top, 0, H);
  drawn = reduced.matches ? 1 : Math.max(drawn, Math.min(1, lengthAtY(y) / len + 0.02));
  pathEl.style.strokeDashoffset = 1 - drawn;
}
let ticking = false;
addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; onScroll(); }); } }, { passive: true });

build();
new ResizeObserver(build).observe(trail);
document.fonts?.ready.then(build);
// deep links from the home trail markers (#stop-0, #stop-1, …)
if (/^#stop-\d+$/.test(location.hash)) document.querySelector(location.hash)?.scrollIntoView({ behavior: 'instant', block: 'center' });
