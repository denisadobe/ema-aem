import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

// Authored rows (UE model order): image | text
export default function decorate(block) {
  const rows = [...block.children];
  const imageRow = rows.find((row) => row.querySelector('picture, img'));
  const textRows = rows.filter((row) => row !== imageRow && row.textContent.trim());

  const media = document.createElement('div');
  media.className = 'hero-split-media';
  if (imageRow) {
    moveInstrumentation(imageRow, media);
    const pic = imageRow.querySelector('picture') || imageRow.querySelector('img');
    media.append(pic);
  }

  const content = document.createElement('div');
  content.className = 'hero-split-content';
  textRows.forEach((row, i) => {
    if (i === 0) moveInstrumentation(row, content);
    const cell = row.querySelector(':scope > div') || row;
    content.append(...cell.childNodes);
  });

  const heading = content.querySelector('h1, h2, h3, h4, h5, h6');
  if (heading) {
    let prev = heading.previousElementSibling;
    while (prev) {
      if (prev.tagName === 'P') prev.classList.add('hero-split-eyebrow');
      prev = prev.previousElementSibling;
    }
  }
  content.querySelectorAll('a[href]').forEach((a) => {
    const p = a.closest('p');
    if (p && p.textContent.trim() === a.textContent.trim()) p.classList.add('hero-split-cta');
  });

  block.replaceChildren(...(imageRow ? [media] : []), content);
  if (!imageRow) block.classList.add('hero-split-no-media');

  block.querySelectorAll('picture > img').forEach((img) => {
    const url = new URL(img.src, window.location.href);
    if (url.origin !== window.location.origin || /\.svg$/i.test(url.pathname)) return;
    const picture = createOptimizedPicture(img.src, img.alt, true, [{ width: '1200' }]);
    moveInstrumentation(img, picture.querySelector('img'));
    img.closest('picture').replaceWith(picture);
  });
}
