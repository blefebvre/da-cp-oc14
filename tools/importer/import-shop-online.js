/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import heroParser from './parsers/hero.js';
import cardsParser from './parsers/cards.js';

// TRANSFORMER IMPORTS
import cpCleanupTransformer from './transformers/cp-cleanup.js';
import cpDmImagesTransformer from './transformers/cp-dm-images.js';
import cpSectionsTransformer from './transformers/cp-sections.js';

// PARSER REGISTRY
const parsers = {
  hero: heroParser,
  cards: cardsParser,
};

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  "name": "shop-online",
  "description": "Chicago Pneumatic shop-online landing page (no global nav on the source): design-system red top banner -> hero (text-only: H1 + intro), webshop cards (image, title, text, external Shop here link) -> cards in a neutral grey section",
  "urls": [
    "https://www.cp.com/en/shop-online"
  ],
  "blocks": [
    {
      "name": "hero",
      "instances": [
        ".top-banner-design-system"
      ]
    },
    {
      "name": "cards",
      "instances": [
        ".local-contact-banner .o-grid"
      ]
    }
  ],
  "sections": [
    {
      "id": "s1",
      "name": "shop-intro-banner",
      "selector": [
        ".columns-fullscreen > .top-banner-design-system"
      ],
      "style": null,
      "blocks": [
        "hero"
      ],
      "defaultContent": []
    },
    {
      "id": "s2",
      "name": "shop-links",
      "selector": [
        ".columns-fullscreen > .local-contact-banner"
      ],
      "style": "neutral, wide",
      "blocks": [
        "cards"
      ],
      "defaultContent": []
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
