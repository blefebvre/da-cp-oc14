/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: Chicago Pneumatic (www.cp.com) OneTrust privacy notices.
 * Used by the privacy-policy / privacy-policy-2 / vulnerability-incident-reporting
 * templates.
 *
 * Source structure (www.cp.com/en/privacy-policy/*, .cp-content-page >
 * .privacy-policy-secure > .privacy-policy > .c-parsys-divider__item):
 *   single notice  (cookie-policy):  .otnotice-language-dropdown-container +
 *                  div.otnotice#otnotice-<id> + script LoadNotices(["<notice>.json"])
 *                  (vulnerability-incident-reporting uses the newer OneTrust markup:
 *                  .ot-privacy-notice-language-dropdown-container and a
 *                  privacy-notices/<id>/published/privacynotice.json notice URL)
 *   notice bundle  (privacy-notice, country-specific, legal-notice):
 *                  select#<name>Dropdown + button#otnotice-bundle-button +
 *                  div.otnotice#otnotice-bundle-container + script bundleUrl="<bundle>.json"
 * OneTrust renders the notice client-side from its CDN:
 *   .otnotice-content > .otnotice-sections > section.otnotice-section >
 *     h2.otnotice-section-header + .otnotice-section-content (h2/h3/p/ul, <p><br></p> spacers)
 *   cookie-policy also holds div#ot-sdk-cookie-policy (cookie list, filled by the consent SDK).
 *
 * transform('onLoad', document.body) -> prepareOneTrust(document), awaited by the
 * import script's onLoad (live DOM, async):
 * it records the OneTrust ids as data attributes (scripts are not reliable at
 * transform time) and, when the notice has not rendered (blocked/slow script),
 * renders the default notice itself from the OneTrust CDN - the same
 * notice-bundle -> notice -> language -> content chain the OneTrust script uses.
 *
 * transform() normalises the rendered notice into default content.
 */
const CDN = 'https://privacyportal-eu-cdn.onetrust.com';

async function getJson(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`${resp.status} ${url}`);
  return resp.json();
}

async function noticeHtml(policyUrl, lang) {
  const meta = await getJson(policyUrl);
  const langs = Object.values(meta.languages || {});
  const pick = langs.find((l) => l.language === lang)
    || langs.find((l) => (l.language || '').split('-')[0] === lang.split('-')[0])
    || langs.find((l) => l.isDefault) || langs[0];
  if (!pick) return '';
  const content = await getJson(pick.policyUrl);
  return Object.values(content.notices || {}).map((n) => n.content || '').join('');
}

async function prepareOneTrust(document) {
  const scripts = [...document.querySelectorAll('script')].map((s) => s.textContent || '');
  const all = scripts.join('\n');
  const lang = 'en-us';

  // cookie list: OneTrust domain script id (otSDKStub data-domain-script)
  // (kept on <body>: OneTrust re-renders its own containers)
  const stub = document.querySelector('script[data-domain-script]');
  if (stub) document.body.setAttribute('data-ot-domain', stub.getAttribute('data-domain-script'));

  const container = document.querySelector('.privacy-policy .otnotice');
  if (!container) return;

  const bundleMatch = all.match(/bundleUrl\s*=\s*"(https:\/\/[^"]+\/notice-bundles\/[\w-]+\.json)"/);
  const noticeMatch = all.match(/LoadNotices\(\s*\[\s*"(https:\/\/[^"]+\/privacy-notices\/[\w/-]+\.json)"/);
  const select = document.querySelector('.privacy-policy select:not(#otnotice-language-dropdown)');

  if (bundleMatch && select) {
    const m = bundleMatch[1].match(/\/([\w-]+)\/notice-bundles\/([\w-]+)\.json$/);
    if (m) {
      document.body.setAttribute('data-ot-tenant', m[1]);
      document.body.setAttribute('data-ot-bundle', m[2]);
    }
  }

  if (container.querySelector('.otnotice-content')) return; // already rendered by OneTrust

  try {
    let policyUrl = noticeMatch && noticeMatch[1];
    if (!policyUrl && bundleMatch) {
      const bundle = await getJson(bundleMatch[1]);
      const first = bundle.filters && bundle.filters[0] && bundle.filters[0].attributes[0];
      const rule = (bundle.rules || []).find((r) => (r.conditions || [])
        .some((c) => (c.attributes || []).some((a) => first && a.value === first.value)));
      policyUrl = rule && rule.policyUrl;
    }
    if (policyUrl && policyUrl.startsWith(CDN)) {
      container.innerHTML = await noticeHtml(policyUrl, lang);
    }
  } catch (e) {
    console.error('OneTrust notice could not be loaded:', e);
  }
}

function isBlank(el) {
  return el.textContent.replace(/[\s ]+/g, '') === '';
}

export default function transform(hookName, element, payload) {
  if (hookName === 'onLoad') return prepareOneTrust(element.ownerDocument);
  if (hookName !== 'beforeTransform') return undefined;
  const doc = element.ownerDocument;
  const notices = element.querySelectorAll('.privacy-policy .otnotice');
  if (!notices.length) return undefined;

  // OneTrust chrome: language switcher (other locales are separate sites; it
  // sits both before and inside the notice) and the empty version stamp.
  element.querySelectorAll('.privacy-policy').forEach((pp) => {
    WebImporter.DOMUtils.remove(pp, [
      '.otnotice-language-dropdown-container',
      '.ot-privacy-notice-language-dropdown-container',
      '#otnotice-language-dropdown',
      '.otnotice-version',
    ]);
  });

  notices.forEach((notice) => {

    // Headings: trailing &nbsp; and wrapper <strong> (e.g. <h3><strong>How To
    // Avoid Cookies:</strong></h3>) carry no meaning.
    notice.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
      if (h.closest('#ot-sdk-cookie-policy')) return;
      const only = h.children.length === 1 ? h.firstElementChild : null;
      if (only && /^(STRONG|B)$/.test(only.tagName) && only.textContent.trim() === h.textContent.trim()) {
        only.replaceWith(...only.childNodes);
      }
      h.innerHTML = h.innerHTML.replace(/(&nbsp;| |\s)+$/g, '');
    });

    // <p><br></p> spacers.
    notice.querySelectorAll('p').forEach((p) => {
      if (p.closest('#ot-sdk-cookie-policy')) return;
      if (isBlank(p) && !p.querySelector('img, picture, a')) p.remove();
    });
  });

  // The page has no h1: the first notice section title is the page title.
  if (!element.querySelector('h1')) {
    const first = element.querySelector('.privacy-policy .otnotice-section-header');
    if (first) {
      const h1 = doc.createElement('h1');
      while (first.firstChild) h1.append(first.firstChild);
      first.replaceWith(h1);
    }
  }
  return undefined;
}
