// Small helpers shared by the project demos.
import { tint } from '../common.js';
import { rng, line, rect, circle } from '../sketch.js';
export { rng, line, rect, circle, tint };

/** A canvas with logical size w×h, sharp on high-DPI screens, scaled by CSS. */
export function makeCanvas(w, h, label) {
  const cv = document.createElement('canvas'), dpr = Math.min(devicePixelRatio || 1, 2);
  cv.width = w * dpr; cv.height = h * dpr;
  cv.style.aspectRatio = `${w} / ${h}`;
  if (label) { cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', label); }
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  return { cv, ctx };
}
export const colors = () => ({ ink: tint('ink'), soft: tint('inkSoft'), paper: tint('paper'), deep: tint('paperDeep'), sky: tint('tintSky'), meadow: tint('tintMeadow'), sand: tint('tintSand'), accent: tint('accent'), accentInk: tint('accentInk') });
export const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content; };
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
