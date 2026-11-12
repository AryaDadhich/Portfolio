# Arya Dadhich — portfolio

A static, hand-drawn portfolio site. Plain HTML, CSS and JavaScript (ES modules). No build step, no backend.

## Run locally

The pages use ES modules, so they must be served over HTTP (opening the files directly with `file://` will not work).

```bash
node tools/serve.mjs
```

Then open http://localhost:5173. Any other static server works too (for example `npx serve .`).

The camera demo needs `localhost` or HTTPS, which is what you get locally and on GitHub Pages / Netlify.

## Edit your content

Everything you would want to change is in **`content.js`**: text, links, projects, demo settings, timeline, "life beyond code" cards, trekking page and the colour palette.

- Anything written as `[ADD: …]` is a placeholder. It shows on the site with a dashed outline and is never rendered as a link. Search `content.js` for `[ADD` and `[OTHER` to find them all.
- To add a "life beyond code" card, copy one line in the `beyond` list.
- To add trek photos, put the image in `assets/` and add a line to `trekking.photos`.
- To replace the CV, overwrite `assets/Arya_Dadhich_CV.pdf`.
- Colours: edit `palette` in `content.js`. (`css/style.css` has the same values as a fallback for the first paint; keep them in sync if you change the palette.)

## Structure

```
index.html          Home: the five-stage zoom scene (never scrolls)
projects.html       Projects, each with a lazy-loaded demo
about.html          Bio, contact, skills, life beyond code
experience.html     Trail-style timeline and CV download
trekking.html       Photos and expeditions
content.js          All content and the palette
css/style.css       All styles; CSS variables at the top
js/sketch.js        Hand-drawn line helper (wobbly SVG paths)
js/companion.js     The small walking companion
js/common.js        Header/footer, page transitions, shared helpers
js/home.js          Home scene
js/demos/*.js       One module per project demo (loaded on demand)
assets/             Images, CV PDF, fallback pose sequence
tools/              Local server and the scripts that generated the palette and assets
```

MediaPipe (pose model) is downloaded from its CDN only after a visitor presses "Try it" on the pose demo. Video never leaves the browser.

## Regenerating the palette and images

The palette was extracted from the portrait photo with `colorthief`:

```bash
cd tools
npm install
node extract-palette.mjs
```

It prints the palette (copy it into `content.js`) and rewrites `assets/portrait.jpg`, `assets/trek-01.jpg` and `assets/og.jpg` from `tools/source-photo.jpg`.

`node tools/make-pose-sequence.mjs` regenerates the fallback landmark sequence used when the camera is unavailable.

## Deploy to GitHub Pages

1. Create a repository on GitHub, for example `portfolio` (or `AryaDadhich.github.io` for a root-level address).
2. From this folder:

   ```bash
   git init
   git add .
   git commit -m "Portfolio site"
   git branch -M main
   git remote add origin https://github.com/AryaDadhich/portfolio.git
   git push -u origin main
   ```

3. On GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, branch `main`, folder `/ (root)`. Save.
4. After a minute the site is live at `https://aryadadhich.github.io/portfolio/`.
5. Update the `og:image` tag in each HTML file to the absolute URL (for example `https://aryadadhich.github.io/portfolio/assets/og.jpg`) so link previews show the image.

All links in the site are relative, so it works from a sub-path without changes. `tools/node_modules` is ignored by git.

**Netlify:** drag this folder onto https://app.netlify.com/drop, or connect the repository with no build command and `.` as the publish directory.
