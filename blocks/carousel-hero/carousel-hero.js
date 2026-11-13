import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

// matches the source's 9s tab/ring progress animation
const AUTOPLAY_INTERVAL = 9000;
const VIDEO_PATTERN = /\.(mp4|webm|ogg|mov|m3u8)(\?.*)?$/i;

let carouselId = 0;

function optimizeImages(scope) {
  scope.querySelectorAll('picture > img').forEach((img) => {
    const url = new URL(img.src, window.location.href);
    if (url.origin !== window.location.origin || /\.svg$/i.test(url.pathname)) return;
    const optimized = createOptimizedPicture(img.src, img.alt, false, [{ width: '2000' }]);
    moveInstrumentation(img, optimized.querySelector('img'));
    img.closest('picture').replaceWith(optimized);
  });
}

/**
 * Turns a video link in the media cell into an inline background video.
 * The poster (authored picture) is kept as fallback for reduced motion.
 */
function decorateVideo(mediaCell) {
  const link = [...mediaCell.querySelectorAll('a')].find((a) => VIDEO_PATTERN.test(a.href));
  if (!link) return false;
  const video = document.createElement('video');
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');
  video.setAttribute('preload', 'metadata');
  video.classList.add('carousel-hero-video');
  const img = mediaCell.querySelector('img');
  if (img) video.poster = img.currentSrc || img.src;
  const source = document.createElement('source');
  source.src = link.href;
  video.append(source);
  const wrapper = link.closest('p') || link;
  wrapper.replaceWith(video);
  return true;
}

function getLabel(slide, labelCell, idx) {
  const text = labelCell?.textContent.trim();
  if (text) return text;
  const heading = slide.querySelector('h1, h2, h3, h4, h5, h6');
  if (heading) return heading.textContent.trim();
  return `${idx + 1}`;
}

function showSlide(block, index) {
  const slides = [...block.querySelectorAll('.carousel-hero-slide')];
  if (!slides.length) return;
  const target = (index + slides.length) % slides.length;
  block.dataset.activeSlide = target;

  slides.forEach((slide, idx) => {
    const active = idx === target;
    slide.classList.toggle('active', active);
    slide.setAttribute('aria-hidden', !active);
    slide.querySelectorAll('a, button').forEach((el) => {
      if (active) el.removeAttribute('tabindex');
      else el.setAttribute('tabindex', '-1');
    });
    const video = slide.querySelector('video');
    if (video) {
      if (active && block.dataset.playing === 'true') video.play().catch(() => {});
      else video.pause();
    }
  });

  block.querySelectorAll('.carousel-hero-tab, .carousel-hero-dot').forEach((btn) => {
    const active = parseInt(btn.dataset.targetSlide, 10) === target;
    btn.setAttribute('aria-selected', active);
    btn.classList.toggle('active', active);
  });

  const prev = block.querySelector('.carousel-hero-prev');
  const next = block.querySelector('.carousel-hero-next');
  if (prev) prev.disabled = target === 0;
  if (next) next.disabled = target === slides.length - 1;
}

/* restarts the CSS progress animations (active tab fill, toggle ring) */
function restartProgress(block) {
  block.classList.remove('is-progressing');
  // eslint-disable-next-line no-unused-expressions
  block.offsetWidth;
  block.classList.add('is-progressing');
}

function createArrow(direction, label) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.classList.add(`carousel-hero-${direction}`);
  btn.setAttribute('aria-label', label);
  return btn;
}

function setupAutoplay(block, toggle) {
  let timer;
  const stop = () => {
    clearInterval(timer);
    timer = undefined;
  };
  const start = () => {
    stop();
    restartProgress(block);
    timer = setInterval(() => {
      showSlide(block, parseInt(block.dataset.activeSlide, 10) + 1);
      restartProgress(block);
    }, AUTOPLAY_INTERVAL);
  };
  const setPlaying = (playing) => {
    block.dataset.playing = playing;
    toggle.setAttribute('aria-pressed', !playing);
    toggle.setAttribute('aria-label', playing ? 'Pause carousel' : 'Play carousel');
    const activeVideo = block.querySelector('.carousel-hero-slide.active video');
    if (playing) {
      start();
      activeVideo?.play().catch(() => {});
    } else {
      stop();
      activeVideo?.pause();
    }
  };

  toggle.addEventListener('click', () => setPlaying(block.dataset.playing !== 'true'));
  block.addEventListener('carousel-hero:interact', () => {
    if (block.dataset.playing === 'true') start();
  });

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  setPlaying(!reduced);
}

export default async function decorate(block) {
  carouselId += 1;
  const id = `carousel-hero-${carouselId}`;
  block.id = id;
  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', 'Carousel');

  const rows = [...block.querySelectorAll(':scope > div')];
  const slidesWrapper = document.createElement('ul');
  slidesWrapper.classList.add('carousel-hero-slides');

  const tabs = document.createElement('div');
  tabs.classList.add('carousel-hero-tabs');
  tabs.setAttribute('role', 'tablist');

  const dots = document.createElement('div');
  dots.classList.add('carousel-hero-dots');
  dots.setAttribute('role', 'tablist');

  rows.forEach((row, idx) => {
    const slide = document.createElement('li');
    slide.classList.add('carousel-hero-slide');
    slide.id = `${id}-slide-${idx}`;
    slide.dataset.slideIndex = idx;
    slide.setAttribute('role', 'tabpanel');
    moveInstrumentation(row, slide);

    const [mediaCell, contentCell, labelCell] = [...row.children];
    if (mediaCell) {
      mediaCell.classList.add('carousel-hero-slide-media');
      if (decorateVideo(mediaCell)) slide.classList.add('has-video');
      slide.append(mediaCell);
    }
    if (contentCell) {
      contentCell.classList.add('carousel-hero-slide-content');
      slide.append(contentCell);
    }
    const label = getLabel(slide, labelCell, idx);
    labelCell?.remove();

    const tab = document.createElement('button');
    tab.type = 'button';
    tab.classList.add('carousel-hero-tab');
    tab.dataset.targetSlide = idx;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', slide.id);
    tab.textContent = label;
    tabs.append(tab);

    const dot = document.createElement('button');
    dot.type = 'button';
    dot.classList.add('carousel-hero-dot');
    dot.dataset.targetSlide = idx;
    dot.setAttribute('role', 'tab');
    dot.setAttribute('aria-controls', slide.id);
    dot.setAttribute('aria-label', `${label} (${idx + 1} / ${rows.length})`);
    dots.append(dot);

    slidesWrapper.append(slide);
    row.remove();
  });

  optimizeImages(slidesWrapper);
  block.append(slidesWrapper);

  if (rows.length > 1) {
    const controls = document.createElement('div');
    controls.classList.add('carousel-hero-controls');

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.classList.add('carousel-hero-toggle');
    // progress ring around the pause/play button (fills over one interval)
    toggle.innerHTML = '<svg viewBox="0 0 44 44" aria-hidden="true" focusable="false"><circle cx="22" cy="22" r="21" pathLength="100"></circle></svg>';

    const pager = document.createElement('div');
    pager.classList.add('carousel-hero-pager');
    pager.append(dots, toggle);

    // grey-light: compact control strip (dots + pause)
    // default: tab bar + pause (desktop), arrows + dots + pause in the card (mobile)
    if (block.classList.contains('grey-light')) {
      controls.append(pager);
    } else {
      block.prepend(tabs);
      controls.append(
        createArrow('prev', 'Previous slide'),
        pager,
        createArrow('next', 'Next slide'),
      );
    }
    block.append(controls);

    const goTo = (index) => {
      showSlide(block, index);
      block.dispatchEvent(new CustomEvent('carousel-hero:interact'));
    };

    [tabs, dots].forEach((list) => {
      list.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-target-slide]');
        if (btn) goTo(parseInt(btn.dataset.targetSlide, 10));
      });
    });

    controls.addEventListener('click', (e) => {
      const arrow = e.target.closest('.carousel-hero-prev, .carousel-hero-next');
      if (!arrow) return;
      const step = arrow.classList.contains('carousel-hero-prev') ? -1 : 1;
      goTo(parseInt(block.dataset.activeSlide, 10) + step);
    });

    showSlide(block, 0);
    setupAutoplay(block, toggle);
  } else {
    block.dataset.playing = 'true';
    showSlide(block, 0);
  }
}
