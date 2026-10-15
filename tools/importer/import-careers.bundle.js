/* eslint-disable */
var CustomImportScript = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
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

  // tools/importer/import-careers.js
  var import_careers_exports = {};
  __export(import_careers_exports, {
    default: () => import_careers_default
  });

  // tools/importer/parsers/widget.js
  function cleanText(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }
  function readBrand(document) {
    const token = document.querySelector('button[class*="CustomToken_tokenBtn"][title]');
    if (token && cleanText(token.getAttribute("title"))) return cleanText(token.getAttribute("title"));
    const link2 = document.querySelector('a[href*="facetFilters"]');
    if (link2) {
      try {
        const facets = JSON.parse(new URL(link2.href, "https://www.jobs.atlascopcogroup.com").searchParams.get("facetFilters") || "{}");
        const values = Object.values(facets).flat();
        if (values.length) return values[0];
      } catch (e) {
      }
    }
    return "";
  }
  function parse(element, { document }) {
    const brand = readBrand(document);
    const params = new URLSearchParams();
    if (brand) params.set("brand", brand);
    params.set("locale", "en_US");
    const button = element.querySelector('button.keywordsearchbutton, button[type="submit"], button');
    const label = cleanText(button && (button.textContent || button.getAttribute("title"))) || "Search jobs";
    const a = document.createElement("a");
    a.href = `/widgets/job-search.html?${params.toString()}`;
    a.textContent = label;
    const block = WebImporter.Blocks.createBlock(document, { name: "widget", cells: [[a]] });
    element.replaceWith(block);
  }

  // tools/importer/import-careers.js
  var parsers = {
    widget: parse
  };
  var PAGE_TEMPLATE = {
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
  var JOBS_ORIGIN = "https://www.jobs.atlascopcogroup.com";
  var DEFAULT_BRAND = "CP Chicago Pneumatic";
  var LOCALE = "en_US";
  var PAGE_HEADING = "Job openings";
  var PAGE_INTRO = "Find your next role at Chicago Pneumatic. Search our current openings by keyword or location, or browse all positions on the Atlas Copco Group careers site.";
  var PAGE_TITLE = "Job openings - Chicago Pneumatic";
  var PAGE_DESCRIPTION = "Find your next role at Chicago Pneumatic. Search current job openings on the Atlas Copco Group careers site.";
  function cleanText2(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }
  function externalSearchUrl(brand) {
    const params = new URLSearchParams({
      q: "",
      locationsearch: "",
      locale: LOCALE,
      searchResultView: "LIST",
      facetFilters: JSON.stringify({ filter1: [brand] }),
      pageNumber: "0"
    });
    return `${JOBS_ORIGIN}/search/?${params.toString()}`;
  }
  function alertsUrl(document) {
    const link2 = document.querySelector('a[href*="talentcommunity/subscribe"]');
    const href = link2 ? link2.getAttribute("href") : `/talentcommunity/subscribe/?locale=${LOCALE}`;
    try {
      const url = new URL(href, JOBS_ORIGIN);
      url.searchParams.set("locale", LOCALE);
      return url.href;
    } catch (e) {
      return `${JOBS_ORIGIN}/talentcommunity/subscribe/?locale=${LOCALE}`;
    }
  }
  function brandFromWidget(block) {
    const a = block && block.querySelector("a[href]");
    if (!a) return "";
    try {
      return new URL(a.getAttribute("href"), JOBS_ORIGIN).searchParams.get("brand") || "";
    } catch (e) {
      return "";
    }
  }
  function el(document, tag, text) {
    const e = document.createElement(tag);
    if (text) e.textContent = text;
    return e;
  }
  function link(document, href, text) {
    const a = el(document, "a", text);
    a.href = href;
    return a;
  }
  var import_careers_default = {
    transform: (payload) => {
      const { document, url, params } = payload;
      const body = document.body;
      let widgetBlock = null;
      PAGE_TEMPLATE.blocks.forEach((blockDef) => {
        blockDef.instances.forEach((selector) => {
          const source = document.querySelector(selector);
          if (!source || widgetBlock) return;
          const holder = document.createElement("div");
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
        console.warn("careers: search band not found, synthesizing job-search widget");
        const q = new URLSearchParams({ brand: DEFAULT_BRAND, locale: LOCALE });
        widgetBlock = WebImporter.Blocks.createBlock(document, {
          name: "widget",
          cells: [[link(document, `/widgets/job-search.html?${q.toString()}`, "Search jobs")]]
        });
      }
      const brand = brandFromWidget(widgetBlock) || DEFAULT_BRAND;
      const alertBtn = document.querySelector('[class*="JobsSearch_createAlertBtn"]');
      const alertLabel = cleanText2(alertBtn && alertBtn.textContent) || "Get Job Alerts";
      const main = document.createElement("div");
      main.append(el(document, "h1", PAGE_HEADING));
      main.append(el(document, "p", PAGE_INTRO));
      main.append(widgetBlock);
      const cta = el(document, "p");
      const strong = el(document, "strong");
      const em = el(document, "em");
      em.append(link(document, externalSearchUrl(brand), "View all Chicago Pneumatic jobs"));
      strong.append(em);
      cta.append(strong);
      main.append(cta);
      const alerts = el(document, "p");
      alerts.append(link(document, alertsUrl(document), alertLabel.replace(/ for this search$/i, "")));
      main.append(alerts);
      main.append(document.createElement("hr"));
      main.append(WebImporter.Blocks.createBlock(document, {
        name: "Metadata",
        cells: {
          Title: PAGE_TITLE,
          Description: PAGE_DESCRIPTION
        }
      }));
      body.innerHTML = "";
      body.append(...main.childNodes);
      const rawPath = new URL(params.originalURL).pathname.replace(/\/$/, "").replace(/\.html?$/, "");
      const path = WebImporter.FileUtils.sanitizePath(rawPath || "/index");
      return [{
        element: body,
        path,
        report: {
          title: PAGE_TITLE,
          template: PAGE_TEMPLATE.name,
          blocks: ["widget"],
          note: "cp.com 301-redirects to the external SuccessFactors job search; live results/facets not migrated"
        }
      }];
    }
  };
  return __toCommonJS(import_careers_exports);
})();
