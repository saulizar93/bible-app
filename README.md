Bible study app — step 1

1. Create the project

```bash
npm create vite@latest bible-app -- --template react
cd bible-app
npm install idb-keyval
```

Then copy these files in:

```
bible-app/
  scripts/build-bibles.mjs
  src/App.jsx
  src/books.js
  src/app.css
```

In `src/main.jsx`, make sure it renders `<App />` (Vite's default already does).
Delete `src/App.css` and `src/index.css` imports if they clash. 2. Get the texts
Download USFM zips and unzip each into its own folder under `sources/`:
Code Where Notes
`kjv` ebible.org → engKJV public domain
`bsb` ebible.org → engBSB free, attribution required
`rv1909` ebible.org → spaRV1909 public domain
`rvg` crosswire.org SWORD module `SpaRVG` CC BY-NC-ND 3.0 — keep non-commercial, don't modify the text
Verify the exact download codes on the site; they change occasionally.
If a source ships as a SWORD module rather than USFM, convert it first with
`mod2osis` / `osis2usfm`, or grab the same text from ebible.org if listed there. 3. Build the data

```bash
node scripts/build-bibles.mjs sources/engKJV    kjv
node scripts/build-bibles.mjs sources/engBSB    bsb
node scripts/build-bibles.mjs sources/spaRV1909 rv1909
node scripts/build-bibles.mjs sources/SpaRVG    rvg
```

This writes `public/data/bibles/<code>/<booknumber>.json`.
The script prints the total gzipped size — expect roughly 1.2–1.5 MB per translation
for the whole Bible, of which a phone downloads only the book being read. 4. Run it

```bash
npm run dev
```

Open on your phone via the network URL Vite prints. Type `jn 3:16`, `mt 5`,
`1 co 13`, `salmos 23` — all work, in either language.
What's already handled
Per-book fetching. Nothing loads until you open that book.
Three-level cache. In-memory map → IndexedDB → network. Second visit to any
chapter is instant and works offline.
Idle prefetch of the next chapter, so paging forward feels instantaneous.
`content-visibility: auto` on verses — the browser skips layout for offscreen text.
Stacked panes on phones, side-by-side at ≥820px, from the same components.
Next steps, in order
Swap the bottom pane for your Matthew notes (a third pane mode, not a fourth translation).
Add the Markdown splitter for the Google Docs export.
Add the Greek/Strong's layer (TAGNT from STEPBible, CC BY 4.0).
Add a service worker so the whole thing works offline as an installable PWA.

### Run on Commentary:

node scripts/build-notes.mjs sources/matthew-commentary-en.txt en MAT
node scripts/build-notes.mjs sources/matthew-commentary-es.txt es MAT

### More English translations:

https://ebible.org/
