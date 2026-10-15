/**
 * Privacy notice selector widget (OneTrust notice bundle).
 * www.cp.com renders its legal pages from OneTrust notice bundles: a dropdown
 * lists the notices of the bundle (general notice, applicants, country addenda,
 * ...) and "Update" loads the selected one. On the migrated page the bundle's
 * default (first) notice is authored as regular page content right after this
 * widget; picking another notice loads it from the OneTrust CDN into the widget
 * panel and hides the authored notice until the default is selected again.
 * Configured through the authored widget link query params:
 *   /widgets/privacy-notices.html?tenant=<OneTrust tenant id>&bundle=<bundle id>
 * @param {Element} widget The widget element (data-tenant, data-bundle, data-lang)
 */
const CDN = 'https://privacyportal-eu-cdn.onetrust.com';
const ID = /^[\w-]+$/;

async function getJson(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`${resp.status} ${url}`);
  return resp.json();
}

/** Picks the notice language matching the page (e.g. en -> en-us), else the default. */
function pickLanguage(languages, lang) {
  const entries = Object.values(languages || {});
  return entries.find((l) => l.language === lang)
    || entries.find((l) => l.language && l.language.split('-')[0] === lang.split('-')[0])
    || entries.find((l) => l.isDefault)
    || entries[0];
}

/** Fetches a notice and returns its sanitised content as a fragment. */
async function loadNotice(policyUrl, lang) {
  const meta = await getJson(policyUrl);
  const language = pickLanguage(meta.languages, lang);
  if (!language) return null;
  const content = await getJson(language.policyUrl);
  const html = Object.values(content.notices || {}).map((n) => n.content || '').join('');
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script, style, link, iframe, object, embed, form, select, button, .otnotice-language-dropdown-container, .otnotice-version')
    .forEach((n) => n.remove());
  doc.querySelectorAll('*').forEach((n) => {
    [...n.attributes].forEach((attr) => {
      if (attr.name === 'style' || attr.name.startsWith('on')) n.removeAttribute(attr.name);
    });
  });
  // empty spacer paragraphs (<p><br></p>)
  doc.querySelectorAll('p').forEach((p) => {
    if (!p.textContent.trim() && !p.querySelector('img, a')) p.remove();
  });
  doc.querySelectorAll('a[target="_blank"]').forEach((a) => a.setAttribute('rel', 'noopener noreferrer'));
  const fragment = document.createDocumentFragment();
  fragment.append(...doc.body.childNodes);
  return fragment;
}

/** Authored content that represents the default notice: the rest of the widget's section. */
function authoredNotice(widget) {
  const wrapper = widget.parentElement;
  const siblings = [];
  let next = wrapper && wrapper.nextElementSibling;
  while (next) {
    if (!next.classList.contains('section-metadata')) siblings.push(next);
    next = next.nextElementSibling;
  }
  return siblings;
}

export default async function decorate(widget) {
  const form = widget.querySelector('form');
  const panel = widget.querySelector('.privacy-notices-panel');
  const { tenant, bundle } = widget.dataset;
  if (!form || !panel || !ID.test(tenant || '') || !ID.test(bundle || '')) return;
  const lang = (widget.dataset.lang || document.documentElement.lang || 'en').toLowerCase();

  let config;
  try {
    config = await getJson(`${CDN}/${tenant}/notice-bundles/${bundle}.json`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('privacy-notices: failed to load the OneTrust notice bundle', error);
    form.hidden = true;
    return;
  }

  const filter = (config.filters || [])[0];
  if (!filter || !filter.attributes || filter.attributes.length < 2) {
    form.hidden = true;
    return;
  }

  // unique ids so several widgets can live on one page
  const select = form.querySelector('select');
  const label = form.querySelector('label');
  select.id = `${select.id}-${Math.random().toString(36).slice(2, 8)}`;
  label.htmlFor = select.id;
  label.textContent = filter.name || '';
  filter.attributes.forEach((attr, i) => {
    const option = document.createElement('option');
    option.value = attr.value;
    option.textContent = attr.label;
    if (!i) option.selected = true;
    select.append(option);
  });

  const policyFor = (value) => {
    const rule = (config.rules || []).find((r) => r.isEnabled !== false
      && (r.conditions || []).some((c) => (c.attributes || []).some((a) => a.value === value)));
    return rule && rule.policyUrl;
  };

  const showAuthored = (show) => {
    authoredNotice(widget).forEach((node) => { node.hidden = !show; });
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const isDefault = select.selectedIndex === 0;
    panel.replaceChildren();
    panel.hidden = true;
    if (isDefault) {
      showAuthored(true);
      return;
    }
    const policyUrl = policyFor(select.value);
    if (!policyUrl || !policyUrl.startsWith(`${CDN}/`)) return;
    widget.setAttribute('aria-busy', 'true');
    try {
      const notice = await loadNotice(policyUrl, lang);
      if (notice) {
        panel.append(notice);
        panel.hidden = false;
        showAuthored(false);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('privacy-notices: failed to load the selected notice', error);
      showAuthored(true);
    } finally {
      widget.removeAttribute('aria-busy');
    }
  });
}
