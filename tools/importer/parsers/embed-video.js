/* eslint-disable */
/* global WebImporter */
/**
 * Parser for embed-video. Base: embed. Source: https://www.cp.com/en/about
 *
 * Output (embed convention): 1 column; one row with a single cell holding a
 * link to the video URL (no poster on the source).
 *   .video-external (YouTube; the iframe is already turned into
 *     <p><a href="https://www.youtube.com/watch?v=ID"> by cp-cleanup beforeTransform)
 *       -> Embed Video
 *   .c-hero video (/en/about/sustainability background video, Scene7 mp4 in
 *     <video><source src="//atlascopco.scene7.com/is/content/...mp4">)
 *       -> Embed Video (hero)
 */
function absolute(src) {
  if (!src) return '';
  if (src.startsWith('//')) return `https:${src}`;
  try { return new URL(src, 'https://www.cp.com/').href; } catch { return src; }
}

export default function parse(element, { document }) {
  const video = element.querySelector('video');
  let href = '';
  const variants = [];

  if (video) {
    const source = video.querySelector('source[src]');
    href = absolute(video.getAttribute('src') || (source && source.getAttribute('src')));
    if (element.matches('.c-hero, .c-hero *') || element.querySelector('.c-hero__video')) {
      variants.push('hero');
    }
  } else {
    const link = element.querySelector('a[href*="youtube.com"], a[href*="youtu.be"], a[href*="vimeo.com"]');
    const iframe = element.querySelector('iframe[src]');
    href = absolute((link && link.getAttribute('href')) || (iframe && iframe.getAttribute('src')));
    // author-friendly watch URL instead of the player URL
    const embed = href.match(/youtube(?:-nocookie)?\.com\/embed\/([\w-]+)/);
    if (embed) href = `https://www.youtube.com/watch?v=${embed[1]}`;
  }

  if (!href) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const a = document.createElement('a');
  a.href = href;
  a.textContent = href;

  const name = variants.length ? `embed-video (${variants.join(', ')})` : 'embed-video';
  const block = WebImporter.Blocks.createBlock(document, { name, cells: [[a]] });
  element.replaceWith(block);
}
