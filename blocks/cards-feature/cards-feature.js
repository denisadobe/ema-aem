import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

function optimizeImages(root) {
  root.querySelectorAll('picture > img').forEach((img) => {
    const url = new URL(img.src, window.location.href);
    if (url.origin !== window.location.origin || /\.svg$/i.test(url.pathname)) return;
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '160' }]);
    moveInstrumentation(img, optimizedPic.querySelector('img'));
    img.closest('picture').replaceWith(optimizedPic);
  });
}

function isPictureOnly(div) {
  return !!div.querySelector('picture') && !div.textContent.trim();
}

function isLinkOnly(div) {
  const links = div.querySelectorAll('a[href]');
  if (links.length !== 1 || div.querySelector('picture')) return false;
  return div.textContent.trim() === links[0].textContent.trim();
}

/**
 * "alt": the source renders the set as a dropdown selector. When every card
 * carries a link, add a native select that navigates to the chosen card.
 * Otherwise the card list renders as-is.
 */
function decorateDropdown(block, ul) {
  const cards = [...ul.children];
  const entries = cards.map((li) => {
    const a = li.querySelector('a.cards-feature-card-link, a[href]');
    const heading = li.querySelector('h1, h2, h3, h4, h5, h6, strong');
    const label = (heading || a || li).textContent.trim();
    return a ? { href: a.href, label } : null;
  });
  if (!entries.length || entries.some((e) => !e)) return;

  const select = document.createElement('select');
  select.className = 'cards-feature-select';
  select.setAttribute('aria-label', block.getAttribute('aria-label') || 'Select an option');
  entries.forEach(({ href, label }, i) => {
    const option = document.createElement('option');
    option.value = href;
    option.textContent = label;
    if (i === 0) option.selected = true;
    select.append(option);
  });
  select.addEventListener('change', () => {
    if (select.value) window.location.href = select.value;
  });
  block.classList.add('cards-feature-has-select');
  block.prepend(select);
}

export default function decorate(block) {
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    li.className = 'cards-feature-card';
    moveInstrumentation(row, li);
    while (row.firstElementChild) li.append(row.firstElementChild);

    let link = null;
    [...li.children].forEach((div) => {
      if (!div.textContent.trim() && !div.querySelector('picture')) {
        div.remove();
      } else if (isPictureOnly(div)) {
        div.className = 'cards-feature-card-icon';
      } else if (isLinkOnly(div)) {
        div.className = 'cards-feature-card-cta';
        link = div.querySelector('a[href]');
      } else {
        div.className = 'cards-feature-card-body';
      }
    });

    if (link) {
      // whole card is clickable via the stretched CTA link
      link.classList.add('cards-feature-card-link');
      link.classList.remove('button');
      link.closest('.button-container')?.classList.remove('button-container');
      if (!link.getAttribute('aria-label')) {
        const heading = li.querySelector('.cards-feature-card-body h1, .cards-feature-card-body h2, .cards-feature-card-body h3, .cards-feature-card-body h4, .cards-feature-card-body h5, .cards-feature-card-body h6');
        const label = (heading || link).textContent.trim();
        if (label) link.setAttribute('aria-label', label);
      }
      li.classList.add('cards-feature-card-linked');
    }

    // icon sits at the bottom of the card, after the body
    const icon = li.querySelector('.cards-feature-card-icon');
    if (icon) li.append(icon);
    const cta = li.querySelector('.cards-feature-card-cta');
    if (cta) li.append(cta);

    if (li.children.length) ul.append(li);
  });
  optimizeImages(ul);
  block.replaceChildren(ul);

  if (block.classList.contains('alt')) decorateDropdown(block, ul);
}
