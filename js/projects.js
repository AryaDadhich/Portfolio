// projects.js — renders the projects from content.js and lazy-loads each demo
// module only when its section scrolls into view.
import { content as C, initPage, txt, esc, link, tags, decorate } from './common.js';

const companion = initPage('projects');
const short = t => t.split(/ — | for | with /)[0];

document.querySelector('#index').innerHTML = C.projects.map(p => `<a href="#${esc(p.id)}">${esc(short(p.title))}</a>`).join('');
document.querySelector('#list').innerHTML = C.projects.map(p => `
  <article class="project" id="${esc(p.id)}" aria-labelledby="${esc(p.id)}-t">
    <div class="p-text">
      <h2 id="${esc(p.id)}-t">${txt(p.title)}</h2>
      <p class="meta">${txt(p.period)} · ${txt(p.context)}</p>
      <p>${txt(p.summary)}</p>
      <ul class="hl">${(p.highlights || []).map(x => `<li>${txt(x)}</li>`).join('')}</ul>
      ${tags(p.tags)}
      ${p.links?.length ? `<p class="links">${p.links.map(l => link(l.label, l.href)).join('')}</p>` : ''}
    </div>
    <div class="demo" data-sketch="rect" data-fill="paperDeep" data-id="${esc(p.id)}">
      <div class="demo-head"><span class="demo-type">${esc(p.demo.type)}</span></div>
      <div class="demo-body"><p class="muted small">Loading demo…</p></div>
      <p class="demo-why"><strong>Why this demo:</strong> ${txt(p.demo.why)}</p>
    </div>
  </article>`).join('');
decorate();

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
    body.innerHTML = '<p class="small">This demo could not be loaded. Please refresh the page.</p>';
  }
}), { rootMargin: '300px 0px' });
document.querySelectorAll('.demo').forEach(d => io.observe(d));
