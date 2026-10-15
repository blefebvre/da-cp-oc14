/* eslint-disable */
/* global WebImporter */

/**
 * Import script for template "careers" (https://www.cp.com/en/careers/job-overview).
 *
 * cp.com authors no content at this URL: it 301-redirects to the Atlas Copco Group
 * SuccessFactors job search, pre-filtered on the "CP Chicago Pneumatic" brand facet.
 * The importer therefore lands on a third-party app (foreign header/footer, live results,
 * facets, cookie manager) - none of which is cp.com content and none of which can be
 * embedded (X-Frame-Options: SAMEORIGIN) or snapshotted without going stale.
 *
 * The page is rebuilt as a cp.com "Job openings" page:
 *   H1 + intro (page label used by cp.com's own links to this URL)
 *   widget block -> /widgets/job-search.html?brand=...&locale=... (keyword/location form that
 *                   hands off to the real external search; parsed from the live search band)
 *   CTA button   -> the real external search URL (all CP jobs)
 *   link         -> the real "Get Job Alerts" subscription URL (from the live app)
 *   Metadata     -> cp.com-branded title/description (the source's belong to the external site)
 *
 * The cp-* transformers are intentionally not used: they target cp.com markup and the
 * redirected DOM is SuccessFactors markup.
 */

// PARSER IMPORTS
import widgetParser from './parsers/widget.js';

// PARSER REGISTRY
const parsers = {
  widget: widgetParser,
};

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  "name": "careers",
  "description": "Chicago Pneumatic job openings (/en/careers/job-overview): cp.com 301-redirects to the Atlas Copco Group SuccessFactors job search filtered to CP. Migrated as an EDS page: H1 + intro, job-search widget (keyword/location form that hands off to the external search), CTA to all CP jobs and job-alerts link",
  "urls": [
    "https://www.cp.com/en/careers/job-overview"
  ],
  "blocks": [
    {
      "name": "widget",
      "instances": [
        "#search-wrapper .searchwell"
      ]
    }
  ],
  "sections": [
    {
      "id": "s1",
      "name": "job-search",
      "selector": [
        ".innershell"
      ],
      "style": null,
      "blocks": [
        "widget"
      ],
      "defaultContent": [
        ".JobsSearch_createAlertBtn__7xEYa"
      ]
    }
  ]
};

const JOBS_ORIGIN = 'https://www.jobs.atlascopcogroup.com';
const DEFAULT_BRAND = 'CP Chicago Pneumatic';
const LOCALE = 'en_US';

// cp.com's own label for this URL (cards-tile "related" link on /en/careers, nav, footer)
const PAGE_HEADING = 'Job openings';
const PAGE_INTRO = 'Find your next role at Chicago Pneumatic. Search our current openings by keyword or location, or browse all positions on the Atlas Copco Group careers site.';
const PAGE_TITLE = 'Job openings - Chicago Pneumatic';
const PAGE_DESCRIPTION = 'Find your next role at Chicago Pneumatic. Search current job openings on the Atlas Copco Group careers site.';

function cleanText(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

function externalSearchUrl(brand) {
  const params = new URLSearchParams({
    q: '',
    locationsearch: '',
    locale: LOCALE,
    searchResultView: 'LIST',
    facetFilters: JSON.stringify({ filter1: [brand] }),
    pageNumber: '0',
  });
  return `${JOBS_ORIGIN}/search/?${params.toString()}`;
}

function alertsUrl(document) {
  const link = document.querySelector('a[href*="talentcommunity/subscribe"]');
  const href = link ? link.getAttribute('href') : `/talentcommunity/subscribe/?locale=${LOCALE}`;
  try {
    const url = new URL(href, JOBS_ORIGIN);
    url.searchParams.set('locale', LOCALE);
    return url.href;
  } catch (e) {
    return `${JOBS_ORIGIN}/talentcommunity/subscribe/?locale=${LOCALE}`;
  }
}

function brandFromWidget(block) {
  const a = block && block.querySelector('a[href]');
  if (!a) return '';
  try {
    return new URL(a.getAttribute('href'), JOBS_ORIGIN).searchParams.get('brand') || '';
  } catch (e) {
    return '';
  }
}

function el(document, tag, text) {
  const e = document.createElement(tag);
  if (text) e.textContent = text;
  return e;
}

function link(document, href, text) {
  const a = el(document, 'a', text);
  a.href = href;
  return a;
}

export default {
  transform: (payload) => {
    const { document, url, params } = payload;
    const body = document.body;

    // 1. Widget block from the live search band (fallback: synthesize one if the app didn't render)
    let widgetBlock = null;
    PAGE_TEMPLATE.blocks.forEach((blockDef) => {
      blockDef.instances.forEach((selector) => {
        const source = document.querySelector(selector);
        if (!source || widgetBlock) return;
        const holder = document.createElement('div');
        source.replaceWith(holder);
        holder.append(source);
        try {
          parsers[blockDef.name](source, { document, url, params });
          widgetBlock = holder.firstElementChild;
        } catch (e) {
          console.error(`Failed to parse ${blockDef.name} (${selector}):`, e);
        }
      });
    });
    if (!widgetBlock) {
      console.warn('careers: search band not found, synthesizing job-search widget');
      const q = new URLSearchParams({ brand: DEFAULT_BRAND, locale: LOCALE });
      widgetBlock = WebImporter.Blocks.createBlock(document, {
        name: 'widget',
        cells: [[link(document, `/widgets/job-search.html?${q.toString()}`, 'Search jobs')]],
      });
    }
    const brand = brandFromWidget(widgetBlock) || DEFAULT_BRAND;

    // 2. Job-alerts label from the live app (button text), defaulting to the app's wording
    const alertBtn = document.querySelector('[class*="JobsSearch_createAlertBtn"]');
    const alertLabel = cleanText(alertBtn && alertBtn.textContent) || 'Get Job Alerts';

    // 3. Rebuild main as a cp.com page (drop the third-party app chrome entirely)
    const main = document.createElement('div');
    main.append(el(document, 'h1', PAGE_HEADING));
    main.append(el(document, 'p', PAGE_INTRO));
    main.append(widgetBlock);

    const cta = el(document, 'p');
    // accent (red outlined) button, as cp.com's "Find all our open vacancies" CTA on /en/careers
    const strong = el(document, 'strong');
    const em = el(document, 'em');
    em.append(link(document, externalSearchUrl(brand), 'View all Chicago Pneumatic jobs'));
    strong.append(em);
    cta.append(strong);
    main.append(cta);

    const alerts = el(document, 'p');
    alerts.append(link(document, alertsUrl(document), alertLabel.replace(/ for this search$/i, '')));
    main.append(alerts);

    // 4. Metadata in its own trailing section (cp.com-branded; the source title/description
    //    belong to the external site)
    main.append(document.createElement('hr'));
    main.append(WebImporter.Blocks.createBlock(document, {
      name: 'Metadata',
      cells: {
        Title: PAGE_TITLE,
        Description: PAGE_DESCRIPTION,
      },
    }));

    body.innerHTML = '';
    body.append(...main.childNodes);

    // 5. Sanitized path from the cp.com URL (not the redirect target)
    const rawPath = new URL(params.originalURL).pathname
      .replace(/\/$/, '')
      .replace(/\.html?$/, '');
    const path = WebImporter.FileUtils.sanitizePath(rawPath || '/index');

    return [{
      element: body,
      path,
      report: {
        title: PAGE_TITLE,
        template: PAGE_TEMPLATE.name,
        blocks: ['widget'],
        note: 'cp.com 301-redirects to the external SuccessFactors job search; live results/facets not migrated',
      },
    }];
  },
};
