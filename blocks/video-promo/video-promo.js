/*
 * Video Promo Block
 * Promotional video in a rounded frame.
 * - Without a placeholder image: the video plays muted, looped and inline once it
 *   scrolls into view (falls back to a paused video with controls under
 *   prefers-reduced-motion).
 * - With a placeholder image: the poster is shown with a play button; clicking it
 *   loads and plays the video with controls.
 *
 * Authored structure:
 * - a link (or URL as text): video source (MP4/WebM, YouTube or Vimeo)
 * - optional picture: placeholder / poster image
 */

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function iframeWrapper(src, title) {
  const wrapper = document.createElement('div');
  wrapper.className = 'video-promo-frame';
  const iframe = document.createElement('iframe');
  iframe.src = src;
  iframe.title = title;
  iframe.loading = 'lazy';
  iframe.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope');
  iframe.setAttribute('allowfullscreen', '');
  wrapper.append(iframe);
  return wrapper;
}

function embedYoutube(url, autoplay, background) {
  const usp = new URLSearchParams(url.search);
  const params = {
    rel: '0',
    autoplay: autoplay ? '1' : '0',
    mute: background ? '1' : '0',
    controls: background ? '0' : '1',
    loop: background ? '1' : '0',
    playsinline: '1',
  };
  let vid = usp.get('v') ? encodeURIComponent(usp.get('v')) : '';
  if (url.origin.includes('youtu.be')) {
    [, vid] = url.pathname.split('/');
  } else if (!vid && /^\/(embed|shorts)\//.test(url.pathname)) {
    [, , vid] = url.pathname.split('/');
  }
  if (background && vid) params.playlist = vid;
  const query = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  const src = vid ? `https://www.youtube.com/embed/${vid}?${query}` : url.href;
  return iframeWrapper(src, 'Content from Youtube');
}

function embedVimeo(url, autoplay, background) {
  const [, video] = url.pathname.split('/');
  const query = `autoplay=${autoplay ? '1' : '0'}&background=${background ? '1' : '0'}`;
  return iframeWrapper(`https://player.vimeo.com/video/${video}?${query}`, 'Content from Vimeo');
}

function getVideoElement(source, autoplay, background) {
  const video = document.createElement('video');
  video.className = 'video-promo-media';
  video.setAttribute('controls', '');
  video.setAttribute('playsinline', '');
  if (background) {
    video.setAttribute('loop', '');
    video.removeAttribute('controls');
    video.muted = true;
  }
  if (autoplay) {
    video.setAttribute('autoplay', '');
    video.addEventListener('canplay', () => {
      video.play().catch(() => { video.setAttribute('controls', ''); });
    }, { once: true });
  }

  const sourceEl = document.createElement('source');
  sourceEl.setAttribute('src', source);
  const ext = new URL(source, window.location.href).pathname.split('.').pop();
  if (ext && ext.length <= 4) sourceEl.setAttribute('type', `video/${ext}`);
  video.append(sourceEl);
  return video;
}

function loadVideoEmbed(block, link, autoplay, background) {
  if (block.dataset.embedLoaded === 'true') return;
  const url = new URL(link, window.location.href);
  const isYoutube = link.includes('youtube') || link.includes('youtu.be');
  const isVimeo = link.includes('vimeo');

  let el;
  if (isYoutube) el = embedYoutube(url, autoplay, background);
  else if (isVimeo) el = embedVimeo(url, autoplay, background);
  else el = getVideoElement(url.href, autoplay, background);

  block.append(el);
  const target = el.querySelector('iframe') || el;
  target.addEventListener(target.tagName === 'IFRAME' ? 'load' : 'loadeddata', () => {
    block.dataset.embedLoaded = 'true';
  }, { once: true });
}

function findLink(block) {
  const anchor = block.querySelector('a[href]');
  if (anchor) return anchor.href;
  return [...block.querySelectorAll('div')]
    .map((d) => d.textContent.trim())
    .find((t) => /^(https?:\/\/|\/)\S+$/.test(t)) || '';
}

export default async function decorate(block) {
  const placeholder = block.querySelector('picture');
  const link = findLink(block);
  block.textContent = '';
  block.dataset.embedLoaded = 'false';
  if (!link) {
    if (placeholder) block.append(placeholder);
    return;
  }

  if (placeholder) {
    block.classList.add('video-promo-has-placeholder');
    const wrapper = document.createElement('div');
    wrapper.className = 'video-promo-placeholder';
    wrapper.append(placeholder);
    wrapper.insertAdjacentHTML(
      'beforeend',
      '<div class="video-promo-placeholder-play"><button type="button" title="Play" aria-label="Play"></button></div>',
    );
    wrapper.addEventListener('click', () => {
      wrapper.remove();
      loadVideoEmbed(block, link, true, false);
    });
    block.append(wrapper);
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      observer.disconnect();
      const background = !prefersReducedMotion.matches;
      loadVideoEmbed(block, link, background, background);
    }
  });
  observer.observe(block);
}
