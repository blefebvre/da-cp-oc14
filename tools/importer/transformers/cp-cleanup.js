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

export default function transform(hookName, element, payload) {
  if (hookName === TransformHook.beforeTransform) {
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

    // Strip tracking / behaviour attributes.
    element.querySelectorAll('[onclick], [data-tms-scrolltracking], [data-tms-scrolltracking-tracked]').forEach((el) => {
      el.removeAttribute('onclick');
      el.removeAttribute('data-tms-scrolltracking');
      el.removeAttribute('data-tms-scrolltracking-tracked');
    });
  }
}
