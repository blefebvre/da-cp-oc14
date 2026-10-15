/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-tile. Base: cards. Source: https://www.cp.com/en
 *
 * Output (cards convention, 2 columns; content model from authoring-analysis.json and
 * blocks/cards-tile/cards-tile.js): one row per tile: [ image | H4 containing link ]
 *
 * Validated selectors (migration-work/block-context/cards-tile/source.html):
 *   .o-grid__item-fix (div, repeating unit x2, iterationSafe) > .o-grid__item > .c-tile
 *   .c-tile__img img (image; alt from the wrapper's title attribute)
 *   h4.c-tile__title > a.js-blocklink__source (title + link)
 *   .c-tile__content p (optional description; empty on source page)
 *   live DOM: .c-tile__img has no <img>; renditions in data-imgsrc-<width> (600 preferred)
 * Iteration is keyed on block-level div wrappers (never on anchors).
 *
 * Heritage gallery (/en/about/our-legacy .card-overview, masonry grid with quarter-width
 * items u-1-of-4-bp5) -> 'cards-tile (gallery)':
 *   .c-tile__content > h4.c-tile__title (empty) + h6 caption (no link) -> caption kept as h6
 *   a.c-tile.js-modal-video (video thumbnail + play icon, href="#") opening the sibling
 *   popup .mfp-container (#js-popup-data-*, data-mfp-src) whose YouTube iframe cp-cleanup
 *   turned into <p><a href="https://www.youtube.com/watch?v=...">; title from .mfp-title
 *   -> [ image | p > a(video URL, title) ]
 */
function cleanText(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

const VIDEO_LINK = 'a[href*="youtube.com/watch"], a[href*="youtu.be/"], a[href*="vimeo.com/"]';

// Video popup of a gallery video tile: data-mfp-src target, else the sibling popup
function findVideoPopup(tile, element, document) {
  const ref = tile.getAttribute('data-mfp-src');
  let popup = null;
  if (ref && ref.startsWith('#')) {
    try { popup = element.querySelector(ref) || document.querySelector(ref); } catch (e) { popup = null; }
  }
  if (!popup) {
    const holder = tile.closest('.o-grid__item-fix') || tile.parentElement && tile.parentElement.parentElement;
    popup = holder && holder.querySelector('.mfp-container');
  }
  return popup;
}

export default function parse(element, { document }) {
  let tiles = [...element.querySelectorAll('.c-tile')];
  if (!tiles.length) tiles = [...element.querySelectorAll('.o-grid__item')];

  // Masonry photo gallery (quarter-width items) vs homepage 2-up promo tiles
  const isGallery = !!element.closest('.card-overview') && !!element.querySelector('.o-grid__item[class*="u-1-of-4"]');

  const cells = [];
  tiles.forEach((tile) => {
    // Cell 1: image
    const imageCell = [];
    const imgWrap = tile.querySelector('.c-tile__img') || tile.querySelector('.cq-dd-image');
    let img = (imgWrap && imgWrap.querySelector('img')) || tile.querySelector('img');
    if (!img && imgWrap) {
      // Live DOM: lazy-loaded wrapper carries Scene7 renditions as data-imgsrc-<width>
      // (e.g. data-imgsrc-600="//atlascopco.scene7.com/is/image/atlascopco/...?$landscape600$").
      const renditions = [...imgWrap.attributes]
        .filter((a) => /^data-imgsrc-\d+$/.test(a.name) && a.value)
        .map((a) => ({ w: parseInt(a.name.split('-').pop(), 10), src: a.value.trim() }))
        .sort((a, b) => a.w - b.w);
      // gallery tiles render up to ~720px wide: use the 800 preset (as the source does)
      const preferred = isGallery ? 800 : 600;
      const pick = renditions.find((r) => r.w === preferred)
        || renditions.find((r) => r.w >= preferred) || renditions[renditions.length - 1];
      if (pick) {
        img = document.createElement('img');
        img.src = pick.src.startsWith('//') ? `https:${pick.src}` : pick.src;
      }
    }
    if (img) {
      if (!img.getAttribute('alt')) {
        const alt = cleanText(imgWrap && imgWrap.getAttribute('title'));
        if (alt) img.setAttribute('alt', alt);
      }
      imageCell.push(img);
    }

    // Cell 2: H4 containing the tile link (+ optional description)
    const content = [];
    let titleEl = tile.querySelector('.c-tile__title') || tile.querySelector('h2, h3, h4, h5');
    let titleTag = 'h4';
    if (isGallery && !cleanText(titleEl && titleEl.textContent)) {
      // gallery captions: empty h4.c-tile__title followed by an h6 caption
      const caption = [...tile.querySelectorAll('h1, h2, h3, h4, h5, h6')]
        .find((h) => cleanText(h.textContent));
      if (caption) {
        titleEl = caption;
        titleTag = caption.tagName.toLowerCase();
      }
    }
    const titleText = cleanText(titleEl && titleEl.textContent);
    const link = (titleEl && titleEl.querySelector('a[href]'))
      || tile.querySelector('a.js-blocklink__source[href]')
      || tile.closest('a[href]');
    if (titleText) {
      const h4 = document.createElement(titleTag);
      const href = link && link.getAttribute('href');
      if (href && !/^javascript:/i.test(href) && !(isGallery && href === '#')) {
        const a = document.createElement('a');
        a.href = href;
        a.textContent = titleText;
        h4.append(a);
      } else {
        h4.textContent = titleText;
      }
      content.push(h4);
    }

    // gallery video tile: the popup's video URL becomes the tile body
    if (isGallery && !titleText && tile.classList.contains('js-modal-video')) {
      const popup = findVideoPopup(tile, element, document);
      const videoLink = popup && popup.querySelector(VIDEO_LINK);
      if (videoLink) {
        const p = document.createElement('p');
        const a = document.createElement('a');
        a.href = videoLink.getAttribute('href');
        const popupTitle = popup.querySelector('.mfp-title');
        a.textContent = cleanText(popupTitle && popupTitle.textContent) || a.href;
        p.append(a);
        content.push(p);
      }
    }

    const contentWrap = tile.querySelector('.c-tile__content');
    if (contentWrap) {
      // direct paragraphs (homepage) or the generated-list teaser (.c-tile__desc > p)
      [...contentWrap.querySelectorAll(':scope > p, :scope > .c-tile__desc > p')].forEach((p) => {
        if (cleanText(p.textContent)) content.push(p);
      });
    }

    if (!content.length && !imageCell.length) return;
    cells.push([imageCell.length ? imageCell : '', content.length ? content : '']);
  });

  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  // Generated link lists on content pages (/en/about/* .generated-list, black
  // caption bar on 4:3 photos): "related" = centred 75%-width list
  // (.u-align-75percent-center, "Related links"), "list" = full-width list
  // ("More on sustainability"). Homepage .card-overview tiles stay the default.
  const list = element.closest('.generated-list');
  let name = isGallery ? 'cards-tile (gallery)' : 'cards-tile';
  if (list) {
    name = list.classList.contains('u-align-75percent-center') || list.querySelector('.generated-list-centered')
      ? 'cards-tile (related)' : 'cards-tile (list)';
  }

  const block = WebImporter.Blocks.createBlock(document, { name, cells });
  element.replaceWith(block);
}
