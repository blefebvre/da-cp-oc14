/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns (vanilla). Source: https://www.cp.com/en/about/sustainability
 *
 * Paragraph-with-image component -> 1 row, 2 columns: [ text | image ]
 * (the image cell follows the text when the source floats it right,
 * .s-img--right; otherwise it comes first).
 *
 * Validated selectors (migration-work/about-src/main_en_about_sustainability.html):
 *   .paragraph-with-image > .s-img-container
 *     > .s-img.par-with-image picture > img   (Scene7 src resolved by cp-dm-images)
 *     > div  (p, ul, p ... rich text)
 */
export default function parse(element, { document }) {
  const container = element.querySelector('.s-img-container') || element;
  const imgWrap = container.querySelector('.s-img, .par-with-image');
  const picture = imgWrap && (imgWrap.querySelector('picture') || imgWrap.querySelector('img'));

  const textWrap = [...container.children].find((c) => c !== imgWrap && !c.contains(imgWrap));
  const text = textWrap ? [...textWrap.childNodes].filter((n) => n.nodeType === 1 || n.textContent.trim()) : [];

  if (!picture && !text.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const imageCell = picture ? [picture] : '';
  const textCell = text.length ? text : '';
  const imageRight = !imgWrap || imgWrap.classList.contains('s-img--right');
  const row = imageRight ? [textCell, imageCell] : [imageCell, textCell];

  const block = WebImporter.Blocks.createBlock(document, { name: 'columns', cells: [row] });
  element.replaceWith(block);
}
