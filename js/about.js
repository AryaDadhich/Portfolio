// about.js — bio, contact, skills and the "life beyond code" cards.
import { content as C, initPage, txt, esc, link, tags, decorate, icon, isPlaceholder } from './common.js';

const companion = initPage('about');
const P = C.person, $ = s => document.querySelector(s);

$('#bio').innerHTML = P.bio.map(p => `<p>${txt(p)}</p>`).join('') + (P.status ? `<p>${txt(P.status)}</p>` : '');
$('#contact-list').innerHTML = [
  ['Email', link(P.email, 'mailto:' + P.email)],
  ['LinkedIn', link(P.linkedin.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''), P.linkedin)],
  ['GitHub', link(P.github.replace(/^https?:\/\//, ''), P.github)],
  ['Based in', txt(P.location)],
].map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
$('#skills').innerHTML = C.skills.map(g => `<div><h3>${esc(g.group)}</h3>${tags(g.items)}</div>`).join('');

$('#beyond').innerHTML = C.beyond.map((c, i) => {
  const inner = `${icon(c.icon, 30)}<h3>${txt(c.title)}</h3><p>${txt(c.text)}</p>`;
  const attrs = `class="card" data-sketch="rect" data-fill="${esc(c.tint || 'tintSky')}" data-seed="${40 + i * 5}"`;
  if (c.href && !isPlaceholder(c.href)) {
    const ext = /^https?:/.test(c.href);
    return `<a ${attrs} href="${esc(c.href)}"${ext ? ' target="_blank" rel="noopener"' : ' data-zoom="in" data-tint="' + esc(c.tint || 'tintSky') + '"'}>${inner}<span class="go">${ext ? 'Visit' : 'Open'} ${icon(ext ? 'external' : 'arrowLeft', 14).replace('<svg', '<svg style="transform:scaleX(-1)"')}</span></a>`;
  }
  return `<div ${attrs}>${inner}${c.href ? `<p class="go">${txt(c.href)}</p>` : ''}</div>`;
}).join('');
decorate();

// the companion packs a rucksack here, and hops when you point at a card
companion.accessory('pack');
document.querySelectorAll('.card').forEach(c => c.addEventListener('pointerenter', () => companion.hop()));
if (location.hash === '#contact') $('#contact').scrollIntoView();
