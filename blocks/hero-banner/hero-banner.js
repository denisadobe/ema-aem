import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * Optimize same-origin, non-SVG images only; keep the authored picture otherwise.
 * @param {Element} root
 */
function optimizeImages(root) {
  root.querySelectorAll('picture > img').forEach((img) => {
    const url = new URL(img.src, window.location.href);
    if (url.origin !== window.location.origin || /\.svg$/i.test(url.pathname)) return;
    img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, true, [{ width: '2000' }]));
  });
}

/**
 * hero-banner: full-width background image with overlaid text.
 * Authored rows: [image] then [text: optional eyebrow, heading, copy, optional CTA].
 * Option description-box moves the copy (paragraphs after the heading, except CTAs)
 * into a separate box; other options are layout/color hooks.
 * @param {Element} block
 */
export default function decorate(block) {
  const rows = [...block.children];
  const media = document.createElement('div');
  media.className = 'hero-banner-media';
  const content = document.createElement('div');
  content.className = 'hero-banner-content';

  rows.forEach((row) => {
    const cells = [...row.children];
    cells.forEach((cell) => {
      const pic = cell.querySelector('picture');
      const textless = cell.textContent.trim() === '';
      if (pic && textless) {
        moveInstrumentation(cell, media);
        media.append(pic);
      } else if (!textless) {
        moveInstrumentation(cell, content);
        while (cell.firstChild) content.append(cell.firstChild);
      }
    });
    row.remove();
  });

  // tag heading group pieces
  const heading = content.querySelector('h1, h2, h3, h4, h5, h6');
  if (heading) {
    heading.classList.add('hero-banner-title');
    const prev = heading.previousElementSibling;
    if (prev && prev.tagName === 'P' && !prev.querySelector('a, picture')) {
      prev.classList.add('hero-banner-eyebrow');
    }
  }
  content.querySelectorAll('p').forEach((p) => {
    if (p.querySelector('a') && p.textContent.trim() === p.querySelector('a').textContent.trim()) {
      p.classList.add('hero-banner-cta');
    }
  });

  const parts = [];
  if (media.querySelector('picture')) parts.push(media);
  else block.classList.add('hero-banner-no-image');
  parts.push(content);

  if (block.classList.contains('description-box') && heading) {
    const box = document.createElement('div');
    box.className = 'hero-banner-description';
    let next = heading.nextElementSibling;
    while (next) {
      const current = next;
      next = next.nextElementSibling;
      if (!current.classList.contains('hero-banner-cta')) box.append(current);
    }
    if (box.children.length) parts.push(box);
  }

  block.append(...parts);

  optimizeImages(block);
}
