// Hybrid recommender with cold-start signals — you play the new user.
// Pick dialogue styles (the proxy preference signal), then blend content-based
// and collaborative scores. Everything is computed in the browser.
import { rng, h, esc } from './util.js';

// genres: action, comedy, drama, sci-fi, thriller, romance
const VIBES = [
  ['Dry one-liners', [0, 1, 0.2, 0, 0, 0]],
  ['Heist-plan montage', [0.5, 0, 0, 0, 1, 0]],
  ['Grand romantic speech', [0, 0, 0.5, 0, 0, 1]],
  ['Mind-bending monologue', [0, 0, 0, 1, 0.4, 0]],
  ['Training-montage pep talk', [0.8, 0, 0.6, 0, 0, 0]],
  ['Road-trip banter', [0, 0.7, 0.4, 0, 0, 0.3]],
];
const FILMS = [
  ['Inception', [0.6, 0, 0, 1, 0.8, 0], 0.92], ['The Dark Knight', [1, 0, 0.5, 0, 0.8, 0], 0.95],
  ['3 Idiots', [0, 1, 0.7, 0, 0, 0], 0.9], ['Dangal', [0.5, 0, 1, 0, 0, 0], 0.84],
  ['Interstellar', [0, 0, 0.8, 1, 0, 0], 0.88], ['Andhadhun', [0, 0.5, 0, 0, 1, 0], 0.7],
  ['Zindagi Na Milegi Dobara', [0, 0.7, 0.6, 0, 0, 0.5], 0.8], ['La La Land', [0, 0, 0.6, 0, 0, 1], 0.72],
  ['Mad Max: Fury Road', [1, 0, 0, 0.5, 0, 0], 0.68], ['Parasite', [0, 0.3, 0.9, 0, 0.9, 0], 0.78],
  ['Queen', [0, 0.8, 0.6, 0, 0, 0], 0.62], ['Jab We Met', [0, 0.7, 0, 0, 0, 1], 0.74],
];
const cos = (a, b) => { let d = 0, x = 0, y = 0; a.forEach((v, i) => { d += v * b[i]; x += v * v; y += b[i] * b[i]; }); return x && y ? d / Math.sqrt(x * y) : 0; };

export default function mount(el, cfg) {
  // synthetic "existing users": a taste vector and the ratings that follow from it
  const r = rng(9);
  const users = Array.from({ length: 10 }, () => {
    const taste = Array.from({ length: 6 }, () => (r() < 0.45 ? r() : 0));
    return { taste, ratings: FILMS.map(f => Math.max(0, Math.min(1, cos(taste, f[1]) + (r() - 0.5) * 0.25))) };
  });
  el.append(h(`
    <p class="small" style="margin:0 0 6px">You are a brand-new user with no viewing history. Pick up to three dialogue styles you enjoy:</p>
    <div class="row" role="group" aria-label="Dialogue styles">${VIBES.map((v, i) => `<button class="chip" type="button" data-i="${i}" aria-pressed="false">${esc(v[0])}</button>`).join('')}</div>
    <label class="ctl"><span>Content-based</span><input type="range" min="0" max="100" value="50" aria-label="Blend between content-based and collaborative filtering"><span>Collaborative</span></label>
    <div class="bars" aria-live="polite"></div>
    <p class="status"></p>
    <p class="demo-note">${esc(cfg.note || '')}</p>`));
  const picked = new Set(), slider = el.querySelector('input'), bars = el.querySelector('.bars'), status = el.querySelector('.status');

  function render() {
    el.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', picked.has(+c.dataset.i)));
    let scored;
    if (!picked.size) {
      scored = FILMS.map(f => [f[0], f[2]]);
      status.textContent = 'Cold start: with no signal, every new user gets the same popularity list.';
    } else {
      const me = [0, 0, 0, 0, 0, 0];
      picked.forEach(i => VIBES[i][1].forEach((v, k) => { me[k] += v; }));
      const a = slider.value / 100, sims = users.map(u => Math.max(0, cos(me, u.taste)) ** 2), ss = sims.reduce((x, y) => x + y, 0) || 1;
      scored = FILMS.map((f, j) => {
        const content = cos(me, f[1]), collab = users.reduce((s, u, k) => s + sims[k] * u.ratings[j], 0) / ss;
        return [f[0], (1 - a) * content + a * collab];
      });
      status.textContent = `Personalised from the first session: ${Math.round((1 - a) * 100)}% content-based (film features), ${Math.round(a * 100)}% collaborative (users with similar signals).`;
    }
    scored.sort((x, y) => y[1] - x[1]);
    bars.innerHTML = scored.slice(0, 5).map(([t, s]) => `<div class="bar"><span>${esc(t)}</span><span><i style="width:${(s * 100).toFixed(1)}%;background:var(--tint-sky)"></i></span><b>${s.toFixed(2)}</b></div>`).join('');
  }
  el.addEventListener('click', e => {
    const c = e.target.closest('.chip'); if (!c) return;
    const i = +c.dataset.i;
    if (picked.has(i)) picked.delete(i); else if (picked.size < 3) picked.add(i);
    render();
  });
  slider.addEventListener('input', render);
  render();
}
