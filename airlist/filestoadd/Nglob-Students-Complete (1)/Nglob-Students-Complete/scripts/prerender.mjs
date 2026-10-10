import { readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { render } from '../.ssr/entry-server.js';

// Both the HTTP preview and the local-file preview use this one rendered build.
const { html, hydration } = render();
const template = await readFile('preview/index.html', 'utf8');
if (!template.includes('<!--hydration-->') || !template.includes('<!--app-html-->')) {
  throw new Error('The preview HTML is missing its prerender placeholders.');
}
const rendered = template
  .replace('<!--hydration-->', hydration)
  .replace('<!--app-html-->', html)
  // Vite builds the single browser entry as an IIFE, so it can be a classic script.
  .replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/g, '<script defer src="$1"></script>')
  .replace(/(<link rel="stylesheet") crossorigin/g, '$1')
  // Local fonts are embedded in CSS below; file:// font fetches can fail CORS.
  .replace(/\s*<link\b[^>]*\bas="font"[^>]*>/g, '');
if (rendered.includes('type="module"') || rendered.includes('<!--app-html-->')) {
  throw new Error('Portable preview generation did not finish.');
}
await writeFile('preview/index.html', rendered);

const font = await readFile('public/nglob-students/assets/inter.woff2');
const fontUrl = `data:font/woff2;base64,${font.toString('base64')}`;
async function embedLocalFont(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await embedLocalFont(path);
    else if (entry.name.endsWith('.css')) {
      const css = await readFile(path, 'utf8');
      await writeFile(path, css.replace(/url\(\s*['"]?[^)'"\s]*inter\.woff2['"]?\s*\)/g, `url("${fontUrl}")`));
    }
  }
}
await embedLocalFont('preview');
const launcher = await readFile(new URL('./preview-launcher.html', import.meta.url), 'utf8');
await writeFile('OPEN_PREVIEW.html', launcher);
await rm('.ssr', { recursive: true, force: true });
console.log('Built preview/index.html and OPEN_PREVIEW.html (desktop + mobile).');
