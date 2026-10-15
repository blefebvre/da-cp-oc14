import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Returns the autoplay embed URL of a YouTube/Vimeo watch link, or null.
 * @param {string} href The link URL
 * @returns {string|null}
 */
function getVideoEmbedUrl(href) {
  let url;
  try {
    url = new URL(href, window.location.href);
  } catch (e) {
    return null;
  }
  const host = url.hostname.replace(/^(www|m)\./, '');
  if (['youtube.com', 'youtube-nocookie.com', 'youtu.be'].includes(host)) {
    let id = host === 'youtu.be' ? url.pathname.split('/')[1] : url.searchParams.get('v');
    if (!id) [, id] = url.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]+)/) || [];
    if (!id) return null;
    const params = new URLSearchParams({ autoplay: '1', rel: '0' });
    const start = parseInt(url.searchParams.get('t') || url.searchParams.get('start') || '', 10);
    if (start) params.set('start', start);
    return `https://www.youtube.com/embed/${id}?${params}`;
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const match = url.pathname.match(/(\d+)(?:\/(\w+))?/);
    if (!match) return null;
    const params = new URLSearchParams({ autoplay: '1' });
    if (match[2]) params.set('h', match[2]);
    return `https://player.vimeo.com/video/${match[1]}?${params}`;
  }
  return null;
}

/**
 * Returns the video link of a tile body that holds nothing but one YouTube/Vimeo link.
 * @param {Element} body The tile body
 * @returns {HTMLAnchorElement|null}
 */
function getVideoOnlyLink(body) {
  const links = body.querySelectorAll('a[href]');
  if (links.length !== 1) return null;
  const [link] = links;
  if (body.querySelector('picture, img, video, iframe')) return null;
  if (body.textContent.trim() !== link.textContent.trim()) return null;
  return getVideoEmbedUrl(link.href) ? link : null;
}

/**
 * Lazily creates the block's video dialog (one per block); closing it removes the player.
 * @param {Element} block The block element
 * @returns {HTMLDialogElement}
 */
function getVideoDialog(block) {
  let dialog = block.querySelector(':scope > dialog.cards-tile-video-modal');
  if (dialog) return dialog;
  dialog = document.createElement('dialog');
  dialog.className = 'cards-tile-video-modal';
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'cards-tile-video-close';
  close.setAttribute('aria-label', 'Close video');
  const frame = document.createElement('div');
  frame.className = 'cards-tile-video-frame';
  // the video title shows under the player (like the source popup) and names the dialog
  const title = document.createElement('p');
  title.className = 'cards-tile-video-title';
  title.id = `cards-tile-video-title-${document.querySelectorAll('.cards-tile-video-modal').length}`;
  dialog.setAttribute('aria-labelledby', title.id);
  dialog.append(close, frame, title);
  close.addEventListener('click', () => dialog.close());
  // a click on the backdrop (outside the frame) closes the dialog
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => {
    frame.replaceChildren();
    if (dialog.returnFocusTo) dialog.returnFocusTo.focus();
  });
  block.append(dialog);
  return dialog;
}

/**
 * Turns a tile whose body is only a video link into a play tile that opens a video dialog.
 * @param {Element} block The block element
 * @param {Element} li The tile
 * @param {HTMLAnchorElement} link The video link
 */
function decorateVideoTile(block, li, link) {
  const title = link.textContent.trim();
  const label = title && !/^https?:\/\//.test(title) ? title : 'Video';
  li.classList.add('cards-tile-card-video');
  link.classList.add('cards-tile-card-play');
  link.setAttribute('aria-haspopup', 'dialog');
  link.setAttribute('aria-label', `Play video: ${label}`);
  const text = document.createElement('span');
  text.className = 'cards-tile-card-play-label';
  text.textContent = label;
  link.replaceChildren(text);

  link.addEventListener('click', (e) => {
    // modified clicks keep the native link behaviour (open the video page)
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
    const dialog = getVideoDialog(block);
    if (typeof dialog.showModal !== 'function') return;
    e.preventDefault();
    const iframe = document.createElement('iframe');
    iframe.src = getVideoEmbedUrl(link.href);
    iframe.title = label;
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    dialog.querySelector('.cards-tile-video-frame').replaceChildren(iframe);
    dialog.querySelector('.cards-tile-video-title').textContent = label;
    dialog.returnFocusTo = link;
    dialog.showModal();
  });
}

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

    // a tile whose body is only a YouTube/Vimeo link plays the video in a dialog
    const videoLink = getVideoOnlyLink(body);
    // the whole tile is clickable (like the source); the first link is the target
    const link = videoLink ? null : body.querySelector('a[href]');
    if (videoLink) {
      decorateVideoTile(block, li, videoLink);
    } else if (link) {
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

  // the related/list options show photos at their own ratio: ask Dynamic Media (Scene7)
  // not to pad presets for images smaller than the preset (white bars otherwise)
  const naturalRatio = block.classList.contains('related') || block.classList.contains('list');

  // optimize same-origin (media bus) images; external image servers keep their own URL params
  ul.querySelectorAll('picture > img').forEach((img) => {
    const url = new URL(img.src, window.location.href);
    if (url.origin !== window.location.origin) {
      if (naturalRatio && url.pathname.includes('/is/image/') && !/[?&]fit=/.test(url.search)) {
        img.src = `${url.href}${url.search ? '&' : '?'}fit=constrain`;
      }
      return;
    }
    img.closest('picture').replaceWith(
      createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]),
    );
  });

  block.replaceChildren(ul);
}
