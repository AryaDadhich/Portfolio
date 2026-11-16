// companion.js — the small companion.
// It never follows the cursor. It rests in a fixed spot and idles (blink, small
// bounce); a page can send it somewhere with moveTo(), which is one smooth,
// eased hop. With reduced motion it simply stays where it is put.

const SVG = `
<svg viewBox="0 0 40 44" width="34" height="37">
  <g class="c-signal"><path d="M15.500 3.500c1.200-2.600 7.800-2.600 9 0"/><path d="M12.500 2.200c2.400-4.400 12.600-4.400 15 0"/></g>
  <path class="c-pack" d="M7.600 14.500c-3.400.2-4.600 1.600-4.600 5.500s1.200 5.600 4.600 5.800"/>
  <path d="M20 9.200V5.200"/><circle class="c-tip" cx="20" cy="3.800" r="1.500"/>
  <path d="M15 30.400v6.200h-2.800"/><path d="M25 30.400v6.200h2.800"/>
  <path class="c-body" d="M13.500 9.400C18 8.700 22.600 8.800 26.900 9.500 30.500 10.100 32.800 12.500 33 16.100 33.200 19 33.100 21.700 32.800 24.400 32.400 27.900 30.100 30.100 26.600 30.500 22.300 31 17.900 31 13.600 30.400 10.100 29.900 7.900 27.700 7.500 24.200 7.200 21.400 7.200 18.700 7.500 15.900 8 12.300 10.100 10 13.500 9.400Z"/>
  <g class="c-eyes">
    <circle class="c-eye" cx="15.300" cy="19" r="3.500"/><circle class="c-eye" cx="24.700" cy="19" r="3.500"/>
    <circle class="c-pupil" cx="15.300" cy="19" r="1.350"/><circle class="c-pupil" cx="24.700" cy="19" r="1.350"/>
  </g>
</svg>`;

export function initCompanion() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const el = document.createElement('div');
  el.className = 'companion idle';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = SVG;
  document.body.append(el);

  const restSpot = () => ({ x: 34, y: innerHeight - 12 });      // feet position, bottom-left corner
  const s = { ...restSpot(), anim: null, resting: true, raf: 0 };
  const paint = () => { el.style.transform = `translate(${(s.x - 17).toFixed(1)}px,${(s.y - 37).toFixed(1)}px)`; };
  const ease = k => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);

  function frame(now) {
    const a = s.anim;
    if (!a) return;
    const k = Math.min(1, (now - a.t0) / a.dur), e = ease(k);
    s.x = a.fx + (a.tx - a.fx) * e;
    s.y = a.fy + (a.ty - a.fy) * e - a.arc * Math.sin(Math.PI * k);
    paint();
    if (k < 1) s.raf = requestAnimationFrame(frame);
    else { s.anim = null; el.classList.add('idle'); }
  }
  /** One smooth hop to (x, y) in viewport px (feet position). */
  function moveTo(x, y, { dur = 700, arc = 12 } = {}) {
    s.resting = false;
    cancelAnimationFrame(s.raf);
    if (reduced.matches || Math.hypot(x - s.x, y - s.y) < 1) { s.anim = null; s.x = x; s.y = y; paint(); el.classList.add('idle'); return; }
    el.classList.remove('idle');
    s.anim = { fx: s.x, fy: s.y, tx: x, ty: y, t0: performance.now(), dur, arc };
    s.raf = requestAnimationFrame(frame);
  }
  /** Go back to the fixed resting spot. */
  function rest(opts) { const r = restSpot(); moveTo(r.x, r.y, opts); s.resting = true; }

  addEventListener('resize', () => { if (s.resting) { cancelAnimationFrame(s.raf); s.anim = null; Object.assign(s, restSpot()); paint(); el.classList.add('idle'); } });
  (function blink() {
    setTimeout(() => {
      if (!reduced.matches) { el.classList.add('blink'); setTimeout(() => el.classList.remove('blink'), 130); }
      blink();
    }, 2600 + Math.random() * 3600);
  })();
  paint();

  return {
    el, moveTo, rest,
    signal(on) { el.classList.toggle('signal', !!on); },
    accessory(name) { el.classList.toggle('has-pack', name === 'pack'); },
  };
}
