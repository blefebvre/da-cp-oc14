/**
 * Fetches the footer fragment as plain HTML.
 * /content/footer.plain.html serves the local preview, /footer.plain.html serves DA/EDS.
 * @returns {Promise<Element|null>} container holding the footer sections
 */
async function fetchFooter() {
  let resp = await fetch('/content/footer.plain.html');
  if (!resp.ok) resp = await fetch('/footer.plain.html');
  if (!resp.ok) return null;
  const container = document.createElement('div');
  container.innerHTML = await resp.text();
  return container;
}

function isExternal(link) {
  try {
    const url = new URL(link.href, window.location.href);
    return url.origin !== window.location.origin && !/\.aem\.(page|live)$/.test(url.hostname);
  } catch (e) {
    return false;
  }
}

/**
 * Groups each heading with the content that follows it into a column.
 * @param {Element} section
 */
function buildColumns(section) {
  const columns = document.createElement('div');
  columns.className = 'footer-columns';
  let column = null;
  [...section.children].forEach((el) => {
    if (/^H[1-6]$/.test(el.tagName) || !column) {
      column = document.createElement('div');
      column.className = 'footer-column';
      columns.append(column);
    }
    column.append(el);
  });
  columns.querySelectorAll('li a').forEach((a) => {
    if (isExternal(a)) {
      a.classList.add('footer-link-external');
      a.target = '_blank';
      a.rel = 'noreferrer noopener';
    }
  });
  return columns;
}

/**
 * Decorates the legal row: links, a cookie-settings trigger and the copyright line.
 * @param {Element} section
 */
function buildLegal(section) {
  const legal = document.createElement('div');
  legal.className = 'footer-legal';
  legal.append(...section.childNodes);
  legal.querySelectorAll('li').forEach((li) => {
    if (li.querySelector('a')) return;
    const text = li.textContent.trim();
    if (/cookie/i.test(text)) {
      // cookie preferences: opens the consent manager when one is installed
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'footer-cookie-settings';
      button.textContent = text;
      button.addEventListener('click', () => {
        if (window.OneTrust?.ToggleInfoDisplay) window.OneTrust.ToggleInfoDisplay();
      });
      li.replaceChildren(button);
    } else {
      const span = document.createElement('span');
      span.className = 'footer-text';
      span.textContent = text;
      li.replaceChildren(span);
    }
  });
  return legal;
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const content = await fetchFooter();
  block.textContent = '';
  if (!content) return;

  const [linksSection, legalSection, ...rest] = [...content.children];
  const footer = document.createElement('div');
  if (linksSection) footer.append(buildColumns(linksSection));
  if (legalSection) footer.append(buildLegal(legalSection));
  footer.append(...rest);
  block.append(footer);
}
