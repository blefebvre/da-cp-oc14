const VIDEO_FILE = /\.(mp4|webm|ogv|mov|m4v)$/i;
const VIDEO_TYPES = {
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  ogv: 'video/ogg',
};

/**
 * Parses an authored link into a playable source.
 * @param {string} href The link URL
 * @returns {{type: string, src: string}|null}
 */
function parseVideoUrl(href) {
  let url;
  try {
    url = new URL(href, window.location.href);
  } catch (e) {
    return null;
  }
  const host = url.hostname.replace(/^www\.|^m\./, '');

  if (host === 'youtube.com' || host === 'youtube-nocookie.com' || host === 'youtu.be') {
    let id = '';
    if (host === 'youtu.be') {
      [, id] = url.pathname.split('/');
    } else if (url.searchParams.get('v')) {
      id = url.searchParams.get('v');
    } else {
      const match = url.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]+)/);
      if (match) [, id] = match;
    }
    if (!id) return null;
    const params = new URLSearchParams({ rel: '0' });
    const start = parseInt(url.searchParams.get('t') || url.searchParams.get('start') || '', 10);
    if (start) params.set('start', start);
    return { type: 'iframe', src: `https://www.youtube.com/embed/${id}?${params}`, provider: 'YouTube' };
  }

  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const match = url.pathname.match(/(\d+)(?:\/(\w+))?/);
    if (!match) return null;
    const params = new URLSearchParams();
    if (match[2]) params.set('h', match[2]);
    const query = params.toString();
    return { type: 'iframe', src: `https://player.vimeo.com/video/${match[1]}${query ? `?${query}` : ''}`, provider: 'Vimeo' };
  }

  if (VIDEO_FILE.test(url.pathname)) {
    return { type: 'file', src: url.href };
  }
  return null;
}

/**
 * Runs a callback once the element scrolls near the viewport.
 * @param {Element} el The observed element
 * @param {Function} callback Called once
 */
function whenVisible(el, callback) {
  if (!('IntersectionObserver' in window)) {
    callback();
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      observer.disconnect();
      callback();
    }
  }, { rootMargin: '200px' });
  observer.observe(el);
}

function buildIframe(source, title, autoplay) {
  const iframe = document.createElement('iframe');
  const src = new URL(source.src);
  if (autoplay) src.searchParams.set('autoplay', '1');
  iframe.src = src.href;
  iframe.title = title || `${source.provider} video`;
  iframe.loading = 'lazy';
  iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
  return iframe;
}

function buildVideo(source, { hero, poster }) {
  const video = document.createElement('video');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');
  video.preload = 'metadata';
  if (!reducedMotion) {
    video.autoplay = true;
    video.setAttribute('autoplay', '');
  }
  // the background (hero) video has no controls unless motion is reduced (so it can be started)
  if (!hero || reducedMotion) video.controls = true;
  if (hero) video.setAttribute('aria-hidden', 'true');
  if (poster) video.poster = poster;

  const sourceEl = document.createElement('source');
  sourceEl.src = source.src;
  const ext = new URL(source.src).pathname.split('.').pop().toLowerCase();
  if (VIDEO_TYPES[ext]) sourceEl.type = VIDEO_TYPES[ext];
  video.append(sourceEl);
  return video;
}

/**
 * Decorates a video embed: YouTube/Vimeo links become a lazy 16:9 iframe,
 * direct video files become a muted looping video. The 'hero' option renders a
 * full-bleed background video.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const link = [...block.querySelectorAll('a[href]')]
    .find((a) => parseVideoUrl(a.href));
  // nothing we can play: leave the authored content as is
  if (!link) return;

  const source = parseVideoUrl(link.href);
  const hero = block.classList.contains('hero');
  const picture = block.querySelector('picture');
  const posterImg = picture && picture.querySelector('img');
  const text = link.textContent.trim();
  const title = text && text !== link.href && !/^https?:\/\//.test(text) ? text : '';

  const frame = document.createElement('div');
  frame.className = 'embed-video-frame';

  if (source.type === 'file') {
    const video = buildVideo(source, {
      hero,
      poster: posterImg ? posterImg.currentSrc || posterImg.src : '',
    });
    if (title) video.setAttribute('aria-label', title);
    frame.append(video);
    block.replaceChildren(frame);
    if (!hero) {
      // defer the download until the player is near the viewport
      video.preload = 'none';
      whenVisible(block, () => {
        video.preload = 'metadata';
        video.load();
      });
    }
    return;
  }

  if (posterImg) {
    // click-to-play: poster + play button, the iframe loads on demand
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'embed-video-play';
    button.setAttribute('aria-label', title ? `Play video: ${title}` : 'Play video');
    const posterWrap = document.createElement('div');
    posterWrap.className = 'embed-video-poster';
    posterWrap.append(picture);
    frame.append(posterWrap, button);
    button.addEventListener('click', () => {
      frame.replaceChildren(buildIframe(source, title, true));
    });
  } else {
    whenVisible(block, () => {
      frame.append(buildIframe(source, title, false));
    });
  }
  block.replaceChildren(frame);
}
