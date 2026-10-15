# cards-tile

Custom **cards** block. Purpose: promo-link-tiles.

## Authoring (Document Authoring)

Model: `standalone`

Single block table. Content: one row, one cell of content.

## Supported variations

- default: red caption bar, 2 tiles per row in a 75% column (homepage).
- `cards-tile (related)`: black caption bar, centred titles, 4:3 tiles 4 per row in a
  centred 75% column. Use in a section with style `center` under a "Related links" heading.
- `cards-tile (list)`: black caption bar, left-aligned titles, 4:3 tiles 3 per row at full
  width. Use in a section with style `wide`.

In both options an optional 2nd paragraph (description) is hidden and revealed on hover
(from 720px). Photos keep their own ratio (top aligned, clipped to the 4:3 tile).

## Universal Editor fields

N/A (Document Authoring project)
