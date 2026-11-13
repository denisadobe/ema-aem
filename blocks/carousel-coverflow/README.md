# carousel-coverflow

Custom **carousel** block. 

## Authoring (Document Authoring)

Model: `standalone`

Single block table. Content: one row, one cell of content.

## Supported variations

| Variation | Option class |
| --- | --- |
| Image Dark | `image-dark` |
| Image Dark 2 | `image-dark-2` |

`image-dark` (full-bleed staggered tile strip that scrolls left in a loop) is also applied automatically when the block has no intro row and every slide is an image plus a single link. Otherwise the block renders the centered coverflow.

## Universal Editor fields

- Content fields derived from the block's decorate contract.
- `classes` select for options: Image Dark, Image Dark 2.
