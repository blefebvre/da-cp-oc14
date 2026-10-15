/* eslint-disable */
var CustomImportScript = (() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
  var __async = (__this, __arguments, generator) => {
    return new Promise((resolve, reject) => {
      var fulfilled = (value) => {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      };
      var rejected = (value) => {
        try {
          step(generator.throw(value));
        } catch (e) {
          reject(e);
        }
      };
      var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
      step((generator = generator.apply(__this, __arguments)).next());
    });
  };

  // tools/importer/import-shop-online.js
  var import_shop_online_exports = {};
  __export(import_shop_online_exports, {
    default: () => import_shop_online_default
  });

  // tools/importer/parsers/hero.js
  function parse(element, { document }) {
    const media = element.querySelector(".ds_c-top-banner__media-box");
    const picture = media && (media.querySelector("picture") || media.querySelector("img"));
    const holder = element.querySelector(".ds_c-top-banner__content-holder") || element;
    const content = [];
    const heading = holder.querySelector("h1, h2, h3");
    if (heading) {
      const h = document.createElement(heading.tagName.toLowerCase());
      h.innerHTML = heading.innerHTML.trim();
      content.push(h);
    }
    holder.querySelectorAll(".ds_c-top-banner__rte").forEach((rte) => {
      const paras = [...rte.querySelectorAll("p")].filter((p) => p.textContent.trim());
      if (paras.length) {
        content.push(...paras);
      } else if (rte.textContent.trim()) {
        const p = document.createElement("p");
        p.innerHTML = rte.innerHTML.trim();
        content.push(p);
      }
    });
    holder.querySelectorAll(".ds_c-top-banner__cta a[href], a.ds_c-button[href]").forEach((a) => {
      const p = document.createElement("p");
      p.append(a);
      content.push(p);
    });
    if (!content.length && !picture) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document, {
      name: "hero",
      cells: [[picture || ""], [content.length ? content : ""]]
    });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards.js
  function cleanText(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }
  function parseJobs(element, document) {
    const before = [];
    const rows = [];
    [...element.querySelectorAll(":scope > .o-grid__item, :scope > .o-grid__item-fix > .o-grid__item")].forEach((item) => {
      const title = item.querySelector("h6, h5");
      if (!title) {
        item.querySelectorAll("h1, h2, h3, h4, h5, h6, p").forEach((el) => {
          if (cleanText(el.textContent)) before.push(el);
        });
        return;
      }
      const content = [];
      const h = document.createElement(title.tagName.toLowerCase());
      const a = title.querySelector("a[href]");
      if (a) {
        const link = document.createElement("a");
        link.href = (a.getAttribute("href") || "").replace(/^(\/[a-z]{2}(?:-[a-z]{2})?\/careers)\/(?:[^/]+\/)+?(job-overview\/job-detail\/)/, "$1/$2");
        link.textContent = cleanText(a.textContent);
        h.append(link);
      } else {
        h.textContent = cleanText(title.textContent);
      }
      content.push(h);
      item.querySelectorAll("p").forEach((pEl) => {
        const text = cleanText(pEl.textContent);
        if (!text) return;
        const para = document.createElement("p");
        para.textContent = text;
        content.push(para);
      });
      rows.push([content]);
    });
    if (!rows.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "cards (jobs)", cells: rows });
    element.replaceWith(...before, block);
  }
  function parse2(element, { document }) {
    if (element.closest(".recent-jobs-banner")) {
      parseJobs(element, document);
      return;
    }
    let cards = [...element.querySelectorAll(".local-contact-card")];
    if (!cards.length) cards = [...element.querySelectorAll(".o-grid__item")];
    const rows = [];
    cards.forEach((card) => {
      const img = card.querySelector("picture") || card.querySelector("img");
      const body = card.querySelector('[data-mh="content"]') || card.querySelector(".c-tile") || card;
      const content = [];
      [...body.querySelectorAll("h1, h2, h3, h4, h5, h6, p, ul, ol")].forEach((el) => {
        if (el.parentElement.closest("ul, ol")) return;
        if (!cleanText(el.textContent) && !el.querySelector("img, a")) return;
        if (/^H\d$/.test(el.tagName)) {
          const h = document.createElement(el.tagName.toLowerCase());
          h.textContent = cleanText(el.textContent);
          content.push(h);
        } else {
          const cta = el.tagName === "P" && el.querySelector("a.c-button");
          if (cta && cleanText(el.textContent) === cleanText(cta.textContent) && !cta.closest("em, strong")) {
            const em = document.createElement("em");
            cta.replaceWith(em);
            em.append(cta);
          }
          content.push(el);
        }
      });
      if (!img && !content.length) return;
      rows.push([img || "", content.length ? content : ""]);
    });
    if (!rows.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "cards", cells: rows });
    element.replaceWith(block);
  }

  // tools/importer/transformers/cp-cleanup.js
  var TransformHook = { beforeTransform: "beforeTransform", afterTransform: "afterTransform" };
  function isBlankText(el) {
    return el.textContent.replace(/[\s ]+/g, "") === "";
  }
  function videoWatchUrl(src) {
    let u;
    try {
      u = new URL(src, "https://www.cp.com/");
    } catch (e) {
      return "";
    }
    const host = u.hostname.replace(/^www\./, "");
    if (/(^|\.)youtube(-nocookie)?\.com$/.test(host)) {
      const m = u.pathname.match(/^\/embed\/([\w-]+)/);
      if (m) return `https://www.youtube.com/watch?v=${m[1]}`;
    }
    if (host === "player.vimeo.com") {
      const m = u.pathname.match(/^\/video\/(\d+)/);
      if (m) return `https://vimeo.com/${m[1]}`;
    }
    return "";
  }
  function transform(hookName, element, payload) {
    if (hookName === TransformHook.beforeTransform) {
      const doc = element.ownerDocument;
      element.querySelectorAll("iframe[src]").forEach((iframe) => {
        const href = videoWatchUrl(iframe.getAttribute("src"));
        if (!href) return;
        const a = doc.createElement("a");
        a.href = href;
        a.textContent = href;
        const p = doc.createElement("p");
        p.append(a);
        iframe.replaceWith(p);
      });
      WebImporter.DOMUtils.remove(element, [
        "#onetrust-consent-sdk",
        "#onetrust-hide-domains",
        'img[src*="google.com/pagead"]',
        'img[src*="googleadservices.com"]',
        'img[src*="clarity.ms"]',
        "iframe",
        "noscript"
      ]);
    }
    if (hookName === TransformHook.afterTransform) {
      WebImporter.DOMUtils.remove(element, [
        ".header",
        ".p-withinviewport-target",
        ".p-withinviewport-dummy",
        "#search-widget",
        "#switch-language-new",
        ".languageOverlayHeader",
        ".tabcontentcontainer",
        ".tabcontentMobile",
        // Global footer (L2484) and empty modal container (L2612).
        ".footer",
        ".cap-modal-windows",
        // Leftover non-content elements.
        "iframe",
        "noscript",
        "link",
        "script",
        "style"
      ]);
      const firstWrapper = element.querySelector("#main > div:first-of-type");
      if (firstWrapper && isBlankText(firstWrapper) && !firstWrapper.querySelector("img, picture, table")) {
        firstWrapper.remove();
      }
      element.querySelectorAll(".paragraph.s-editor").forEach((para) => {
        if (isBlankText(para) && !para.querySelector("img, picture, table")) para.remove();
      });
      WebImporter.DOMUtils.remove(element, [".c-breadcrumb"]);
      const doc = element.ownerDocument;
      element.querySelectorAll(".button a.c-button[data-target-url]").forEach((a) => {
        const href = a.getAttribute("href") || "";
        const target = a.getAttribute("data-target-url");
        if ((!href || href === "#") && target) a.setAttribute("href", target);
        if (a.closest("strong, b")) return;
        const strong = doc.createElement("strong");
        a.replaceWith(strong);
        strong.append(a);
      });
      element.querySelectorAll("p > a.c-button--ghost-positive[href]").forEach((a) => {
        if (a.closest("strong, em, b, i, table")) return;
        if (a.parentElement.textContent.trim() !== a.textContent.trim()) return;
        const strong = doc.createElement("strong");
        const em = doc.createElement("em");
        a.replaceWith(strong);
        strong.append(em);
        em.append(a);
      });
      element.querySelectorAll("h4.u-h5").forEach((h4) => {
        if (h4.closest("table")) return;
        const h5 = doc.createElement("h5");
        while (h4.firstChild) h5.append(h4.firstChild);
        h4.replaceWith(h5);
      });
      element.querySelectorAll("center").forEach((center) => {
        const p = doc.createElement("p");
        while (center.firstChild) p.append(center.firstChild);
        center.replaceWith(p);
      });
      element.querySelectorAll(".c-lead > p").forEach((p) => {
        if (isBlankText(p) || p.querySelector("em, i")) return;
        const em = doc.createElement("em");
        while (p.firstChild) em.append(p.firstChild);
        p.append(em);
      });
      element.querySelectorAll("p, h1, h2, h3, h4, h5, h6").forEach((el) => {
        if (el.closest("table")) return;
        if (isBlankText(el) && !el.querySelector("img, picture, video, iframe, a")) el.remove();
      });
      element.querySelectorAll("[onclick], [data-tms-scrolltracking], [data-tms-scrolltracking-tracked]").forEach((el) => {
        el.removeAttribute("onclick");
        el.removeAttribute("data-tms-scrolltracking");
        el.removeAttribute("data-tms-scrolltracking-tracked");
      });
    }
  }

  // tools/importer/transformers/cp-dm-images.js
  function detectDynamicMediaUrl(urlStr) {
    let u;
    try {
      u = new URL(urlStr, "https://x/");
    } catch (e) {
      return false;
    }
    if (u.pathname.startsWith("/is/image/")) {
      return "scene7";
    }
    if (/^delivery-p\d+-e\d+\.adobeaemcloud\.com$/.test(u.hostname) && u.pathname.startsWith("/adobe/assets/urn:")) {
      return "dm-openapi";
    }
    return false;
  }
  var LAZY_SRC_ATTRS = ["data-src", "data-lazy-src", "data-original"];
  function toAbsolute(src, base) {
    try {
      return new URL(src, base).href;
    } catch (e) {
      return src;
    }
  }
  function firstSrcsetUrl(srcset) {
    if (!srcset) return "";
    return srcset.trim().split(/,\s+/)[0].split(/\s+/)[0] || "";
  }
  function pictureSourceUrl(img) {
    const picture = img.closest("picture");
    if (!picture) return "";
    const sources = [...picture.querySelectorAll("source")].map((s) => ({
      media: s.getAttribute("media") || "",
      // lazysizes swaps data-srcset into srcset only once in view; before
      // that srcset may hold the GIF placeholder
      url: [s.getAttribute("srcset"), s.getAttribute("data-srcset")].map(firstSrcsetUrl).find((u) => u && detectDynamicMediaUrl(u)) || ""
    })).filter((s) => s.url && detectDynamicMediaUrl(s.url));
    if (!sources.length) return "";
    const preferred = sources.find((s) => /min-width:\s*1280px/.test(s.media)) || sources[0];
    return preferred.url;
  }
  function transform2(hookName, element, payload) {
    const base = payload && payload.url || "https://www.cp.com/";
    if (hookName === "beforeTransform") {
      element.querySelectorAll("img").forEach((img) => {
        const lazy = LAZY_SRC_ATTRS.map((a) => img.getAttribute(a)).find((v) => v && detectDynamicMediaUrl(v));
        const fromSrcset = firstSrcsetUrl(img.getAttribute("srcset") || img.getAttribute("data-srcset"));
        const current = img.getAttribute("src") || "";
        const fromSource = !current || current.startsWith("data:") || detectDynamicMediaUrl(current) ? pictureSourceUrl(img) : "";
        if (fromSource) {
          img.setAttribute("src", fromSource);
          img.removeAttribute("srcset");
          img.removeAttribute("data-srcset");
        } else if (!detectDynamicMediaUrl(current)) {
          if (lazy) img.setAttribute("src", lazy);
          else if (fromSrcset && detectDynamicMediaUrl(fromSrcset)) img.setAttribute("src", fromSrcset);
        }
        if (!detectDynamicMediaUrl(img.getAttribute("src") || "")) return;
        if (!img.getAttribute("alt")) {
          const wrapper = img.closest(".cq-dd-image[title]");
          if (wrapper) img.setAttribute("alt", wrapper.getAttribute("title").trim());
        }
      });
    }
    if (hookName === "afterTransform") {
      element.querySelectorAll("img").forEach((img) => {
        const src = img.getAttribute("src") || "";
        if (!detectDynamicMediaUrl(src)) return;
        img.setAttribute("src", toAbsolute(src, base).replace("$landscape400$", "$landscape800$"));
        ["srcset", "data-srcset", "sizes", "loading", ...LAZY_SRC_ATTRS].forEach((a) => img.removeAttribute(a));
        const picture = img.parentElement;
        if (picture && picture.tagName === "PICTURE") {
          picture.querySelectorAll("source").forEach((s) => s.remove());
        }
      });
    }
  }

  // tools/importer/transformers/cp-sections.js
  var SECTION_MARKER_ATTR = "data-excat-section-id";
  function querySection(root, selectors) {
    const list = Array.isArray(selectors) ? selectors : [selectors];
    for (const sel of list) {
      if (!sel) continue;
      const el = root.querySelector(sel);
      if (el) return el;
    }
    return null;
  }
  function isLeadingContent(root, el) {
    let node = el;
    while (node && node !== root) {
      let prev = node.previousSibling;
      while (prev) {
        if (prev.nodeType === 3 && prev.textContent.trim()) return false;
        if (prev.nodeType === 1 && (prev.textContent.replace(/[\s ]+/g, "") || prev.querySelector("img, picture, video, iframe, table"))) return false;
        prev = prev.previousSibling;
      }
      node = node.parentNode;
    }
    return true;
  }
  function transform3(hookName, element, payload) {
    const sections = payload && payload.template && payload.template.sections || [];
    if (sections.length < 2) return;
    const doc = element.ownerDocument;
    if (hookName === "beforeTransform") {
      for (let i = sections.length - 1; i >= 0; i -= 1) {
        const section = sections[i];
        if (i === 0 && !section.style) continue;
        const sectionEl = querySection(element, section.selector);
        if (!sectionEl) continue;
        const scope = sectionEl.closest("#main") || element;
        if (!section.style && isLeadingContent(scope, sectionEl)) continue;
        const hr = doc.createElement("hr");
        if (section.style) hr.setAttribute(SECTION_MARKER_ATTR, section.id);
        sectionEl.before(hr);
      }
    }
    if (hookName === "afterTransform") {
      for (let i = sections.length - 1; i >= 0; i -= 1) {
        const section = sections[i];
        if (!section.style) continue;
        const marker = element.querySelector(`[${SECTION_MARKER_ATTR}="${section.id}"]`);
        const anchor = marker || querySection(element, section.selector);
        if (!anchor) continue;
        const metadataBlock = WebImporter.Blocks.createBlock(doc, {
          name: "Section Metadata",
          cells: { style: section.style }
        });
        anchor.after(metadataBlock);
        if (marker) {
          marker.removeAttribute(SECTION_MARKER_ATTR);
          if (i === 0) marker.remove();
        }
      }
    }
  }

  // tools/importer/import-shop-online.js
  var parsers = {
    hero: parse,
    cards: parse2
  };
  var PAGE_TEMPLATE = {
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
  var transformers = [
    transform,
    transform2,
    ...PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [transform3] : []
  ];
  function executeTransformers(hookName, element, payload) {
    const enhancedPayload = __spreadProps(__spreadValues({}, payload), {
      template: PAGE_TEMPLATE
    });
    transformers.forEach((transformerFn) => {
      try {
        transformerFn.call(null, hookName, element, enhancedPayload);
      } catch (e) {
        console.error(`Transformer failed at ${hookName}:`, e);
      }
    });
  }
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
            section: blockDef.section || null
          });
        });
      });
    });
    console.log(`Found ${pageBlocks.length} block instances on page`);
    return pageBlocks;
  }
  var import_shop_online_default = {
    // helix-importer drops <img> without a usable src (lazy GIF placeholders)
    // before transform() runs, so resolve the Scene7 <picture> renditions on the
    // live document first (cp-dm-images beforeTransform is idempotent).
    onLoad: (_0) => __async(void 0, [_0], function* ({ document }) {
      try {
        transform2("beforeTransform", document.body, { document, url: document.location.href });
      } catch (e) {
        console.error("onLoad image resolution failed:", e);
      }
    }),
    transform: (payload) => {
      const { document, url, params } = payload;
      const main = document.body;
      executeTransformers("beforeTransform", main, payload);
      const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);
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
      executeTransformers("afterTransform", main, payload);
      const hr = document.createElement("hr");
      main.appendChild(hr);
      WebImporter.rules.createMetadata(main, document);
      WebImporter.rules.transformBackgroundImages(main, document);
      WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
      const rawPath = new URL(params.originalURL).pathname.replace(/\/$/, "").replace(/\.html?$/, "");
      const isRoot = rawPath === "";
      const path = WebImporter.FileUtils.sanitizePath(isRoot ? "/index" : rawPath);
      const report = {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        blocks: pageBlocks.map((b) => b.name)
      };
      return [{ element: main, path, report }];
    }
  };
  return __toCommonJS(import_shop_online_exports);
})();
