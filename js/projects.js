// projects.js — renders the projects from content.js. A project may have a
// demo; its module is loaded only when the section scrolls into view.
import { content as C, initPage, txt, esc, link, tags, decorate } from './common.js';

const companion = initPage('projects');
const short = t => t.split(/ — | for | with /)[0];
// disclaimers are always shown in brackets, small and muted
const note = s => (s ? `<p class="demo-note">${/^\(.*\)$/.test(s.trim()) ? txt(s.trim()) : '(' + txt(s.trim()) + ')'}</p>` : '');

document.querySelector('#index').innerHTML = C.projects.map(p => `<a href="#${esc(p.id)}">${esc(short(p.title))}</a>`).join('');
document.querySelector('#list').innerHTML = C.projects.map(p => `
  <article class="project${p.demo ? '' : ' no-demo'}" id="${esc(p.id)}" aria-labelledby="${esc(p.id)}-t">
    <div class="p-text">
      <h2 id="${esc(p.id)}-t">${txt(p.title)}</h2>
      <p class="meta">${txt(p.period)} · ${txt(p.context)}</p>
      <p>${txt(p.summary)}</p>
      <ul class="hl">${(p.highlights || []).map(x => `<li>${txt(x)}</li>`).join('')}</ul>
      ${tags(p.tags)}
      ${p.links?.length ? `<p class="links">${p.links.map(l => link(l.label, l.href)).join('')}</p>` : ''}
      ${p.demo ? '' : note(p.note)}
    </div>
    ${p.demo ? `<div class="demo" data-sketch="rect" data-fill="paperDeep" data-id="${esc(p.id)}">
      ${p.demo.title ? `<div class="demo-head"><span class="demo-type">${txt(p.demo.title)}</span></div>` : ''}
      <div class="demo-body"><p class="muted small">Loading…</p></div>
      ${note(p.demo.note)}
    </div>` : ''}
  </article>`).join('');
decorate();
// deep links from the home scatter dots (#project-id): the sections are rendered above, so scroll now
if (location.hash.length > 1) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView({ behavior: 'instant', block: 'start' });

const io = new IntersectionObserver(entries => entries.forEach(async e => {
  if (!e.isIntersecting) return;
  io.unobserve(e.target);
  const p = C.projects.find(x => x.id === e.target.dataset.id), body = e.target.querySelector('.demo-body');
  try {
    const mod = await import(`./demos/${p.demo.module}.js`);
    body.innerHTML = '';
    mod.default(body, p.demo.config || {}, { companion, project: p });
    decorate(body);
  } catch (err) {
    console.error(err);
    body.innerHTML = '<p class="small">This could not be loaded. Please refresh the page.</p>';
  }
}), { rootMargin: '300px 0px' });
document.querySelectorAll('.demo').forEach(d => io.observe(d));
