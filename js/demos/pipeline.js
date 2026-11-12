// Renal calculi detection — a clickable pipeline. Each stage is actually
// computed (in miniature) on a synthetic two-stain image generated here:
// colour deconvolution → morphological reconstruction → threshold → labelling.
import { makeCanvas, colors, reduced, rng, rect, h, esc } from './util.js';

const GW = 96, GH = 72, S = 5;
const STAIN_A = [0.65, 0.70, 0.29], STAIN_B = [0.07, 0.99, 0.11];   // structure stain, counter-stain

function compute() {
  const r = rng(77), n = GW * GH, struct = new Float32Array(n), counter = new Float32Array(n);
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    const i = y * GW + x;
    const inside = ((x - 48) / 32) ** 2 + ((y - 36) / 25) ** 2 < 1 && !(((x - 70) / 12) ** 2 + ((y - 36) / 10) ** 2 < 1);
    let v = inside ? 0.3 + r() * 0.08 : 0.04 + r() * 0.03;
    for (const [cx, cy, rad] of [[38, 28, 5.500], [52, 47, 3.800], [30, 44, 2.600]]) v += 0.6 * Math.exp(-(((x - cx) ** 2 + (y - cy) ** 2) / (rad * rad)));
    if (r() < 0.012) v += 0.55;                                   // speckle noise
    struct[i] = Math.min(1, v);
    counter[i] = Math.max(0, 0.35 + 0.3 * Math.sin(x / 9) * Math.cos(y / 7));
  }
  // 1 · the "captured" colour image (Beer-Lambert mix of the two stains)
  const rgb = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) rgb[i * 3 + c] = Math.exp(-1.2 * (struct[i] * STAIN_A[c] + counter[i] * STAIN_B[c]));
  // 2 · colour deconvolution: least-squares un-mixing of optical density
  const aa = STAIN_A.reduce((s, v) => s + v * v, 0), bb = STAIN_B.reduce((s, v) => s + v * v, 0), ab = STAIN_A.reduce((s, v, c) => s + v * STAIN_B[c], 0), det = aa * bb - ab * ab;
  const decon = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let pa = 0, pb = 0;
    for (let c = 0; c < 3; c++) { const od = -Math.log(rgb[i * 3 + c]) / 1.2; pa += od * STAIN_A[c]; pb += od * STAIN_B[c]; }
    decon[i] = (pa * bb - pb * ab) / det;
  }
  // 3 · opening by reconstruction: erode, then grow back under the original
  const morph = (src, fn) => { const o = new Float32Array(n); for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) { let v = src[y * GW + x]; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < GW && yy < GH) v = fn(v, src[yy * GW + xx]); } o[y * GW + x] = v; } return o; };
  let marker = morph(decon, Math.min);
  for (let it = 0; it < 40; it++) {
    const d = morph(marker, Math.max); let changed = false;
    for (let i = 0; i < n; i++) { const v = Math.min(d[i], decon[i]); if (v - marker[i] > 1e-4) changed = true; d[i] = v; }
    marker = d; if (!changed) break;
  }
  // 4 · segmentation by threshold
  const mask = new Uint8Array(n); for (let i = 0; i < n; i++) mask[i] = marker[i] > 0.56 ? 1 : 0;
  // 5 · connected components → candidate stones
  const lab = new Int32Array(n), comps = [];
  for (let i = 0; i < n; i++) {
    if (!mask[i] || lab[i]) continue;
    const c = { x0: GW, y0: GH, x1: 0, y1: 0, area: 0 }, stack = [i]; lab[i] = comps.length + 1;
    while (stack.length) {
      const j = stack.pop(), x = j % GW, y = (j / GW) | 0;
      c.area++; c.x0 = Math.min(c.x0, x); c.x1 = Math.max(c.x1, x); c.y0 = Math.min(c.y0, y); c.y1 = Math.max(c.y1, y);
      for (const k of [j - 1, j + 1, j - GW, j + GW]) if (k >= 0 && k < n && mask[k] && !lab[k] && Math.abs((k % GW) - x) <= 1) { lab[k] = lab[i]; stack.push(k); }
    }
    comps.push(c);
  }
  return { rgb, decon, marker, mask, comps };
}

const STEPS = [
  ['Input', 'A synthetic two-stain image: tissue structure, bright stone-like deposits, a counter-stain wash and speckle noise.'],
  ['Colour deconvolution', 'The colour image is un-mixed into stain channels; only the structural channel is kept, so the wash disappears.'],
  ['Morphological reconstruction', 'Opening by reconstruction removes isolated speckle while preserving the true shape of larger regions.'],
  ['Segmentation', 'A threshold on the cleaned image separates dense, bright regions from the surrounding tissue.'],
  ['Classification', 'Connected regions are measured; those large enough are flagged as stone candidates.'],
];

export default function mount(el, cfg, api) {
  const W = GW * S, H = GH * S, { cv, ctx } = makeCanvas(W, H, 'Synthetic medical-style image at the selected pipeline stage');
  const d = compute(), off = document.createElement('canvas'); off.width = GW; off.height = GH;
  const octx = off.getContext('2d'), img = octx.createImageData(GW, GH);
  el.append(h(`<div class="row" role="group" aria-label="Pipeline stages">${STEPS.map((s, i) => `<button class="chip" type="button" data-i="${i}" aria-pressed="false">${i + 1}. ${esc(s[0])}</button>`).join('<span aria-hidden="true">→</span>')}</div>`));
  el.append(cv, h(`<p class="status" aria-live="polite"></p>
    <div class="row"><button class="btn" type="button" data-sketch="rect" data-fill="tintSky">Play all steps</button></div>
    <p class="demo-note">${esc(cfg.note || '')}</p>`));
  cv.style.marginTop = '10px';
  const status = el.querySelector('.status'), play = el.querySelector('.btn');
  let step = 0, timer = 0;
  const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));

  function draw() {
    const c = colors(), paper = hex(c.paper), ink = hex(c.ink), n = GW * GH;
    for (let i = 0; i < n; i++) {
      let px;
      if (step === 0) px = [0, 1, 2].map(k => 255 * d.rgb[i * 3 + k] * 0.42 + paper[k] * 0.58);   // muted towards the paper colour
      else {
        const v = step === 1 ? d.decon[i] : step === 2 ? d.marker[i] : d.mask[i] * 0.8;
        const t = Math.max(0, Math.min(1, v)) * 0.85;
        px = [0, 1, 2].map(k => paper[k] + (ink[k] - paper[k]) * t);
      }
      img.data.set([px[0], px[1], px[2], 255], i * 4);
    }
    octx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = false; ctx.clearRect(0, 0, W, H); ctx.drawImage(off, 0, 0, W, H);
    if (step === 4) {
      ctx.font = '500 11px Inter, sans-serif'; ctx.lineWidth = 1.5;
      d.comps.forEach((k, i) => {
        const stone = k.area >= 12, x = k.x0 * S - 6, y = k.y0 * S - 6, w = (k.x1 - k.x0 + 1) * S + 12, hh = (k.y1 - k.y0 + 1) * S + 12;
        ctx.strokeStyle = stone ? c.accentInk : c.soft; ctx.setLineDash(stone ? [] : [3, 4]);
        ctx.stroke(new Path2D(rect(x, y, w, hh, { seed: i + 3 }).stroke)); ctx.setLineDash([]);
        const label = stone ? `stone · ${k.area} px` : 'too small';
        const tw = ctx.measureText(label).width + 8, tx = Math.min(W - tw - 2, x), ty = y > 20 ? y - 17 : y + hh + 3;
        ctx.fillStyle = c.paper; ctx.fillRect(tx, ty, tw, 15); ctx.fillStyle = c.ink; ctx.fillText(label, tx + 4, ty + 11);
      });
    }
    el.querySelectorAll('.chip').forEach(b => b.setAttribute('aria-pressed', +b.dataset.i === step));
    status.textContent = STEPS[step][1] + (step === 4 ? ` Found ${d.comps.filter(k => k.area >= 12).length} candidates.` : '');
  }
  const stop = () => { clearInterval(timer); timer = 0; play.lastChild.textContent = 'Play all steps'; api?.companion?.signal(false); };
  el.addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) { stop(); step = +b.dataset.i; draw(); } });
  play.addEventListener('click', () => {
    if (timer) return stop();
    step = 0; draw(); play.lastChild.textContent = 'Stop'; api?.companion?.signal(true);
    timer = setInterval(() => { step++; draw(); if (step >= STEPS.length - 1) stop(); }, reduced() ? 2200 : 1500);
  });
  draw();
}
