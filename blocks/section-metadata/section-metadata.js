import { readBlockConfig, toClassName } from '../../scripts/aem.js';

/**
 * Applies section metadata (style + data attributes) to the parent section
 * and removes the metadata block from the rendered page.
 * @param {Element} block The section-metadata block element
 */
export default function decorate(block) {
  const section = block.closest('.section');
  if (section) {
    const meta = readBlockConfig(block);
    Object.entries(meta).forEach(([key, value]) => {
      if (key === 'style') {
        String(value).split(',')
          .map((style) => toClassName(style.trim()))
          .filter(Boolean)
          .forEach((style) => section.classList.add(style));
      } else {
        section.dataset[toClassName(key).replace(/-([a-z])/g, (g) => g[1].toUpperCase())] = value;
      }
    });
  }
  const wrapper = block.parentElement;
  block.remove();
  if (wrapper && wrapper.classList.contains('section-metadata-wrapper') && !wrapper.children.length) {
    wrapper.remove();
  }
}
