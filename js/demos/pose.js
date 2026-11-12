// Gesture / pose demo — MediaPipe Pose Landmarker running fully in the browser.
// Left: mirrored webcam with hand-drawn joints. Right: a stick-figure game
// character that mirrors the visitor. Falls back to a looped landmark
// sequence when there is no camera, permission is denied, or the model can't load.
import { colors, reduced, h, esc } from './util.js';

const W = 480, H = 360, ASPECT = W / H;
const BONES = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28]];
const JOINTS = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];

/** Lazy-loads MediaPipe and creates the landmarker (GPU first, CPU as a fallback). */
export async function loadLandmarker(cfg) {
  const vision = await import(/* @vite-ignore */ cfg.visionBundle);
  const files = await vision.FilesetResolver.forVisionTasks(cfg.wasmPath);
  const make = delegate => vision.PoseLandmarker.createFromOptions(files, {
    baseOptions: { modelAssetPath: cfg.model, delegate }, runningMode: 'VIDEO', numPoses: 1,
    minPoseDetectionConfidence: 0.5, minPosePresenceConfidence: 0.5, minTrackingConfidence: 0.5,
  });
  try { return await make('GPU'); } catch { return await make('CPU'); }
}

export default function mount(el, cfg, api) {
  el.append(h(`
    <div class="pose-grid">
      <figure class="pose-panel" data-sketch="rect">
        <canvas width="${W}" height="${H}" role="img" aria-label="Your mirrored camera view with detected joints drawn on top"></canvas>
        <video playsinline muted></video>
        <figcaption class="cap-a">Camera is off</figcaption>
      </figure>
      <figure class="pose-panel" data-sketch="rect">
        <canvas width="${W}" height="${H}" role="img" aria-label="Stick-figure game character mirroring the detected pose"></canvas>
        <figcaption>Game character · targets touched: <b class="score">0</b></figcaption>
      </figure>
    </div>
    <p class="status" role="status" aria-live="polite">Press “Try it” and allow the camera, then move your arms to touch the targets.</p>
    <div class="row">
      <button class="btn try" type="button" data-sketch="rect" data-fill="tintSky">Try it</button>
      <button class="btn sample" type="button" data-sketch="rect">Watch a sample instead</button>
      <button class="btn stop" type="button" data-sketch="rect" hidden>Stop</button>
    </div>
    <p class="demo-note">${esc(cfg.privacy || '')}</p>`));
  const [cvA, cvB] = el.querySelectorAll('canvas'), a = cvA.getContext('2d'), b = cvB.getContext('2d');
  const video = el.querySelector('video'), status = el.querySelector('.status'), capA = el.querySelector('.cap-a'), scoreEl = el.querySelector('.score');
  const btnTry = el.querySelector('.try'), btnSample = el.querySelector('.sample'), btnStop = el.querySelector('.stop');
  for (const c of [a, b]) { c.lineCap = 'round'; c.lineJoin = 'round'; }

  let mode = 'idle';            // idle | loading | camera | sample
  let stream = null, landmarker = null, raf = 0, runId = 0;
  let smooth = null, lastSeen = 0, lastVideoTime = -1, score = 0, target = null, hitFlash = 0, baseHip = null, seq = null;
  const say = (msg) => { if (status.textContent !== msg) status.textContent = msg; };

  // ── smoothing: exponential, easing off when the joint moves fast ───────────
  function smoothLandmarks(raw) {
    const k0 = 1 - (cfg.smoothing ?? 0.45);
    if (!smooth) return (smooth = raw.map(p => ({ ...p })));
    raw.forEach((p, i) => {
      const s = smooth[i], d = Math.hypot(p.x - s.x, p.y - s.y), k = Math.min(1, k0 + d * 5);
      s.x += (p.x - s.x) * k; s.y += (p.y - s.y) * k; s.visibility = p.visibility;
    });
    return smooth;
  }

  // ── drawing helpers (slightly bowed strokes, fixed per bone so they don't jitter) ─
  function bone(c, x1, y1, x2, y2, i) {
    const len = Math.hypot(x2 - x1, y2 - y1) || 1, amp = Math.min(len * 0.035, 4) * (((i * 37) % 7) / 3.500 - 1);
    c.moveTo(x1, y1); c.quadraticCurveTo((x1 + x2) / 2 - ((y2 - y1) / len) * amp, (y1 + y2) / 2 + ((x2 - x1) / len) * amp, x2, y2);
  }
  const vis = p => p && (p.visibility ?? 1) > 0.45;

  function drawCamera(lm, col) {
    a.clearRect(0, 0, W, H);
    if (mode === 'camera' && video.readyState >= 2) {
      const vw = video.videoWidth, vh = video.videoHeight, s = Math.max(W / vw, H / vh);
      a.save(); a.translate(W, 0); a.scale(-1, 1);
      a.drawImage(video, (W - vw * s) / 2, (H - vh * s) / 2, vw * s, vh * s);
      a.restore();
      a.globalAlpha = 0.28; a.fillStyle = col.paper; a.fillRect(0, 0, W, H); a.globalAlpha = 1;   // soften the video so the line work reads
    } else { a.fillStyle = col.deep; a.fillRect(0, 0, W, H); }
    if (!lm) return;
    const pt = i => {
      // map through the same "cover" crop as the video
      const vw = video.videoWidth || W, vh = video.videoHeight || H, s = Math.max(W / vw, H / vh);
      return [W - ((W - vw * s) / 2 + lm[i].x * vw * s), (H - vh * s) / 2 + lm[i].y * vh * s];
    };
    for (const [lw, style] of [[5, col.paper], [1.800, col.ink]]) {
      a.lineWidth = lw; a.strokeStyle = style; a.beginPath();
      BONES.forEach(([p, q], i) => { if (vis(lm[p]) && vis(lm[q])) { const A = pt(p), B = pt(q); bone(a, A[0], A[1], B[0], B[1], i); } });
      a.stroke();
    }
    a.fillStyle = col.sky; a.strokeStyle = col.ink; a.lineWidth = 1.400;
    JOINTS.forEach(i => { if (vis(lm[i])) { const p = pt(i); a.beginPath(); a.arc(p[0], p[1], i === 0 ? 7 : 4.200, 0, 7); a.fill(); a.stroke(); } });
  }

  function drawGame(lm, col, now) {
    b.clearRect(0, 0, W, H);
    b.fillStyle = col.paper; b.fillRect(0, 0, W, H);
    const ground = H - 46;
    // quiet backdrop: two soft hills and a ground line
    b.fillStyle = col.meadow; b.beginPath(); b.moveTo(0, ground); b.quadraticCurveTo(110, ground - 70, 250, ground); b.fill();
    b.fillStyle = col.sand; b.beginPath(); b.moveTo(210, ground); b.quadraticCurveTo(360, ground - 96, W, ground - 10); b.lineTo(W, ground); b.fill();
    b.strokeStyle = col.ink; b.lineWidth = 1.300; b.beginPath(); bone(b, 8, ground, W - 8, ground + 1, 3); b.stroke();
    if (!lm) return;

    // normalise: mirrored, aspect-corrected, measured from the hips
    const P = i => ({ x: (1 - lm[i].x) * ASPECT, y: lm[i].y });
    const shL = P(11), shR = P(12), shMid = { x: (shL.x + shR.x) / 2, y: (shL.y + shR.y) / 2 }, sw = Math.hypot(shL.x - shR.x, shL.y - shR.y) || 0.2;
    const hipsSeen = vis(lm[23]) && vis(lm[24]);
    const hipL = hipsSeen ? P(23) : { x: shMid.x + (shL.x - shMid.x) * 0.62, y: shMid.y + sw * 1.45 };
    const hipR = hipsSeen ? P(24) : { x: shMid.x + (shR.x - shMid.x) * 0.62, y: shMid.y + sw * 1.45 };
    const hip = { x: (hipL.x + hipR.x) / 2, y: (hipL.y + hipR.y) / 2 }, torso = Math.hypot(shMid.x - hip.x, shMid.y - hip.y) || 0.3;
    const s = 84 / torso, legLen = 100;
    baseHip = baseHip == null ? hip.y : baseHip + (hip.y - baseHip) * 0.01;             // slow baseline → squats and jumps show
    const ox = W / 2 + (hip.x - ASPECT / 2) * 300, oy = ground - legLen + Math.max(-70, Math.min(46, (hip.y - baseHip) * s));
    const G = p => [ox + (p.x - hip.x) * s, oy + (p.y - hip.y) * s];
    const legsSeen = hipsSeen && vis(lm[25]) && vis(lm[26]) && vis(lm[27]) && vis(lm[28]);
    const pts = { shL: G(shL), shR: G(shR), hipL: G(hipL), hipR: G(hipR), elL: G(P(13)), elR: G(P(14)), wrL: G(P(15)), wrR: G(P(16)), head: G(P(0)) };
    if (legsSeen) { pts.knL = G(P(25)); pts.knR = G(P(26)); pts.anL = G(P(27)); pts.anR = G(P(28)); }
    else {      // upper body only (typical at a laptop): stand the character on straight legs
      pts.knL = [pts.hipL[0] + 2, pts.hipL[1] + legLen / 2]; pts.knR = [pts.hipR[0] - 2, pts.hipR[1] + legLen / 2];
      pts.anL = [pts.hipL[0] + 3, ground]; pts.anR = [pts.hipR[0] - 3, ground];
    }
    // torso
    b.fillStyle = col.sky; b.beginPath(); b.moveTo(...pts.shL); b.lineTo(...pts.shR); b.lineTo(...pts.hipR); b.lineTo(...pts.hipL); b.closePath(); b.fill();
    b.strokeStyle = col.ink; b.lineWidth = 2; b.beginPath();
    [['shL', 'shR'], ['shR', 'hipR'], ['hipR', 'hipL'], ['hipL', 'shL'], ['shL', 'elL'], ['elL', 'wrL'], ['shR', 'elR'], ['elR', 'wrR'], ['hipL', 'knL'], ['knL', 'anL'], ['hipR', 'knR'], ['knR', 'anR']]
      .forEach(([p, q], i) => bone(b, pts[p][0], pts[p][1], pts[q][0], pts[q][1], i + 2));
    // feet, neck
    b.moveTo(...pts.anL); b.lineTo(pts.anL[0] + 9, pts.anL[1]); b.moveTo(...pts.anR); b.lineTo(pts.anR[0] - 9, pts.anR[1]);
    const neck = [(pts.shL[0] + pts.shR[0]) / 2, (pts.shL[1] + pts.shR[1]) / 2], hr = Math.max(13, sw * s * 0.34);
    const hd = [pts.head[0], Math.min(pts.head[1], neck[1] - hr - 3)];
    b.moveTo(...neck); b.lineTo(hd[0], hd[1] + hr);
    b.stroke();
    b.fillStyle = col.paper; b.beginPath(); b.arc(hd[0], hd[1], hr, 0, 7); b.fill(); b.stroke();
    b.fillStyle = col.ink; b.beginPath(); b.arc(hd[0] - hr * 0.34, hd[1] - 1, 1.500, 0, 7); b.arc(hd[0] + hr * 0.34, hd[1] - 1, 1.500, 0, 7); b.fill();
    b.fillStyle = col.sand; for (const k of ['wrL', 'wrR']) { b.beginPath(); b.arc(pts[k][0], pts[k][1], 4.500, 0, 7); b.fill(); b.stroke(); }

    // a tiny game: touch the target with either hand
    if (!target) {
      const ang = -Math.PI * (0.1 + Math.random() * 0.8), reach = sw * s * (1.25 + Math.random() * 0.5);
      target = [Math.max(26, Math.min(W - 26, neck[0] + Math.cos(ang) * reach)), Math.max(26, Math.min(ground - 30, neck[1] + Math.sin(ang) * reach))];
    }
    b.fillStyle = col.accent; b.strokeStyle = col.ink; b.lineWidth = 1.300; b.beginPath(); b.arc(target[0], target[1], 13, 0, 7); b.fill(); b.stroke();
    if (now - hitFlash < 320) { b.beginPath(); b.arc(target[0], target[1], 13 + (now - hitFlash) / 14, 0, 7); b.stroke(); }
    for (const k of ['wrL', 'wrR']) if (Math.hypot(pts[k][0] - target[0], pts[k][1] - target[1]) < 22 && now - hitFlash > 350) {
      scoreEl.textContent = ++score; hitFlash = now; target = null; api?.companion?.hop(); break;
    }
  }

  // ── fallback sequence ──────────────────────────────────────────────────────
  async function loadSequence() {
    if (seq) return seq;
    const j = await (await fetch(cfg.fallbackSequence)).json();
    return (seq = j);
  }
  function sequenceFrame(now) {
    const f = (now / 1000) * seq.fps, n = seq.frames.length, i = Math.floor(f) % n, k = f - Math.floor(f), A = seq.frames[i], B = seq.frames[(i + 1) % n];
    const lm = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0 }));
    seq.idx.forEach((id, q) => { lm[id] = { x: A[q * 2] + (B[q * 2] - A[q * 2]) * k, y: A[q * 2 + 1] + (B[q * 2 + 1] - A[q * 2 + 1]) * k, visibility: 1 }; });
    return lm;
  }

  // ── main loop ──────────────────────────────────────────────────────────────
  function loop(now) {
    const col = colors();
    let lm = null;
    if (mode === 'sample' && seq) lm = sequenceFrame(now);
    else if (mode === 'camera' && landmarker && video.readyState >= 2) {
      if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        try {
          const res = landmarker.detectForVideo(video, now);
          if (res.landmarks?.[0]) { smoothLandmarks(res.landmarks[0]); lastSeen = now; }
        } catch (e) { console.warn('pose detect failed', e); }
      }
      if (now - lastSeen < 600) { lm = smooth; say('Tracking. Move your arms to touch the target; step sideways or squat and the character follows.'); }
      else { smooth = null; say('No person detected. Step back so your head, shoulders and arms are in view.'); }
    }
    drawCamera(lm, col); drawGame(lm, col, now);
    if (mode === 'camera' || mode === 'sample') raf = requestAnimationFrame(loop);
  }

  function setButtons() {
    const on = mode === 'camera' || mode === 'sample' || mode === 'loading';
    btnStop.hidden = !on; btnTry.hidden = mode === 'camera' || mode === 'loading'; btnSample.hidden = mode === 'sample' || mode === 'loading';
    api?.companion?.signal(mode === 'camera' || mode === 'sample');
  }
  function stopCamera() {
    stream?.getTracks().forEach(t => t.stop()); stream = null; video.srcObject = null;
    try { landmarker?.close(); } catch {} landmarker = null;
  }
  function stop(msg) {
    runId++; cancelAnimationFrame(raf); stopCamera();
    mode = 'idle'; smooth = null; target = null; baseHip = null;
    capA.textContent = 'Camera is off';
    setButtons(); drawCamera(null, colors()); drawGame(null, colors(), 0);
    say(msg || 'Stopped. The camera is off.');
  }
  async function startSample(reason) {
    runId++; const id = runId;
    cancelAnimationFrame(raf); stopCamera();
    try { await loadSequence(); } catch { return stop('Could not load the sample sequence.'); }
    if (id !== runId) return;
    mode = 'sample'; smooth = null; target = null; baseHip = null;
    capA.textContent = 'Pre-recorded landmark sequence (no camera in use)';
    say((reason ? reason + ' ' : '') + 'Playing a pre-recorded landmark sequence so you can still see the character move.');
    setButtons(); raf = requestAnimationFrame(loop);
  }
  async function startCamera() {
    runId++; const id = runId;
    cancelAnimationFrame(raf);
    if (!navigator.mediaDevices?.getUserMedia) return startSample('This browser has no camera access.');
    mode = 'loading'; setButtons(); say('Waiting for camera permission…');
    const model = loadLandmarker(cfg);          // start the download while the permission prompt is open
    model.catch(() => {});
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: 'user', width: { ideal: cfg.video?.width || 480 }, height: { ideal: cfg.video?.height || 360 }, frameRate: { ideal: 30, max: 30 } } });
    } catch (e) {
      model.then(l => l.close()).catch(() => {});   // not needed without a camera
      if (id !== runId) return;
      const denied = e.name === 'NotAllowedError' || e.name === 'SecurityError';
      const none = e.name === 'NotFoundError' || e.name === 'OverconstrainedError' || e.name === 'DevicesNotFoundError';
      return startSample(denied ? 'Camera permission was denied.' : none ? 'No camera was found.' : 'The camera could not be started.');
    }
    if (id !== runId) { stream.getTracks().forEach(t => t.stop()); return; }
    video.srcObject = stream;
    try { await video.play(); } catch {}
    say('Loading the pose model (a few MB, first time only)…');
    try {
      landmarker = await Promise.race([model, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 30000))]);
    } catch (e) {
      console.warn('pose model failed to load', e);
      if (id !== runId) return;
      return startSample('The pose model could not be loaded (are you offline?).');
    }
    if (id !== runId) { try { landmarker.close(); } catch {} landmarker = null; return; }
    mode = 'camera'; lastSeen = performance.now(); lastVideoTime = -1;
    capA.textContent = 'You (mirrored), with detected joints';
    setButtons(); raf = requestAnimationFrame(loop);
  }

  btnTry.addEventListener('click', startCamera);
  btnSample.addEventListener('click', () => startSample(''));
  btnStop.addEventListener('click', () => stop());
  addEventListener('pagehide', () => { if (mode !== 'idle') stop(); });
  drawCamera(null, colors()); drawGame(null, colors(), 0);
  if (reduced()) status.textContent += ' (The demo shows live motion once started.)';
}
