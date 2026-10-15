import { createOptimizedPicture } from '../../scripts/aem.js';

let cardCount = 0;

/**
 * Decorates a crossroad card list: one full-height image panel per division
 * with a title band. The description is revealed on hover/focus (desktop),
 * the explore link stretches over the whole panel (desktop), and the region
 * list is revealed via the toggle button.
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

    // details = everything else (explore link, region list)
    const details = document.createElement('div');
    details.className = 'cards-crossroad-card-details';
    cardCount += 1;
    details.id = `cards-crossroad-details-${cardCount}`;
    while (content.firstChild) details.append(content.firstChild);
    details.querySelectorAll('ul, ol').forEach((list) => list.classList.add('cards-crossroad-card-regions'));
    const explore = [...details.children].find((el) => el.tagName === 'P' && el.querySelector('a'));
    if (explore) {
      explore.classList.add('cards-crossroad-card-explore');
      li.classList.add('has-link');
    }

    if (details.children.length) {
      body.append(details);
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'cards-crossroad-card-toggle';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-controls', details.id);
      toggle.setAttribute('aria-label', `Show more${title ? `: ${title.textContent.trim()}` : ''}`);
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
    if (li.children.length) ul.append(li);
  });

  ul.querySelectorAll('picture > img').forEach((img) => {
    img.closest('picture').replaceWith(
      createOptimizedPicture(img.src, img.alt, false, [{ media: '(min-width: 900px)', width: '1200' }, { width: '750' }]),
    );
  });

  block.replaceChildren(ul);
}
