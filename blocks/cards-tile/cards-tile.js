import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Decorates link tiles: one image per tile with a caption bar overlapping
 * the bottom of the image. The whole tile is clickable (forwards to the caption link).
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const ul = document.createElement('ul');

  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    li.className = 'cards-tile-card';

    const cells = [...row.children];
    const imageCell = cells.find((cell) => cell.querySelector('picture, img')
      && !cell.textContent.trim());
    const bodyCells = cells.filter((cell) => cell !== imageCell);

    if (imageCell) {
      imageCell.className = 'cards-tile-card-image';
      li.append(imageCell);
    }

    const body = document.createElement('div');
    body.className = 'cards-tile-card-body';
    bodyCells.forEach((cell) => {
      while (cell.firstChild) body.append(cell.firstChild);
    });
    body.querySelectorAll('p').forEach((p) => {
      if (!p.textContent.trim() && !p.querySelector('img, picture, a')) p.remove();
    });
    if (body.children.length || body.textContent.trim()) li.append(body);

    // the whole tile is clickable (like the source); the first link is the target
    const link = body.querySelector('a[href]');
    if (link) {
      li.classList.add('cards-tile-card-linked');
      link.classList.add('cards-tile-card-link');
      li.addEventListener('click', (e) => {
        if (e.target.closest('a')) return;
        if (e.ctrlKey || e.metaKey || e.shiftKey) {
          window.open(link.href, '_blank', 'noopener');
        } else {
          link.click();
        }
      });
    }

    if (li.children.length) ul.append(li);
  });

  // optimize same-origin (media bus) images; external image servers keep their own URL params
  ul.querySelectorAll('picture > img').forEach((img) => {
    if (new URL(img.src, window.location.href).origin !== window.location.origin) return;
    img.closest('picture').replaceWith(
      createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]),
    );
  });

  block.replaceChildren(ul);
}
