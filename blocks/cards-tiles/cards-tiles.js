import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

const CHEVRON = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d="M9.5 6.5 15 12l-5.5 5.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function optimizeImages(root) {
  root.querySelectorAll('picture > img').forEach((img) => {
    const url = new URL(img.src, window.location.href);
    if (url.origin !== window.location.origin || /\.svg$/i.test(url.pathname)) return;
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '96' }]);
    moveInstrumentation(img, optimizedPic.querySelector('img'));
    img.closest('picture').replaceWith(optimizedPic);
  });
}

function isLinkOnly(div) {
  const links = div.querySelectorAll('a[href]');
  if (links.length !== 1 || div.querySelector('picture')) return false;
  return div.textContent.trim() === links[0].textContent.trim();
}

let blockCount = 0;

function setFlipped(tile, flipped) {
  tile.classList.toggle('is-flipped', flipped);
  const front = tile.querySelector('.cards-tiles-tile-front');
  const back = tile.querySelector('.cards-tiles-tile-back');
  front.setAttribute('aria-expanded', String(flipped));
  back.setAttribute('aria-hidden', String(!flipped));
}

export default function decorate(block) {
  blockCount += 1;
  const blockId = blockCount;
  const ul = document.createElement('ul');
  [...block.children].forEach((row, index) => {
    const li = document.createElement('li');
    li.className = 'cards-tiles-tile';
    moveInstrumentation(row, li);

    let icon = null;
    let body = null;
    let link = null;
    [...row.children].forEach((div) => {
      const hasPicture = !!div.querySelector('picture');
      if (!div.textContent.trim() && !hasPicture) return;
      if (hasPicture && !div.textContent.trim()) {
        div.className = 'cards-tiles-tile-icon';
        icon = div;
      } else if (isLinkOnly(div)) {
        link = div.querySelector('a[href]');
      } else {
        div.className = 'cards-tiles-tile-body';
        body = div;
      }
    });
    if (!body && !icon) return;

    const heading = body?.querySelector('h1, h2, h3, h4, h5, h6');
    const title = heading?.textContent.trim() || '';
    const id = `cards-tiles-${blockId}-${index}`;

    // front face: icon at the top, title pinned to the bottom
    const front = document.createElement('div');
    front.className = 'cards-tiles-tile-front';
    front.id = `${id}-front`;
    front.setAttribute('role', 'button');
    front.setAttribute('tabindex', '0');
    front.setAttribute('aria-controls', `${id}-back`);
    if (title) front.setAttribute('aria-label', title);
    if (icon) front.append(icon);
    if (heading) {
      const frontTitle = document.createElement('p');
      frontTitle.className = 'cards-tiles-tile-title';
      frontTitle.setAttribute('aria-hidden', 'true');
      frontTitle.textContent = title;
      front.append(frontTitle);
    }

    // back face: title + description, chevron at the bottom right
    const back = document.createElement('div');
    back.className = 'cards-tiles-tile-back';
    back.id = `${id}-back`;
    if (body) back.append(body);
    const action = document.createElement('div');
    action.className = 'cards-tiles-tile-action';
    if (link) {
      link.className = 'cards-tiles-tile-link';
      link.setAttribute('aria-label', link.textContent.trim() || title);
      link.innerHTML = CHEVRON;
      action.append(link);
    } else {
      action.innerHTML = `<span class="cards-tiles-tile-chevron" aria-hidden="true">${CHEVRON}</span>`;
    }
    back.append(action);

    li.append(front, back);
    setFlipped(li, false);
    ul.append(li);
  });
  optimizeImages(ul);
  block.replaceChildren(ul);

  const toggle = (tile) => setFlipped(tile, !tile.classList.contains('is-flipped'));
  const hoverable = window.matchMedia('(hover: hover) and (pointer: fine)');

  // touch: tap to flip
  ul.addEventListener('click', (e) => {
    if (hoverable.matches || e.target.closest('a[href]')) return;
    const tile = e.target.closest('.cards-tiles-tile');
    if (tile) toggle(tile);
  });

  ul.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const front = e.target.closest('.cards-tiles-tile-front');
    if (!front) return;
    e.preventDefault();
    toggle(front.closest('.cards-tiles-tile'));
  });

  // desktop: flip while hovered, like the source
  ul.addEventListener('mouseover', (e) => {
    if (!hoverable.matches) return;
    const tile = e.target.closest('.cards-tiles-tile');
    if (tile && !tile.classList.contains('is-flipped')) setFlipped(tile, true);
  });
  ul.addEventListener('mouseout', (e) => {
    if (!hoverable.matches) return;
    const tile = e.target.closest('.cards-tiles-tile');
    if (tile && !tile.contains(e.relatedTarget)) setFlipped(tile, false);
  });
}
