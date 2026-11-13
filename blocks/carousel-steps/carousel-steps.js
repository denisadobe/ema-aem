import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

const AUTOPLAY_INTERVAL = 5000;
const VIDEO_PATTERN = /\.(mp4|webm|ogg|mov|m3u8)(\?.*)?$/i;
const VERTICAL_OPTIONS = ['vertical', 'vertical-2', 'vertical-purple-light'];

let carouselId = 0;

function optimizeImages(scope) {
  scope.querySelectorAll('picture > img').forEach((img) => {
    const url = new URL(img.src, window.location.href);
    if (url.origin !== window.location.origin || /\.svg$/i.test(url.pathname)) return;
    const optimized = createOptimizedPicture(img.src, img.alt, false, [{ width: '1200' }]);
    moveInstrumentation(img, optimized.querySelector('img'));
    img.closest('picture').replaceWith(optimized);
  });
}

/** Replaces a link to a video file in the media cell with an inline muted video. */
function decorateVideo(mediaCell) {
  const link = [...mediaCell.querySelectorAll('a')].find((a) => VIDEO_PATTERN.test(a.href));
  if (!link) return;
  const video = document.createElement('video');
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');
  video.setAttribute('preload', 'metadata');
  const img = mediaCell.querySelector('img');
  if (img) {
    video.poster = img.currentSrc || img.src;
    img.closest('picture')?.remove();
  }
  const source = document.createElement('source');
  source.src = link.href;
  video.append(source);
  (link.closest('p') || link).replaceWith(video);
}

function showSlide(block, index) {
  const slides = [...block.querySelectorAll('.carousel-steps-slide')];
  if (!slides.length) return;
  const vertical = block.classList.contains('is-vertical');
  // vertical showcase stops at both ends (source disables the arrows); steps loop
  const target = vertical
    ? Math.min(Math.max(index, 0), slides.length - 1)
    : (index + slides.length) % slides.length;
  block.dataset.activeSlide = target;

  slides.forEach((slide, idx) => {
    const active = idx === target;
    slide.classList.toggle('active', active);
    slide.classList.toggle('is-prev', idx === target - 1);
    slide.classList.toggle('is-next', idx === target + 1);
    slide.setAttribute('aria-hidden', !active);
    slide.querySelectorAll('a, button').forEach((el) => {
      if (active) el.removeAttribute('tabindex');
      else el.setAttribute('tabindex', '-1');
    });
    slide.querySelectorAll('video').forEach((video) => {
      if (active && block.dataset.playing === 'true') video.play().catch(() => {});
      else video.pause();
    });
  });

  const prev = block.querySelector('.carousel-steps-prev');
  const next = block.querySelector('.carousel-steps-next');
  if (prev) prev.disabled = target === 0;
  if (next) next.disabled = target === slides.length - 1;

  block.querySelectorAll('.carousel-steps-dot').forEach((dot) => {
    const active = parseInt(dot.dataset.targetSlide, 10) === target;
    dot.classList.toggle('active', active);
    dot.setAttribute('aria-selected', active);
  });
}

function buildControls(block, count, vertical) {
  const controls = document.createElement('div');
  controls.classList.add('carousel-steps-controls');

  const dots = document.createElement('div');
  dots.classList.add('carousel-steps-dots');
  dots.setAttribute('role', 'tablist');
  for (let i = 0; i < count; i += 1) {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.classList.add('carousel-steps-dot');
    dot.dataset.targetSlide = i;
    dot.setAttribute('role', 'tab');
    dot.setAttribute('aria-controls', `${block.id}-slide-${i}`);
    dot.setAttribute('aria-label', `Step ${i + 1} of ${count}`);
    dots.append(dot);
  }

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.classList.add('carousel-steps-toggle');

  if (vertical) {
    const prev = document.createElement('button');
    prev.type = 'button';
    prev.classList.add('carousel-steps-prev');
    prev.setAttribute('aria-label', 'Previous slide');
    const next = document.createElement('button');
    next.type = 'button';
    next.classList.add('carousel-steps-next');
    next.setAttribute('aria-label', 'Next slide');
    controls.append(prev, dots, toggle, next);
  } else {
    controls.append(dots, toggle);
  }
  return { controls, toggle };
}

function setupAutoplay(block, toggle) {
  let timer;
  const stop = () => {
    clearInterval(timer);
    timer = undefined;
  };
  const start = () => {
    stop();
    timer = setInterval(() => {
      showSlide(block, parseInt(block.dataset.activeSlide, 10) + 1);
    }, AUTOPLAY_INTERVAL);
  };
  const setPlaying = (playing) => {
    block.dataset.playing = playing;
    toggle.setAttribute('aria-pressed', !playing);
    toggle.setAttribute('aria-label', playing ? 'Pause carousel' : 'Play carousel');
    block.querySelectorAll('.carousel-steps-slide.active video').forEach((video) => {
      if (playing) video.play().catch(() => {});
      else video.pause();
    });
    if (playing) start();
    else stop();
  };

  toggle.addEventListener('click', () => setPlaying(block.dataset.playing !== 'true'));
  block.addEventListener('carousel-steps:interact', () => {
    if (block.dataset.playing === 'true') start();
  });

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  setPlaying(!reduced);
}

export default async function decorate(block) {
  carouselId += 1;
  block.id = `carousel-steps-${carouselId}`;
  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', 'Carousel');
  const rows = [...block.querySelectorAll(':scope > div')];
  // leading single-cell rows are block-level fields: intro, then cta
  const firstSlideIdx = rows.findIndex((row) => row.children.length > 1);
  const configRows = firstSlideIdx === -1 ? rows : rows.slice(0, firstSlideIdx);
  const slideRows = firstSlideIdx === -1 ? [] : rows.slice(firstSlideIdx);
  const [introRow, ctaRow] = configRows;

  // vertical showcase: an explicit option, or (no option set) empty intro and cta,
  // since that layout carries its heading, text and button in each slide
  const isEmptyRow = (row) => !row || !row.textContent.trim();
  const hasOption = ['light-grey-purple', 'orange-grey-purple', ...VERTICAL_OPTIONS]
    .some((cls) => block.classList.contains(cls));
  const vertical = VERTICAL_OPTIONS.some((cls) => block.classList.contains(cls))
    || (!hasOption && slideRows.length > 0 && isEmptyRow(introRow) && isEmptyRow(ctaRow));
  if (vertical) block.classList.add('is-vertical');

  const makeArea = (row, cls) => {
    const area = document.createElement('div');
    area.classList.add(cls);
    if (row) {
      moveInstrumentation(row, area);
      const cell = row.firstElementChild;
      if (cell) area.append(...cell.childNodes);
      row.remove();
    }
    return area;
  };
  const intro = makeArea(introRow, 'carousel-steps-intro');
  const cta = makeArea(ctaRow, 'carousel-steps-cta');
  configRows.slice(2).forEach((row) => row.remove());

  const slidesWrapper = document.createElement('ul');
  slidesWrapper.classList.add('carousel-steps-slides');
  slideRows.forEach((row, idx) => {
    const slide = document.createElement('li');
    slide.classList.add('carousel-steps-slide');
    slide.id = `${block.id}-slide-${idx}`;
    slide.dataset.slideIndex = idx;
    slide.setAttribute('role', 'tabpanel');
    moveInstrumentation(row, slide);
    const [mediaCell, contentCell] = [...row.children];
    if (mediaCell) {
      mediaCell.classList.add('carousel-steps-slide-media');
      decorateVideo(mediaCell);
      slide.append(mediaCell);
    }
    if (contentCell) {
      contentCell.classList.add('carousel-steps-slide-content');
      slide.append(contentCell);
    }
    slidesWrapper.append(slide);
    row.remove();
  });
  optimizeImages(intro);
  optimizeImages(cta);
  optimizeImages(slidesWrapper);

  block.append(intro, slidesWrapper);
  if (!intro.childNodes.length) intro.classList.add('is-empty');
  if (!cta.childNodes.length) cta.classList.add('is-empty');

  if (slideRows.length > 1) {
    const { controls, toggle } = buildControls(block, slideRows.length, vertical);
    block.append(controls);
    controls.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn || btn === toggle) return;
      const current = parseInt(block.dataset.activeSlide, 10);
      if (btn.classList.contains('carousel-steps-prev')) showSlide(block, current - 1);
      else if (btn.classList.contains('carousel-steps-next')) showSlide(block, current + 1);
      else if (btn.dataset.targetSlide) showSlide(block, parseInt(btn.dataset.targetSlide, 10));
      block.dispatchEvent(new CustomEvent('carousel-steps:interact'));
    });
    block.append(cta);
    if (vertical) {
      // the showcase is user-driven: no autoplay, active-slide videos just loop
      block.dataset.playing = 'true';
      toggle.hidden = true;
      showSlide(block, 0);
    } else {
      showSlide(block, 0);
      setupAutoplay(block, toggle);
    }
  } else {
    block.append(cta);
    block.dataset.playing = 'true';
    showSlide(block, 0);
  }
}
