/* eslint-disable no-console */
/**
 * Uploads content/*.plain.html pages to Document Authoring and triggers AEM preview.
 *
 * usage: node tools/importer/da-upload.js <page> [<page> ...]
 *   <page> is a content path without extension, e.g. "en", "en/about", "nav"
 *
 * Relative image references (images/foo.png) are uploaded to DA under /images/
 * and rewritten to their content.da.live URLs.
 */
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const ORG = 'blefebvre';
const SITE = 'da-cp-oc14';
const CONTENT_DIR = path.resolve('content');
const DA_SOURCE = `https://admin.da.live/source/${ORG}/${SITE}`;
const DA_CONTENT = `https://content.da.live/${ORG}/${SITE}`;
const ADMIN = `https://admin.hlx.page/preview/${ORG}/${SITE}/main`;

const uploadedImages = new Set();

async function post(url, blob, filename) {
  const form = new FormData();
  form.append('data', blob, filename);
  const resp = await fetch(url, { method: 'POST', body: form });
  if (!resp.ok) throw new Error(`${resp.status} ${url}: ${await resp.text()}`);
}

async function uploadImage(rel) {
  const clean = rel.replace(/^\.?\//, '');
  if (uploadedImages.has(clean)) return `${DA_CONTENT}/${clean}`;
  const file = path.join(CONTENT_DIR, clean);
  if (!existsSync(file)) throw new Error(`missing image ${file}`);
  const ext = path.extname(file).slice(1).replace('jpg', 'jpeg').replace('svg', 'svg+xml');
  await post(`${DA_SOURCE}/${clean}`, new Blob([await readFile(file)], { type: `image/${ext}` }), path.basename(file));
  uploadedImages.add(clean);
  return `${DA_CONTENT}/${clean}`;
}

async function uploadPage(page) {
  const file = path.join(CONTENT_DIR, `${page}.plain.html`);
  let html = await readFile(file, 'utf-8');
  const rel = [...html.matchAll(/src="((?:\.\/)?images\/[^"]+)"/g)].map((m) => m[1]);
  // eslint-disable-next-line no-restricted-syntax
  for (const src of new Set(rel)) {
    // eslint-disable-next-line no-await-in-loop
    const url = await uploadImage(src);
    html = html.split(`src="${src}"`).join(`src="${url}"`);
  }
  const doc = `<body><header></header><main>${html}</main><footer></footer></body>`;
  await post(`${DA_SOURCE}/${page}.html`, new Blob([doc], { type: 'text/html' }), `${path.basename(page)}.html`);
  const preview = await fetch(`${ADMIN}/${page === 'index' ? '' : page}`, { method: 'POST' });
  console.log(`${page}: uploaded, preview ${preview.status}`);
}

const pages = process.argv.slice(2);
if (!pages.length) {
  console.error('usage: node tools/importer/da-upload.js <page> [...]');
  process.exit(1);
}
// eslint-disable-next-line no-restricted-syntax
for (const page of pages) {
  try {
    // eslint-disable-next-line no-await-in-loop
    await uploadPage(page);
  } catch (e) {
    console.error(`${page}: FAILED ${e.message}`);
    process.exitCode = 1;
  }
}
