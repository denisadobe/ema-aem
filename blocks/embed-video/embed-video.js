/*
 * Embed Video Block
 * Embeds a YouTube / Vimeo (or any iframe-able) video in a 16:9 frame.
 *
 * Authored structure:
 * - optional picture: click-to-play placeholder image
 * - a link (or URL as text): the video URL
 */

const getDefaultEmbed = (url) => `<div class="embed-video-frame">
    <iframe src="${url.href}" allowfullscreen="" scrolling="no" allow="encrypted-media"
      title="Content from ${url.hostname}" loading="lazy"></iframe>
  </div>`;

const embedYoutube = (url, autoplay) => {
  const usp = new URLSearchParams(url.search);
  const suffix = autoplay ? '&mute=1&autoplay=1' : '';
  let vid = usp.get('v') ? encodeURIComponent(usp.get('v')) : '';
  const embed = url.pathname;
  if (url.origin.includes('youtu.be')) {
    [, vid] = url.pathname.split('/');
  } else if (!vid && /^\/(embed|shorts)\//.test(url.pathname)) {
    [, , vid] = url.pathname.split('/');
  }
  return `<div class="embed-video-frame">
      <iframe src="https://www.youtube.com${vid ? `/embed/${vid}?rel=0&v=${vid}${suffix}` : embed}"
      allow="autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope"
      allowfullscreen="" scrolling="no" title="Content from Youtube" loading="lazy"></iframe>
    </div>`;
};

const embedVimeo = (url, autoplay) => {
  const [, video] = url.pathname.split('/');
  const suffix = autoplay ? '?muted=1&autoplay=1' : '';
  return `<div class="embed-video-frame">
      <iframe src="https://player.vimeo.com/video/${video}${suffix}"
      frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen
      title="Content from Vimeo" loading="lazy"></iframe>
    </div>`;
};

const EMBEDS_CONFIG = [
  { match: ['youtube', 'youtu.be'], name: 'youtube', render: embedYoutube },
  { match: ['vimeo'], name: 'vimeo', render: embedVimeo },
];

const loadEmbed = (block, link, autoplay) => {
  if (block.classList.contains('embed-video-is-loaded')) return;

  const config = EMBEDS_CONFIG.find((e) => e.match.some((match) => link.includes(match)));
  const url = new URL(link, window.location.href);
  if (config) {
    block.innerHTML = config.render(url, autoplay);
    block.classList.add(`embed-video-${config.name}`);
  } else {
    block.innerHTML = getDefaultEmbed(url);
  }
  block.classList.add('embed-video-is-loaded');
};

function findLink(block) {
  const anchor = block.querySelector('a[href]');
  if (anchor) return anchor.href;
  const text = [...block.querySelectorAll('div')]
    .map((d) => d.textContent.trim())
    .find((t) => /^https?:\/\//.test(t));
  return text || '';
}

export default function decorate(block) {
  const placeholder = block.querySelector('picture');
  const link = findLink(block);
  block.textContent = '';
  if (!link) return;

  if (placeholder) {
    const wrapper = document.createElement('div');
    wrapper.className = 'embed-video-placeholder';
    wrapper.innerHTML = '<div class="embed-video-placeholder-play"><button type="button" title="Play"></button></div>';
    wrapper.prepend(placeholder);
    wrapper.addEventListener('click', () => {
      loadEmbed(block, link, true);
    });
    block.append(wrapper);
  } else {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        observer.disconnect();
        loadEmbed(block, link);
      }
    });
    observer.observe(block);
  }
}
