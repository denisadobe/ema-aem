/*
 * Notice Block
 * Bordered box holding a consumer note / disclaimer (title, subtitle, body text).
 *
 * Authored structure: one or more rows, each with a single rich-text cell.
 * All non-empty cells are merged into one content wrapper.
 */

export default function decorate(block) {
  const content = document.createElement('div');
  content.className = 'notice-content';

  [...block.children].forEach((row) => {
    [...row.children].forEach((cell) => {
      if (!cell.textContent.trim() && !cell.querySelector('picture, img, a')) return;
      cell.className = 'notice-text';
      content.append(cell);
    });
  });

  block.textContent = '';
  block.append(content);
  block.setAttribute('role', 'note');
}
