import { createOptimizedPicture } from '../../scripts/aem.js';

const DESKTOP = window.matchMedia('(width >= 900px)');

let cardCount = 0;

/**
 * Splits an authored "Country - Language" link label into
 * country / gold separator / language spans.
 * @param {HTMLAnchorElement} a The region link
 */
function decorateRegionLink(a) {
  const label = a.textContent.trim();
  const sep = label.indexOf(' - ');
  if (sep < 0) return;
  const country = document.createElement('span');
  country.className = 'cards-crossroad-region-country';
  country.textContent = label.slice(0, sep).trim();
  const divider = document.createElement('span');
  divider.className = 'cards-crossroad-region-divider';
  divider.setAttribute('aria-hidden', 'true');
  const language = document.createElement('span');
  language.className = 'cards-crossroad-region-language';
  language.textContent = label.slice(sep + 3).trim();
  a.replaceChildren(country, ' ', divider, ' ', language);
}

/**
 * Builds the in-card region/language picker around the authored region list.
 * @param {Element} list The authored region list
 * @param {string} titleText The division title
 * @param {string} id Unique id suffix
 * @returns {HTMLElement} The (hidden) picker panel
 */
function buildPicker(list, titleText, id) {
  const picker = document.createElement('div');
  picker.className = 'cards-crossroad-card-picker';
  picker.id = `cards-crossroad-picker-${id}`;
  picker.setAttribute('role', 'dialog');
  picker.hidden = true;

  const bar = document.createElement('div');
  bar.className = 'cards-crossroad-card-picker-bar';
  const barTitle = document.createElement('p');
  barTitle.className = 'cards-crossroad-card-picker-title';
  barTitle.id = `cards-crossroad-picker-title-${id}`;
  barTitle.textContent = titleText;
  picker.setAttribute('aria-labelledby', barTitle.id);
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'cards-crossroad-card-picker-close';
  close.setAttribute('aria-label', `Close${titleText ? `: ${titleText}` : ''}`);
  bar.append(barTitle, close);

  const scroller = document.createElement('div');
  scroller.className = 'cards-crossroad-card-picker-list';
  list.classList.add('cards-crossroad-card-regions');
  list.querySelectorAll('a').forEach(decorateRegionLink);
  scroller.append(list);

  picker.append(bar, scroller);
  return picker;
}

/**
 * Wires open/close behaviour of a card's picker.
 * Desktop: a click anywhere on the card opens it. Mobile: only the Explore link.
 * @param {HTMLLIElement} li The card
 * @param {HTMLElement} picker The picker panel
 * @param {HTMLAnchorElement|null} exploreLink The Explore link (kept as no-JS fallback)
 * @param {HTMLButtonElement|null} toggle The mobile "+" toggle
 */
function wirePicker(li, picker, exploreLink, toggle) {
  const trigger = exploreLink || li;
  const close = picker.querySelector('.cards-crossroad-card-picker-close');
  if (trigger === li) li.tabIndex = 0;
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', picker.id);
  if (exploreLink) exploreLink.setAttribute('role', 'button');

  let onOutside;
  const closePicker = (restoreFocus) => {
    if (picker.hidden) return;
    picker.hidden = true;
    li.classList.remove('is-picker-open');
    trigger.setAttribute('aria-expanded', 'false');
    document.removeEventListener('click', onOutside);
    if (restoreFocus) trigger.focus();
  };
  onOutside = (e) => {
    if (!li.contains(e.target)) closePicker(false);
  };
  const openPicker = () => {
    picker.hidden = false;
    li.classList.add('is-picker-open');
    trigger.setAttribute('aria-expanded', 'true');
    picker.querySelector('.cards-crossroad-card-picker-list').scrollTop = 0;
    document.addEventListener('click', onOutside);
    close.focus();
  };

  li.addEventListener('click', (e) => {
    if (picker.contains(e.target) || (toggle && toggle.contains(e.target))) return;
    const onExplore = exploreLink && exploreLink.contains(e.target);
    // mobile: only the Explore link opens it (the card itself when there is no link)
    if (exploreLink && !onExplore && !DESKTOP.matches) return;
    e.preventDefault();
    openPicker();
  });

  trigger.addEventListener('keydown', (e) => {
    if (e.target !== trigger) return;
    // anchors already fire click on Enter
    if (e.key === ' ' || (e.key === 'Enter' && trigger === li)) {
      e.preventDefault();
      openPicker();
    }
  });

  close.addEventListener('click', () => closePicker(true));
  picker.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      closePicker(true);
    }
  });
  li.addEventListener('focusout', (e) => {
    if (e.relatedTarget && !li.contains(e.relatedTarget)) closePicker(false);
  });
}

/**
 * Decorates a crossroad card list: one full-height image panel per division
 * with a title band. The description is revealed on hover/focus (desktop) or
 * via the "+" toggle (mobile). Activating a card (desktop) or its Explore link
 * (mobile) opens an in-card region/language picker.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const ul = document.createElement('ul');

  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    li.className = 'cards-crossroad-card';

    const cells = [...row.children];
    const imageCell = cells.find((cell) => cell.querySelector('picture, img')
      && !cell.textContent.trim());
    const bodyCells = cells.filter((cell) => cell !== imageCell);

    if (imageCell) {
      imageCell.className = 'cards-crossroad-card-image';
      li.append(imageCell);
    }

    const content = document.createElement('div');
    bodyCells.forEach((cell) => {
      while (cell.firstChild) content.append(cell.firstChild);
    });
    // drop empty paragraphs left by authoring
    content.querySelectorAll('p').forEach((p) => {
      if (!p.textContent.trim() && !p.querySelector('img, picture, a')) p.remove();
    });

    const body = document.createElement('div');
    body.className = 'cards-crossroad-card-body';

    // title = first heading (fallback: first paragraph)
    const title = content.querySelector('h1, h2, h3, h4, h5, h6') || content.querySelector('p');
    const titleText = title ? title.textContent.trim() : '';
    const titleWrap = document.createElement('div');
    titleWrap.className = 'cards-crossroad-card-title';
    if (title) {
      title.classList.add('cards-crossroad-card-heading');
      titleWrap.append(title);
    }

    // description = text paragraphs (no links) directly in the content
    const description = document.createElement('div');
    description.className = 'cards-crossroad-card-description';
    [...content.children]
      .filter((el) => el.tagName === 'P' && !el.querySelector('a'))
      .forEach((p) => description.append(p));
    if (description.children.length) titleWrap.append(description);
    body.append(titleWrap);

    cardCount += 1;
    const id = String(cardCount);

    // region list -> picker (first list only)
    const regions = content.querySelector('ul, ol');
    const picker = regions && regions.querySelector('a')
      ? buildPicker(regions, titleText, id) : null;
    if (regions && !picker) regions.remove();

    // details = everything else (explore link)
    const details = document.createElement('div');
    details.className = 'cards-crossroad-card-details';
    details.id = `cards-crossroad-details-${id}`;
    while (content.firstChild) details.append(content.firstChild);
    const explore = [...details.children].find((el) => el.tagName === 'P' && el.querySelector('a'));
    const exploreLink = explore ? explore.querySelector('a') : null;
    if (explore) {
      explore.classList.add('cards-crossroad-card-explore');
      li.classList.add('has-link');
    }

    let toggle = null;
    if (details.children.length) {
      body.append(details);
      toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'cards-crossroad-card-toggle';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-controls', details.id);
      toggle.setAttribute('aria-label', `Show more${titleText ? `: ${titleText}` : ''}`);
      const icon = document.createElement('span');
      icon.className = 'cards-crossroad-card-toggle-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = '+';
      toggle.append(icon);
      toggle.addEventListener('click', () => {
        const open = li.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      body.append(toggle);
    }

    li.append(body);
    if (picker) {
      li.classList.add('has-picker');
      li.append(picker);
      wirePicker(li, picker, exploreLink, toggle);
    }
    if (li.children.length) ul.append(li);
  });

  ul.querySelectorAll('picture > img').forEach((img) => {
    img.closest('picture').replaceWith(
      createOptimizedPicture(img.src, img.alt, false, [{ media: '(min-width: 900px)', width: '1200' }, { width: '750' }]),
    );
  });

  block.replaceChildren(ul);
}
