import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

const PREFIX = 'carousel-blog';
let instanceId = 0;

function optimizeImages(root) {
  root.querySelectorAll('picture > img').forEach((img) => {
    const url = new URL(img.src, window.location.href);
    if (url.origin !== window.location.origin || /\.svg$/i.test(url.pathname)) return;
    const optimized = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    moveInstrumentation(img, optimized.querySelector('img'));
    img.closest('picture').replaceWith(optimized);
  });
}

function getActiveIndex(track) {
  const slides = [...track.children];
  const { scrollLeft } = track;
  let active = 0;
  let best = Infinity;
  slides.forEach((slide, idx) => {
    const dist = Math.abs(slide.offsetLeft - scrollLeft);
    if (dist < best) {
      best = dist;
      active = idx;
    }
  });
  return active;
}

function scrollToSlide(track, index) {
  const slides = [...track.children];
  if (!slides.length) return;
  const target = Math.max(0, Math.min(index, slides.length - 1));
  track.scrollTo({ left: slides[target].offsetLeft, behavior: 'smooth' });
}

function updateState(block, track) {
  const slides = [...track.children];
  const active = getActiveIndex(track);
  block.dataset.activeSlide = active;
  const prev = block.querySelector(`.${PREFIX}-prev`);
  const next = block.querySelector(`.${PREFIX}-next`);
  const maxScroll = track.scrollWidth - track.clientWidth;
  if (prev) prev.disabled = track.scrollLeft <= 1;
  if (next) next.disabled = track.scrollLeft >= maxScroll - 1;
  block.querySelectorAll(`.${PREFIX}-indicator button`).forEach((btn, idx) => {
    btn.setAttribute('aria-current', idx === active ? 'true' : 'false');
  });
  slides.forEach((slide, idx) => slide.classList.toggle('is-active', idx === active));
}

function buildNavigation(block, track, count) {
  const nav = document.createElement('div');
  nav.className = `${PREFIX}-navigation`;
  nav.innerHTML = `
    <button type="button" class="${PREFIX}-prev" aria-label="Previous slide"></button>
    <ol class="${PREFIX}-indicators"></ol>
    <button type="button" class="${PREFIX}-next" aria-label="Next slide"></button>
  `;
  const indicators = nav.querySelector('ol');
  for (let i = 0; i < count; i += 1) {
    const li = document.createElement('li');
    li.className = `${PREFIX}-indicator`;
    li.innerHTML = `<button type="button" aria-label="Show slide ${i + 1} of ${count}"></button>`;
    li.querySelector('button').addEventListener('click', () => scrollToSlide(track, i));
    indicators.append(li);
  }
  nav.querySelector(`.${PREFIX}-prev`).addEventListener('click', () => {
    scrollToSlide(track, getActiveIndex(track) - 1);
  });
  nav.querySelector(`.${PREFIX}-next`).addEventListener('click', () => {
    scrollToSlide(track, getActiveIndex(track) + 1);
  });
  return nav;
}

function createSlide(row, idx) {
  const slide = document.createElement('li');
  slide.className = `${PREFIX}-slide`;
  slide.id = `${PREFIX}-${instanceId}-slide-${idx}`;
  moveInstrumentation(row, slide);
  [...row.children].forEach((cell) => {
    const hasPicture = cell.querySelector('picture') && !cell.textContent.trim();
    cell.className = hasPicture ? `${PREFIX}-slide-image` : `${PREFIX}-slide-content`;
    if (!cell.children.length && !cell.textContent.trim()) return;
    slide.append(cell);
  });
  const heading = slide.querySelector('h1, h2, h3, h4, h5, h6');
  if (heading && heading.id) slide.setAttribute('aria-labelledby', heading.id);
  return slide;
}

export default function decorate(block) {
  instanceId += 1;
  const rows = [...block.querySelectorAll(':scope > div')];
  const anyImage = rows.some((row) => row.querySelector('picture'));

  // Leading rows without an image form the intro panel (heading + CTA),
  // but only when the block also has image slides.
  const introRows = [];
  if (anyImage) {
    while (rows.length && !rows[0].querySelector('picture')) introRows.push(rows.shift());
  } else {
    block.classList.add('is-text-only');
  }

  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', 'Carousel');

  let intro;
  if (introRows.length) {
    intro = document.createElement('div');
    intro.className = `${PREFIX}-intro`;
    introRows.forEach((row) => {
      const wrapper = document.createElement('div');
      moveInstrumentation(row, wrapper);
      [...row.children].forEach((cell) => wrapper.append(...cell.childNodes));
      intro.append(wrapper);
      row.remove();
    });
  }

  const viewport = document.createElement('div');
  viewport.className = `${PREFIX}-slides-container`;
  const track = document.createElement('ul');
  track.className = `${PREFIX}-slides`;
  track.setAttribute('tabindex', '0');
  rows.forEach((row, idx) => {
    track.append(createSlide(row, idx));
    row.remove();
  });
  viewport.append(track);

  optimizeImages(track);

  block.replaceChildren();
  if (intro) block.append(intro);
  block.append(viewport);

  if (rows.length > 1) {
    const nav = buildNavigation(block, track, rows.length);
    (intro || block).append(nav);
    let ticking = false;
    track.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        updateState(block, track);
        ticking = false;
      });
    }, { passive: true });
    // the section is hidden while loading, so re-evaluate arrow state once the track has a size
    if ('ResizeObserver' in window) {
      new ResizeObserver(() => updateState(block, track)).observe(track);
    } else {
      window.requestAnimationFrame(() => updateState(block, track));
    }
  } else {
    block.classList.add('is-single');
  }

  // purple-2 (tab bar): clicking an item marks it active.
  if (block.classList.contains('purple-2')) {
    const slides = [...track.children];
    if (slides[0]) slides[0].classList.add('is-selected');
    slides.forEach((slide) => {
      slide.addEventListener('click', () => {
        slides.forEach((s) => s.classList.toggle('is-selected', s === slide));
      });
    });
  }
}
