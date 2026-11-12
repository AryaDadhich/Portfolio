// companion.js — the small walking companion.
// Desktop: walks after the cursor and watches it. Touch: idles along the bottom
// edge and reacts to taps. Pages can park it somewhere or make it react.

const SVG = `
<svg viewBox="0 0 40 44" width="34" height="37">
  <g class="c-signal"><path d="M15.500 3.500c1.200-2.600 7.800-2.600 9 0"/><path d="M12.500 2.200c2.400-4.400 12.600-4.400 15 0"/></g>
  <path class="c-pack" d="M7.600 14.500c-3.400.2-4.600 1.600-4.600 5.500s1.200 5.600 4.600 5.800"/>
  <path d="M20 9.200V5.200"/><circle class="c-tip" cx="20" cy="3.800" r="1.500"/>
  <g class="c-leg c-leg-a"><path d="M15 30.400v6.200h-2.800"/></g>
  <g class="c-leg c-leg-b"><path d="M25 30.400v6.200h2.800"/></g>
  <path class="c-body" d="M13.500 9.400C18 8.700 22.600 8.800 26.900 9.500 30.500 10.100 32.800 12.500 33 16.100 33.200 19 33.100 21.700 32.800 24.400 32.400 27.900 30.100 30.100 26.600 30.500 22.300 31 17.900 31 13.600 30.400 10.100 29.900 7.900 27.700 7.500 24.200 7.200 21.400 7.200 18.700 7.500 15.900 8 12.300 10.100 10 13.500 9.400Z"/>
  <g class="c-eyes">
    <circle class="c-eye" cx="15.300" cy="19" r="3.500"/><circle class="c-eye" cx="24.700" cy="19" r="3.500"/>
    <g class="c-pupils"><circle cx="15.300" cy="19" r="1.350"/><circle cx="24.700" cy="19" r="1.350"/></g>
  </g>
</svg>`;

export function initCompanion() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const el = document.createElement('div');
  el.className = 'companion';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `<div class="c-in">${SVG}</div>`;
  document.body.append(el);
  const inner = el.firstElementChild, pupils = el.querySelector('.c-pupils');
  const legA = el.querySelector('.c-leg-a'), legB = el.querySelector('.c-leg-b');

  const W = () => innerWidth, H = () => innerHeight;
  const s = { x: 40, y: H() - 14, look: null, cursor: null, park: null, phase: 0, face: 1, wander: 40, nextWander: 0, nextBlink: 2000, snap: true };

  addEventListener('pointermove', e => { if (e.pointerType !== 'touch') { s.cursor = { x: e.clientX, y: e.clientY }; s.look = s.cursor; } }, { passive: true });
  addEventListener('pointerdown', e => {
    s.look = { x: e.clientX, y: e.clientY };
    if (e.pointerType === 'touch' || !fine) { api.hop(); s.wander = Math.max(30, Math.min(W() - 30, e.clientX + (e.clientX > s.x ? -46 : 46))); s.nextWander = performance.now() + 7000; }
  }, { passive: true });

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    // where should it be?
    let tx, ty, max = 240;
    const parked = s.park && s.park();
    if (parked) { tx = parked.x; ty = parked.y; max = parked.speed || 520; }
    else if (fine && s.cursor) { tx = s.cursor.x + 26; ty = s.cursor.y + 44; }
    else {
      if (now > s.nextWander) { s.wander = 30 + Math.random() * Math.min(W() - 60, 240); s.nextWander = now + 6000 + Math.random() * 5000; }
      tx = s.wander; ty = H() - (document.body.classList.contains('home') ? 82 : 12);   // stay clear of the home zoom controls
    }
    tx = Math.max(20, Math.min(W() - 20, tx)); ty = Math.max(40, Math.min(H() - 6, ty));
    const dx = tx - s.x, dy = ty - s.y, dist = Math.hypot(dx, dy);
    let v = 0;
    if (s.snap || reduced.matches || dist > 1400) { s.x = tx; s.y = ty; s.snap = false; }
    else if (dist > 0.5) {
      v = Math.min(max, dist * 5);
      const step = Math.min(dist, v * dt);
      s.x += (dx / dist) * step; s.y += (dy / dist) * step;
      if (Math.abs(dx) > 3) s.face = dx > 0 ? 1 : -1;
    }
    // legs
    const walking = v > 14;
    if (walking) s.phase += dt * (6 + v * 0.03);
    const sw = walking ? Math.sin(s.phase * 2) * 16 : 0;
    legA.style.transform = `rotate(${sw}deg)`; legB.style.transform = `rotate(${-sw}deg)`;
    // eyes
    let px = 0, py = 0;
    if (s.look) {
      const ex = s.look.x - s.x, ey = s.look.y - (s.y - 20), d = Math.hypot(ex, ey) || 1, k = Math.min(1, d / 60) * 1.700;
      px = (ex / d) * k * s.face; py = (ey / d) * k;
    }
    pupils.style.transform = `translate(${px.toFixed(2)}px,${py.toFixed(2)}px)`;
    if (now > s.nextBlink) { el.classList.add('blink'); setTimeout(() => el.classList.remove('blink'), 130); s.nextBlink = now + 2600 + Math.random() * 3600; }
    el.style.transform = `translate(${(s.x - 17).toFixed(1)}px,${(s.y - 37).toFixed(1)}px)`;
    inner.style.transform = `scaleX(${s.face})`;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  const api = {
    el,
    /** fn returns {x, y, speed?} in viewport px (feet position), or null to release for that frame */
    park(fn) { s.park = fn; },
    release() { s.park = null; },
    lookAt(x, y) { s.look = { x, y }; },
    hop() {
      if (reduced.matches) return;
      el.classList.remove('hop'); void el.offsetWidth; el.classList.add('hop');
    },
    signal(on) { el.classList.toggle('signal', !!on); },
    accessory(name) { el.classList.toggle('has-pack', name === 'pack'); },
  };
  return api;
}
