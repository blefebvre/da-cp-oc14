/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import cardsTileParser from './parsers/cards-tile.js';
import cardsParser from './parsers/cards.js';

// TRANSFORMER IMPORTS
import cpCleanupTransformer from './transformers/cp-cleanup.js';
import cpDmImagesTransformer from './transformers/cp-dm-images.js';
import cpSectionsTransformer from './transformers/cp-sections.js';

// PARSER REGISTRY
const parsers = {
  'cards-tile': cardsTileParser,
  cards: cardsParser,
};

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  "name": "about-2",
  "description": "Chicago Pneumatic editorial pages with a photo gallery or jobs banner (Our legacy, Careers): H1 + lead/intro text, decade timeline (headings + bullet lists) or image, heritage photo gallery with video tile, recently posted jobs banner, related-link tiles",
  "urls": [
    "https://www.cp.com/en/about/our-legacy",
    "https://www.cp.com/en/careers"
  ],
  "blocks": [
    {
      "name": "cards-tile",
      "instances": [
        ".cp-content-page > .card-overview .o-grid",
        ".generated-list .o-grid"
      ]
    },
    {
      "name": "cards",
      "instances": [
        ".cp-content-page > .recent-jobs-banner > .o-grid"
      ]
    }
  ],
  "sections": [
    {
      "id": "s1",
      "name": "intro",
      "selector": [
        ".cp-content-page > .title"
      ],
      "style": null,
      "blocks": [],
      "defaultContent": [
        ".title h1",
        ".paragraph .c-lead p",
        ".paragraph h5",
        ".subtitle h4",
        ".paragraph ul",
        ".image picture"
      ]
    },
    {
      "id": "s2",
      "name": "heritage-gallery",
      "selector": [
        ".cp-content-page > .card-overview"
      ],
      "style": null,
      "blocks": [
        "cards-tile"
      ],
      "defaultContent": []
    },
    {
      "id": "s3",
      "name": "recent-jobs",
      "selector": [
        ".cp-content-page > .recent-jobs-banner"
      ],
      "style": "wide, subdued",
      "blocks": [
        "cards"
      ],
      "defaultContent": [
        ".recent-jobs-banner h4",
        ".recent-jobs-banner > p a.c-button"
      ]
    },
    {
      "id": "s4",
      "name": "related-links",
      "selector": [
        ".cp-content-page > .c-row--divider:has(> .generated-list.u-align-75percent-center)"
      ],
      "style": "center",
      "blocks": [
        "cards-tile"
      ],
      "defaultContent": [
        ".title-box h4"
      ]
    }
  ]
};

// TRANSFORMER REGISTRY
// Order: cleanup -> DM images -> sections (sections run last so breaks/metadata land on cleaned DOM)
const transformers = [
  cpCleanupTransformer,
  cpDmImagesTransformer,
  ...(PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [cpSectionsTransformer] : []),
];

/**
 * Execute all page transformers for a specific hook
 * @param {string} hookName - 'beforeTransform' or 'afterTransform'
 * @param {Element} element - The DOM element to transform
 * @param {Object} payload - { document, url, html, params }
 */
function executeTransformers(hookName, element, payload) {
  const enhancedPayload = {
    ...payload,
    template: PAGE_TEMPLATE,
  };

  transformers.forEach((transformerFn) => {
    try {
      transformerFn.call(null, hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

/**
 * Find all blocks on the page based on the embedded template configuration
 * @param {Document} document
 * @param {Object} template
 * @returns {Array} block instances found on the page
 */
function findBlocksOnPage(document, template) {
  const pageBlocks = [];

  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) {
        console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
      }
      elements.forEach((element) => {
        pageBlocks.push({
          name: blockDef.name,
          selector,
          element,
          section: blockDef.section || null,
        });
      });
    });
  });

  console.log(`Found ${pageBlocks.length} block instances on page`);
  return pageBlocks;
}

export default {
  // helix-importer drops <img> without a usable src (lazy GIF placeholders)
  // before transform() runs, so resolve the Scene7 <picture> renditions on the
  // live document first (cp-dm-images beforeTransform is idempotent).
  onLoad: async ({ document }) => {
    try {
      cpDmImagesTransformer('beforeTransform', document.body, { document, url: document.location.href });
    } catch (e) {
      console.error('onLoad image resolution failed:', e);
    }
  },

  transform: (payload) => {
    const { document, url, params } = payload;

    const main = document.body;

    // 1. beforeTransform (initial cleanup, section break markers)
    executeTransformers('beforeTransform', main, payload);

    // 2. Find blocks
    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);

    // 3. Parse blocks (skip elements already replaced by an earlier parser)
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return;
      const parser = parsers[block.name];
      if (parser) {
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      } else {
        console.warn(`No parser found for block: ${block.name}`);
      }
    });

    // 4. afterTransform (final cleanup + section breaks/metadata)
    executeTransformers('afterTransform', main, payload);

    // 5. WebImporter built-in rules
    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 6. Sanitized path (root maps to /index)
    const rawPath = new URL(params.originalURL).pathname
      .replace(/\/$/, '')
      .replace(/\.html?$/, '');
    const isRoot = rawPath === '';
    const path = WebImporter.FileUtils.sanitizePath(isRoot ? '/index' : rawPath);

    const report = {
      title: document.title,
      template: PAGE_TEMPLATE.name,
      blocks: pageBlocks.map((b) => b.name),
    };
    return [{ element: main, path, report }];
  },
};
