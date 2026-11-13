# cards-contact

Custom **cards** block: stacked contact-channel cards (chat, phone numbers, sign-language / form / site links) shown beside the section heading and intro.

## Authoring (Document Authoring)

Model: `standalone`

One row per card. Cell 1 (optional): icon image. Cell 2: rich text.

The block reads the text cell as one of three patterns:

- **Phone card**: an intro line, then phone links (`tel:`), each followed by a description line.
- **Link card**: one link per paragraph; each becomes an icon + link row.
- **Message card**: plain text shown beside a chat icon.

When no icon image is authored, a default Nubank icon is chosen (`/icons/contact-*.svg`): phone for `tel:` cards, chat for message cards, and for links: Libras (`libras` / `callvideo`), document (forms, PDFs) or the Nu logo.

## Layout

On desktop (>= 900px) the section that holds the block becomes two columns: default content (heading + intro) on the left, cards on the right. Cards are beige on white sections and white on `beige` sections.

## Supported variations

No variations.
