import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

function optimizeImages(root) {
  root.querySelectorAll('picture > img').forEach((img) => {
    const url = new URL(img.src, window.location.href);
    if (url.origin !== window.location.origin || /\.svg$/i.test(url.pathname)) return;
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    moveInstrumentation(img, optimizedPic.querySelector('img'));
    img.closest('picture').replaceWith(optimizedPic);
  });
}

function isPictureOnly(div) {
  return !!div.querySelector('picture') && !div.textContent.trim();
}

/**
 * Text links in the body ("Mais informações") render as plain chevron links,
 * not buttons. A link alone in its paragraph becomes the card's link.
 */
function decorateLinks(body) {
  body.querySelectorAll('a[href]').forEach((a) => {
    a.classList.remove('button', 'primary', 'secondary');
    const container = a.closest('.button-container');
    if (container) container.classList.remove('button-container');
    const p = a.closest('p');
    if (p && p.textContent.trim() === a.textContent.trim()) {
      p.classList.add('cards-photo-card-cta');
      a.classList.add('cards-photo-card-link');
    }
  });
}

export default function decorate(block) {
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    li.className = 'cards-photo-card';
    moveInstrumentation(row, li);
    while (row.firstElementChild) li.append(row.firstElementChild);

    [...li.children].forEach((div) => {
      if (!div.textContent.trim() && !div.querySelector('picture')) {
        div.remove();
      } else if (isPictureOnly(div)) {
        div.className = 'cards-photo-card-image';
      } else {
        div.className = 'cards-photo-card-body';
        decorateLinks(div);
      }
    });

    // photo always sits on top of the text
    const image = li.querySelector('.cards-photo-card-image');
    if (image) li.prepend(image);

    if (li.children.length) ul.append(li);
  });
  optimizeImages(ul);
  block.replaceChildren(ul);
}
