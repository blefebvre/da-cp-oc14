/**
 * OneTrust cookie list widget.
 * Renders the live cookie inventory of a OneTrust domain (the list the OneTrust
 * SDK injects into #ot-sdk-cookie-policy on www.cp.com) without loading the
 * consent SDK: the public domain configuration and its language data are read
 * from the OneTrust CDN and rendered as one heading, description and table per
 * cookie category.
 * Configured through the authored widget link query params:
 *   /widgets/cookie-list.html?domain=<OneTrust domain script id>[&lang=en]
 * @param {Element} widget The widget element (data-domain, data-lang)
 */
const CDN = 'https://cdn.cookielaw.org/consent';

async function getJson(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`${resp.status} ${url}`);
  return resp.json();
}

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(props).forEach(([key, value]) => {
    if (key === 'className') node.className = value;
    else node.setAttribute(key, value);
  });
  node.append(...children.filter((c) => c !== null && c !== undefined));
  return node;
}

function lifespan(cookie, data) {
  if (cookie.IsSession) return data.LifespanTypeText || 'Session';
  const days = parseInt(cookie.Length, 10);
  if (!days) return data.PCLifeSpanSecs || data.pclifeSpanSecs || '';
  return `${days} ${data.PCenterVendorListLifespanDays || 'Days'}`;
}

/**
 * Rows per group: first-party cookies grouped by host (linked to Cookiepedia,
 * as the OneTrust SDK does), then third-party hosts.
 */
function groupRows(group, data, site) {
  const rows = [];
  const firstParty = new Map();
  (group.FirstPartyCookies || []).forEach((cookie) => {
    const host = cookie.Host || '';
    if (!firstParty.has(host)) firstParty.set(host, []);
    firstParty.get(host).push(cookie);
  });
  // the site's own host first, as the OneTrust SDK lists it
  const hosts = [...firstParty.keys()].sort((a, b) => (b === site) - (a === site));
  hosts.forEach((host) => {
    const cookies = firstParty.get(host);
    rows.push({
      host, cookies, type: data.CookieFirstPartyText || 'First Party', linked: true,
    });
  });
  (group.Hosts || []).forEach((host) => {
    if (!host.Cookies || !host.Cookies.length) return;
    rows.push({
      host: host.DisplayName || host.HostName, cookies: host.Cookies, type: data.CookieThirdPartyText || 'Third Party', linked: false,
    });
  });
  return rows;
}

function cookieNames(row) {
  const cell = el('span', { className: 'cookie-list-names' });
  row.cookies.forEach((cookie, i) => {
    if (i) cell.append(', ');
    if (row.linked) {
      cell.append(el('a', {
        href: `https://cookiepedia.co.uk/cookies/${encodeURIComponent(cookie.Name)}`,
        target: '_blank',
        rel: 'noopener noreferrer',
      }, cookie.Name));
    } else {
      cell.append(cookie.Name);
    }
  });
  return cell;
}

function renderGroup(group, data, site) {
  const rows = groupRows(group, data, site);
  if (!rows.length) return null;
  const labels = [
    data.CategoriesText || 'Cookie Subgroup',
    data.CookiesText || 'Cookies',
    data.CookiesUsedText || 'Cookies used',
    data.LifespanText || 'Lifespan',
  ];
  const head = el('tr', {}, ...labels.map((label) => el('th', { scope: 'col' }, label)));
  const body = el('tbody', {}, ...rows.map((row) => el(
    'tr',
    {},
    el('td', { 'data-label': labels[0] }, row.host),
    el('td', { 'data-label': labels[1] }, cookieNames(row)),
    el('td', { 'data-label': labels[2] }, row.type),
    el('td', { 'data-label': labels[3] }, row.cookies.map((c) => lifespan(c, data)).join(', ')),
  )));
  const table = el(
    'table',
    {},
    el('caption', { className: 'cookie-list-caption' }, group.GroupName),
    el('thead', {}, head),
    body,
  );
  return el(
    'section',
    { className: 'cookie-list-group' },
    el('h4', {}, group.GroupName),
    group.GroupDescription ? el('p', { className: 'cookie-list-group-desc' }, group.GroupDescription) : null,
    table,
  );
}

function render(container, data, site) {
  const groups = (data.Groups || []).filter((g) => !g.Parent);
  // fold sub-groups into their parent category
  (data.Groups || []).filter((g) => g.Parent).forEach((sub) => {
    const parent = groups.find((g) => g.OptanonGroupId === sub.Parent);
    if (!parent) return;
    parent.FirstPartyCookies = [
      ...(parent.FirstPartyCookies || []),
      ...(sub.FirstPartyCookies || []),
    ];
    parent.Hosts = [...(parent.Hosts || []), ...(sub.Hosts || [])];
  });
  const sections = groups.map((g) => renderGroup(g, data, site)).filter(Boolean);
  if (!sections.length) return;
  container.append(
    el('h3', { className: 'cookie-list-title' }, data.CookieListTitle || ''),
    data.CookieListDescription ? el('p', { className: 'cookie-list-desc' }, data.CookieListDescription) : null,
    ...sections,
  );
}

export default async function decorate(widget) {
  const container = widget.querySelector('.cookie-list-content') || widget;
  const { domain } = widget.dataset;
  if (!domain || !/^[\w-]+$/.test(domain)) return;
  const lang = (widget.dataset.lang || document.documentElement.lang || 'en').toLowerCase().split('-')[0];

  try {
    const config = await getJson(`${CDN}/${domain}/${domain}.json`);
    const rules = config.RuleSet || [];
    const rule = rules.find((r) => r.Default) || rules[0];
    if (!rule) return;
    const cultures = rule.LanguageSwitcherPlaceholder || {};
    const culture = cultures[lang] || cultures.default || 'en';
    const { DomainData } = await getJson(`${CDN}/${domain}/${rule.Id}/${culture}.json`);
    if (DomainData) render(container, DomainData, config.Domain);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('cookie-list: failed to load the OneTrust cookie list', error);
  }
}
