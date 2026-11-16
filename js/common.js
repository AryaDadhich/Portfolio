// common.js — shared by every page: theme + palette, header/footer, zoom page
// transitions, sketch decoration and the companion.
import C from '../content.js';
import { decorate, icon } from './sketch.js';
import { initCompanion } from './companion.js';

export const content = C;
export const reduced = matchMedia('(prefers-reduced-motion: reduce)');
export { decorate, icon };

// ── theme + palette → CSS variables (content.js is the source of truth) ─────
// The <head> of every page sets data-theme before first paint (saved choice,
// else the system preference); here the matching palette is applied.
const kebab = k => k.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
const root = document.documentElement;
const systemDark = matchMedia('(prefers-color-scheme: dark)');
const savedTheme = () => { try { const t = localStorage.getItem('theme'); return t === 'dark' || t === 'light' ? t : null; } catch { return null; } };
export const theme = () => root.dataset.theme || (systemDark.matches ? 'dark' : 'light');
export function setTheme(t, save = false) {
  root.dataset.theme = t;
  if (save) { try { localStorage.setItem('theme', t); } catch {} }
  const pal = (t === 'dark' && C.paletteDark) || C.palette || {};
  for (const [k, v] of Object.entries(pal)) root.style.setProperty('--' + kebab(k), v);
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', pal.paper || '');
  document.querySelectorAll('button.theme').forEach(b => {
    b.setAttribute('aria-label', t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    b.setAttribute('aria-pressed', t === 'dark');
    b.querySelector('.ic')?.remove();
    b.insertAdjacentHTML('beforeend', icon(t === 'dark' ? 'sun' : 'moon', 20));
  });
  dispatchEvent(new CustomEvent('themechange', { detail: t }));
}
setTheme(savedTheme() || (systemDark.matches ? 'dark' : 'light'));
systemDark.addEventListener('change', e => { if (!savedTheme()) setTheme(e.matches ? 'dark' : 'light'); });
document.addEventListener('click', e => { if (e.target.closest?.('button.theme')) setTheme(theme() === 'dark' ? 'light' : 'dark', true); });
export const tint = name => getComputedStyle(root).getPropertyValue('--' + kebab(name)).trim() || '#eee';

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
    setTimeout(leave, 780);
  } else {
    document.body.classList.add('leaving-out');
    setTimeout(leave, 560);
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
    setTimeout(() => veil.remove(), 900);
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

// ── header / footer ─────────────────────────────────────────────────────────
// Top right on every page: [theme toggle] Name. The name goes to the final home screen.
function shell(page) {
  const head = document.querySelector('header.site');
  if (head) {
    const home = page === 'index';
    const me = `<div class="me">
        <button class="theme" type="button"></button>
        <a class="name" href="index.html#home"${home ? '' : ' data-zoom="out"'}>${esc(C.person.name)}</a>
      </div>`;
    head.innerHTML = home ? me : `
      <a class="back" href="index.html#home" data-zoom="out" aria-label="Back to home">
        <span class="back-ic" data-sketch="circle" data-fill="tintSand">${icon('arrowLeft', 18)}</span><span class="back-t">home</span>
      </a>
      <nav aria-label="Main"><ul>
        ${C.nav.map(n => `<li><a href="${esc(n.href)}"${n.href.startsWith(page) ? ' aria-current="page" data-sketch="underline"' : ''}>${esc(n.label)}</a></li>`).join('')}
      </ul></nav>
      ${me}`;
    setTheme(theme());      // fills in the toggle icon and label
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
  root.classList.add('js');
  return companion;
}
