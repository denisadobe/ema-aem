import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Optimize same-origin, non-SVG images only; keep the authored picture otherwise.
 * @param {Element} root
 */
function optimizeImages(root) {
  root.querySelectorAll('picture > img').forEach((img) => {
    const url = new URL(img.src, window.location.href);
    if (url.origin !== window.location.origin || /\.svg$/i.test(url.pathname)) return;
    img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]));
  });
}

/**
 * True when the cell holds only media (picture / image link) and no text.
 * @param {Element} cell
 */
function isMediaOnly(cell) {
  if (!cell.querySelector('picture, img')) return false;
  const clone = cell.cloneNode(true);
  clone.querySelectorAll('picture, img').forEach((el) => el.remove());
  return clone.textContent.trim() === '';
}

/**
 * columns-media: media + text side-by-side (default / alt) or a row of
 * stacked media cards (alt-2). Each authored row is a row of columns; each
 * cell is either a media-only cell or a text cell (eyebrow, heading, copy, CTA).
 * @param {Element} block
 */
export default function decorate(block) {
  const firstRow = block.firstElementChild;
  if (!firstRow) return;
  const cols = [...firstRow.children];
  block.classList.add(`columns-media-${cols.length}-cols`);

  [...block.children].forEach((row) => {
    row.classList.add('columns-media-row');
    const cells = [...row.children];
    cells.forEach((cell, index) => {
      if (isMediaOnly(cell)) {
        cell.classList.add('columns-media-img-col');
        if (index === 0 && cells.length > 1) row.classList.add('columns-media-media-first');
      } else {
        cell.classList.add('columns-media-text-col');
        if (cell.querySelector('picture, img')) cell.classList.add('columns-media-card');
      }
    });
    if (cells.length && cells.every((c) => !c.classList.contains('columns-media-img-col'))) {
      row.classList.add('columns-media-text-only');
      // heading | lone CTA link: render as a CTA strip
      const last = cells[cells.length - 1];
      const links = last ? last.querySelectorAll('a') : [];
      if (cells.length > 1 && links.length === 1
        && last.textContent.trim() === links[0].textContent.trim()) {
        row.classList.add('columns-media-cta');
      }
    }
  });

  optimizeImages(block);
}
