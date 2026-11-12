// Trade Offer Optimisation — least-squares fits computed live on synthetic data:
// one pooled line versus a separate line per group (the multilevel idea).
import { rng, line, h, esc } from './util.js';

export default function mount(el, cfg) {
  const groups = cfg.groups || ['Channel A', 'Channel B', 'Channel C'];
  const W = 520, H = 310, m = { l: 46, r: 14, t: 12, b: 40 }, XMAX = 30, YMAX = 40;
  const sx = x => m.l + (x / XMAX) * (W - m.l - m.r), sy = y => H - m.b - (y / YMAX) * (H - m.t - m.b);

  // synthetic sample: each group responds differently to offer depth
  const r = rng(5), truth = [[3, 0.42], [1, 1.02], [7, 0.68]];
  const data = truth.flatMap(([a, b], g) => Array.from({ length: 14 }, () => { const x = 2 + r() * 27; return { g, x, y: Math.max(0, a + b * x + (r() - 0.5) * 7) }; }));
  const ols = pts => {
    const n = pts.length, mx = pts.reduce((s, p) => s + p.x, 0) / n, my = pts.reduce((s, p) => s + p.y, 0) / n;
    const b = pts.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0) / pts.reduce((s, p) => s + (p.x - mx) ** 2, 0);
    const a = my - b * mx, sse = pts.reduce((s, p) => s + (p.y - a - b * p.x) ** 2, 0);
    return { a, b, sse };
  };
  const pooled = ols(data), per = groups.map((_, g) => ols(data.filter(p => p.g === g)));
  const sst = (() => { const my = data.reduce((s, p) => s + p.y, 0) / data.length; return data.reduce((s, p) => s + (p.y - my) ** 2, 0); })();
  const r2 = { pooled: 1 - pooled.sse / sst, multi: 1 - per.reduce((s, f) => s + f.sse, 0) / sst };

  el.append(h(`
    <div class="plot-wrap"></div>
    <div class="row" role="group" aria-label="Model">
      <button class="chip" type="button" data-mode="pooled" aria-pressed="false">One pooled line</button>
      <button class="chip" type="button" data-mode="multi" aria-pressed="true">A line per channel</button>
    </div>
    <label class="ctl"><span>Offer depth</span><input type="range" min="0" max="30" value="15" step="1"><output>15%</output></label>
    <div class="bars" aria-live="polite"></div>
    <p class="status"></p>
    <p class="demo-note">${esc(cfg.note || '')}</p>`));
  const wrap = el.querySelector('.plot-wrap'), slider = el.querySelector('input'), out = el.querySelector('output');
  const bars = el.querySelector('.bars'), status = el.querySelector('.status');
  let mode = 'multi';
  const fills = ['var(--tint-sand)', 'var(--tint-meadow)', 'var(--tint-sky)'], dash = ['', '7 4', '2 4'];
  const mark = (p) => {
    const x = sx(p.x), y = sy(p.y), a = `fill="${fills[p.g]}" stroke="var(--ink)" stroke-width="1.1"`;
    return p.g === 0 ? `<circle cx="${x}" cy="${y}" r="4.2" ${a}/>` : p.g === 1 ? `<rect x="${x - 3.8}" y="${y - 3.8}" width="7.600" height="7.600" ${a}/>` : `<path d="M${x} ${y - 5}L${x + 4.800} ${y + 3.600}L${x - 4.800} ${y + 3.600}Z" ${a}/>`;
  };
  const fitLine = (f, i, d = '') => { const y0 = f.a, y1 = f.a + f.b * XMAX; return `<path d="${line(sx(0), sy(y0), sx(XMAX), sy(Math.min(YMAX, y1)), { seed: 30 + i, wobble: 0.6 })}" fill="none" stroke="var(--ink)" stroke-width="1.500" stroke-dasharray="${d}"/>`; };

  function render() {
    const x = +slider.value;
    out.textContent = x + '%';
    const ticks = [0, 10, 20, 30].map(v => `<text x="${sx(v)}" y="${H - m.b + 16}" text-anchor="middle">${v}</text>`).join('') +
      [0, 10, 20, 30, 40].map(v => `<text x="${m.l - 8}" y="${sy(v) + 4}" text-anchor="end">${v}</text>`).join('');
    wrap.innerHTML = `<svg class="plot" viewBox="0 0 ${W} ${H}" role="img" aria-label="Scatter plot of volume uplift against offer depth with fitted regression lines">
      <g font-size="11" fill="var(--ink-soft)" font-family="Inter, sans-serif">${ticks}
        <text x="${(m.l + W - m.r) / 2}" y="${H - 6}" text-anchor="middle">offer depth (%)</text>
        <text transform="translate(12 ${(m.t + H - m.b) / 2}) rotate(-90)" text-anchor="middle">volume uplift (%)</text></g>
      <path d="${line(m.l, H - m.b, W - m.r, H - m.b, { seed: 1 })}${line(m.l, H - m.b, m.l, m.t, { seed: 2 })}" fill="none" stroke="var(--ink)" stroke-width="1.300"/>
      <path d="M${sx(x)} ${m.t}V${H - m.b}" stroke="var(--accent-ink)" stroke-width="1" stroke-dasharray="3 4"/>
      ${data.map(mark).join('')}
      ${mode === 'pooled' ? fitLine(pooled, 0) : per.map((f, i) => fitLine(f, i + 1, dash[i])).join('')}
    </svg>`;
    el.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', c.dataset.mode === mode));
    const pred = f => Math.max(0, f.a + f.b * x);
    bars.innerHTML = groups.map((g, i) => {
      const v = pred(mode === 'pooled' ? pooled : per[i]);
      return `<div class="bar"><span>${esc(g)}</span><span><i style="width:${Math.min(100, (v / YMAX) * 100).toFixed(1)}%;background:${fills[i]}"></i></span><b>+${v.toFixed(1)}%</b></div>`;
    }).join('');
    const best = per.indexOf(per.reduce((a, b) => (b.b > a.b ? b : a)));
    status.textContent = mode === 'pooled'
      ? `One line for everything explains ${Math.round(r2.pooled * 100)}% of the variance and predicts the same uplift for every channel.`
      : `A line per channel explains ${Math.round(r2.multi * 100)}% of the variance. ${groups[best]} responds most per point of offer (+${per[best].b.toFixed(2)}%), which is where extra spend works hardest.`;
  }
  el.addEventListener('click', e => { const c = e.target.closest('.chip'); if (c) { mode = c.dataset.mode; render(); } });
  slider.addEventListener('input', render);
  render();
}
