// Extracts dominant colours from the source photo and derives the site's light pastel palette.
// Also writes the web-sized images. Run:  cd tools && npm install && node extract-palette.mjs
// Then copy the printed palette into content.js (palette) and css/style.css (:root fallback).
import sharp from 'sharp';
import * as CT from 'colorthief';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(here, 'source-photo.jpg');
const assets = path.join(here, '..', 'assets');

const toHsl = ([r, g, b]) => {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  let h = 0, s = 0;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
};
const toRgb = ([h, s, l]) => {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [r, g, b].map(v => Math.round((v + m) * 255));
};
const hex = rgb => '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('');
const lum = rgb => { const [r, g, b] = rgb.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// --- dominant colours -------------------------------------------------------
let dominant = null;
try {
  const fn = CT.getPalette || CT.default?.getPalette;
  const res = await fn(src, 10);
  dominant = res.map(c => Array.isArray(c) ? c : (c.rgb ? (Array.isArray(c.rgb) ? c.rgb : [c.rgb.r, c.rgb.g, c.rgb.b]) : (typeof c.array === 'function' ? c.array() : [c.r, c.g, c.b])));
  console.log('colorthief palette used');
} catch (e) {
  console.log('colorthief failed (' + e.message + '), using built-in k-means');
}
const { data, info } = await sharp(src).resize(160).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const px = [];
for (let i = 0; i < data.length; i += info.channels) px.push([data[i], data[i + 1], data[i + 2]]);
if (!dominant || dominant.some(c => !c || c.some(v => typeof v !== 'number' || Number.isNaN(v)))) {
  let cents = Array.from({ length: 10 }, (_, i) => px[Math.floor((i + 0.5) * px.length / 10)].slice());
  for (let it = 0; it < 12; it++) {
    const sum = cents.map(() => [0, 0, 0, 0]);
    for (const p of px) {
      let bi = 0, bd = 1e9;
      cents.forEach((c, i) => { const d = (c[0] - p[0]) ** 2 + (c[1] - p[1]) ** 2 + (c[2] - p[2]) ** 2; if (d < bd) { bd = d; bi = i; } });
      const s = sum[bi]; s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; s[3]++;
    }
    cents = cents.map((c, i) => sum[i][3] ? sum[i].slice(0, 3).map(v => Math.round(v / sum[i][3])) : c);
  }
  dominant = cents;
}
console.log('dominant:', dominant.map(hex).join(' '));

// --- derive the palette -----------------------------------------------------
const hs = dominant.map(c => ({ rgb: c, hsl: toHsl(c) }));
const pickHue = (lo, hi, fallback) => {
  const c = hs.filter(c => c.hsl[0] >= lo && c.hsl[0] < hi && c.hsl[1] > 0.08).sort((a, b) => b.hsl[1] - a.hsl[1])[0];
  return c ? c.hsl[0] : fallback;
};
const sky = pickHue(190, 250, 212);     // sky / distant ridges
const grass = pickHue(55, 150, 75);     // meadow
const earth = pickHue(15, 55, 38);      // skin, dry ground, trousers
// warm dark ink: average of the warm, dark pixels (hair, shadowed trousers)
const warmDark = px.filter(p => { const [h, s, l] = toHsl(p); return l < 0.3 && h > 10 && h < 70 && s > 0.08; });
const avg = warmDark.length ? [0, 1, 2].map(i => warmDark.reduce((a, p) => a + p[i], 0) / warmDark.length) : [60, 50, 40];
const inkHue = toHsl(avg)[0];

const palette = {
  paper: toRgb([earth, 0.38, 0.965]),
  paperDeep: toRgb([earth, 0.32, 0.935]),
  tintSky: toRgb([sky, 0.42, 0.885]),
  tintMeadow: toRgb([grass, 0.30, 0.875]),
  tintSand: toRgb([earth, 0.45, 0.885]),
  accent: toRgb([sky, 0.36, 0.74]),
  accentInk: toRgb([sky, 0.38, 0.33]),
  ink: toRgb([inkHue, 0.22, 0.17]),
  inkSoft: toRgb([inkHue, 0.12, 0.36]),
};
const out = Object.fromEntries(Object.entries(palette).map(([k, v]) => [k, hex(v)]));
console.log(JSON.stringify(out, null, 2));
for (const bg of ['paper', 'paperDeep', 'tintSky', 'tintMeadow', 'tintSand', 'accent'])
  console.log(`contrast ink/${bg}: ${contrast(palette.ink, palette[bg]).toFixed(2)}  inkSoft: ${contrast(palette.inkSoft, palette[bg]).toFixed(2)}  accentInk: ${contrast(palette.accentInk, palette[bg]).toFixed(2)}`);
fs.writeFileSync(path.join(here, 'palette.json'), JSON.stringify({ dominant: dominant.map(hex), palette: out }, null, 2));

// --- web images -------------------------------------------------------------
await sharp(src).extract({ left: 30, top: 470, width: 460, height: 460 }).resize(560, 560).jpeg({ quality: 84 }).toFile(path.join(assets, 'portrait.jpg'));
await sharp(src).resize(900).jpeg({ quality: 80 }).toFile(path.join(assets, 'trek-01.jpg'));
await sharp(src).extract({ left: 0, top: 380, width: 960, height: 504 }).resize(1200, 630).jpeg({ quality: 80 }).toFile(path.join(assets, 'og.jpg'));
console.log('images written');
