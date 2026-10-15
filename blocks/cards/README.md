# cards

Custom **cards** block. Purpose: image-cards.

## Authoring (Document Authoring)

Model: `standalone`

Single block table. Content: one row, one cell of content.

## Supported variations

| Variation | Option class |
| --- | --- |
| Jobs | `jobs` |

## Universal Editor fields

N/A (Document Authoring project)

## Variation notes

- default: image cards. One row per card: cell 1 = image (4:3), cell 2 = heading, text and an
  optional "Read more" button link, on a white shadowed tile. 1 / 2 / 4 per row.
- `cards (jobs)`: text-only job list. One row per job, one cell: an H6 whose text links to the
  job, then a category paragraph and a date paragraph (grey captions). 2 per row, 4 from 720px.
  Use in a section with style `wide`, below a heading and above a "Find all our open vacancies"
  button (both default content).
