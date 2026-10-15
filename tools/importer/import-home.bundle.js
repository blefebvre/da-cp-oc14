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

  // tools/importer/import-home.js
  var import_home_exports = {};
  __export(import_home_exports, {
    default: () => import_home_default
  });

  // tools/importer/parsers/cards-crossroad.js
  var FALLBACK_IMAGES = {
    "tab-left": "https://www.cp.com/content/dam/brands/cp/corporate/new-corporate-content/ctba-splash-2.jpg",
    "tab-middle": "https://www.cp.com/content/dam/brands/cp/corporate/new-corporate-content/splash-itba-2.png",
    "tab-right": "https://www.cp.com/content/dam/brands/Chicago%20Pneumatic/construction-technique/portable-air-division/pictures-web/brand/02-cp-brand-image-greyscale.jpg"
  };
  function cleanText(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }
  function cssUnescape(value) {
    return value.replace(/\\([0-9a-fA-F]{1,6})[ \t\n\r\f]?/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16))).replace(/\\(.)/g, "$1");
  }
  function toAbsolute(url, doc) {
    let base = "https://www.cp.com/";
    try {
      const b = new URL(doc.baseURI || "");
      if (/^https?:$/.test(b.protocol) && !/^(localhost|127\.0\.0\.1)$/.test(b.hostname)) base = b.href;
    } catch (e) {
    }
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
    return !!href && !/^javascript:/i.test(href.trim()) && href.trim() !== "#";
  }
  function findBackgroundUrl(card, doc) {
    const candidates = [card, ...card.querySelectorAll("*")];
    for (const el of candidates) {
      const url = urlFromCss(el.getAttribute("style"));
      if (url) return url;
    }
    for (const el of candidates) {
      for (const attr of [...el.attributes]) {
        if (/^data-.*(src|bg|background|image|img)/i.test(attr.name) && attr.value && /\.(jpe?g|png|webp|gif|avif)|scene7|\/content\/dam\//i.test(attr.value)) {
          return urlFromCss(attr.value) || attr.value.trim();
        }
      }
    }
    const view = doc.defaultView;
    if (view && typeof view.getComputedStyle === "function") {
      for (const el of candidates) {
        try {
          const url = urlFromCss(view.getComputedStyle(el).backgroundImage);
          if (url) return url;
        } catch (e) {
        }
      }
    }
    return FALLBACK_IMAGES[card.id] || null;
  }
  function findRegionLinks(card, doc) {
    const id = card.id;
    if (!id) return [];
    let links = [];
    const desktop = [...doc.querySelectorAll(".tabcontentcontainer .tabcontent")].find((el) => el.id === id);
    if (desktop) links = [...desktop.querySelectorAll(".languages li a.clink")];
    if (!links.length) {
      const mobile = [...doc.querySelectorAll(".tabcontentMobile")].find((el) => el.id === `${id}Mobile`);
      if (mobile) links = [...mobile.querySelectorAll(".languages li a.clink")];
    }
    return links.map((a) => {
      const href = a.getAttribute("href");
      if (!isUsableHref(href)) return null;
      const parts = [...a.querySelectorAll(".clink_uline")].map((s) => cleanText(s.textContent)).filter(Boolean);
      const label = parts.length ? parts.join(" - ") : cleanText(a.textContent);
      return label ? { href, label } : null;
    }).filter(Boolean);
  }
  function pickPrimary(regions) {
    if (!regions.length) return null;
    return regions.find((r) => /\/en-international\/?$/i.test(r.href)) || regions.find((r) => /\/en(-us)?\/?$/i.test(r.href)) || regions.find((r) => /\/en[-/]/i.test(r.href)) || regions[0];
  }
  function parse(element, { document }) {
    const doc = element.ownerDocument || document;
    let cards = [...element.querySelectorAll(".crossroad-card")];
    if (!cards.length) cards = [...element.querySelectorAll(":scope > div > div")];
    const cells = [];
    cards.forEach((card) => {
      const titleEl = card.querySelector("h2.title-text") || card.querySelector("h2, h3");
      const titleText = cleanText(titleEl && titleEl.textContent);
      const imageCell = [];
      const existingImg = card.querySelector("img");
      if (existingImg) {
        imageCell.push(existingImg);
      } else {
        const bgUrl = findBackgroundUrl(card, doc);
        if (bgUrl) {
          const img = document.createElement("img");
          img.src = toAbsolute(bgUrl, doc);
          img.alt = titleText;
          imageCell.push(img);
        }
      }
      const content = [];
      if (titleText) {
        const h2 = document.createElement("h2");
        h2.textContent = titleText;
        content.push(h2);
      }
      const descEl = card.querySelector("p.basubtext") || card.querySelector("p");
      if (descEl) {
        const clone = descEl.cloneNode(true);
        clone.querySelectorAll("a").forEach((a) => a.remove());
        const descText = cleanText(clone.textContent);
        if (descText) {
          const p = document.createElement("p");
          p.textContent = descText;
          content.push(p);
        }
      }
      const regions = findRegionLinks(card, doc);
      const primary = pickPrimary(regions);
      const ownLink = [...card.querySelectorAll("a[href]")].find((a) => isUsableHref(a.getAttribute("href")));
      const exploreHref = primary ? primary.href : ownLink && ownLink.getAttribute("href");
      if (exploreHref) {
        const p = document.createElement("p");
        const a = document.createElement("a");
        a.href = exploreHref;
        a.textContent = "Explore";
        p.append(a);
        content.push(p);
      }
      if (regions.length) {
        const ul = document.createElement("ul");
        regions.forEach(({ href, label }) => {
          const li = document.createElement("li");
          const a = document.createElement("a");
          a.href = href;
          a.textContent = label;
          li.append(a);
          ul.append(li);
        });
        content.push(ul);
      }
      if (!content.length && !imageCell.length) return;
      cells.push([imageCell.length ? imageCell : "", content.length ? content : ""]);
    });
    if (!cells.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "cards-crossroad", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-tile.js
  function cleanText2(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }
  function parse2(element, { document }) {
    let tiles = [...element.querySelectorAll(".c-tile")];
    if (!tiles.length) tiles = [...element.querySelectorAll(".o-grid__item")];
    const cells = [];
    tiles.forEach((tile) => {
      const imageCell = [];
      const imgWrap = tile.querySelector(".c-tile__img") || tile.querySelector(".cq-dd-image");
      let img = imgWrap && imgWrap.querySelector("img") || tile.querySelector("img");
      if (!img && imgWrap) {
        const renditions = [...imgWrap.attributes].filter((a) => /^data-imgsrc-\d+$/.test(a.name) && a.value).map((a) => ({ w: parseInt(a.name.split("-").pop(), 10), src: a.value.trim() })).sort((a, b) => a.w - b.w);
        const pick = renditions.find((r) => r.w === 600) || renditions.find((r) => r.w >= 600) || renditions[renditions.length - 1];
        if (pick) {
          img = document.createElement("img");
          img.src = pick.src.startsWith("//") ? `https:${pick.src}` : pick.src;
        }
      }
      if (img) {
        if (!img.getAttribute("alt")) {
          const alt = cleanText2(imgWrap && imgWrap.getAttribute("title"));
          if (alt) img.setAttribute("alt", alt);
        }
        imageCell.push(img);
      }
      const content = [];
      const titleEl = tile.querySelector(".c-tile__title") || tile.querySelector("h2, h3, h4, h5");
      const titleText = cleanText2(titleEl && titleEl.textContent);
      const link = titleEl && titleEl.querySelector("a[href]") || tile.querySelector("a.js-blocklink__source[href]") || tile.closest("a[href]");
      if (titleText) {
        const h4 = document.createElement("h4");
        const href = link && link.getAttribute("href");
        if (href && !/^javascript:/i.test(href)) {
          const a = document.createElement("a");
          a.href = href;
          a.textContent = titleText;
          h4.append(a);
        } else {
          h4.textContent = titleText;
        }
        content.push(h4);
      }
      const contentWrap = tile.querySelector(".c-tile__content");
      if (contentWrap) {
        [...contentWrap.querySelectorAll(":scope > p")].forEach((p) => {
          if (cleanText2(p.textContent)) content.push(p);
        });
      }
      if (!content.length && !imageCell.length) return;
      cells.push([imageCell.length ? imageCell : "", content.length ? content : ""]);
    });
    if (!cells.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "cards-tile", cells });
    element.replaceWith(block);
  }

  // tools/importer/transformers/cp-cleanup.js
  var TransformHook = { beforeTransform: "beforeTransform", afterTransform: "afterTransform" };
  function isBlankText(el) {
    return el.textContent.replace(/[\s ]+/g, "") === "";
  }
  function transform(hookName, element, payload) {
    if (hookName === TransformHook.beforeTransform) {
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
  function toAbsolute2(src, base) {
    try {
      return new URL(src, base).href;
    } catch (e) {
      return src;
    }
  }
  function firstSrcsetUrl(srcset) {
    if (!srcset) return "";
    return srcset.split(",")[0].trim().split(/\s+/)[0] || "";
  }
  function transform2(hookName, element, payload) {
    const base = payload && payload.url || "https://www.cp.com/";
    if (hookName === "beforeTransform") {
      element.querySelectorAll("img").forEach((img) => {
        const lazy = LAZY_SRC_ATTRS.map((a) => img.getAttribute(a)).find((v) => v && detectDynamicMediaUrl(v));
        const fromSrcset = firstSrcsetUrl(img.getAttribute("srcset") || img.getAttribute("data-srcset"));
        const current = img.getAttribute("src") || "";
        if (!detectDynamicMediaUrl(current)) {
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
        img.setAttribute("src", toAbsolute2(src, base));
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

  // tools/importer/import-home.js
  var parsers = {
    "cards-crossroad": parse,
    "cards-tile": parse2
  };
  var PAGE_TEMPLATE = {
    name: "home",
    description: "Chicago Pneumatic corporate homepage: division crossroad panels, statement heading, promo link tiles",
    urls: [
      "https://www.cp.com/en"
    ],
    blocks: [
      {
        name: "cards-crossroad",
        instances: [".ba-crossroad-component"]
      },
      {
        name: "cards-tile",
        instances: [".card-overview"]
      }
    ],
    sections: [
      {
        id: "rc2",
        name: "division-crossroad",
        selector: [".ba-crossroad-component"],
        style: null,
        blocks: ["cards-crossroad"],
        defaultContent: []
      },
      {
        id: "rc3",
        name: "statement",
        selector: [".c-parsys-divider > .subtitle.s-editor"],
        style: "statement",
        blocks: [],
        defaultContent: [".subtitle.s-editor h2", ".subtitle.s-editor h3"]
      },
      {
        id: "rc5",
        name: "promo-tiles",
        selector: [".card-overview"],
        style: null,
        blocks: ["cards-tile"],
        defaultContent: []
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
  var import_home_default = {
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
      const isRoot = rawPath === "" || new URL(params.originalURL).hash === "#index";
      const path = WebImporter.FileUtils.sanitizePath(isRoot ? "/index" : rawPath);
      const report = {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        blocks: pageBlocks.map((b) => b.name)
      };
      return [{ element: main, path, report }];
    }
  };
  return __toCommonJS(import_home_exports);
})();
