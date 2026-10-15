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
 *
 * Option "jobs" (https://www.cp.com/en/careers "These are our most recently posted jobs"):
 *   .recent-jobs-banner > .o-grid > .o-grid__item
 *     first item: h4 banner title only -> kept as default content above the block
 *     job items:  h6 > a (title + link), p.c-caption (category), p.c-caption (date)
 *   -> 'cards (jobs)', one row per job, single cell [ h6 > a, p, p ]
 *   (static snapshot of the job feed at import time)
 */
function cleanText(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

function parseJobs(element, document) {
  const before = [];
  const rows = [];
  [...element.querySelectorAll(':scope > .o-grid__item, :scope > .o-grid__item-fix > .o-grid__item')].forEach((item) => {
    const title = item.querySelector('h6, h5');
    if (!title) {
      // banner heading item -> default content
      item.querySelectorAll('h1, h2, h3, h4, h5, h6, p').forEach((el) => {
        if (cleanText(el.textContent)) before.push(el);
      });
      return;
    }
    const content = [];
    const h = document.createElement(title.tagName.toLowerCase());
    const a = title.querySelector('a[href]');
    if (a) {
      const link = document.createElement('a');
      // The job feed builds detail links relative to the current page
      // (/en/careers/our-culture/job-overview/job-detail/... -> 404 on the source);
      // normalise them to the canonical /en/careers/job-overview/job-detail/... path.
      link.href = (a.getAttribute('href') || '')
        .replace(/^(\/[a-z]{2}(?:-[a-z]{2})?\/careers)\/(?:[^/]+\/)+?(job-overview\/job-detail\/)/, '$1/$2');
      link.textContent = cleanText(a.textContent);
      h.append(link);
    } else {
      h.textContent = cleanText(title.textContent);
    }
    content.push(h);
    item.querySelectorAll('p').forEach((pEl) => {
      const text = cleanText(pEl.textContent);
      if (!text) return;
      const para = document.createElement('p');
      para.textContent = text;
      content.push(para);
    });
    rows.push([content]);
  });
  if (!rows.length) {
    element.replaceWith(...element.childNodes);
    return;
  }
  const block = WebImporter.Blocks.createBlock(document, { name: 'cards (jobs)', cells: rows });
  element.replaceWith(...before, block);
}

/**
 * Option "links" (https://www.cp.com/en/sys/sitemap HTML sitemap):
 *   .sitemap .o-grid > .o-grid__item > div
 *     > h6 > a.c-list__nested__link     (section page)
 *     > ul.c-list-nested > li > a.c-link (child pages; the list may be empty)
 *   -> 'cards (links)', one row per group, single cell [ h6 > a, ul > li > a ]
 *   (static copy of the AEM-generated page tree at import time)
 */
function parseLinks(element, document) {
  const rows = [];
  [...element.querySelectorAll(':scope > .o-grid__item')].forEach((item) => {
    const title = item.querySelector('h1, h2, h3, h4, h5, h6');
    if (!title) return;
    const content = [];
    const h = document.createElement(title.tagName.toLowerCase());
    const a = title.querySelector('a[href]');
    if (a) {
      const link = document.createElement('a');
      link.href = a.getAttribute('href');
      link.textContent = cleanText(a.textContent);
      h.append(link);
    } else {
      h.textContent = cleanText(title.textContent);
    }
    content.push(h);
    const links = [...item.querySelectorAll('ul > li > a[href]')]
      .filter((l) => cleanText(l.textContent));
    if (links.length) {
      const ul = document.createElement('ul');
      links.forEach((l) => {
        const li = document.createElement('li');
        const link = document.createElement('a');
        link.href = l.getAttribute('href');
        link.textContent = cleanText(l.textContent);
        li.append(link);
        ul.append(li);
      });
      content.push(ul);
    }
    rows.push([content]);
  });
  if (!rows.length) {
    element.replaceWith(...element.childNodes);
    return;
  }
  const block = WebImporter.Blocks.createBlock(document, { name: 'cards (links)', cells: rows });
  element.replaceWith(block);
}

export default function parse(element, { document }) {
  if (element.closest('.sitemap')) {
    parseLinks(element, document);
    return;
  }
  if (element.closest('.recent-jobs-banner')) {
    parseJobs(element, document);
    return;
  }

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
