/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: Chicago Pneumatic (www.cp.com) section breaks + Section Metadata.
 * Uses payload.template.sections from tools/importer/page-templates.json.
 * Section selectors (verified in migration-work/cleaned.html):
 *   rc2 .ba-crossroad-component (L2342)
 *   rc3 .c-parsys-divider > .subtitle.s-editor (L2412)
 *   rc5 .card-overview (L2422)
 *
 * Breaks are inserted in beforeTransform (parsers replace section elements
 * between hooks); Section Metadata is added in afterTransform anchored to a
 * marker <hr>. Sections are iterated in reverse so earlier insertions never
 * shift elements not yet processed.
 */
const SECTION_MARKER_ATTR = 'data-excat-section-id';

function querySection(root, selectors) {
  const list = Array.isArray(selectors) ? selectors : [selectors];
  for (const sel of list) {
    if (!sel) continue;
    const el = root.querySelector(sel);
    if (el) return el;
  }
  return null;
}

// True when nothing with text or media precedes `el` inside `root`, i.e. a
// break before it would only open an empty first section (e.g. /en/about has
// no hero, so its "intro" section is the first content on the page).
function isLeadingContent(root, el) {
  let node = el;
  while (node && node !== root) {
    let prev = node.previousSibling;
    while (prev) {
      if (prev.nodeType === 3 && prev.textContent.trim()) return false;
      if (prev.nodeType === 1 && (prev.textContent.replace(/[\s ]+/g, '')
        || prev.querySelector('img, picture, video, iframe, table'))) return false;
      prev = prev.previousSibling;
    }
    node = node.parentNode;
  }
  return true;
}

export default function transform(hookName, element, payload) {
  const sections = (payload && payload.template && payload.template.sections) || [];
  if (sections.length < 2) return;
  const doc = element.ownerDocument;

  if (hookName === 'beforeTransform') {
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      if (i === 0 && !section.style) continue;
      const sectionEl = querySection(element, section.selector);
      if (!sectionEl) continue;
      // header chrome is still in the DOM here (removed in afterTransform), so
      // measure "leading" within #main
      const scope = sectionEl.closest('#main') || element;
      if (!section.style && isLeadingContent(scope, sectionEl)) continue;

      const hr = doc.createElement('hr');
      if (section.style) hr.setAttribute(SECTION_MARKER_ATTR, section.id);
      sectionEl.before(hr);
    }
  }

  if (hookName === 'afterTransform') {
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      if (!section.style) continue;

      const marker = element.querySelector(`[${SECTION_MARKER_ATTR}="${section.id}"]`);
      const anchor = marker || querySection(element, section.selector);
      if (!anchor) continue;

      const metadataBlock = WebImporter.Blocks.createBlock(doc, {
        name: 'Section Metadata',
        cells: { style: section.style },
      });
      anchor.after(metadataBlock);

      if (marker) {
        marker.removeAttribute(SECTION_MARKER_ATTR);
        if (i === 0) marker.remove();
      }
    }
  }
}
