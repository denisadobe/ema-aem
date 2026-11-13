import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

const PREFIX = 'carousel-expanding';
const VIDEO_RE = /\.(mp4|webm|mov|m3u8)(\?|#|$)/i;
// source advances every ~7s (measured on nubank.com.br/croma)
const AUTOPLAY_INTERVAL = 7000;
const SWIPE_THRESHOLD = 40;

function optimizeImages(root) {
  root.querySelectorAll('picture > img').forEach((img) => {
    const url = new URL(img.src, window.location.href);
    if (url.origin !== window.location.origin || /\.svg$/i.test(url.pathname)) return;
    const optimized = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    moveInstrumentation(img, optimized.querySelector('img'));
    img.closest('picture').replaceWith(optimized);
  });
}

function getVideoUrl(cell) {
  if (!cell) return '';
  const link = cell.querySelector('a');
  const raw = (link ? link.href : cell.textContent).trim();
  return raw && (VIDEO_RE.test(raw) || raw.includes('/content/dam/')) ? raw : '';
}

function buildVideo(src, poster) {
  const video = document.createElement('video');
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');
  video.setAttribute('preload', 'metadata');
  video.setAttribute('aria-hidden', 'true');
  if (poster) video.poster = poster;
  const source = document.createElement('source');
  source.src = src;
  video.append(source);
  return video;
}

function createSlide(row, idx) {
  const slide = document.createElement('li');
  slide.className = `${PREFIX}-slide`;
  slide.dataset.slideIndex = idx;
  moveInstrumentation(row, slide);

  const cells = [...row.children];
  // cell contract: image | (optional) video URL | rich text
  const imageCell = cells.find((c) => c.querySelector('picture'));
  const textCell = cells.length > 1 ? cells[cells.length - 1] : null;
  const videoCell = cells.length > 2 ? cells[1] : null;
  const videoUrl = getVideoUrl(videoCell);

  const media = document.createElement('div');
  media.className = `${PREFIX}-slide-media`;
  if (imageCell && imageCell !== textCell) {
    media.append(...imageCell.childNodes);
  }
  if (videoUrl) {
    const img = media.querySelector('img');
    const video = buildVideo(videoUrl, img ? img.src : '');
    if (videoCell) moveInstrumentation(videoCell, video);
    media.append(video);
    slide.classList.add('has-video');
  }
  slide.append(media);

  const content = document.createElement('div');
  content.className = `${PREFIX}-slide-content`;
  if (textCell && textCell !== imageCell) {
    moveInstrumentation(textCell, content);
    content.append(...textCell.childNodes);
  }
  // links render as text links with a chevron, not as pill buttons
  content.querySelectorAll('a.button').forEach((a) => a.classList.add(`${PREFIX}-link`));
  slide.append(content);

  const heading = content.querySelector('h1, h2, h3, h4, h5, h6');
  slide.setAttribute('aria-label', heading ? heading.textContent.trim() : `Slide ${idx + 1}`);
  return slide;
}

function createButton(className, label) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = className;
  btn.setAttribute('aria-label', label);
  return btn;
}

export default function decorate(block) {
  const rows = [...block.querySelectorAll(':scope > div')];
  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', 'Carousel');

  const track = document.createElement('ul');
  track.className = `${PREFIX}-slides`;
  const slides = rows.map((row, idx) => createSlide(row, idx));
  track.append(...slides);
  optimizeImages(track);
  block.replaceChildren(track);

  // all-video galleries use the bottom-aligned video layout (alt-2) unless an option is authored
  if (!block.classList.contains('alt') && !block.classList.contains('alt-2')
    && slides.length && slides.every((s) => s.classList.contains('has-video'))) {
    block.classList.add('alt-2');
  }
  const hasArrows = block.classList.contains('alt') || block.classList.contains('alt-2');

  // controls: (prev) dots + pause/play with progress ring (next)
  const controls = document.createElement('div');
  controls.className = `${PREFIX}-controls`;
  const pager = document.createElement('div');
  pager.className = `${PREFIX}-pager`;
  const dots = document.createElement('div');
  dots.className = `${PREFIX}-dots`;
  const dotButtons = slides.map((_, idx) => {
    const dot = createButton(`${PREFIX}-dot`, `Ir para slide ${idx + 1}`);
    dot.dataset.targetSlide = idx;
    dots.append(dot);
    return dot;
  });
  const toggle = createButton(`${PREFIX}-toggle`, 'Pausar');
  toggle.innerHTML = '<svg viewBox="0 0 44 44" aria-hidden="true" focusable="false"><circle cx="22" cy="22" r="21" pathLength="100"></circle></svg>';
  pager.append(dots, toggle);
  const prev = createButton(`${PREFIX}-prev`, 'Slide anterior');
  const next = createButton(`${PREFIX}-next`, 'Próximo slide');
  if (hasArrows) controls.append(prev, pager, next);
  else controls.append(pager);
  if (slides.length > 1) block.append(controls);

  let active = 0;
  let timer;
  let playing = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let inView = false;

  const restartProgress = () => {
    block.classList.remove('is-progressing');
    // eslint-disable-next-line no-unused-expressions
    block.offsetWidth;
    if (playing && inView) block.classList.add('is-progressing');
  };

  const activate = (index) => {
    active = (index + slides.length) % slides.length;
    block.dataset.activeSlide = active;
    block.style.setProperty('--active-index', active);
    slides.forEach((slide, idx) => {
      const isActive = idx === active;
      slide.classList.toggle('is-active', isActive);
      slide.setAttribute('aria-current', isActive ? 'true' : 'false');
      slide.querySelectorAll(`.${PREFIX}-slide-content a`).forEach((a) => {
        if (isActive) a.removeAttribute('tabindex');
        else a.setAttribute('tabindex', '-1');
      });
      const video = slide.querySelector('video');
      if (video) {
        if (isActive) video.play().catch(() => {});
        else video.pause();
      }
    });
    dotButtons.forEach((dot, idx) => {
      dot.classList.toggle('is-active', idx === active);
      dot.setAttribute('aria-current', idx === active ? 'true' : 'false');
    });
    prev.disabled = active === 0;
    next.disabled = active === slides.length - 1;
  };

  const stopTimer = () => {
    clearInterval(timer);
    timer = undefined;
  };
  const startTimer = () => {
    stopTimer();
    restartProgress();
    if (!playing || !inView || slides.length < 2) return;
    timer = setInterval(() => {
      activate(active + 1);
      restartProgress();
    }, AUTOPLAY_INTERVAL);
  };
  const setPlaying = (state) => {
    playing = state;
    block.dataset.playing = state;
    toggle.setAttribute('aria-label', state ? 'Pausar' : 'Iniciar');
    toggle.setAttribute('aria-pressed', state ? 'false' : 'true');
    if (state) startTimer();
    else stopTimer();
  };

  // user navigation restarts the autoplay cycle
  const goTo = (index) => {
    activate(index);
    if (playing) startTimer();
  };

  track.addEventListener('click', (e) => {
    const slide = e.target.closest(`.${PREFIX}-slide`);
    if (!slide || slide.classList.contains('is-active')) return;
    e.preventDefault();
    goTo(parseInt(slide.dataset.slideIndex, 10));
  });
  track.addEventListener('focusin', (e) => {
    const slide = e.target.closest(`.${PREFIX}-slide`);
    if (slide && !slide.classList.contains('is-active')) goTo(parseInt(slide.dataset.slideIndex, 10));
  });
  track.addEventListener('keydown', (e) => {
    const slide = e.target.closest(`.${PREFIX}-slide`);
    if (!slide) return;
    const idx = parseInt(slide.dataset.slideIndex, 10);
    if (e.key === 'ArrowRight' && slides[idx + 1]) slides[idx + 1].focus();
    if (e.key === 'ArrowLeft' && slides[idx - 1]) slides[idx - 1].focus();
  });
  slides.forEach((slide) => { slide.tabIndex = 0; });

  controls.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn || btn.disabled) return;
    if (btn === toggle) setPlaying(!playing);
    else if (btn === prev) goTo(active - 1);
    else if (btn === next) goTo(active + 1);
    else if (btn.dataset.targetSlide) goTo(parseInt(btn.dataset.targetSlide, 10));
  });

  // touch swipe (mobile layout translates the track instead of scrolling it)
  let touchX = null;
  track.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend', (e) => {
    if (touchX === null) return;
    const delta = e.changedTouches[0].clientX - touchX;
    touchX = null;
    if (Math.abs(delta) < SWIPE_THRESHOLD) return;
    const target = active + (delta < 0 ? 1 : -1);
    if (target >= 0 && target < slides.length) goTo(target);
  }, { passive: true });

  if (slides.length) activate(0);
  block.dataset.playing = playing;
  toggle.setAttribute('aria-label', playing ? 'Pausar' : 'Iniciar');

  // autoplay only while the carousel is on screen
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      inView = entries.some((entry) => entry.isIntersecting);
      if (inView) startTimer();
      else stopTimer();
    }, { threshold: 0.3 }).observe(block);
  } else {
    inView = true;
    startTimer();
  }
}
