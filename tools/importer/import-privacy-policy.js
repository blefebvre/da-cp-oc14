/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
// "widget" here is the OneTrust variant (cookie-list / privacy-notices widgets);
// the job-search variant (import-careers.js) keeps parsers/widget.js.
import widgetOneTrustParser from './parsers/widget-onetrust.js';

// TRANSFORMER IMPORTS
import cpCleanupTransformer from './transformers/cp-cleanup.js';
import cpDmImagesTransformer from './transformers/cp-dm-images.js';
import cpSectionsTransformer from './transformers/cp-sections.js';
import cpOneTrustTransformer from './transformers/cp-onetrust.js';

// PARSER REGISTRY
const parsers = {
  widget: widgetOneTrustParser,
};

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  "name": "privacy-policy",
  "description": "Chicago Pneumatic legal notice page rendered from OneTrust (cookie policy, privacy notice): notice title (promoted to h1), long-form headings/paragraphs/lists as default content; OneTrust cookie list -> widget (cookie-list); notice bundle selector -> widget (privacy-notices); privacy-officer contact paragraph",
  "urls": [
    "https://www.cp.com/en/privacy-policy/cookie-policy",
    "https://www.cp.com/en/privacy-policy/privacy-notice"
  ],
  "blocks": [
    {
      "name": "widget",
      "instances": [
        "#ot-sdk-cookie-policy",
        ".privacy-policy select:not(#otnotice-language-dropdown)"
      ]
    }
  ],
  "sections": [
    {
      "id": "s1",
      "name": "notice",
      "selector": [
        ".cp-content-page > .privacy-policy-secure"
      ],
      "style": "notice",
      "blocks": [
        "widget"
      ],
      "defaultContent": [
        ".otnotice-section-header",
        ".otnotice-section-content h2",
        ".otnotice-section-content h3",
        ".otnotice-section-content p",
        ".otnotice-section-content ul"
      ]
    },
    {
      "id": "s2",
      "name": "contact",
      "selector": [
        ".cp-content-page > .privacy-policy-secure ~ .paragraph"
      ],
      "style": null,
      "blocks": [],
      "defaultContent": [
        ".paragraph p"
      ]
    }
  ]
};

// TRANSFORMER REGISTRY
// Order: OneTrust notice normalisation -> cleanup -> DM images -> sections
// (sections run last so breaks/metadata land on cleaned DOM)
const transformers = [
  cpOneTrustTransformer,
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
  // OneTrust renders the notices client-side: record the OneTrust ids and, if
  // the notice did not render, load the default notice from the OneTrust CDN.
  onLoad: async ({ document }) => {
    try {
      await cpOneTrustTransformer('onLoad', document.body, { document, url: document.location.href });
    } catch (e) {
      console.error('onLoad OneTrust preparation failed:', e);
    }
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
