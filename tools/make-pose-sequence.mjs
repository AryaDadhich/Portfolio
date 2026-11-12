// Generates assets/pose-sequence.json: a looped landmark sequence used by the pose demo
// when the camera is unavailable or permission is denied.
// The motion is synthesised from a simple kinematic figure (wave, arm raises, side steps, squat).
// To use a real recording instead, write the same JSON shape:
//   { fps, idx: [MediaPipe landmark indices], frames: [[x0, y0, x1, y1, …]] }  (normalised 0–1, un-mirrored)
// Run: node tools/make-pose-sequence.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FPS = 30, SECONDS = 10, W = 480, H = 360;
const IDX = [0, 7, 8, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
const bump = (t, a, b) => (t <= a || t >= b ? 0 : 0.5 - 0.5 * Math.cos(((t - a) / (b - a)) * Math.PI * 2)); // 0→1→0
const rad = d => (d * Math.PI) / 180;
const frames = [];

for (let f = 0; f < FPS * SECONDS; f++) {
  const t = f / FPS;
  const wave = bump(t, 0.3, 2.6), raise = bump(t, 2.8, 5), stepPh = bump(t, 5.2, 7.6), squat = bump(t, 7.8, 9.800);
  const sway = Math.sin(t * 1.3) * 3 + stepPh * Math.sin((t - 5.2) * Math.PI * 1.25) * 70;
  const cx = W / 2 + sway, drop = squat * 34, breathe = Math.sin(t * 2) * 1.2;
  const shY = 132 + drop + breathe, hipY = 232 + drop * 1.15, sw = 46, hw = 30, upper = 44, fore = 40, thigh = 52, shin = 50;
  const pt = {};
  pt[0] = [cx + Math.sin(t * 0.9) * 2, shY - 44];
  pt[7] = [pt[0][0] + 13, pt[0][1] - 2]; pt[8] = [pt[0][0] - 13, pt[0][1] - 2];   // image-left is the person's right
  pt[11] = [cx + sw, shY]; pt[12] = [cx - sw, shY];
  pt[23] = [cx + hw, hipY]; pt[24] = [cx - hw, hipY];
  // arm angles measured from straight down, positive = away from the body
  const arm = (sh, side, a1, a2) => {
    const e = [sh[0] + side * Math.sin(a1) * upper, sh[1] + Math.cos(a1) * upper];
    return [e, [e[0] + side * Math.sin(a2) * fore, e[1] + Math.cos(a2) * fore]];
  };
  const wig = Math.sin(t * 9) * 0.35 * wave;
  const lA1 = rad(12) + raise * rad(150) + stepPh * rad(78) + squat * rad(70);
  const lA2 = lA1 + rad(8) - squat * rad(20);
  const rA1 = rad(12) + wave * rad(120) + raise * rad(150) + stepPh * rad(78) + squat * rad(70);
  const rA2 = rA1 + rad(8) + wave * (rad(40) + wig) - squat * rad(20);
  [pt[13], pt[15]] = arm(pt[11], 1, lA1, lA2);
  [pt[14], pt[16]] = arm(pt[12], -1, rA1, rA2);
  // legs: feet stay on the ground, knees bend outwards as the hips drop
  const ground = 232 + thigh + shin;
  const leg = (hip, side) => {
    const foot = [hip[0] + side * 6 - sway * 0.25, ground];
    const d = Math.hypot(foot[0] - hip[0], foot[1] - hip[1]), reach = Math.min(d, thigh + shin - 0.01);
    const a = Math.acos((thigh * thigh + reach * reach - shin * shin) / (2 * thigh * reach));
    const base = Math.atan2(foot[0] - hip[0], foot[1] - hip[1]) + side * a;
    return [[hip[0] + Math.sin(base) * thigh, hip[1] + Math.cos(base) * thigh], foot];
  };
  [pt[25], pt[27]] = leg(pt[23], 1);
  [pt[26], pt[28]] = leg(pt[24], -1);
  frames.push(IDX.flatMap(i => [+(pt[i][0] / W).toFixed(4), +(pt[i][1] / H).toFixed(4)]));
}
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'pose-sequence.json');
fs.writeFileSync(out, JSON.stringify({ note: 'Synthesised looped landmark sequence for the pose demo fallback.', fps: FPS, idx: IDX, frames }));
console.log('wrote', out, frames.length, 'frames', (fs.statSync(out).size / 1024).toFixed(1) + ' KB');
