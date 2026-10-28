# Field Station Bibliographic Catalog — Shiny App

A searchable, filterable web catalog of bibliographic records for field station
course materials, built with R and Shiny and deployed to shinyapps.io.

---

## 1. Project Overview

**Goal:** Provide a public-facing catalog/database of ~10,000 bibliographic records
with full-text search, faceted filtering, downloadable results, and a detailed
single-record view styled like a traditional library catalog display.

**Status:** Working prototype complete. A static version for GitHub Pages lives in
`docs/` (see Section 11) and is replacing the Shiny app on shinyapps.io.

**Stack:**
- R / RStudio
- `shiny` — application framework
- `DT` — interactive results table
- `dplyr`, `stringr`, `readr` — data wrangling
- GitHub — version control
- shinyapps.io — hosting

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
| `secondarycreator` | Detail view only |
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
- **Free-text search** across `title`, `creator`, `subject`, and `location` (case-insensitive, partial match)
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
field-station-catalog/
├── app.R              # Full application (UI + server)
├── data/
│   └── records.csv    # Bibliographic data
├── README.md          # This file
├── .gitignore
└── rsconnect/         # Created automatically on first deploy (do not edit)
```

---

## 5. Setup

### Install dependencies

```r
install.packages(c("shiny", "dplyr", "DT", "stringr", "readr", "rsconnect"))
```

### Point the app at your data

In `app.R`, update the file path near the top:

```r
data <- read_csv("data/records.csv", col_types = cols(.default = col_character()))
```

### Run locally

Open `app.R` in RStudio and click **Run App**, or:

```r
shiny::runApp()
```

---

## 6. Deployment to shinyapps.io

1. Create a free account at <https://www.shinyapps.io>
2. In shinyapps.io: **Account → Tokens → Show → Copy to clipboard**
3. Paste the resulting command into the RStudio console:

   ```r
   rsconnect::setAccountInfo(
     name   = "YOUR_ACCOUNT",
     token  = "YOUR_TOKEN",
     secret = "YOUR_SECRET"
   )
   ```

4. Deploy:

   ```r
   rsconnect::deployApp()
   ```

   Or use the **Publish** button in RStudio. Confirm the CSV in `data/` is
   included in the file list before publishing.

### Free tier limits
- 5 applications
- 25 active hours per month
- Limited memory — fine for a dataset of this size

---

## 7. GitHub Notes

GitHub cannot host the Shiny app, since Shiny requires a live R session. It can
host the static version in `docs/` through GitHub Pages (see Section 11).

Suggested `.gitignore`:

```
.Rproj.user
.Rhistory
.RData
.Ruserdata
rsconnect/
```

> **Note:** If the CSV contains anything non-public, keep it out of the repo and
> load it from a secure source at runtime instead.

---

## 8. Known Issues / Things to Watch

- **Date parsing** — `year` assumes `date` begins with a four-digit year.
  Irregular or missing dates produce `NA`. These records appear while the
  slider covers the full range, but are excluded once it is narrowed.
- **URL validity** — `object_location` must contain full URLs
  (e.g. `https://…`) for links to resolve correctly.
- **Dropdown values** — populated from unique values in the data; messy or
  inconsistent entries will appear as separate options. May need cleanup upstream.

---

## 9. Backlog / Ideas

- [ ] Make dropdown filters cascade (e.g. course name options limited by selected field station)
- [ ] Add a "Reset all filters" button
- [ ] Support bookmarkable URLs so individual records can be linked directly
- [ ] Add a formatted citation block to the detail view
- [x] Replace fixed column index with a more robust click handler
- [ ] Add an "About" / "How to use this catalog" panel
- [ ] Cache the dataset as `.rds` for faster startup

---

## 10. Context for AI Assistants

If you're picking this project up fresh: this is a bibliographic catalog Shiny
app for field station course materials. The working `app.R` is already written —
it loads a CSV, builds a sidebar of filters, renders a `DT` results table, and
swaps to a detail view when a user clicks an `objectid`. Section 3 above is the
authoritative spec for required behavior; Section 8 lists current rough edges.
Sections 1–2 cover the data shape. Start by reading `app.R` alongside Section 3.

The static GitHub Pages version in `docs/` implements the same spec in
JavaScript (`docs/app.js`); see Section 11. Changes to required behavior should
be made in both until the Shiny app is retired.

---

## 11. Static Site on GitHub Pages

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

**The whole CSV is public.** Anyone visiting the site can download the full
dataset, including abstracts.

### Updating the data

The site reads `docs/data/dod-data.csv`, not the copy in the project root.
After changing the data, copy it over and commit both:

```sh
cp dod-data.csv docs/data/dod-data.csv
```

### Preview locally

Browsers block loading the CSV from a page opened directly as a file, so
serve the folder instead:

```sh
python3 -m http.server 8000 --directory docs
```

Then open <http://localhost:8000>.

### Turn on GitHub Pages

1. Push `docs/` to the `main` branch on GitHub.
2. In the repository: **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, branch
   `main`, folder `/docs`, then **Save**.
4. After a minute or two the site is live at
   <https://amandawhitmire.github.io/data-over-decades/>.

GitHub Pages on a private repository requires a paid GitHub plan.