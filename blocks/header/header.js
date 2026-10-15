import { decorateIcons } from '../../scripts/aem.js';

// mobile-first: the full horizontal nav shows from this width up
const isDesktop = window.matchMedia('(width >= 900px)');

/**
 * Fetches the nav fragment as plain HTML.
 * /content/nav.plain.html serves the local preview, /nav.plain.html serves DA/EDS.
 * @returns {Promise<Element|null>} container holding the nav sections
 */
async function fetchNav() {
  let resp = await fetch('/content/nav.plain.html');
  if (!resp.ok) resp = await fetch('/nav.plain.html');
  if (!resp.ok) return null;
  const container = document.createElement('div');
  container.innerHTML = await resp.text();
  return container;
}

function createIcon(name) {
  const span = document.createElement('span');
  span.className = `icon icon-${name}`;
  return span;
}

/**
 * Builds the brand (logo) area from the first nav section.
 * @param {Element} section
 */
function buildBrand(section) {
  const brand = document.createElement('div');
  brand.className = 'nav-brand';
  const links = [...(section?.querySelectorAll('a') || [])];
  const logoLink = links.find((a) => a.querySelector('img')) || links[0];
  if (logoLink) {
    logoLink.classList.add('nav-brand-link');
    logoLink.removeAttribute('title');
    const img = logoLink.querySelector('img');
    const text = logoLink.textContent.trim() || img?.alt;
    if (img && text) {
      // logo is an image: keep the accessible name as visually hidden text
      [...logoLink.childNodes]
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .forEach((node) => node.remove());
      const label = document.createElement('span');
      label.className = 'nav-visually-hidden';
      label.textContent = text;
      img.alt = '';
      logoLink.append(label);
    }
    brand.append(logoLink);
  } else if (section) {
    brand.append(...section.childNodes);
  }
  return brand;
}

/**
 * Turns a "#main" link in the brand section into a skip link.
 * @param {Element} section
 */
function buildSkipLink(section) {
  const skip = [...(section?.querySelectorAll('a[href^="#"]') || [])]
    .find((a) => !a.querySelector('img'));
  if (!skip) return null;
  skip.classList.add('nav-skip-link');
  const main = document.querySelector('main');
  const targetId = skip.getAttribute('href').slice(1);
  if (main && targetId && !document.getElementById(targetId)) main.id = targetId;
  return skip;
}

/**
 * Builds the search overlay from the search nav section.
 * Expected content: link (form action + submit label), placeholder paragraph,
 * then the suggestion copy (heading, intro, link lists, highlighted card).
 * @param {Element} section
 * @param {Function} onClose
 */
function buildSearchOverlay(section, onClose) {
  const overlay = document.createElement('div');
  overlay.className = 'nav-search nav-search-panel';
  overlay.id = 'nav-search';
  overlay.hidden = true;
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  const children = [...section.children];
  const actionLink = children.find((el) => el.tagName === 'P' && el.querySelector('a'));
  const placeholderP = children.find((el) => el !== actionLink && el.tagName === 'P' && !el.querySelector('a'));
  const submitLabel = actionLink?.textContent.trim() || 'Search';
  overlay.setAttribute('aria-label', submitLabel);

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'nav-search-close';
  close.setAttribute('aria-label', 'Close');
  close.append(createIcon('close'));
  close.addEventListener('click', onClose);

  const form = document.createElement('form');
  form.className = 'nav-search-form';
  form.method = 'get';
  form.action = actionLink?.querySelector('a').href || '/search';
  form.setAttribute('role', 'search');
  const input = document.createElement('input');
  input.type = 'search';
  input.name = 'search';
  input.placeholder = placeholderP?.textContent.trim() || '';
  input.setAttribute('aria-label', input.placeholder || submitLabel);
  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'nav-search-submit';
  submit.append(createIcon('search'), document.createTextNode(submitLabel));
  form.append(input, submit);

  // remaining content becomes the suggestions card
  const rest = children.filter((el) => el !== actionLink && el !== placeholderP);
  const card = document.createElement('div');
  card.className = 'nav-search-card';
  const intro = document.createElement('div');
  intro.className = 'nav-search-intro';
  const columns = document.createElement('div');
  columns.className = 'nav-search-columns';
  let column = null;
  let highlight = null;
  rest.forEach((el) => {
    const isHeading = /^H[1-6]$/.test(el.tagName);
    if (!columns.children.length && !column && (el.tagName === 'H2' || (el.tagName === 'P' && intro.children.length))) {
      intro.append(el);
      return;
    }
    if (el.tagName === 'H4') {
      // h4 opens the highlighted card
      highlight = document.createElement('div');
      highlight.className = 'nav-search-column nav-search-highlight';
      highlight.append(el);
      columns.append(highlight);
      column = highlight;
      return;
    }
    if (isHeading || (el.tagName === 'UL' && column?.querySelector('ul'))) {
      column = document.createElement('div');
      column.className = 'nav-search-column';
      columns.append(column);
    }
    if (!column) {
      column = document.createElement('div');
      column.className = 'nav-search-column';
      columns.append(column);
    }
    column.append(el);
  });
  card.append(intro, columns);

  const inner = document.createElement('div');
  inner.className = 'nav-search-inner';
  inner.append(form, card);
  overlay.append(close, inner);
  return overlay;
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  const navContent = await fetchNav();
  block.textContent = '';
  if (!navContent) return;

  const [brandSection, linksSection, toolsSection, searchSection] = [...navContent.children];

  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.setAttribute('aria-label', 'Main navigation');
  nav.setAttribute('aria-expanded', 'false');

  const skipLink = buildSkipLink(brandSection);
  nav.append(buildBrand(brandSection));

  // meta row: search trigger + language link
  const meta = document.createElement('div');
  meta.className = 'nav-meta';
  let searchToggle = null;
  let overlay = null;
  const closeSearch = () => {
    if (!overlay || overlay.hidden) return;
    overlay.hidden = true;
    document.body.classList.remove('nav-search-open');
    searchToggle.setAttribute('aria-expanded', 'false');
    searchToggle.focus();
  };
  if (searchSection) {
    overlay = buildSearchOverlay(searchSection, closeSearch);
    searchToggle = document.createElement('a');
    searchToggle.href = '#nav-search';
    searchToggle.setAttribute('role', 'button');
    searchToggle.className = 'nav-search-toggle';
    searchToggle.setAttribute('aria-controls', 'nav-search');
    searchToggle.setAttribute('aria-expanded', 'false');
    const searchLabel = document.createElement('span');
    searchLabel.className = 'nav-visually-hidden';
    searchLabel.textContent = overlay.getAttribute('aria-label');
    searchToggle.append(createIcon('search'), searchLabel);
    searchToggle.addEventListener('click', (e) => {
      e.preventDefault();
      overlay.hidden = false;
      document.body.classList.add('nav-search-open');
      searchToggle.setAttribute('aria-expanded', 'true');
      overlay.querySelector('input').focus();
    });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeSearch(); });
    meta.append(searchToggle);
  }
  const toolsList = toolsSection?.querySelector('ul');
  if (toolsList) {
    toolsList.classList.add('nav-tools');
    meta.append(toolsList);
  }
  nav.append(meta);

  // main row: section links
  const sectionsList = linksSection?.querySelector('ul');
  if (sectionsList) {
    sectionsList.classList.add('nav-sections');
    nav.append(sectionsList);
  }

  // mobile "More" menu: section links, language link and current language
  const more = document.createElement('button');
  more.type = 'button';
  more.className = 'nav-more';
  more.setAttribute('aria-controls', 'nav-more-panel');
  more.setAttribute('aria-expanded', 'false');
  more.append(createIcon('more'), document.createTextNode('More'));
  const morePanel = document.createElement('div');
  morePanel.className = 'nav-more-panel';
  morePanel.id = 'nav-more-panel';
  if (sectionsList) {
    const moreList = sectionsList.cloneNode(true);
    moreList.classList.remove('nav-sections');
    morePanel.append(moreList);
  }
  if (toolsList) morePanel.append(toolsList.cloneNode(true));
  const currentLang = toolsSection?.querySelector('p');
  if (currentLang) {
    currentLang.classList.add('nav-current-language');
    morePanel.append(currentLang);
  }
  const toggleMore = (forceOpen) => {
    const open = forceOpen ?? more.getAttribute('aria-expanded') !== 'true';
    more.setAttribute('aria-expanded', String(open));
    nav.setAttribute('aria-expanded', String(open));
  };
  more.addEventListener('click', () => toggleMore());
  nav.append(more, morePanel);

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (overlay && !overlay.hidden) closeSearch();
    else if (more.getAttribute('aria-expanded') === 'true') {
      toggleMore(false);
      more.focus();
    }
  });
  // close the mobile menu when the layout switches to desktop
  isDesktop.addEventListener('change', () => toggleMore(false));

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  if (skipLink) block.append(skipLink);
  block.append(navWrapper);
  if (overlay) block.append(overlay);
  decorateIcons(block);
}
