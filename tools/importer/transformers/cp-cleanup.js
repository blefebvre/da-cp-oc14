/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: Chicago Pneumatic (www.cp.com) site-wide cleanup.
 * All selectors verified against migration-work/cleaned.html (line refs below)
 * or, for tracking pixels, against original URLs in migration-work/metadata.json
 * (.images.mapping) - the scraper strips those pixels from cleaned.html.
 *
 * IMPORTANT: the "Our global presence" language overlay
 * (#switch-language-new / .tabcontentcontainer / .tabcontentMobile) lives inside
 * the global header and is read by the cards-crossroad parser
 * (`.tabcontentcontainer .tabcontent#tab-left|tab-middle|tab-right`) during
 * parsing. Therefore the header and overlay are removed ONLY in afterTransform.
 */
const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

// Text is empty once whitespace and &nbsp; ( ) are stripped.
function isBlankText(el) {
  return el.textContent.replace(/[\s ]+/g, '') === '';
}

// YouTube / Vimeo iframe src -> canonical watch URL (EDS embed convention:
// videos are authored as links). Returns '' for any other iframe.
function videoWatchUrl(src) {
  let u;
  try { u = new URL(src, 'https://www.cp.com/'); } catch { return ''; }
  const host = u.hostname.replace(/^www\./, '');
  if (/(^|\.)youtube(-nocookie)?\.com$/.test(host)) {
    const m = u.pathname.match(/^\/embed\/([\w-]+)/);
    if (m) return `https://www.youtube.com/watch?v=${m[1]}`;
  }
  if (host === 'player.vimeo.com') {
    const m = u.pathname.match(/^\/video\/(\d+)/);
    if (m) return `https://vimeo.com/${m[1]}`;
  }
  return '';
}

export default function transform(hookName, element, payload) {
  if (hookName === TransformHook.beforeTransform) {
    const doc = element.ownerDocument;

    // Video embeds (/en/about .video-external .o-media-embed > iframe[src*="youtube.com/embed/"]):
    // keep them as plain links before all iframes are dropped below; the
    // embed-video parser (or default content) picks the link up.
    element.querySelectorAll('iframe[src]').forEach((iframe) => {
      const href = videoWatchUrl(iframe.getAttribute('src'));
      if (!href) return;
      const a = doc.createElement('a');
      a.href = href;
      a.textContent = href;
      const p = doc.createElement('p');
      p.append(a);
      iframe.replaceWith(p);
    });

    // OneTrust cookie consent (cleaned.html L2617 #onetrust-consent-sdk incl.
    // #onetrust-banner-sdk / #onetrust-pc-sdk; L2 #onetrust-hide-domains).
    // Tracking pixels (metadata.json image mapping: google.com/pagead,
    // c.clarity.ms) and iframes (L2836, L2840 - OneTrust/GTM).
    WebImporter.DOMUtils.remove(element, [
      '#onetrust-consent-sdk',
      '#onetrust-hide-domains',
      'img[src*="google.com/pagead"]',
      'img[src*="googleadservices.com"]',
      'img[src*="clarity.ms"]',
      'iframe',
      'noscript',
    ]);
  }

  if (hookName === TransformHook.afterTransform) {
    // Global header / sticky brand bar (L8 div.header, L18 sticky
    // .p-withinviewport-target with logo, language overlay, meta + main nav),
    // sticky dummy (L2188) and search modal (L2190 #search-widget).
    // Language overlay markup (L93 #switch-language-new, L97
    // .languageOverlayHeader, L106 .tabcontentMobile, L1110 .tabcontentcontainer)
    // removed explicitly too in case it is not nested in the header on live DOM.
    WebImporter.DOMUtils.remove(element, [
      '.header',
      '.p-withinviewport-target',
      '.p-withinviewport-dummy',
      '#search-widget',
      '#switch-language-new',
      '.languageOverlayHeader',
      '.tabcontentcontainer',
      '.tabcontentMobile',
      // Global footer (L2484) and empty modal container (L2612).
      '.footer',
      '.cap-modal-windows',
      // Leftover non-content elements.
      'iframe',
      'noscript',
      'link',
      'script',
      'style',
    ]);

    // Empty wrapper as first child of #main (L2339 <div></div>).
    const firstWrapper = element.querySelector('#main > div:first-of-type');
    if (firstWrapper && isBlankText(firstWrapper) && !firstWrapper.querySelector('img, picture, table')) {
      firstWrapper.remove();
    }

    // &nbsp; spacer paragraph (L2417 .paragraph.s-editor > div > p "&nbsp; &nbsp;&nbsp;").
    element.querySelectorAll('.paragraph.s-editor').forEach((para) => {
      if (isBlankText(para) && !para.querySelector('img, picture, table')) para.remove();
    });

    // Breadcrumb trail (.c-row > .c-breadcrumb under the sticky header) is
    // site chrome; EDS pages do not author it.
    WebImporter.DOMUtils.remove(element, ['.c-breadcrumb']);

    const doc = element.ownerDocument;

    // Modal-form CTA buttons (/en/about/sustainability .button > a.c-button.js-modal
    // href="#" data-target-url="https://compressors.cp.com/en/product-inquiry"):
    // link straight to the form page and author as a primary (bold) button.
    element.querySelectorAll('.button a.c-button[data-target-url]').forEach((a) => {
      const href = a.getAttribute('href') || '';
      const target = a.getAttribute('data-target-url');
      if ((!href || href === '#') && target) a.setAttribute('href', target);
      if (a.closest('strong, b')) return;
      const strong = doc.createElement('strong');
      a.replaceWith(strong);
      strong.append(a);
    });

    // Image captions (/en/about/our-reach .image.s-editor > center > i) -> paragraph.
    element.querySelectorAll('center').forEach((center) => {
      const p = doc.createElement('p');
      while (center.firstChild) p.append(center.firstChild);
      center.replaceWith(p);
    });

    // Lead text (.c-lead p, rendered italic) -> emphasised paragraph.
    element.querySelectorAll('.c-lead > p').forEach((p) => {
      if (isBlankText(p) || p.querySelector('em, i')) return;
      const em = doc.createElement('em');
      while (p.firstChild) em.append(p.firstChild);
      p.append(em);
    });

    // &nbsp;-only spacer paragraphs/headings in editorial text (e.g. /en/about
    // <p>&nbsp;</p>, <h5>&nbsp;</h5>). Block tables are left untouched.
    element.querySelectorAll('p, h1, h2, h3, h4, h5, h6').forEach((el) => {
      if (el.closest('table')) return;
      if (isBlankText(el) && !el.querySelector('img, picture, video, iframe, a')) el.remove();
    });

    // Strip tracking / behaviour attributes.
    element.querySelectorAll('[onclick], [data-tms-scrolltracking], [data-tms-scrolltracking-tracked]').forEach((el) => {
      el.removeAttribute('onclick');
      el.removeAttribute('data-tms-scrolltracking');
      el.removeAttribute('data-tms-scrolltracking-tracked');
    });
  }
}
