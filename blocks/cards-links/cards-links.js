import { moveInstrumentation } from '../../scripts/scripts.js';

function isLinkOnly(div) {
  const links = div.querySelectorAll('a[href]');
  if (links.length !== 1) return false;
  return div.textContent.trim() === links[0].textContent.trim();
}

export default function decorate(block) {
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    li.className = 'cards-links-card';
    moveInstrumentation(row, li);
    while (row.firstElementChild) li.append(row.firstElementChild);

    // drop empty cells first so a lone "heading link" cell stays the card body
    [...li.children].forEach((div) => {
      if (!div.textContent.trim() && !div.querySelector('img, picture')) div.remove();
    });

    let link = null;
    const cells = [...li.children];
    cells.forEach((div) => {
      if (!link && cells.length > 1 && isLinkOnly(div)) {
        div.className = 'cards-links-card-cta';
        link = div.querySelector('a[href]');
      } else {
        div.className = 'cards-links-card-body';
      }
    });

    // single-cell row: fall back to the first link inside the body
    if (!link) {
      link = li.querySelector('.cards-links-card-body a[href]');
      if (link) {
        const cta = document.createElement('div');
        cta.className = 'cards-links-card-cta';
        const clone = link.cloneNode(false);
        clone.textContent = link.textContent;
        cta.append(clone);
        link.replaceWith(...link.childNodes);
        li.append(cta);
        link = clone;
      }
    }

    if (link) {
      link.classList.add('cards-links-card-link');
      link.classList.remove('button');
      link.closest('.button-container')?.classList.remove('button-container');
      if (!link.getAttribute('aria-label')) {
        const heading = li.querySelector('.cards-links-card-body :is(h1, h2, h3, h4, h5, h6, strong)');
        const label = (heading || link).textContent.trim();
        if (label) link.setAttribute('aria-label', label);
      }
      li.classList.add('cards-links-card-linked');
    }

    if (li.children.length) ul.append(li);
  });
  block.replaceChildren(ul);
}
