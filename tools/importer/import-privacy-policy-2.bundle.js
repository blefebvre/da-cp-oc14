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

  // tools/importer/import-privacy-policy-2.js
  var import_privacy_policy_2_exports = {};
  __export(import_privacy_policy_2_exports, {
    default: () => import_privacy_policy_2_default
  });

  // tools/importer/parsers/widget-onetrust.js
  function cleanText(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }
  function widgetBlock(document, href, label) {
    const a = document.createElement("a");
    a.href = href;
    a.textContent = label || href;
    return WebImporter.Blocks.createBlock(document, { name: "widget", cells: [[a]] });
  }
  function parse(element, { document }) {
    if (element.matches("#ot-sdk-cookie-policy")) {
      const stub = document.querySelector("script[data-domain-script]");
      const domain = document.body.getAttribute("data-ot-domain") || stub && stub.getAttribute("data-domain-script");
      if (!domain) {
        console.warn("widget-onetrust: no OneTrust domain id, cookie list dropped");
        element.remove();
        return;
      }
      const title = element.querySelector(".ot-sdk-cookie-policy-title, h3");
      const params = new URLSearchParams({ domain });
      element.replaceWith(widgetBlock(document, `/widgets/cookie-list.html?${params.toString()}`, cleanText(title && title.textContent)));
      return;
    }
    if (element.matches("select")) {
      const tenant = document.body.getAttribute("data-ot-tenant");
      const bundle = document.body.getAttribute("data-ot-bundle");
      const scope = element.parentElement || document;
      scope.querySelectorAll("#otnotice-bundle-button").forEach((b) => b.remove());
      if (!tenant || !bundle) {
        element.remove();
        return;
      }
      const params = new URLSearchParams({ tenant, bundle });
      const selected = element.options && element.selectedIndex >= 0 ? element.options[element.selectedIndex] : null;
      element.replaceWith(widgetBlock(document, `/widgets/privacy-notices.html?${params.toString()}`, cleanText(selected && selected.textContent)));
    }
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

  // tools/importer/transformers/cp-onetrust.js
  var CDN = "https://privacyportal-eu-cdn.onetrust.com";
  function getJson(url) {
    return __async(this, null, function* () {
      const resp = yield fetch(url);
      if (!resp.ok) throw new Error(`${resp.status} ${url}`);
      return resp.json();
    });
  }
  function noticeHtml(policyUrl, lang) {
    return __async(this, null, function* () {
      const meta = yield getJson(policyUrl);
      const langs = Object.values(meta.languages || {});
      const pick = langs.find((l) => l.language === lang) || langs.find((l) => (l.language || "").split("-")[0] === lang.split("-")[0]) || langs.find((l) => l.isDefault) || langs[0];
      if (!pick) return "";
      const content = yield getJson(pick.policyUrl);
      return Object.values(content.notices || {}).map((n) => n.content || "").join("");
    });
  }
  function prepareOneTrust(document) {
    return __async(this, null, function* () {
      const scripts = [...document.querySelectorAll("script")].map((s) => s.textContent || "");
      const all = scripts.join("\n");
      const lang = "en-us";
      const stub = document.querySelector("script[data-domain-script]");
      if (stub) document.body.setAttribute("data-ot-domain", stub.getAttribute("data-domain-script"));
      const container = document.querySelector(".privacy-policy .otnotice");
      if (!container) return;
      const bundleMatch = all.match(/bundleUrl\s*=\s*"(https:\/\/[^"]+\/notice-bundles\/[\w-]+\.json)"/);
      const noticeMatch = all.match(/LoadNotices\(\s*\[\s*"(https:\/\/[^"]+\/privacy-notices\/[\w/-]+\.json)"/);
      const select = document.querySelector(".privacy-policy select:not(#otnotice-language-dropdown)");
      if (bundleMatch && select) {
        const m = bundleMatch[1].match(/\/([\w-]+)\/notice-bundles\/([\w-]+)\.json$/);
        if (m) {
          document.body.setAttribute("data-ot-tenant", m[1]);
          document.body.setAttribute("data-ot-bundle", m[2]);
        }
      }
      if (container.querySelector(".otnotice-content")) return;
      try {
        let policyUrl = noticeMatch && noticeMatch[1];
        if (!policyUrl && bundleMatch) {
          const bundle = yield getJson(bundleMatch[1]);
          const first = bundle.filters && bundle.filters[0] && bundle.filters[0].attributes[0];
          const rule = (bundle.rules || []).find((r) => (r.conditions || []).some((c) => (c.attributes || []).some((a) => first && a.value === first.value)));
          policyUrl = rule && rule.policyUrl;
        }
        if (policyUrl && policyUrl.startsWith(CDN)) {
          container.innerHTML = yield noticeHtml(policyUrl, lang);
        }
      } catch (e) {
        console.error("OneTrust notice could not be loaded:", e);
      }
    });
  }
  function isBlank(el) {
    return el.textContent.replace(/[\s ]+/g, "") === "";
  }
  function transform4(hookName, element, payload) {
    if (hookName === "onLoad") return prepareOneTrust(element.ownerDocument);
    if (hookName !== "beforeTransform") return void 0;
    const doc = element.ownerDocument;
    const notices = element.querySelectorAll(".privacy-policy .otnotice");
    if (!notices.length) return void 0;
    element.querySelectorAll(".privacy-policy").forEach((pp) => {
      WebImporter.DOMUtils.remove(pp, [
        ".otnotice-language-dropdown-container",
        ".ot-privacy-notice-language-dropdown-container",
        "#otnotice-language-dropdown",
        ".otnotice-version",
        ".otnotice-menu",
        ".otnotice-menu-mobile"
      ]);
    });
    notices.forEach((notice) => {
      notice.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((h) => {
        if (h.closest("#ot-sdk-cookie-policy")) return;
        const only = h.children.length === 1 ? h.firstElementChild : null;
        if (only && /^(STRONG|B)$/.test(only.tagName) && only.textContent.trim() === h.textContent.trim()) {
          only.replaceWith(...only.childNodes);
        }
        h.innerHTML = h.innerHTML.replace(/(&nbsp;| |\s)+$/g, "");
      });
      notice.querySelectorAll("p").forEach((p) => {
        if (p.closest("#ot-sdk-cookie-policy")) return;
        if (isBlank(p) && !p.querySelector("img, picture, a")) p.remove();
      });
    });
    if (!element.querySelector("h1")) {
      const first = element.querySelector(".privacy-policy .otnotice-section-header");
      if (first) {
        const h1 = doc.createElement("h1");
        while (first.firstChild) h1.append(first.firstChild);
        first.replaceWith(h1);
      }
    }
    return void 0;
  }

  // tools/importer/import-privacy-policy-2.js
  var parsers = {
    widget: parse
  };
  var PAGE_TEMPLATE = {
    "name": "privacy-policy-2",
    "description": "Chicago Pneumatic legal notice page rendered from a OneTrust notice bundle (country-specific notices, legal notice): bundle selector -> widget (privacy-notices); default notice (title promoted to h1, long-form headings/paragraphs/lists) as default content; privacy-officer contact paragraph",
    "urls": [
      "https://www.cp.com/en/privacy-policy/country-specific",
      "https://www.cp.com/en/privacy-policy/legal-notice"
    ],
    "blocks": [
      {
        "name": "widget",
        "instances": [
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
  var transformers = [
    transform4,
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
  var import_privacy_policy_2_default = {
    // helix-importer drops <img> without a usable src (lazy GIF placeholders)
    // before transform() runs, so resolve the Scene7 <picture> renditions on the
    // live document first (cp-dm-images beforeTransform is idempotent).
    // OneTrust renders the notices client-side: record the OneTrust ids and, if
    // the notice did not render, load the default notice from the OneTrust CDN.
    onLoad: (_0) => __async(void 0, [_0], function* ({ document }) {
      try {
        yield transform4("onLoad", document.body, { document, url: document.location.href });
      } catch (e) {
        console.error("onLoad OneTrust preparation failed:", e);
      }
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
  return __toCommonJS(import_privacy_policy_2_exports);
})();
