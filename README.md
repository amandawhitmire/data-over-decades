# Field Station Student Papers Bibliographic Catalog

A searchable, filterable web catalog of bibliographic records for field station
course materials, built by Claude Opus 5.5 in HTML.

---

## 1. Project Overview

**Goal:** Provide a public-facing catalog/database of ~10,000 bibliographic records
with full-text search, faceted filtering, downloadable results, and a detailed
single-record view styled like a traditional library catalog display.

**Status:** Working prototype complete. A static version for GitHub Pages lives in
`docs/` (see Section 8) and is replacing the Shiny app on shinyapps.io.

**Stack:**
- `DT` — interactive results table
- `dplyr`, `stringr`, `readr` — data wrangling
- GitHub — version control, hosting

---

## 2. Data

**Source:** Single CSV file stored in the app directory.

**Size:** ~10,000 records.

**Columns (exact names, as they appear in the CSV):**

| Column | Notes |
|---|---|
| `institution` | Used as a dropdown filter |
| `fieldstation` | Displayed + dropdown filter |
| `objectid` | Displayed; clickable → opens detail view |
| `object_location` | Displayed as a clickable URL |
| `date` | Displayed; year extracted for range slider |
| `creator` | Displayed + searchable |
| `secondarycreator` | Co-authors/advisors; searchable; detail view only |
| `title` | Displayed + searchable |
| `pages` | Displayed |
| `abstract` | Detail view only |
| `subject` | Displayed + searchable |
| `location` | Searchable; detail view only |
| `coursenumber` | Dropdown filter |
| `coursename` | Dropdown filter |

A derived column, `year`, is created at load time by extracting the first four
digits from `date`.

---

## 3. Functional Requirements

### Search & filter (left sidebar)
- **Free-text search** across `title`, `creator`, `secondarycreator`, `subject`, and `location` (case-insensitive, partial match)
- **Year range slider** based on the derived `year` column
- **Dropdown filters:** `institution`, `fieldstation`, `coursenumber`, `coursename`
  — each includes an "All" option
- **Download button** exporting the currently filtered set as CSV

### Results table (main panel)
Displays these columns, in this order:

```
fieldstation, objectid, object_location, date, creator, title, pages, subject
```

- `object_location` renders as a clickable hyperlink
- `objectid` is clickable and navigates to the full record view
- Record count displayed above the table ("Showing X of Y records")

### Detail view (full record)
Triggered by clicking an `objectid`. Fields displayed, each on its own line,
in this exact order:

```
title
abstract
fieldstation
date
creator
secondarycreator
pages
subject
location
objectid
object_location
coursenumber
coursename
```

Includes a "Back to Search Results" button.

---

## 4. Project Structure

```
data-over-decades/
├── app.R              # Shiny app (UI + server); reads dod-data.csv here
├── dod-data.csv       # Bibliographic data used by the Shiny app
├── docs/              # Static GitHub Pages site (Section 8)
│   └── data/
│       └── dod-data.csv   # Copy of dod-data.csv served to the website
├── README.md          # This file
├── README.html        # Old rendered copy of the README (Feb 2026, out of date)
├── .gitignore
```

The two `dod-data.csv` files must stay identical. When the data changes,
update the root file and then **copy** (don't move) it into `docs/data/`;
moving it breaks the Shiny app.

---

## 5. Known Issues / Things to Watch

- **Date parsing** — `year` assumes `date` begins with a four-digit year.
  Irregular or missing dates produce `NA`. These records appear while the
  slider covers the full range, but are excluded once it is narrowed.
- **URL validity** — `object_location` must contain full URLs
  (e.g. `https://…`) for links to resolve correctly.
- **Dropdown values** — populated from unique values in the data; messy or
  inconsistent entries will appear as separate options. May need cleanup upstream.

---

## 6. Backlog / Ideas

- [ ] Make dropdown filters cascade (e.g. course name options limited by selected field station)
- [ ] Add a "Reset all filters" button
- [ ] Support bookmarkable URLs so individual records can be linked directly
  (done in the static site, `#record/<objectid>`; not in the Shiny app)
- [ ] Add a formatted citation block to the detail view
- [x] Replace fixed column index with a more robust click handler
- [ ] Add an "About" / "How to use this catalog" panel (done in the static
  site as `docs/about.html`; not in the Shiny app)
- [ ] Cache the dataset as `.rds` for faster startup

---

## 7. Context for AI Assistants

If you're picking this project up fresh: this is a bibliographic catalog Shiny
app for field station course materials. The working `app.R` is already written —
it loads a CSV, builds a sidebar of filters, renders a `DT` results table, and
swaps to a detail view when a user clicks an `objectid`. Section 3 above is the
authoritative spec for required behavior; Section 5 lists current rough edges.
Sections 1–2 cover the data shape. Start by reading `app.R` alongside Section 3.

The static GitHub Pages version in `docs/` implements the same spec in
JavaScript (`docs/app.js`); see Section 8. Changes to required behavior should be made in both until the
Shiny app is retired. Section 9 lists where work left off.

---

## 8. Static Site on GitHub Pages

`docs/` contains a static version of the catalog that runs entirely in the
visitor's browser, so it can be hosted free on GitHub Pages with no R session.
It implements the spec in Section 3, and each record has its own link
(`…/#record/<objectid>`).

```
docs/
├── index.html         # Catalog page layout
├── about.html         # About page: project background and how to use the catalog
├── app.js             # Loading, search, filters, table, detail view, download
├── style.css          # Styles for both pages
├── .nojekyll          # Tells GitHub Pages to serve files as-is
├── images/            # Web-sized copies of images/ used on the About page
└── data/
    └── dod-data.csv   # Copy of the data served to the browser
```

The About page's "What's in the Catalog" table (papers and years per field
station) is written by hand. Update it when the data changes.

Libraries (loaded from CDNs, no install step): DataTables (the same table
library `DT` uses), PapaParse (CSV parsing and export), and noUiSlider (year
range slider).

---

## 9. Status and Next Steps (as of 2026-10-28)

**Live site:** <https://amandawhitmire.github.io/data-over-decades/>, served
from `docs/` on `main`. GitHub matches the local copy as of commit `1ec8cf3`
(pushed 2026-10-28). The live site serves all 10,170 records, and search covers
co-authors/advisors (`secondarycreator`) in both the Shiny app and the website.

**Next steps:**

- [x] **Update the site's data.** Done 2026-10-28 (commit `1ec8cf3`):
  `docs/data/dod-data.csv` now has the 10,170 records (Hopkins Marine Station
  986 instead of 747; Friday Harbor 3,709 instead of 3,710).
- [ ] **Update the About page table** ("What's in the Catalog" in
  `docs/about.html`) with the new counts and year ranges, and the "9,932
  papers" sentence above it.
- [ ] **Decide what to do with the new, uncommitted files:** the harvesting
  scripts (`harvest_fhl_oai.R`, `harvest_fhl_rest.R`, `map_fhl.R`,
  `merge_fhl.R`, `update-uw.R`, `build_series_crosswalk.R`,
  `check-fhl-subjects.R`, `test-rest-api.R`) and seven CSVs in `docs/data/`
  (`dod-data_backup_2026-10-27.csv`, `fhl-crosswalk.csv`, `fhl_oai_long.csv`,
  `fhl_rest_long.csv`, `harvest_fhl.csv`, `series_crosswalk_DRAFT.csv`,
  `uw_oai_sets.csv`). **Anything committed in `docs/` is public on the
  website**, so move working files elsewhere (for example a `data-raw/`
  folder) unless they are meant to be published.
- [ ] **Add the UC Berkeley papers** (238 records, 1947–1951, from
  `metadata-berkeley-papers.csv`, which is not in this folder or in git).
  Its columns (`HRID`, `Contributor`, `Imprint`, `catkey`, …) must be mapped
  to the catalog's columns in Section 2 first.
- [ ] **Decide whether to retire the Shiny app.** Until then, behavior
  changes need making in both `app.R` and `docs/app.js` (Section 7).
