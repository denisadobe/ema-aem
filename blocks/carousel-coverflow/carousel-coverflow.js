import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

const PREFIX = 'carousel-coverflow';
// source: 3000ms autoplay delay + 850ms slide transition
const SPEED_MS = 850;
const AUTOPLAY_MS = 3850;
const SWIPE_PX = 40;

function optimizeImages(root) {
  root.querySelectorAll('picture > img').forEach((img) => {
    const url = new URL(img.src, window.location.href);
    if (url.origin !== window.location.origin || /\.svg$/i.test(url.pathname)) return;
    const optimized = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    moveInstrumentation(img, optimized.querySelector('img'));
    img.closest('picture').replaceWith(optimized);
  });
}

function createSlide(row, idx) {
  const slide = document.createElement('li');
  slide.className = `${PREFIX}-slide`;
  slide.dataset.slideIndex = idx;
  slide.dataset.stagger = idx % 4;
  moveInstrumentation(row, slide);
  [...row.children].forEach((cell) => {
    const isImage = cell.querySelector('picture') && !cell.textContent.trim();
    if (!isImage && !cell.textContent.trim()) return;
    cell.className = isImage ? `${PREFIX}-slide-image` : `${PREFIX}-slide-content`;
    slide.append(cell);
  });
  // paragraphs without links are the caption shown above the stage for the active slide
  slide.querySelectorAll(`.${PREFIX}-slide-content p`).forEach((p) => {
    if (!p.querySelector('a')) p.classList.add(`${PREFIX}-slide-caption`);
  });
  return slide;
}

// a slide whose only text is a single link: a product tile
function isLinkTile(slide) {
  const content = slide.querySelector(`.${PREFIX}-slide-content`);
  if (!content || !slide.querySelector('picture')) return false;
  const links = content.querySelectorAll('a[href]');
  return links.length === 1 && content.textContent.trim() === links[0].textContent.trim();
}

export default function decorate(block) {
  const rows = [...block.querySelectorAll(':scope > div')];

  // leading rows without an image form an intro (heading / subheading)
  const introRows = [];
  while (rows.length > 1 && !rows[0].querySelector('picture')) introRows.push(rows.shift());

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
    });
  }

  const stage = document.createElement('ul');
  stage.className = `${PREFIX}-slides`;
  const slides = rows.map((row, idx) => createSlide(row, idx));
  stage.append(...slides);
  optimizeImages(stage);

  // link-only product tiles without an intro scroll as a staggered strip (image-dark);
  // everything else is the centered coverflow
  if (!introRows.length && slides.length > 1 && slides.every(isLinkTile)) {
    block.classList.add('image-dark');
  }
  const strip = block.classList.contains('image-dark');
  if (strip) {
    // label + chevron row at the bottom of each tile
    stage.querySelectorAll(`.${PREFIX}-slide-content a[href]`).forEach((a) => {
      const label = document.createElement('span');
      label.className = `${PREFIX}-slide-label`;
      label.append(...a.childNodes);
      a.append(label);
    });
  }

  const hasCaptions = slides.some((slide) => slide.querySelector(`.${PREFIX}-slide-caption`));
  let caption;
  if (!strip && hasCaptions) {
    caption = document.createElement('div');
    caption.className = `${PREFIX}-caption`;
    caption.setAttribute('aria-live', 'polite');
  }

  const controls = document.createElement('div');
  controls.className = `${PREFIX}-controls`;
  const indicators = document.createElement('ol');
  indicators.className = `${PREFIX}-indicators`;
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = `${PREFIX}-toggle`;
  toggle.innerHTML = '<svg viewBox="0 0 36 36" aria-hidden="true" focusable="false"><circle cx="18" cy="18" r="17" pathLength="100"></circle></svg>';
  controls.append(indicators, toggle);

  block.replaceChildren(...[intro, caption, stage, controls].filter(Boolean));

  const count = slides.length;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let active = 0;
  let timer;
  let busy = false;
  let playing = count > 1 && !reducedMotion;
  block.style.setProperty('--autoplay-duration', `${AUTOPLAY_MS}ms`);

  const updateIndicators = () => {
    block.dataset.activeSlide = active;
    [...indicators.children].forEach((li, idx) => {
      li.querySelector('button').setAttribute('aria-current', idx === active ? 'true' : 'false');
    });
  };

  // coverflow: every slide sits in the same spot, shifted by its offset from the active one
  const showCoverflow = (index) => {
    active = ((index % count) + count) % count;
    slides.forEach((slide, idx) => {
      let offset = idx - active;
      if (offset > count / 2) offset -= count;
      if (offset < -count / 2) offset += count;
      slide.style.setProperty('--offset', offset);
      slide.style.setProperty('--abs-offset', Math.abs(offset));
      slide.classList.toggle('is-active', offset === 0);
      slide.classList.toggle('is-hidden', Math.abs(offset) > 1);
      slide.setAttribute('aria-hidden', offset !== 0);
      slide.querySelectorAll('a, button').forEach((el) => {
        if (offset === 0) el.removeAttribute('tabindex');
        else el.setAttribute('tabindex', '-1');
      });
    });
    if (caption) {
      const captionSource = slides[active].querySelector(`.${PREFIX}-slide-caption`);
      caption.textContent = captionSource ? captionSource.textContent : '';
    }
    updateIndicators();
  };

  // strip: slides scroll left in an endless loop; the DOM order is rotated after each move
  const settleStrip = (after) => {
    window.setTimeout(() => {
      if (after) after();
      active = Number(stage.firstElementChild.dataset.slideIndex);
      busy = false;
      updateIndicators();
    }, reducedMotion ? 0 : SPEED_MS);
  };

  const jump = (transform) => {
    stage.classList.add('no-transition');
    stage.style.transform = transform;
    // force a reflow so the next transform animates
    stage.getBoundingClientRect();
    stage.classList.remove('no-transition');
  };

  const stepStrip = (steps) => {
    if (busy || !steps) return;
    busy = true;
    const items = [...stage.children];
    if (steps > 0) {
      const shift = items[steps].offsetLeft - items[0].offsetLeft;
      stage.style.transform = `translateX(${-shift}px)`;
      settleStrip(() => {
        stage.append(...items.slice(0, steps));
        jump('translateX(0)');
      });
    } else {
      stage.prepend(...items.slice(steps));
      const shift = stage.children[-steps].offsetLeft - stage.children[0].offsetLeft;
      jump(`translateX(${-shift}px)`);
      stage.style.transform = 'translateX(0)';
      settleStrip();
    }
  };

  const go = (index) => {
    if (!strip) {
      showCoverflow(index);
      return;
    }
    let steps = ((((index - active) % count) + count) % count);
    if (steps > count / 2) steps -= count;
    stepStrip(steps);
  };

  const restartProgress = () => {
    toggle.classList.remove('is-running');
    if (!playing) return;
    toggle.getBoundingClientRect();
    toggle.classList.add('is-running');
  };

  const stop = () => {
    window.clearTimeout(timer);
    timer = undefined;
  };
  const start = () => {
    stop();
    restartProgress();
    if (!playing || count < 2) return;
    timer = window.setTimeout(() => {
      go(active + 1);
      start();
    }, AUTOPLAY_MS);
  };
  const updateToggle = () => {
    toggle.setAttribute('aria-label', playing ? 'Pause carousel' : 'Play carousel');
    toggle.setAttribute('aria-pressed', playing ? 'false' : 'true');
    block.classList.toggle('is-paused', !playing);
  };

  slides.forEach((slide, idx) => {
    const li = document.createElement('li');
    li.className = `${PREFIX}-indicator`;
    li.innerHTML = `<button type="button" aria-label="Show slide ${idx + 1} of ${count}"></button>`;
    indicators.append(li);
  });

  indicators.addEventListener('click', (e) => {
    const button = e.target.closest('button');
    if (!button) return;
    go([...indicators.children].indexOf(button.parentElement));
    start();
  });

  // coverflow: clicking a side slide brings it to the center
  stage.addEventListener('click', (e) => {
    const slide = e.target.closest(`.${PREFIX}-slide`);
    if (strip || !slide || slide.classList.contains('is-active')) return;
    e.preventDefault();
    go(Number(slide.dataset.slideIndex));
    start();
  });

  // swipe left / right
  let startX = null;
  let swiped = false;
  stage.addEventListener('pointerdown', (e) => {
    startX = e.clientX;
    swiped = false;
  });
  stage.addEventListener('pointerup', (e) => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    startX = null;
    if (Math.abs(dx) < SWIPE_PX || count < 2) return;
    swiped = true;
    go(active + (dx < 0 ? 1 : -1));
    start();
  });
  stage.addEventListener('click', (e) => {
    if (!swiped) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    swiped = false;
  }, true);
  stage.addEventListener('dragstart', (e) => e.preventDefault());

  toggle.addEventListener('click', () => {
    playing = !playing;
    updateToggle();
    start();
  });

  if (count < 2) controls.hidden = true;

  updateToggle();
  if (strip) updateIndicators();
  else showCoverflow(0);
  start();
}
