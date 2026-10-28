// Bibliographic Records Catalog — static version of app.R for GitHub Pages.
// The CSV is loaded in the browser and all searching and filtering happens here.

const DATA_URL = "data/dod-data.csv";

// Columns searched by the free-text box
const SEARCH_FIELDS = ["title", "creator", "subject", "location"];

// Dropdown filters (each <select> has id "filter-<column>")
const FILTER_FIELDS = ["institution", "fieldstation", "coursenumber", "coursename"];

// Results table columns, in display order
const TABLE_FIELDS = ["fieldstation", "objectid", "object_location", "date",
                      "creator", "title", "pages", "subject"];

// Detail view fields, in display order (title is shown as the heading)
const DETAIL_FIELDS = [
  ["abstract", "Abstract"],
  ["fieldstation", "Field Station"],
  ["date", "Date"],
  ["creator", "Creator"],
  ["secondarycreator", "Secondary Creator"],
  ["pages", "Pages"],
  ["subject", "Subject"],
  ["location", "Location"],
  ["objectid", "Object ID"],
  ["object_location", "Object Location"],
  ["coursenumber", "Course Number"],
  ["coursename", "Course Name"],
];

const PAGE_TITLE = document.title;

const el = (id) => document.getElementById(id);
const searchInput = el("search");
const countText = el("record-count");
const catalogView = el("catalog-view");
const detailView = el("detail-view");
const recordView = el("record");

let records = [];      // all records
let csvFields = [];    // original CSV column names, for downloads
let recordsById = new Map();
let filtered = [];     // records matching the current filters
let table, slider, yearMin, yearMax;
let cameFromCatalog = false;
let catalogScrollY = 0;

// --- Helpers ---

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

function isUrl(value) {
  return /^https?:\/\//i.test(value);
}

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// --- Load data ---

Papa.parse(DATA_URL, {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: (results) => init(results.data, results.meta.fields),
  error: (err) => {
    countText.textContent = `Could not load records (${err.message || err}).`;
  },
});

function init(rows, fields) {
  csvFields = fields;
  records = rows.map((r) => {
    // Year is the first four digits of date; undated records get null
    const match = /^(\d{4})/.exec(r.date || "");
    r.year = match ? Number(match[1]) : null;
    // Lowercased copies of the searchable fields, for case-insensitive search
    r._search = SEARCH_FIELDS.map((f) => (r[f] || "").toLowerCase());
    return r;
  });
  recordsById = new Map(records.map((r) => [r.objectid, r]));

  buildDropdowns();
  buildYearSlider();
  buildTable();

  searchInput.addEventListener("input", debounce(applyFilters, 200));
  FILTER_FIELDS.forEach((f) => el(`filter-${f}`).addEventListener("change", applyFilters));
  el("download").addEventListener("click", downloadFiltered);
  el("download").disabled = false;
  el("back").addEventListener("click", backToResults);
  window.addEventListener("hashchange", route);

  applyFilters();
  route();
}

// --- Filters ---

function buildDropdowns() {
  for (const field of FILTER_FIELDS) {
    const select = el(`filter-${field}`);
    const values = [...new Set(records.map((r) => r[field]).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    // An empty value means "All"
    select.replaceChildren(new Option("All", ""), ...values.map((v) => new Option(v, v)));
  }
}

function buildYearSlider() {
  const years = records.map((r) => r.year).filter((y) => y !== null);
  yearMin = Math.min(...years);
  yearMax = Math.max(...years);

  slider = el("year-slider");
  noUiSlider.create(slider, {
    start: [yearMin, yearMax],
    connect: true,
    step: 1,
    range: { min: yearMin, max: yearMax },
    handleAttributes: [{ "aria-label": "Start year" }, { "aria-label": "End year" }],
    format: { to: (v) => Math.round(v), from: Number },
  });
  slider.noUiSlider.on("update", ([start, end]) => {
    el("year-start").textContent = start;
    el("year-end").textContent = end;
  });
  slider.noUiSlider.on("set", applyFilters);
}

function applyFilters() {
  const term = searchInput.value.trim().toLowerCase();
  const [start, end] = slider.noUiSlider.get().map(Number);
  // Only filter by year once the range is narrowed, so undated records
  // still appear by default
  const yearActive = start > yearMin || end < yearMax;
  const selected = FILTER_FIELDS
    .map((f) => [f, el(`filter-${f}`).value])
    .filter(([, value]) => value !== "");

  filtered = records.filter((r) =>
    (!term || r._search.some((text) => text.includes(term))) &&
    (!yearActive || (r.year !== null && r.year >= start && r.year <= end)) &&
    selected.every(([f, value]) => r[f] === value)
  );

  table.clear().rows.add(filtered).draw();
  countText.textContent =
    `Showing ${filtered.length.toLocaleString()} of ${records.length.toLocaleString()} records`;
}

// --- Results table ---

function renderCell(field) {
  return (value, type) => {
    if (type !== "display") return value;
    if (field === "objectid") {
      return `<a href="#record/${encodeURIComponent(value)}">${escapeHtml(value)}</a>`;
    }
    if (field === "object_location" && isUrl(value)) {
      return `<a href="${escapeHtml(value)}" target="_blank" rel="noopener">${escapeHtml(value)}</a>`;
    }
    return escapeHtml(value);
  };
}

function buildTable() {
  table = new DataTable("#results", {
    data: [],
    deferRender: true,
    searching: false,   // filtering is done by applyFilters()
    order: [],          // keep the CSV order until a column is sorted
    pageLength: 25,
    lengthMenu: [10, 25, 50, 100],
    scrollX: true,
    columns: TABLE_FIELDS.map((field) => ({
      title: field,
      data: field,
      defaultContent: "",
      className: `col-${field}`,
      render: renderCell(field),
    })),
  });
}

// --- Download ---

function downloadFiltered() {
  const csv = Papa.unparse({
    fields: csvFields,
    data: filtered.map((r) => csvFields.map((f) => r[f] ?? "")),
  });
  const now = new Date();
  const date = [now.getFullYear(), now.getMonth() + 1, now.getDate()]
    .map((n) => String(n).padStart(2, "0")).join("-");

  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  link.download = `filtered_records_${date}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

// --- Detail view ---
// Each record has its own URL (#record/<objectid>), so records can be linked to directly.

function route() {
  const match = /^#record\/(.+)$/.exec(location.hash);
  if (match) {
    if (!catalogView.hidden) {
      cameFromCatalog = true;
      catalogScrollY = window.scrollY;
    }
    showRecord(decodeURIComponent(match[1]));
    catalogView.hidden = true;
    detailView.hidden = false;
    window.scrollTo(0, 0);
  } else {
    detailView.hidden = true;
    catalogView.hidden = false;
    document.title = PAGE_TITLE;
    table.columns.adjust();
    window.scrollTo(0, catalogScrollY);
  }
}

function showRecord(id) {
  const record = recordsById.get(id);
  recordView.replaceChildren();

  const heading = document.createElement("h2");
  recordView.append(heading);
  if (!record) {
    heading.textContent = "Record not found";
    const message = document.createElement("p");
    message.textContent = `No record has the ID “${id}”.`;
    recordView.append(message);
    document.title = PAGE_TITLE;
    return;
  }

  heading.textContent = record.title;
  document.title = `${record.title} — ${PAGE_TITLE}`;

  const list = document.createElement("dl");
  for (const [field, label] of DETAIL_FIELDS) {
    const value = record[field];
    if (!value) continue;  // skip empty fields

    const term = document.createElement("dt");
    term.textContent = `${label}:`;
    const detail = document.createElement("dd");
    if (field === "object_location" && isUrl(value)) {
      const link = document.createElement("a");
      link.href = value;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = value;
      detail.append(link);
    } else {
      detail.textContent = value;
    }
    if (field === "abstract") term.classList.add("block");
    list.append(term, detail);
  }
  recordView.append(list);
}

function backToResults() {
  if (cameFromCatalog) {
    history.back();
  } else {
    // Opened from a direct link: go to the catalog without leaving the site
    history.pushState(null, "", location.pathname + location.search);
    route();
  }
}
