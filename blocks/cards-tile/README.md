# cards-tile

Custom **cards** block. Purpose: promo-link-tiles.

## Authoring (Document Authoring)

Model: `standalone`

Single block table. Content: one row, one cell of content.

## Supported variations

| Variation | Option class |
| --- | --- |
| Related links | `related` |
| List | `list` |
| Gallery | `gallery` |

## Universal Editor fields

N/A (Document Authoring project)

## Variation notes

- default: red caption bar, 2 tiles per row in a 75% column (homepage). Cell 1 = image,
  cell 2 = heading containing a link; the whole tile is clickable.
- `cards-tile (related)`: black caption bar, centred titles, 4:3 tiles 4 per row in a
  centred 75% column. Use in a section with style `center` under a "Related links" heading.
- `cards-tile (list)`: black caption bar, left-aligned titles, 4:3 tiles 3 per row at full
  width. Use in a section with style `wide`.
  In `related` and `list` an optional 2nd paragraph (description) is hidden and revealed on
  hover (from 720px). Photos keep their own ratio (top aligned, clipped to the 4:3 tile).
- `cards-tile (gallery)`: full-bleed photo masonry. One row per tile: cell 1 = image, cell 2 =
  an H6 caption (not linked; shown in the red bar). Tiles 1, 5 and 7 of every group of 9 are
  wide (2:1, two columns), the others square; 1 column on mobile, 2 from 720px, 4 from 1140px.

## Video tiles

In any variation, a tile whose 2nd cell holds only a link to a YouTube (`youtube.com`,
`youtu.be`) or Vimeo watch URL becomes a video tile: no caption bar, a centred red play icon,
and clicking opens the video (autoplay) in a modal dialog. The link text is used as the video
title (screen readers: "Play video: <link text>"). Example row:
`[image] | [Chicago Pneumatic history video](https://www.youtube.com/watch?v=EKJbGXrWV-o)`.
