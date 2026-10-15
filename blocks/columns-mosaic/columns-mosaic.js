import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Returns true when a cell only holds an image (no meaningful text).
 * @param {Element} cell The cell element
 * @returns {boolean}
 */
function isImageCell(cell) {
  return !!cell.querySelector('picture, img') && !cell.textContent.trim();
}

/**
 * Decorates the brand values mosaic: each row is a pair of equal tiles,
 * one photo and one solid colour text tile. Authors pick the image side by cell order;
 * the text tile colour alternates by row (odd rows red, even rows black).
 * @param {Element} block The block element
 */
export default function decorate(block) {
  let rowIndex = 0;

  [...block.children].forEach((row) => {
    const cells = [...row.children].filter((cell) => cell.children.length
      || cell.textContent.trim());

    // drop rows authors left empty
    if (!cells.length) {
      row.remove();
      return;
    }

    row.className = 'columns-mosaic-row';
    rowIndex += 1;
    if (rowIndex % 2 === 0) row.classList.add('columns-mosaic-row-dark');

    // remove empty cells so the pair stays a clean two-tile grid
    [...row.children].forEach((cell) => {
      if (!cells.includes(cell)) cell.remove();
    });

    cells.forEach((cell) => {
      cell.classList.add('columns-mosaic-tile');
      if (isImageCell(cell)) {
        cell.classList.add('columns-mosaic-image');
      } else {
        cell.classList.add('columns-mosaic-text');
        cell.querySelectorAll('p').forEach((p) => {
          if (!p.textContent.trim() && !p.querySelector('img, picture, a')) p.remove();
        });
      }
    });

    if (cells[0].classList.contains('columns-mosaic-text')) {
      row.classList.add('columns-mosaic-row-text-first');
    }
    if (cells.length === 1) row.classList.add('columns-mosaic-row-single');
  });

  // optimize same-origin (media bus) images; external image servers keep their own URL params
  block.querySelectorAll('.columns-mosaic-image picture > img').forEach((img) => {
    if (new URL(img.src, window.location.href).origin !== window.location.origin) return;
    img.closest('picture').replaceWith(
      createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]),
    );
  });
}
