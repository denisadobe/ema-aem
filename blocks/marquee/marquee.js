/*
 * Marquee Block
 * Several horizontally scrolling rows of large words interleaved with images
 * (event logos or photos), plus an optional caption line (date / place).
 *
 * Authored structure:
 * - Rows with 2+ cells: marquee items -> [image, text]. Either cell may be empty.
 * - Single-cell rows: caption (rich text) shown below the scrolling rows.
 */

import { moveInstrumentation } from '../../scripts/scripts.js';

// source renders 3 tracks on desktop and 4 on mobile (the 4th is hidden by CSS at >= 900px)
const TRACK_COUNT = 4;
// each half of a track repeats the authored items 3 times (source behaviour)
const SET_REPEATS = 3;
const MIN_TOKENS_PER_SET = 12;

function hasContent(el) {
  return !!el && (!!el.textContent.trim() || !!el.querySelector('picture, img'));
}

function buildTokens(row) {
  const tokens = [];
  [...row.children].forEach((cell) => {
    const picture = cell.querySelector('picture');
    const img = cell.querySelector('img');
    if (picture || img) {
      const token = document.createElement('span');
      token.className = 'marquee-token marquee-token-image';
      token.append(picture || img);
      tokens.push(token);
    }
    const text = cell.textContent.trim();
    if (text) {
      const token = document.createElement('span');
      token.className = 'marquee-token marquee-token-text';
      token.textContent = text;
      tokens.push(token);
    }
  });
  return tokens;
}

function buildSet(tokens) {
  const set = document.createElement('div');
  set.className = 'marquee-set';
  const repeats = Math.max(SET_REPEATS, Math.ceil(MIN_TOKENS_PER_SET / tokens.length));
  for (let r = 0; r < repeats; r += 1) {
    tokens.forEach((token) => set.append(token.cloneNode(true)));
  }
  return set;
}

export default function decorate(block) {
  const tokens = [];
  const caption = document.createElement('div');
  caption.className = 'marquee-caption';

  [...block.children].forEach((row) => {
    const cells = [...row.children];
    if (cells.length >= 2) {
      tokens.push(...buildTokens(row));
    } else if (hasContent(cells[0])) {
      const cell = cells[0];
      moveInstrumentation(row, cell);
      cell.className = 'marquee-caption-text';
      caption.append(cell);
    }
  });

  block.textContent = '';

  if (tokens.length) {
    const rows = document.createElement('div');
    rows.className = 'marquee-rows';

    // accessible text equivalent of the decorative scrolling words
    const label = [...new Set(tokens
      .filter((t) => t.classList.contains('marquee-token-text'))
      .map((t) => t.textContent))].join(', ');
    if (label) {
      const sr = document.createElement('p');
      sr.className = 'marquee-sr-only';
      sr.textContent = label;
      block.append(sr);
    }

    for (let r = 0; r < TRACK_COUNT; r += 1) {
      const track = document.createElement('div');
      track.className = `marquee-track ${r % 2 ? 'marquee-track-reverse' : ''}`.trim();
      track.setAttribute('aria-hidden', 'true');
      // two identical sets so translating by -50% loops seamlessly
      track.append(buildSet(tokens), buildSet(tokens));
      rows.append(track);
    }
    block.append(rows);
  }

  if (caption.children.length) block.append(caption);
}
