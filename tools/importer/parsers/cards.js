/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards (vanilla). Source: https://www.cp.com/en/about/what-we-offer
 *
 * "Our business areas" local contact banner -> 2 columns, one row per card:
 *   [ image | H5 title, description p, "Read more" link p ]
 * The banner heading (h3) stays default content above the block.
 *
 * Validated selectors (migration-work/about-src/main_en_about_what-we-offer.html):
 *   .local-contact-banner .o-grid > .o-grid__item > .local-contact-card
 *     > .o-mask picture > img          (Scene7 src resolved by cp-dm-images)
 *     > .c-tile [data-mh="content"] > h5, p, ul.o-list (empty), p.local-contact-card-link > a.c-button
 */
function cleanText(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

export default function parse(element, { document }) {
  let cards = [...element.querySelectorAll('.local-contact-card')];
  if (!cards.length) cards = [...element.querySelectorAll('.o-grid__item')];

  const rows = [];
  cards.forEach((card) => {
    const img = card.querySelector('picture') || card.querySelector('img');
    const body = card.querySelector('[data-mh="content"]') || card.querySelector('.c-tile') || card;
    const content = [];
    [...body.querySelectorAll('h1, h2, h3, h4, h5, h6, p, ul, ol')].forEach((el) => {
      if (el.parentElement.closest('ul, ol')) return;
      if (!cleanText(el.textContent) && !el.querySelector('img, a')) return;
      if (/^H\d$/.test(el.tagName)) {
        const h = document.createElement(el.tagName.toLowerCase());
        h.textContent = cleanText(el.textContent);
        content.push(h);
      } else {
        // outlined "Read more" CTA (a.c-button) -> secondary button (<em><a>)
        const cta = el.tagName === 'P' && el.querySelector('a.c-button');
        if (cta && cleanText(el.textContent) === cleanText(cta.textContent) && !cta.closest('em, strong')) {
          const em = document.createElement('em');
          cta.replaceWith(em);
          em.append(cta);
        }
        content.push(el);
      }
    });
    if (!img && !content.length) return;
    rows.push([img || '', content.length ? content : '']);
  });

  if (!rows.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards', cells: rows });
  element.replaceWith(block);
}
