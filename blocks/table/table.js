/*
 * Table Block
 * Recreates a data table from authored rows (one row per table row, one cell per column).
 * Based on https://www.hlx.live/developer/block-collection/table
 *
 * - First row renders as a header row (<th scope="col">) unless the `no-header` option is set.
 * - Rows can hold fewer cells than the widest row (source colspan): the last cell of a
 *   short row spans the remaining columns.
 * - Options: striped, bordered, no-header. Unknown tokens are ignored.
 */

import { moveInstrumentation } from '../../scripts/scripts.js';

// row component ids the import shape (md2jcr) puts in each row's first cell
const ROW_COMPONENT_ID = /^table-(row|col-[2-5])$/;

export default async function decorate(block) {
  const rows = [...block.children];
  if (!rows.length) return;

  // drop the row component id cell (e.g. "table-col-2") when the row carries one
  rows.forEach((row) => {
    const first = row.firstElementChild;
    if (row.children.length > 1 && ROW_COMPONENT_ID.test(first.textContent.trim())) first.remove();
  });

  // html2md/md2jcr can carry the `no-header` option as "no header" (two tokens)
  const { classList } = block;
  const noHeader = classList.contains('no-header')
    || (classList.contains('no') && classList.contains('header'));
  const header = !noHeader;
  const columnCount = Math.max(...rows.map((row) => row.children.length));

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');

  rows.forEach((row, i) => {
    const isHeader = header && i === 0;
    const tr = document.createElement('tr');
    moveInstrumentation(row, tr);

    const cells = [...row.children];
    cells.forEach((cell, c) => {
      const td = document.createElement(isHeader ? 'th' : 'td');
      if (isHeader) td.setAttribute('scope', 'col');
      moveInstrumentation(cell, td);
      td.append(...cell.childNodes);

      // short row (colspan in source): last cell fills the remaining columns
      const span = columnCount - cells.length + 1;
      if (c === cells.length - 1 && span > 1) td.colSpan = span;

      tr.append(td);
    });

    if (isHeader) thead.append(tr);
    else tbody.append(tr);
  });

  if (thead.children.length) table.append(thead);
  table.append(tbody);

  const wrapper = document.createElement('div');
  wrapper.className = 'table-wrapper';
  wrapper.append(table);
  block.replaceChildren(wrapper);
}
