// common.js — shared by every page: palette, header/footer, zoom page
// transitions, sketch decoration and the companion.
import C from '../content.js';
import { decorate, icon } from './sketch.js';
import { initCompanion } from './companion.js';

export const content = C;
export const reduced = matchMedia('(prefers-reduced-motion: reduce)');
export { decorate, icon };

// ── palette → CSS variables (content.js is the source of truth) ─────────────
const kebab = k => k.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
for (const [k, v] of Object.entries(C.palette || {})) document.documentElement.style.setProperty('--' + kebab(k), v);
export const tint = name => getComputedStyle(document.documentElement).getPropertyValue('--' + kebab(name)).trim() || '#eee';

// ── text helpers ────────────────────────────────────────────────────────────
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const isPlaceholder = s => /\[(ADD|OTHER|LINK)\b/i.test(s || '');
/** Escape text and outline any [ADD: …] placeholder inside it. */
export const txt = s => esc(s).replace(/\[(ADD|OTHER|LINK)[^\]]*\]/gi, m => `<span class="ph" title="Placeholder: edit content.js">${m}</span>`);
/** A link, or a visibly marked placeholder when the href is not filled in yet. */
export function link(label, href, cls = '', extra = '') {
  if (!href) return `<span class="${cls}">${txt(label)}</span>`;
  if (isPlaceholder(href)) return `<span class="${cls} ph" title="Placeholder: edit content.js">${esc(label)}: ${esc(href)}</span>`;
  const ext = /^https?:/.test(href) ? ' target="_blank" rel="noopener"' : '';
  return `<a class="${cls}" href="${esc(href)}"${ext} ${extra}>${txt(label)}</a>`;
}
export const tags = list => (list?.length ? `<ul class="tags" aria-label="Tech stack">${list.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : '');

// ── page transitions ────────────────────────────────────────────────────────
// Leaving: a soft tinted circle grows from the clicked control ("zoom in") or
// the page shrinks away ("zoom out"). Reduced motion: a plain cross-fade.
export function zoomTo(href, { x = innerWidth / 2, y = innerHeight / 2, color = 'var(--tint-sky)', dir = 'in' } = {}) {
  try { sessionStorage.setItem('pt', JSON.stringify({ dir, color })); } catch {}
  const leave = () => { location.href = href; };
  if (reduced.matches) { document.body.classList.add('leaving-fade'); return setTimeout(leave, 200); }
  if (dir === 'in') {
    const veil = document.createElement('div');
    veil.className = 'veil';
    const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 40;
    Object.assign(veil.style, { left: x - r + 'px', top: y - r + 'px', width: 2 * r + 'px', height: 2 * r + 'px', background: color });
    document.body.append(veil);
    document.body.classList.add('leaving-in');
    document.body.style.setProperty('--ox', x + 'px'); document.body.style.setProperty('--oy', y + 'px');
    requestAnimationFrame(() => requestAnimationFrame(() => veil.classList.add('grow')));
    setTimeout(leave, 520);
  } else {
    document.body.classList.add('leaving-out');
    setTimeout(leave, 380);
  }
}
function arrive() {
  let pt = null;
  try { pt = JSON.parse(sessionStorage.getItem('pt') || 'null'); sessionStorage.removeItem('pt'); } catch {}
  if (!pt) return;
  document.body.classList.add(pt.dir === 'in' ? 'arrive-in' : 'arrive-out');
  if (pt.dir === 'in' && !reduced.matches) {
    const veil = document.createElement('div');
    veil.className = 'veil full';
    veil.style.background = pt.color;
    document.body.append(veil);
    requestAnimationFrame(() => requestAnimationFrame(() => veil.classList.add('gone')));
    setTimeout(() => veil.remove(), 700);
  }
}
// Back/forward cache: never show a page frozen mid-transition.
addEventListener('pageshow', e => {
  if (!e.persisted) return;
  document.querySelectorAll('.veil').forEach(v => v.remove());
  document.body.classList.remove('leaving-in', 'leaving-out', 'leaving-fade');
});
document.addEventListener('click', e => {
  const a = e.target.closest?.('a[data-zoom]');
  if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  const b = (a.querySelector('.b-dot') || a).getBoundingClientRect();
  zoomTo(a.getAttribute('href'), { x: b.left + b.width / 2, y: b.top + b.height / 2, color: a.dataset.tint ? `var(--${kebab(a.dataset.tint)})` : undefined, dir: a.dataset.zoom || 'in' });
});

// ── header / footer for the inner pages ─────────────────────────────────────
function shell(page) {
  const head = document.querySelector('header.site');
  if (head) {
    head.innerHTML = `
      <a class="back" href="index.html#home" data-zoom="out" aria-label="Back to home">
        <span class="back-ic" data-sketch="circle" data-fill="tintSand">${icon('arrowLeft', 18)}</span><span class="back-t">home</span>
      </a>
      <nav aria-label="Main"><ul>
        ${C.nav.map(n => `<li><a href="${esc(n.href)}"${n.href.startsWith(page) ? ' aria-current="page" data-sketch="underline"' : ''}>${esc(n.label)}</a></li>`).join('')}
      </ul></nav>`;
  }
  const foot = document.querySelector('footer.site');
  if (foot) {
    const p = C.person;
    foot.innerHTML = `<p>${esc(p.name)} · ${link('Email', 'mailto:' + p.email)} · ${link('LinkedIn', p.linkedin)} · ${link('GitHub', p.github)}</p>`;
  }
}

/** Call once per page. Returns the companion API. */
export function initPage(page = '') {
  shell(page);
  arrive();
  decorate();
  const companion = initCompanion();
  document.documentElement.classList.add('js');
  return companion;
}
