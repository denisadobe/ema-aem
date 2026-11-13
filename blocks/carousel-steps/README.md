# carousel-steps

Custom **carousel** block. 

## Authoring (Document Authoring)

Model: `standalone`

Single block table. Content: one row, one cell of content.

## Supported variations

| Variation | Option class |
| --- | --- |
| Light Grey Purple | `light-grey-purple` |
| Vertical 2 | `vertical-2` |
| Orange Grey Purple | `orange-grey-purple` |
| Vertical | `vertical` |
| Vertical Purple Light | `vertical-purple-light` |

When no option class is set and both the intro and cta rows are empty, the block renders the vertical card showcase (heading, text and button carried in each slide), which is how the home, empresas, nubank-parque and central-de-protecao pages are authored. The vertical layout has no autoplay or dots: up/down arrows (left/right on mobile) stop at the first and last card.

## Universal Editor fields

- Content fields derived from the block's decorate contract.
- `classes` select for options: Light Grey Purple, Vertical 2, Orange Grey Purple, Vertical, Vertical Purple Light.
