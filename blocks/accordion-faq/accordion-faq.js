/*
 * Accordion FAQ Block
 * Intro column (heading, text, optional image, optional CTA) next to (or above)
 * a list of expandable question/answer items.
 *
 * Authored structure:
 * - Single-cell rows: intro content. A row holding only a picture becomes the intro
 *   media, a row holding only links becomes the actions (CTA) area, anything else is
 *   intro text. Empty rows are dropped.
 * - Rows with 2+ cells: accordion items -> [summary, body, optional image].
 */

import { moveInstrumentation } from '../../scripts/scripts.js';

function isEmpty(el) {
  return !el || (!el.textContent.trim() && !el.querySelector('picture, img, a'));
}

function isPictureOnly(cell) {
  return !!cell.querySelector('picture, img') && !cell.textContent.trim();
}

function isLinksOnly(cell) {
  const links = cell.querySelectorAll('a');
  if (!links.length) return false;
  const linkText = [...links].map((a) => a.textContent).join('').replace(/\s+/g, '');
  return linkText === cell.textContent.replace(/\s+/g, '') && !cell.querySelector('h1, h2, h3, h4, h5, h6');
}

function buildItem(row) {
  const cells = [...row.children];
  const mediaCell = cells.find((c) => isPictureOnly(c));
  const textCells = cells.filter((c) => c !== mediaCell);
  const [label, body] = textCells;

  const details = document.createElement('details');
  moveInstrumentation(row, details);
  details.className = 'accordion-faq-item';

  const summary = document.createElement('summary');
  summary.className = 'accordion-faq-item-label';
  if (mediaCell && !isEmpty(mediaCell)) {
    mediaCell.className = 'accordion-faq-item-image';
    summary.append(mediaCell);
    details.classList.add('accordion-faq-item-has-image');
  }
  const title = document.createElement('div');
  title.className = 'accordion-faq-item-title';
  if (label) {
    moveInstrumentation(label, title);
    title.append(...label.childNodes);
  }
  summary.append(title);

  const bodyEl = body || document.createElement('div');
  bodyEl.className = 'accordion-faq-item-body';

  details.append(summary, bodyEl);
  return details;
}

export default function decorate(block) {
  const intro = document.createElement('div');
  intro.className = 'accordion-faq-intro';
  const actions = document.createElement('div');
  actions.className = 'accordion-faq-actions';
  const list = document.createElement('div');
  list.className = 'accordion-faq-list';

  [...block.children].forEach((row) => {
    const cells = [...row.children];
    if (cells.length >= 2) {
      list.append(buildItem(row));
      row.remove();
      return;
    }
    const cell = cells[0];
    if (isEmpty(cell)) {
      row.remove();
      return;
    }
    if (isPictureOnly(cell)) {
      row.className = 'accordion-faq-intro-media';
      intro.append(row);
    } else if (isLinksOnly(cell)) {
      row.className = 'accordion-faq-actions-row';
      actions.append(row);
    } else {
      row.className = 'accordion-faq-intro-text';
      intro.append(row);
    }
  });

  block.textContent = '';
  if (intro.children.length) block.append(intro);
  else block.classList.add('accordion-faq-no-intro');
  if (intro.querySelector('.accordion-faq-intro-media')) block.classList.add('accordion-faq-has-media');
  block.append(list);
  if (actions.children.length) block.append(actions);
}
