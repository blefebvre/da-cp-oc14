/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: Chicago Pneumatic (www.cp.com) Dynamic Media / Scene7 images.
 *
 * PROJECT DEVIATION (intentional) from references/dm-scene7-transformer.md:
 * this project must NOT edit scripts/aem.js (vendored, see AGENTS.md) and must
 * not modify scripts/scripts.js, so the anchor-carrier + client auto-block +
 * aem.js dispatcher pattern is NOT used. The only Scene7 images on the site
 * (metadata.json .images.mapping) are simple card-overview tile images with a
 * `$landscape600$` preset:
 *   https://atlascopco.scene7.com/is/image/atlascopco/co-workers-in-discussion?$landscape600$
 *   https://atlascopco.scene7.com/is/image/atlascopco/careers-cp-grey?$landscape600$
 * They are emitted as plain <img> elements with an absolute Scene7 src; DA
 * ingests them into the media bus on preview, after which the standard EDS
 * createOptimizedPicture path applies.
 *
 * beforeTransform: promote lazy-load attributes to src and copy the wrapper's
 *   title (L2433/L2459 .cq-dd-image[title]) to alt when missing, so parsers
 *   pick up a real src + alt.
 * afterTransform: normalise every Scene7 <img> to an absolute src and strip
 *   responsive/lazy attributes that would confuse ingestion.
 */

// Canonical detector (byte-identical with dm-scene7-helpers.js).
function detectDynamicMediaUrl(urlStr) {
  let u;
  try { u = new URL(urlStr, 'https://x/'); } catch { return false; }
  if (u.pathname.startsWith('/is/image/')) {
    return 'scene7';
  }
  if (/^delivery-p\d+-e\d+\.adobeaemcloud\.com$/.test(u.hostname)
      && u.pathname.startsWith('/adobe/assets/urn:')) {
    return 'dm-openapi';
  }
  return false;
}

const LAZY_SRC_ATTRS = ['data-src', 'data-lazy-src', 'data-original'];

function toAbsolute(src, base) {
  try { return new URL(src, base).href; } catch { return src; }
}

function firstSrcsetUrl(srcset) {
  if (!srcset) return '';
  return srcset.split(',')[0].trim().split(/\s+/)[0] || '';
}

export default function transform(hookName, element, payload) {
  const base = (payload && payload.url) || 'https://www.cp.com/';

  if (hookName === 'beforeTransform') {
    element.querySelectorAll('img').forEach((img) => {
      const lazy = LAZY_SRC_ATTRS.map((a) => img.getAttribute(a)).find((v) => v && detectDynamicMediaUrl(v));
      const fromSrcset = firstSrcsetUrl(img.getAttribute('srcset') || img.getAttribute('data-srcset'));
      const current = img.getAttribute('src') || '';
      if (!detectDynamicMediaUrl(current)) {
        if (lazy) img.setAttribute('src', lazy);
        else if (fromSrcset && detectDynamicMediaUrl(fromSrcset)) img.setAttribute('src', fromSrcset);
      }
      if (!detectDynamicMediaUrl(img.getAttribute('src') || '')) return;

      if (!img.getAttribute('alt')) {
        const wrapper = img.closest('.cq-dd-image[title]');
        if (wrapper) img.setAttribute('alt', wrapper.getAttribute('title').trim());
      }
    });
  }

  if (hookName === 'afterTransform') {
    element.querySelectorAll('img').forEach((img) => {
      const src = img.getAttribute('src') || '';
      if (!detectDynamicMediaUrl(src)) return;

      img.setAttribute('src', toAbsolute(src, base));
      ['srcset', 'data-srcset', 'sizes', 'loading', ...LAZY_SRC_ATTRS].forEach((a) => img.removeAttribute(a));

      // Drop <source> siblings so the Scene7 <img> is the only rendition.
      const picture = img.parentElement;
      if (picture && picture.tagName === 'PICTURE') {
        picture.querySelectorAll('source').forEach((s) => s.remove());
      }
    });
  }
}
