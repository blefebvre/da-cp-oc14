/* eslint-disable */
/* global WebImporter */
/**
 * Parser for widget (local block). Source: https://www.cp.com/en/careers/job-overview
 * (cp.com 301-redirects to the Atlas Copco Group SuccessFactors job search, pre-filtered on
 * the "CP Chicago Pneumatic" brand facet).
 *
 * The SuccessFactors search band is a third-party app (X-Frame-Options: SAMEORIGIN, so it
 * cannot be embedded). It is represented by the project's widget block pointing at the
 * local job-search widget (widgets/job-search.{html,css,js}), which renders the keyword +
 * location form and hands the query off to the real external search:
 *
 *   | widget |
 *   | <a href="/widgets/job-search.html?brand=...&locale=...">Search jobs</a> |
 *
 * Validated selectors (migration-work/cleaned.html):
 *   #search-wrapper .searchwell
 *     .input-group-addon[title]        -> keyword / location labels ("Search by keyword", ...)
 *     button.keywordsearchbutton       -> submit label ("Search jobs")
 *   brand: the active facet token button[title] (".CustomToken_tokenBtn__*"), or the
 *          facetFilters query param of the en_US language link
 *   locale: the en_US language link, defaulting to en_US
 */
function cleanText(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

function readBrand(document) {
  const token = document.querySelector('button[class*="CustomToken_tokenBtn"][title]');
  if (token && cleanText(token.getAttribute('title'))) return cleanText(token.getAttribute('title'));
  const link = document.querySelector('a[href*="facetFilters"]');
  if (link) {
    try {
      const facets = JSON.parse(new URL(link.href, 'https://www.jobs.atlascopcogroup.com').searchParams.get('facetFilters') || '{}');
      const values = Object.values(facets).flat();
      if (values.length) return values[0];
    } catch (e) {
      // ignore malformed facet filters
    }
  }
  return '';
}

export default function parse(element, { document }) {
  const brand = readBrand(document);
  const params = new URLSearchParams();
  if (brand) params.set('brand', brand);
  params.set('locale', 'en_US');

  const button = element.querySelector('button.keywordsearchbutton, button[type="submit"], button');
  const label = cleanText(button && (button.textContent || button.getAttribute('title'))) || 'Search jobs';

  const a = document.createElement('a');
  a.href = `/widgets/job-search.html?${params.toString()}`;
  a.textContent = label;

  const block = WebImporter.Blocks.createBlock(document, { name: 'widget', cells: [[a]] });
  element.replaceWith(block);
}
