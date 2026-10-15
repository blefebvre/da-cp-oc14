/* eslint-disable */
/* global WebImporter */
/**
 * Parser for widget (local block), OneTrust variants. Source: https://www.cp.com/en/privacy-policy/*
 * Registered as the "widget" parser by the privacy-policy import scripts only
 * (the job-search variant keeps parsers/widget.js).
 *
 * OneTrust renders two dynamic parts of the legal pages client-side; each is
 * represented by the project's widget block pointing at a local widget:
 *
 *   #ot-sdk-cookie-policy (cookie list, filled by the OneTrust consent SDK)
 *     | widget | <a href="/widgets/cookie-list.html?domain=<domain script id>">Cookie List</a> |
 *
 *   select#<name>Dropdown + button#otnotice-bundle-button (notice bundle selector)
 *     | widget | <a href="/widgets/privacy-notices.html?tenant=<id>&bundle=<id>">Privacy Notice</a> |
 *     The bundle's default notice stays on the page as default content
 *     (cp-onetrust transformer); the widget loads the other notices on demand.
 *
 * The OneTrust ids are recorded as data-ot-* attributes on <body> by
 * transformers/cp-onetrust.js (onLoad hook), with the stub script as fallback.
 * Validated selectors (live DOM / tools/importer/bd-snapshots, /en/privacy-policy/*):
 *   #ot-sdk-cookie-policy  .ot-sdk-cookie-policy-title ("Cookie List")
 *   .privacy-policy select:not(#otnotice-language-dropdown)
 *   body[data-ot-domain][data-ot-tenant][data-ot-bundle], script[data-domain-script]
 *   #otnotice-bundle-button
 */
function cleanText(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

function widgetBlock(document, href, label) {
  const a = document.createElement('a');
  a.href = href;
  a.textContent = label || href;
  return WebImporter.Blocks.createBlock(document, { name: 'widget', cells: [[a]] });
}

export default function parse(element, { document }) {
  // cookie list
  if (element.matches('#ot-sdk-cookie-policy')) {
    const stub = document.querySelector('script[data-domain-script]');
    const domain = document.body.getAttribute('data-ot-domain') || (stub && stub.getAttribute('data-domain-script'));
    if (!domain) {
      console.warn('widget-onetrust: no OneTrust domain id, cookie list dropped');
      element.remove();
      return;
    }
    const title = element.querySelector('.ot-sdk-cookie-policy-title, h3');
    const params = new URLSearchParams({ domain });
    element.replaceWith(widgetBlock(document, `/widgets/cookie-list.html?${params.toString()}`, cleanText(title && title.textContent)));
    return;
  }

  // notice bundle selector
  if (element.matches('select')) {
    const tenant = document.body.getAttribute('data-ot-tenant');
    const bundle = document.body.getAttribute('data-ot-bundle');
    const scope = element.parentElement || document;
    scope.querySelectorAll('#otnotice-bundle-button').forEach((b) => b.remove());
    if (!tenant || !bundle) {
      element.remove();
      return;
    }
    const params = new URLSearchParams({ tenant, bundle });
    const selected = element.options && element.selectedIndex >= 0 ? element.options[element.selectedIndex] : null;
    element.replaceWith(widgetBlock(document, `/widgets/privacy-notices.html?${params.toString()}`, cleanText(selected && selected.textContent)));
  }
}
