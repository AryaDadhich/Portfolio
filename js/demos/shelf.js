// Share of Shelf — an illustrative shelf. Press the button to find the
// products, then see how much of the shelf each brand takes up.
import { makeCanvas, colors, reduced, rng, rect, h, esc } from './util.js';

export default function mount(el, cfg, api) {
  const W = 520, H = 330, brands = cfg.brands || ['Own brand', 'Competitor A', 'Competitor B'];
  const { cv, ctx } = makeCanvas(W, H, 'A drawn retail shelf with products from three brands');
  el.append(h(`<p class="small" style="margin:0 0 8px">A shelf with three brands. Press the button to find every product, then see who owns the most space.</p>`));
  el.append(cv, h(`
    <div class="row"><button class="btn" type="button" data-sketch="rect" data-fill="tintSky">Find the products</button></div>
    <label class="ctl"><span>How sure it must be</span><input type="range" min="30" max="95" value="50" step="1"><output>a little</output></label>
    <div class="bars" aria-live="polite"></div>
    <p class="status"></p>`));
  const btn = el.querySelector('button'), slider = el.querySelector('input'), out = el.querySelector('output');
  const bars = el.querySelector('.bars'), status = el.querySelector('.status');

  // bundled sample: three shelves of products, each with a brand and how sure the model is about it
  const r = rng(42), items = [];
  [98, 204, 310].forEach(base => {
    let x = 16;
    while (x < W - 60) {
      const w = 34 + Math.round(r() * 26), ht = 54 + Math.round(r() * 30), p = r();
      const brand = p < 0.45 ? 0 : p < 0.75 ? 1 : 2;
      const conf = r() < 0.2 ? 0.36 + r() * 0.25 : 0.7 + r() * 0.28;
      items.push({ x, y: base - ht, w, h: ht, brand, conf, seed: items.length + 1 });
      x += w + 7;
    }
  });
  let scan = -1, raf = 0;      // scan < 0: not run yet; otherwise x position of the sweep line

  function draw() {
    const c = colors(), fills = [c.meadow, c.sand, c.sky], th = slider.value / 100;
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = c.ink; ctx.lineWidth = 1.3;
    [98, 204, 310].forEach((y, i) => ctx.stroke(new Path2D(rect(6, y + 1, W - 12, 5, { seed: 80 + i }).stroke)));
    for (const it of items) {
      const p = rect(it.x, it.y, it.w, it.h, { seed: it.seed });
      ctx.fillStyle = fills[it.brand]; ctx.fill(new Path2D(p.fill));
      ctx.lineWidth = 1.1; ctx.strokeStyle = c.ink; ctx.stroke(new Path2D(p.stroke));
      // a simple mark per brand, so brands differ by shape as well as tint
      ctx.beginPath(); const mx = it.x + it.w / 2, my = it.y + it.h * 0.45;
      if (it.brand === 0) ctx.arc(mx, my, 7, 0, 7);
      else if (it.brand === 1) { ctx.moveTo(mx - 9, my - 4); ctx.lineTo(mx + 9, my - 4); ctx.moveTo(mx - 9, my + 4); ctx.lineTo(mx + 9, my + 4); }
      else { ctx.moveTo(mx - 7, my + 7); ctx.lineTo(mx + 7, my - 7); ctx.moveTo(mx - 7, my - 1); ctx.lineTo(mx + 1, my - 9); }
      ctx.stroke();
    }
    if (scan < 0) return;
    ctx.setLineDash([4, 3]); ctx.strokeStyle = c.accentInk; ctx.lineWidth = 1.5;
    for (const it of items) if (it.x <= scan && it.conf >= th) ctx.stroke(new Path2D(rect(it.x - 3, it.y - 3, it.w + 6, it.h + 6, { seed: it.seed + 50 }).stroke));
    ctx.setLineDash([]);
    if (scan < W) { ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(scan, 4); ctx.lineTo(scan, H - 4); ctx.stroke(); }
  }

  function stats() {
    const v = +slider.value;
    out.textContent = v < 50 ? 'a little' : v < 75 ? 'fairly' : 'very';
    if (scan < W) { bars.innerHTML = ''; status.textContent = scan < 0 ? '' : 'Looking…'; return; }
    const th = v / 100, det = items.filter(i => i.conf >= th), tot = det.reduce((a, i) => a + i.w, 0) || 1;
    bars.innerHTML = brands.map((b, k) => {
      const share = det.filter(i => i.brand === k).reduce((a, i) => a + i.w, 0) / tot;
      return `<div class="bar"><span>${esc(b)}</span><span><i style="width:${(share * 100).toFixed(1)}%"></i></span><b>${Math.round(share * 100)}%</b></div>`;
    }).join('');
    status.textContent = `Found ${det.length} of ${items.length} products. The bars show each brand’s share of the shelf.`;
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
  btn.addEventListener('click', () => { btn.lastChild.textContent = 'Look again'; run(); });
  slider.addEventListener('input', () => { draw(); stats(); });
  addEventListener('themechange', draw);
  draw(); stats();
}
