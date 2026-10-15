/**
 * Hero: page-top banner.
 * Rows (EDS hero convention): optional background image, then H1 title,
 * intro paragraph(s) and an optional call-to-action. A picture becomes a cover
 * background; without one the block renders as a solid brand band (.hero-no-image).
 * @param {Element} block The hero block element
 */
export default function decorate(block) {
  // authors may leave the image row empty (or omit it): drop empty rows/cells
  [...block.querySelectorAll(':scope > div')].forEach((row) => {
    if (!row.textContent.trim() && !row.querySelector('picture, img, a')) row.remove();
  });

  const picture = block.querySelector('picture');
  if (!picture) {
    block.classList.add('hero-no-image');
    return;
  }

  // drop the paragraph wrapper the picture often sits in, so it can cover the block
  const parent = picture.parentElement;
  if (parent && parent.tagName === 'P' && parent.children.length === 1
    && !parent.textContent.trim()) {
    parent.replaceWith(picture);
  }
  block.classList.add('hero-with-image');
}
