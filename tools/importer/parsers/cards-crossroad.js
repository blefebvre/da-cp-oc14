/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-crossroad. Base: cards. Source: https://www.cp.com/en
 *
 * Output (cards convention, 2 columns; content model from authoring-analysis.json and
 * blocks/cards-crossroad/cards-crossroad.js):
 *   one row per division card: [ image | H2 title, description <p>, <p><a>Explore</a></p>, <ul> region links ]
 *
 * Validated selectors (migration-work/block-context/cards-crossroad/source.html):
 *   .crossroad-card#tab-left|tab-middle|tab-right  (div, iterationSafe per structure.json, x3)
 *   h2.title-text, p.basubtext (contains a.bamobileLink "Explore" with href="javascript:;" - stripped)
 * Region links live OUTSIDE the block, in the header language overlay (cleaned.html L1110 / L106):
 *   .tabcontentcontainer .tabcontent#<id> .languages li a.clink   (desktop)
 *   #<id>Mobile.tabcontentMobile .languages li a.clink              (mobile duplicate, fallback)
 * Note: ids are duplicated on the page (button.tablinks, div.tabcontent, div.crossroad-card all use
 * id="tab-left"), so lookups are always class-qualified. Desktop card links are "javascript:;" - never used.
 * Background images are CSS backgrounds: inline style / data attributes / computed style, else
 * fallback to the known absolute source URLs (migration-work/metadata.json images.mapping).
 */
const FALLBACK_IMAGES = {
  'tab-left': 'https://www.cp.com/content/dam/brands/cp/corporate/new-corporate-content/ctba-splash-2.jpg',
  'tab-middle': 'https://www.cp.com/content/dam/brands/cp/corporate/new-corporate-content/splash-itba-2.png',
  'tab-right': 'https://www.cp.com/content/dam/brands/Chicago%20Pneumatic/construction-technique/portable-air-division/pictures-web/brand/02-cp-brand-image-greyscale.jpg',
};

function cleanText(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

// Inline styles on the live page use CSS hex escapes (e.g. "\2f content\2f dam...").
function cssUnescape(value) {
  return value
    .replace(/\\([0-9a-fA-F]{1,6})[ \t\n\r\f]?/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/\\(.)/g, '$1');
}

function toAbsolute(url, doc) {
  let base = 'https://www.cp.com/';
  try {
    const b = new URL(doc.baseURI || '');
    if (/^https?:$/.test(b.protocol) && !/^(localhost|127\.0\.0\.1)$/.test(b.hostname)) base = b.href;
  } catch (e) { /* keep default */ }
  try {
    return new URL(url, base).href;
  } catch (e) {
    return url;
  }
}

function urlFromCss(value) {
  if (!value) return null;
  const m = value.match(/url\(\s*(['"]?)(.+?)\1\s*\)/i);
  return m ? cssUnescape(m[2]).trim() : null;
}

function isUsableHref(href) {
  return !!href && !/^javascript:/i.test(href.trim()) && href.trim() !== '#';
}

function findBackgroundUrl(card, doc) {
  const candidates = [card, ...card.querySelectorAll('*')];
  // 1. inline style
  for (const el of candidates) {
    const url = urlFromCss(el.getAttribute('style'));
    if (url) return url;
  }
  // 2. data attributes
  for (const el of candidates) {
    for (const attr of [...el.attributes]) {
      if (/^data-.*(src|bg|background|image|img)/i.test(attr.name) && attr.value
        && /\.(jpe?g|png|webp|gif|avif)|scene7|\/content\/dam\//i.test(attr.value)) {
        return urlFromCss(attr.value) || attr.value.trim();
      }
    }
  }
  // 3. computed style (live DOM only)
  const view = doc.defaultView;
  if (view && typeof view.getComputedStyle === 'function') {
    for (const el of candidates) {
      try {
        const url = urlFromCss(view.getComputedStyle(el).backgroundImage);
        if (url) return url;
      } catch (e) { /* ignore */ }
    }
  }
  // 4. known mapping by card id
  return FALLBACK_IMAGES[card.id] || null;
}

function findRegionLinks(card, doc) {
  const id = card.id;
  if (!id) return [];
  let links = [];
  const desktop = [...doc.querySelectorAll('.tabcontentcontainer .tabcontent')]
    .find((el) => el.id === id);
  if (desktop) links = [...desktop.querySelectorAll('.languages li a.clink')];
  if (!links.length) {
    const mobile = [...doc.querySelectorAll('.tabcontentMobile')]
      .find((el) => el.id === `${id}Mobile`);
    if (mobile) links = [...mobile.querySelectorAll('.languages li a.clink')];
  }
  return links
    .map((a) => {
      const href = a.getAttribute('href');
      if (!isUsableHref(href)) return null;
      const parts = [...a.querySelectorAll('.clink_uline')]
        .map((s) => cleanText(s.textContent)).filter(Boolean);
      const label = parts.length ? parts.join(' - ') : cleanText(a.textContent);
      return label ? { href, label } : null;
    })
    .filter(Boolean);
}

function pickPrimary(regions) {
  if (!regions.length) return null;
  return regions.find((r) => /\/en-international\/?$/i.test(r.href))
    || regions.find((r) => /\/en(-us)?\/?$/i.test(r.href))
    || regions.find((r) => /\/en[-/]/i.test(r.href))
    || regions[0];
}

export default function parse(element, { document }) {
  const doc = element.ownerDocument || document;
  let cards = [...element.querySelectorAll('.crossroad-card')];
  if (!cards.length) cards = [...element.querySelectorAll(':scope > div > div')];

  const cells = [];
  cards.forEach((card) => {
    const titleEl = card.querySelector('h2.title-text') || card.querySelector('h2, h3');
    const titleText = cleanText(titleEl && titleEl.textContent);

    // Cell 1: image (real <img> if present, otherwise CSS background / known fallback)
    const imageCell = [];
    const existingImg = card.querySelector('img');
    if (existingImg) {
      imageCell.push(existingImg);
    } else {
      const bgUrl = findBackgroundUrl(card, doc);
      if (bgUrl) {
        const img = document.createElement('img');
        img.src = toAbsolute(bgUrl, doc);
        img.alt = titleText;
        imageCell.push(img);
      }
    }

    // Cell 2: title, description, Explore link, region list
    const content = [];
    if (titleText) {
      const h2 = document.createElement('h2');
      h2.textContent = titleText;
      content.push(h2);
    }

    const descEl = card.querySelector('p.basubtext') || card.querySelector('p');
    if (descEl) {
      const clone = descEl.cloneNode(true);
      clone.querySelectorAll('a').forEach((a) => a.remove());
      const descText = cleanText(clone.textContent);
      if (descText) {
        const p = document.createElement('p');
        p.textContent = descText;
        content.push(p);
      }
    }

    const regions = findRegionLinks(card, doc);
    const primary = pickPrimary(regions);
    const ownLink = [...card.querySelectorAll('a[href]')]
      .find((a) => isUsableHref(a.getAttribute('href')));
    const exploreHref = primary ? primary.href : (ownLink && ownLink.getAttribute('href'));
    if (exploreHref) {
      const p = document.createElement('p');
      const a = document.createElement('a');
      a.href = exploreHref;
      a.textContent = 'Explore';
      p.append(a);
      content.push(p);
    }

    if (regions.length) {
      const ul = document.createElement('ul');
      regions.forEach(({ href, label }) => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = href;
        a.textContent = label;
        li.append(a);
        ul.append(li);
      });
      content.push(ul);
    }

    if (!content.length && !imageCell.length) return;
    cells.push([imageCell.length ? imageCell : '', content.length ? content : '']);
  });

  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-crossroad', cells });
  element.replaceWith(block);
}
