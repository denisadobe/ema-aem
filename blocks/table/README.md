# table

**table** block (base: library `table`). Plain data tables in legal text (contracts, promotion rules).

## Authoring

Model: `standalone`

One block row per table row, one cell per column (1-5 columns). Cells hold rich text. The first row renders as the header row unless `no-header` is set. A row with fewer cells than the widest row has its last cell span the remaining columns (source colspan).

## Supported variations

| Variation | Option class |
| --- | --- |
| Striped | `striped` |
| Bordered | `bordered` |
| No Header | `no-header` |

## Universal Editor fields

- Block (`table`): `classes` multiselect (Striped, Bordered, No Header) and `filter` select (Columns: 1-5) choosing which row type authors can add.
- Rows: `table-row` (1 column) and `table-col-2` .. `table-col-5`, each with rich-text fields `column1text` .. `columnNtext`.

## Import shape (md2jcr)

Block header row: `Table` or `Table (bordered, no-header)`. Each following row: first cell is the row component id for that row's cell count (`table-row`, `table-col-2` .. `table-col-5`), then one cell per column starting with `<!-- field:columnKtext -->` followed by the rich text. Keep empty cells (hint only) so columns stay aligned. See `xwalkModel.importShape` in `metadata.json`.
