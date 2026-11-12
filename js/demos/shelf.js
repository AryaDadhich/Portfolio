// Share of Shelf — an illustrative shelf with pre-computed detections.
// Run detection, move the confidence threshold, and watch share of shelf change.
import { makeCanvas, colors, reduced, rng, rect, h, esc } from './util.js';

export default function mount(el, cfg, api) {
  const W = 520, H = 330, brands = cfg.brands || ['Own brand', 'Competitor A', 'Competitor B'];
  const { cv, ctx } = makeCanvas(W, H, 'Illustrative retail shelf with products from three brands');
  el.append(cv, h(`
    <div class="row"><button class="btn" type="button" data-sketch="rect" data-fill="tintSky">Run detection</button></div>
    <label class="ctl"><span>Confidence threshold</span><input type="range" min="30" max="95" value="50" step="1"><output>0.50</output></label>
    <div class="bars" aria-live="polite"></div>
    <p class="status"></p>
    <p class="demo-note">${esc(cfg.note || '')}</p>`));
  const btn = el.querySelector('button'), slider = el.querySelector('input'), out = el.querySelector('output');
  const bars = el.querySelector('.bars'), status = el.querySelector('.status');

  // bundled sample: three shelves of facings, each with a brand and a model confidence
  const r = rng(42), items = [];
  [98, 204, 310].forEach((base, s) => {
    let x = 16;
    while (x < W - 60) {
      const w = 34 + Math.round(r() * 26), ht = 54 + Math.round(r() * 30), p = r();
      const brand = p < 0.45 ? 0 : p < 0.75 ? 1 : 2;
      const conf = r() < 0.2 ? 0.36 + r() * 0.25 : 0.7 + r() * 0.28;
      items.push({ x, y: base - ht, w, h: ht, brand, conf, seed: items.length + 1 });
      x += w + 7;
    }
  });
  let scan = -1, raf = 0;      // scan < 0: not run yet; otherwise x position of the scan line

  function draw() {
    const c = colors(), fills = [c.meadow, c.sand, c.sky], th = slider.value / 100;
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = c.ink; ctx.lineWidth = 1.3;
    [98, 204, 310].forEach((y, i) => ctx.stroke(new Path2D(rect(6, y + 1, W - 12, 5, { seed: 80 + i }).stroke)));
    for (const it of items) {
      const p = rect(it.x, it.y, it.w, it.h, { seed: it.seed });
      ctx.fillStyle = fills[it.brand]; ctx.fill(new Path2D(p.fill));
      ctx.lineWidth = 1.1; ctx.strokeStyle = c.ink; ctx.stroke(new Path2D(p.stroke));
      // a simple label mark per brand, so brands differ by shape as well as tint
      ctx.beginPath(); const mx = it.x + it.w / 2, my = it.y + it.h * 0.45;
      if (it.brand === 0) ctx.arc(mx, my, 7, 0, 7);
      else if (it.brand === 1) { ctx.moveTo(mx - 9, my - 4); ctx.lineTo(mx + 9, my - 4); ctx.moveTo(mx - 9, my + 4); ctx.lineTo(mx + 9, my + 4); }
      else { ctx.moveTo(mx - 7, my + 7); ctx.lineTo(mx + 7, my - 7); ctx.moveTo(mx - 7, my - 1); ctx.lineTo(mx + 1, my - 7 - 2); }
      ctx.stroke();
    }
    if (scan < 0) return;
    ctx.font = '500 10px Inter, sans-serif'; ctx.textAlign = 'center';
    for (const it of items) {
      if (it.x > scan || it.conf < th) continue;
      ctx.setLineDash([4, 3]); ctx.strokeStyle = c.accentInk; ctx.lineWidth = 1.4;
      ctx.stroke(new Path2D(rect(it.x - 3, it.y - 3, it.w + 6, it.h + 6, { seed: it.seed + 50 }).stroke));
      ctx.setLineDash([]);
      ctx.fillStyle = c.paper; ctx.fillRect(it.x + it.w / 2 - 12, it.y - 15, 24, 11);
      ctx.fillStyle = c.accentInk; ctx.fillText(it.conf.toFixed(2), it.x + it.w / 2, it.y - 6);
    }
    if (scan < W) { ctx.strokeStyle = c.accentInk; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(scan, 4); ctx.lineTo(scan, H - 4); ctx.stroke(); }
  }

  function stats() {
    out.textContent = (slider.value / 100).toFixed(2);
    if (scan < W) { bars.innerHTML = ''; status.textContent = scan < 0 ? 'Press "Run detection" to find the facings on this shelf.' : 'Detecting…'; return; }
    const th = slider.value / 100, det = items.filter(i => i.conf >= th), tot = det.reduce((a, i) => a + i.w, 0) || 1;
    bars.innerHTML = brands.map((b, k) => {
      const share = det.filter(i => i.brand === k).reduce((a, i) => a + i.w, 0) / tot;
      return `<div class="bar"><span>${esc(b)}</span><span><i style="width:${(share * 100).toFixed(1)}%"></i></span><b>${Math.round(share * 100)}%</b></div>`;
    }).join('');
    status.textContent = `Detected ${det.length} of ${items.length} facings at confidence ≥ ${th.toFixed(2)}. Share of shelf is measured by facing width.`;
  }

  function run() {
    cancelAnimationFrame(raf);
    api?.companion?.signal(true);
    if (reduced()) { scan = W; draw(); stats(); api?.companion?.signal(false); return; }
    const t0 = performance.now();
    const loop = now => {
      scan = Math.min(W, ((now - t0) / 1300) * W);
      draw(); stats();
      if (scan < W) raf = requestAnimationFrame(loop); else api?.companion?.signal(false);
    };
    raf = requestAnimationFrame(loop);
  }
  btn.addEventListener('click', () => { btn.lastChild.textContent = 'Run again'; run(); });
  slider.addEventListener('input', () => { draw(); stats(); });
  draw(); stats();
}
