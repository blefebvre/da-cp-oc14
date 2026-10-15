/* eslint-disable */
/* global WebImporter */
/**
 * Parser for hero (vanilla). Source: https://www.cp.com/en/shop-online
 *
 * Design-system top banner -> EDS hero convention, 1 column:
 *   row 1: background image (optional; empty on the source - the red band is
 *          the block's own styling, see blocks/hero)
 *   row 2: H1 title, intro paragraph(s), optional CTA link
 *
 * Validated selectors (migration-work/cleaned.html, shop-online):
 *   .top-banner-design-system > .ds_c-top-banner
 *     .ds_c-top-banner__media-box        (empty; picture/img when an image is authored)
 *     .ds_c-top-banner__content-holder
 *       > h1.ds_c-top-banner__heading    (two sentences split by <br>)
 *       > .ds_c-top-banner__rte          (plain text or rich text <p>s)
 */
export default function parse(element, { document }) {
  const media = element.querySelector('.ds_c-top-banner__media-box');
  const picture = media && (media.querySelector('picture') || media.querySelector('img'));
  const holder = element.querySelector('.ds_c-top-banner__content-holder') || element;

  const content = [];
  const heading = holder.querySelector('h1, h2, h3');
  if (heading) {
    const h = document.createElement(heading.tagName.toLowerCase());
    h.innerHTML = heading.innerHTML.trim();
    content.push(h);
  }

  holder.querySelectorAll('.ds_c-top-banner__rte').forEach((rte) => {
    const paras = [...rte.querySelectorAll('p')].filter((p) => p.textContent.trim());
    if (paras.length) {
      content.push(...paras);
    } else if (rte.textContent.trim()) {
      const p = document.createElement('p');
      p.innerHTML = rte.innerHTML.trim();
      content.push(p);
    }
  });

  // CTA links in the banner (if any)
  holder.querySelectorAll('.ds_c-top-banner__cta a[href], a.ds_c-button[href]').forEach((a) => {
    const p = document.createElement('p');
    p.append(a);
    content.push(p);
  });

  if (!content.length && !picture) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, {
    name: 'hero',
    cells: [[picture || ''], [content.length ? content : '']],
  });
  element.replaceWith(block);
}
