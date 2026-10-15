/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-mosaic. Base: columns. Source: https://www.cp.com/en/about
 *
 * Output (columns convention): one row per tile pair, 2 cells in source order:
 *   [ image | H4 + p ]  or  [ H4 + p | image ]
 * (blocks/columns-mosaic/columns-mosaic.js detects image vs text cells by content.)
 *
 * Validated selectors (migration-work/about-src/main_en_about.html):
 *   .card-overview .o-grid > .o-grid__item-fix (6 tiles, row-major, 2 per row)
 *   photo tile:  .o-grid__item-fix:not(.cardimg) .cq-dd-image.c-tile__img[title]
 *                (no <img>; Scene7 renditions in data-imgsrc-<width>)
 *   text tile:   .o-grid__item-fix.cardimg .c-tile__card h4.c-tile__title + p.c-tile__caption
 */
function cleanText(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

const PREFERRED_WIDTH = 1280;

function imageFromRenditions(wrap, document) {
  const renditions = [...wrap.attributes]
    .filter((a) => /^data-imgsrc-\d+$/.test(a.name) && a.value)
    .map((a) => ({ w: parseInt(a.name.split('-').pop(), 10), src: a.value.trim() }))
    .sort((a, b) => a.w - b.w);
  const pick = renditions.find((r) => r.w === PREFERRED_WIDTH)
    || renditions.find((r) => r.w >= PREFERRED_WIDTH) || renditions[renditions.length - 1];
  if (!pick) return null;
  const img = document.createElement('img');
  img.src = pick.src.startsWith('//') ? `https:${pick.src}` : pick.src;
  return img;
}

function tileCell(tile, document) {
  const titleEl = tile.querySelector('.c-tile__title, h2, h3, h4, h5');
  const title = cleanText(titleEl && titleEl.textContent);
  const captions = [...tile.querySelectorAll('.c-tile__caption, .c-tile__card p')]
    .filter((p, i, all) => all.indexOf(p) === i && cleanText(p.textContent));

  if (title || captions.length) {
    const content = [];
    if (title) {
      const h4 = document.createElement('h4');
      h4.textContent = title;
      content.push(h4);
    }
    captions.forEach((c) => {
      const p = document.createElement('p');
      p.textContent = cleanText(c.textContent);
      content.push(p);
    });
    return content;
  }

  const wrap = tile.querySelector('.c-tile__img, .cq-dd-image');
  // the site's lazy loader may already have injected a smaller rendition <img>;
  // the data-imgsrc-<width> set on the wrapper is authoritative
  let img = (wrap && imageFromRenditions(wrap, document)) || tile.querySelector('img');
  if (img && (!img.getAttribute('src') || img.getAttribute('src').startsWith('data:'))) img = null;
  if (!img) return null;
  if (!img.getAttribute('alt')) {
    const alt = cleanText(wrap && wrap.getAttribute('title'));
    if (alt) img.setAttribute('alt', alt);
  }
  return [img];
}

export default function parse(element, { document }) {
  let tiles = [...element.querySelectorAll('.o-grid__item-fix')];
  if (!tiles.length) tiles = [...element.querySelectorAll('.o-grid__item')];

  const cells = tiles.map((tile) => tileCell(tile, document)).filter(Boolean);
  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  // pair tiles into rows of 2 (source grid is 2 per row)
  const rows = [];
  for (let i = 0; i < cells.length; i += 2) {
    rows.push(cells[i + 1] ? [cells[i], cells[i + 1]] : [cells[i], '']);
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-mosaic', cells: rows });
  element.replaceWith(block);
}
