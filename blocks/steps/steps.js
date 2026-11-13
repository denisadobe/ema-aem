/*
 * Steps Block
 * Numbered list of steps with a vertical progress track that fills as the
 * block scrolls through the viewport.
 *
 * Authored structure: one row per step.
 * - 1 cell: step text (number is generated: 01, 02, ...).
 * - 2+ cells: cell 1 = custom step label/number, cell 2 = step text.
 */

import { moveInstrumentation } from '../../scripts/scripts.js';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function bindProgress(block) {
  let ticking = false;
  const update = () => {
    ticking = false;
    const rect = block.getBoundingClientRect();
    const viewport = window.innerHeight || document.documentElement.clientHeight;
    // 0 when the block top reaches the viewport middle, 1 when the bottom does
    const start = viewport / 2;
    const progress = Math.min(1, Math.max(0, (start - rect.top) / Math.max(rect.height, 1)));
    block.style.setProperty('--steps-progress', progress.toFixed(3));
  };
  const onScroll = () => {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(update);
    }
  };

  const observer = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll, { passive: true });
      update();
    } else {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      update();
    }
  });
  observer.observe(block);
}

export default function decorate(block) {
  const list = document.createElement('ol');
  list.className = 'steps-list';

  [...block.children].forEach((row) => {
    const cells = [...row.children];
    const hasLabel = cells.length >= 2;
    const labelCell = hasLabel ? cells[0] : null;
    const bodyCell = hasLabel ? cells[1] : cells[0];
    if (!bodyCell || (!bodyCell.textContent.trim() && !bodyCell.children.length)) return;

    const li = document.createElement('li');
    li.className = 'steps-item';
    moveInstrumentation(row, li);

    const number = document.createElement('span');
    number.className = 'steps-number';
    const label = labelCell && labelCell.textContent.trim();
    number.textContent = label || String(list.children.length + 1).padStart(2, '0');
    if (!label) number.setAttribute('aria-hidden', 'true');

    bodyCell.className = 'steps-body';
    li.append(number, bodyCell);
    list.append(li);
  });

  const track = document.createElement('div');
  track.className = 'steps-track';
  track.setAttribute('aria-hidden', 'true');
  const fill = document.createElement('div');
  fill.className = 'steps-track-fill';
  track.append(fill);

  block.textContent = '';
  block.append(track, list);

  if (prefersReducedMotion.matches) {
    block.style.setProperty('--steps-progress', '1');
  } else {
    bindProgress(block);
  }
}
