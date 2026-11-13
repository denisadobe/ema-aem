import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

function optimizeImages(root) {
  root.querySelectorAll('picture > img').forEach((img) => {
    const url = new URL(img.src, window.location.href);
    if (url.origin !== window.location.origin || /\.svg$/i.test(url.pathname)) return;
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    moveInstrumentation(img, optimizedPic.querySelector('img'));
    img.closest('picture').replaceWith(optimizedPic);
  });
}

function isLinkOnly(div) {
  const links = div.querySelectorAll('a[href]');
  if (links.length !== 1 || div.querySelector('picture')) return false;
  return div.textContent.trim() === links[0].textContent.trim();
}

/** Returns an embeddable player element for a video URL. */
function buildPlayer(href, title) {
  let url;
  try {
    url = new URL(href, window.location.href);
  } catch (e) {
    return null;
  }
  const host = url.hostname.replace(/^www\./, '');
  let embedSrc = null;
  if (host === 'youtu.be') {
    embedSrc = `https://www.youtube.com/embed/${url.pathname.slice(1)}?autoplay=1&rel=0`;
  } else if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
    const id = url.searchParams.get('v')
      || url.pathname.split('/').filter(Boolean).pop();
    embedSrc = `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
  } else if (host.endsWith('vimeo.com')) {
    const id = url.pathname.split('/').filter(Boolean).pop();
    embedSrc = `https://player.vimeo.com/video/${id}?autoplay=1`;
  }

  if (embedSrc) {
    const iframe = document.createElement('iframe');
    iframe.src = embedSrc;
    iframe.title = title || 'Video';
    iframe.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.loading = 'lazy';
    return iframe;
  }

  if (/\.(mp4|webm|ogg|mov)$/i.test(url.pathname)) {
    const video = document.createElement('video');
    video.src = url.href;
    video.controls = true;
    video.autoplay = true;
    video.playsInline = true;
    if (title) video.setAttribute('aria-label', title);
    return video;
  }
  return null;
}

export default function decorate(block) {
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    li.className = 'cards-video-card';
    moveInstrumentation(row, li);
    while (row.firstElementChild) li.append(row.firstElementChild);

    let media = null;
    let videoLink = null;
    [...li.children].forEach((div) => {
      const hasPicture = !!div.querySelector('picture');
      if (!div.textContent.trim() && !hasPicture) {
        div.remove();
      } else if (hasPicture && !media) {
        div.className = 'cards-video-card-media';
        media = div;
        // poster may be wrapped in the video link
        const a = div.querySelector('a[href]');
        if (a && !videoLink) videoLink = a;
      } else if (!videoLink && isLinkOnly(div)) {
        videoLink = div.querySelector('a[href]');
        div.remove();
      } else {
        div.className = 'cards-video-card-body';
      }
    });

    if (!media) {
      media = document.createElement('div');
      media.className = 'cards-video-card-media';
    }
    li.prepend(media);

    if (videoLink) {
      const { href } = videoLink;
      const title = li.querySelector('.cards-video-card-body')?.textContent.trim() || videoLink.textContent.trim();
      const poster = media.querySelector('picture');
      media.replaceChildren();
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cards-video-card-play';
      button.setAttribute('aria-label', title ? `Play video: ${title}` : 'Play video');
      if (poster) button.append(poster);
      const icon = document.createElement('span');
      icon.className = 'cards-video-card-play-icon';
      icon.setAttribute('aria-hidden', 'true');
      button.append(icon);
      media.append(button);
      button.addEventListener('click', () => {
        const player = buildPlayer(href, title);
        if (!player) {
          window.open(href, '_blank', 'noopener');
          return;
        }
        media.replaceChildren(player);
        media.classList.add('cards-video-card-playing');
      });
    }

    if (li.children.length) ul.append(li);
  });
  optimizeImages(ul);
  block.replaceChildren(ul);
}
