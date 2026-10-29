# AI Decision & Architecture Log

## 2026-10-04: Language Switch + Default Panes in Settings

### User Request

- Change `app_lang` between "en" and "es" from the app.
- Set a default translation or notes set for each of the two panes.

### Decisions & Changes

1. **Language** (`SettingsModal`, top section): English / Español buttons call `changeLanguage` in `App.jsx`, which writes localStorage `app_lang` and updates `lang` state, so the interface switches immediately. Panes are not changed (the first-run `LanguageSelectionModal` still picks language-based panes).
2. **Default panes** (`SettingsModal`, bottom section): one select per pane listing every `PANE_OPTIONS` entry (English / Español / Study notes), plus "Remember last used" (the previous behavior). Stored as localStorage `app_default_top` / `app_default_bottom`; empty = removed.
   - On startup a valid default wins over `app_top_pane` / `app_bottom_pane` (last used). Changing panes while reading still works; the next launch returns to the default.
   - Choosing a default also switches that pane immediately.
   - A default pointing at a removed translation is ignored (`savedDefault` checks `optionFor`).

## 2026-10-04: Verse Number Size Setting + Info Pages Dock Like the Strong's Panel

### User Request

- Let users change the size of the (clickable) verse numbers.
- Info pages (hamburger menu) should appear exactly like the Strong's panel: docked to the side on desktop, a modal on phones with an × and click-away to close, with the Bible/notes panes always visible behind.

### Decisions & Changes

1. **Verse number size**: new setting `numScale` (50–200 % of the default 12px, independent of text size; min 8px), saved as localStorage `app_verse_num_scale`. `SettingsModal` has a "Verse number size" row and the sample shows a verse number. `App.jsx` sets `--verse-num-scale`; `.vnum` (BiblePane.css) uses it instead of following the text size.
2. **InfoPanel placement**: moved inside `.content-row` (next to `SplitPanes`), so the existing `StrongsPanel.css` rules apply unchanged: ≥900px a 320px sidebar beside the panes (no backdrop); below that a centered card over a translucent backdrop, closed by × or tapping the backdrop.
3. **One side panel at a time**: opening an info page closes the Strong's panel and tapping a Strong's word closes the info page, so desktop never shows two sidebars.
4. Noted, not changed: `src/index.css` (Vite template) caps `#root` at 1126px wide, leaving empty space on large monitors.

## 2026-10-04: Reading Settings + Hamburger Menu With Info Pages

### User Request

- Settings button (left of the JumpBar, right of "previous") opening a modal to change text size (percentages) and font.
- Hamburger button next to it with a dropdown: About the Author, About the Bible Translations, Bible Manipulations, Bibliography — each opening a Strong's-style panel with placeholder text for the author's notes.

### Decisions & Changes

1. **Header order**: ‹ | ⚙ settings | ☰ menu | Book Chapter ▾ | 🔍 | Gk/Heb | ›. Gaps tighten under 420px so it fits phones.
2. **`src/settings.js`** (new): sizes 50/75/100/125/150/175/200 %, fonts Default (Charter), Georgia, Times New Roman, Arial, Verdana, Helvetica (system fonts — no downloads, works offline). Saved in localStorage `app_font_scale` / `app_font_family`.
3. **`SettingsModal`** (new): live sample text, size chips, font buttons (each shown in its own font), Reset / Done; EN/ES labels. Changes apply immediately.
4. **Applying settings**: `App.jsx` sets `--reading-scale` / `--reading-font` on `.app`; `.pane-body` (PaneSlot.css) uses them for Bible and notes panes; verse numbers scale too (clamped 10–20px). Header, panels and menus keep their normal size.
5. **`src/pages.js`** (new) lists the menu pages; **`MainMenu`** (new) is the hamburger + dropdown (closes on outside click / Escape).
6. **`InfoPanel`** (new): reuses the Strong's panel look; loads `public/data/pages/<id>.<lang>.md` (falls back to English). Supports a small Markdown subset: `#`/`##`/`###` headings, `-` bullets, `**bold**`, `*italic*`, `[link](https://...)`, blank-line paragraphs. Rendered as React elements (no innerHTML).
7. **Placeholder pages**: `public/data/pages/{author,translations,manipulations,bibliography}.{en,es}.md`. To add a page: add it to `src/pages.js` and create its two `.md` files.

## 2026-10-04: Strong's Toggle Only With Tagged Panes + Copyright Notices

### User Request

- Show the Gk/Heb button only when a Strong's-tagged translation is selected.
- Show each translation's copyright at the very bottom of the scrollable pane, under every chapter.

### Decisions & Changes

1. **`JumpBar`**: the toggle renders only if `top` or `bottom` is a `PANE_OPTIONS` entry with `strongs: true` (currently `kjv-strong`, `rv1909-strong`).
2. **`src/data.js`**: every translation has a `copyright` string, taken from its own source files (eBible `copr.htm`, SWORD `.conf`, DRC front matter). Torres-Amat (built from an epub with no license page) is marked public domain on the basis of the 1823–1825 translation date. Notes panes have none.
3. **`BiblePane`**: renders `<p class="pane-copyright">` after the last verse.
4. **`BiblePane.css`**: when a notice is present, `.pane-body:has(> .pane-copyright)` drops its 40vh bottom padding and the notice's top margin supplies the same space, so the last verse can still scroll to the top and the notice sits at the very end. (A negative-margin version was tried first; Chrome still added the full padding after it.) Keep the 40vh in sync with `PaneSlot.css`.

## 2026-10-04: Biblia Platense (Straubinger) added as `platense`

### User Request

- Parse the SWORD module SpaPlatense (Biblia Platense, Straubinger, 1948; Public Domain) and add it to the Bibles.

### Decisions & Changes

1. **`scripts/build-sword-bible.mjs`** (KJV and RV1909 output re-verified byte-identical):
   - Books matched by OSIS name instead of position; books the app lacks are skipped (Tob, Jdt, Wis, Sir, Bar, 1Macc, 2Macc).
   - Non-KJV versifications allowed (structure check only enforced for KJV v11n); trailing empty slots trimmed for non-KJV versifications only.
   - Section headings (`x-s`, `x-ms`, ...) and book introductions always dropped; `--keep-titles` keeps only Psalm titles. Footnotes dropped (13,088 Straubinger notes — candidate for a future notes pane).
   - Block markup (poetry lines, paragraphs) separates words.
   - Plain-text modules are written as `{ b, c, v }` (no `w`).
   - New `--vulg-psalms`: Vulgate -> Hebrew/English Psalm chapters (9 -> 9+10, 10–112 -> 11–113, 113 -> 114+115, 114+115 -> 116, 116–145 -> 117–146, 146+147 -> 147), then titles counted as their own verse merged into verse 1 (59 psalms) so all 150 psalms match KJV verse counts.
   - Usage: `node scripts/build-sword-bible.mjs "<unzipped SpaPlatense>" --vulg-psalms --out public/data/bibles/platense`
2. **`public/data/bibles/platense/`**: 66 books, 3.9 MB raw / 1.3 MB gzipped.
3. **`src/data.js`**: `platense` added after Torres-Amat ("Straubinger (Católica)", citation "Straubinger"). Torres-Amat not touched.
4. **Known gaps**: 56 chapters still differ from KJV verse counts by 1–2 (Vulgate chapter/verse boundaries: e.g. Gen 31/32, Job 39–41, Dan 3, some NT chapters), so verse sync can be one off there. Esther has 16 and Daniel 14 chapters (Vulgate additions); the book picker only reaches the first 10 / 12.

## 2026-10-04: Bilingual Lexicon Definitions (def-en / def-es)

### User Request

- Give every Greek and Hebrew lexicon entry a `def-en` (English) and `def-es` (Spanish, placeholder for now, to be filled in by hand), and have StrongsPanel show the one matching localStorage `app_lang`.

### Decisions & Changes

1. **Lexicon data (`public/data/strongs/{greek,hebrew}/*.json`)**: `def` renamed to `def-en`; `def-es` added with the placeholder "Definición en español llegará pronto." (5,523 Greek + 8,674 Hebrew entries). Files are now written indented (one field per line) for hand editing.
2. **`scripts/lexicon-write.mjs`** (new, shared by `build-strongs-lexicon.mjs` and `build-strongs-hebrew.mjs`): before writing a shard it reads the existing file and keeps every `def-es` that is not the placeholder, so re-running the build never erases hand-entered translations. If an existing shard is invalid JSON (e.g. a typo while editing) the build stops instead of overwriting it. Each run prints "Spanish definitions: N kept, M placeholders".
3. **`StrongsPanel`**: reads localStorage `app_lang` — "es" shows `def-es`, otherwise `def-en` (falls back to the old `def` field).
4. **`src/data.js`**: `LEXICON_VERSION` 2 -> 3 so phones refetch the lexicon.
5. **`.gitattributes`**: lexicon JSON is diffable again (exception to the `public/data` -diff rule) so hand edits show in Source Control.
6. Not translated yet: `deriv`, `kjv` and the Hebrew `outline` remain English.

## 2026-10-04: RV1909 con Strong (rv1909-strong) + Gk/Heb Toggle Label

### User Request

- Parse the SWORD module "Reina-Valera 1909 con números de Strong" (SpaRV1909) and add it as `rv1909-strong` with Strong's tags, the same way as the KJV.
- Show the Strong's toggle as "Heb" in the Old Testament and "Gk" in the New Testament.

### Decisions & Changes

1. **Generic SWORD reader (`scripts/build-kjv-sword.mjs` renamed to `scripts/build-sword-bible.mjs`)**:
   - Reads the module's `.conf` (DataPath, CipherKey) instead of a hard-coded KJV path.
   - Implements SWORD's Sapphire II cipher: SpaRV1909 is enciphered; the key ships in its `.conf`.
   - `Strong:` prefix matched case-insensitively (RV1909 capitalizes it).
   - New `--keep-titles` flag keeps Psalm titles inline at the start of verse 1 (used for RV1909, matching the existing `rv1909`; the KJV still drops them).
   - Tokens get `j: 1` when the source has no space before them (tags splitting a word: "Gessur" + "i", "Díjete" + "lo"); text building and `BiblePane` skip the space for those. Opening "¿", "¡", "«" attach to the next word.
   - KJV regression: rebuilt `kjv-strong` differs in one verse only (Exodus 32:32 "sin —;" -> "sin—;").
   - Usage:
     - `node scripts/build-sword-bible.mjs "<KJV module>" --out public/data/bibles/kjv-strong`
     - `node scripts/build-sword-bible.mjs "<SpaRV1909 module>" --keep-titles --out public/data/bibles/rv1909-strong`
2. **`public/data/bibles/rv1909-strong/`**: 390,759 tagged words (no morphology in this module), 15.3 MB raw / 3.5 MB gzipped. Text is identical letter-for-letter to the existing `rv1909` except 122 spacing fixes (e.g. "sáca lo" -> "sácalo", "¿ Quién" -> "¿Quién").
3. **Per-translation concordance**: `build-concordance.mjs` takes an optional output root; RV1909's is at `public/data/concord/rv1909-strong/{greek,hebrew}` (KJV stays at `public/data/concord/{greek,hebrew}`). `PANE_OPTIONS[].concord` maps each tagged translation to its folder.
   - `node scripts/build-concordance.mjs public/data/bibles/rv1909-strong public/data/concord/rv1909-strong`
4. **App**: `rv1909-strong` added to `PANE_OPTIONS` ("RV1909 c/Strong (TR)"); the selection remembers which pane a word came from (`source`), so "Show other occurrences" uses that translation's concordance and verse snippets.
5. **`JumpBar`**: toggle reads "Heb" for books 1–39 and "Gk" for 40–66.
6. **Greek lexicon**: inline Greek words without a number (`<greek unicode="ἄγαν" .../>`) were dropped ("from (much)"); now "from ἄγαν (ágan) (much)". 492 fields fixed.
7. **License note**: the RV1909 text is public domain, but the Strong's tagging (Rubén Gómez) is marked "Copyrighted; Permission to distribute granted to CrossWire". Publishing `rv1909-strong` on GitHub Pages redistributes the tagging — get the editor's permission first, or keep it out of the deployed build.

## 2026-10-04: Hebrew Lexicon, Hebrew Concordance, Greek Lexicon Cross-References

### User Request

- Hebrew words had no definitions, no `strongs/hebrew` folder and no Hebrew concordance.

### Decisions & Changes

1. **Hebrew lexicon (`scripts/build-strongs-hebrew.mjs`, `sources/StrongHebrewG.xml`)**: OpenScriptures Strong's Hebrew XML (marked Public Domain; the JSON version in the same repo is CC-BY-SA, so the XML was used). Writes `public/data/strongs/hebrew/<shard>.json` (8,674 entries, 18 shards, 2.7 MB) with lemma, transliteration, pronunciation, part of speech + gender (`n-m`, `n-f`, ...), derivation (cross-references kept as "אֱלוֹהַּ (ʼĕlôwahh, H433)"), definition, KJV usage and the stem-by-stem sense outline.
   - Run: `node scripts/build-strongs-hebrew.mjs sources/StrongHebrewG.xml`
2. **Concordance (`scripts/build-concordance.mjs`)**: now indexes H numbers too, into `public/data/concord/hebrew/` (Greek and Hebrew numbers overlap, so separate folders).
3. **Greek lexicon fix (`scripts/build-strongs-lexicon.mjs`)**: `<strongsref>` cross-references were dropped ("from and the base of ;"); now kept as "from G303 and the base of G939;". Leading ":--" removed from KJV usage. Rebuilt `public/data/strongs/greek/` — no other field changed.
4. **`src/data.js`**: Strong's/concordance lookups pick `greek` or `hebrew` by prefix; cache keys now include `LEXICON_VERSION` (2) so phones refetch rebuilt lexicon/concordance files.
5. **`src/morph.js`**: `decodeHebrewPos()` for dictionary part-of-speech/gender codes (EN/ES).
6. **`StrongsPanel`**: Hebrew lemma right-to-left with Hebrew font; Hebrew nouns/adjectives show part of speech + gender from the dictionary (the KJV module only parses verbs); collapsible "Meanings (outline)".
7. **`.gitattributes`**: `public/data/**/*.json` and `sources/**` marked `-diff` so VS Code Source Control / git don't try to text-diff huge single-line JSON files.

## 2026-10-04: KJV Rebuilt from SWORD Module with Morphology

### User Request

- Reparse the KJV from the CrossWire SWORD module "King James Version (1769) with Strongs Numbers and Morphology and CatchWords" (v3.1) so word morphology (case, number, gender; verb tense/voice/mood; Hebrew verb stem/form) displays in the app.

### Decisions & Changes

1. **New build script (`scripts/build-kjv-sword.mjs`, now `scripts/build-sword-bible.mjs`)**:
   - Reads the module's zText files (`.bzs/.bzv/.bzz`) directly with Node's zlib — no SWORD/diatheke install needed, and nothing is filtered out (the old diatheke export had dropped morphology).
   - Validates structure: 66 books, 1,189 chapters, 31,102 verses.
   - Keeps the existing token format and adds optional keys: `m` (morph code: Robinson for Greek, `TH8xxx` for Hebrew verbs), `g` (Greek word as in the TR), `it` (translator-supplied italics), `r` (words of Jesus), `dn` (divine name). The last three are stored for future display, not yet rendered.
   - Usage: `node scripts/build-kjv-sword.mjs "C:/Users/saulo/Downloads/KJV (1)"` then `node scripts/build-concordance.mjs public/data/bibles/kjv-strong`.
2. **Data (`public/data/bibles/kjv-strong/`, `public/data/concord/greek/`)**:
   - Verse text identical to the previous build except 185 verses where a stray space after "(" was removed ("( out of" -> "(out of").
   - Fixed about 4,400 wrong Strong's tags (plus 239 verses with wrong word boundaries) caused by the old parser swallowing self-closing `<w/>` elements (e.g. Matthew 1:7 "And" was G3588 "the", now G1161 δέ). Concordance rebuilt.
   - Size 15.5 MB -> 19.8 MB raw (4.0 MB gzipped).
3. **Morphology decoder (`src/morph.js`)**: decodes all 1,062 Robinson codes and all 134 Hebrew TVM codes in the module, English and Spanish labels. Hebrew table verified entry-by-entry (studybible.info Strong's H8675–H8809). Hebrew nouns have no gender data in this source.
4. **UI**: `BiblePane` passes the tapped token; `App` stores `morph`/`form` in the selection and passes `lang`; `StrongsPanel` shows a "Parsing" block (chips) and the TR form.
5. **`src/data.js`**: `DATA_VERSION` 1 -> 2 so phones drop cached KJV books.

## 2026-10-03: Header Navigation & Search Popup Refactor

### User Request

- Set `BookPicker` as the primary verse navigation control, centered in the top bar and labeled with the current book and chapter.
- Replace permanent jump bar input with a search icon that opens a search popup dialog for quick verse jumping.

### Decisions & Changes

1. **Top Navigation Bar (`JumpBar.jsx`, `JumpBar.css`)**:
   - Reorganized header layout to: `‹` (previous chapter) | `[ Book Chapter ▾ ]` (centered BookPicker button) | `[ 🔍 ]` `[ Gk ]` `[ › ]` (actions group).
   - Replaced the full-width input field with a search trigger button (`🔍`).
   - Removed the redundant emoji button (`📖`) since the center button now opens `BookPicker`.
2. **Search Popup Modal (`JumpBar.jsx`, `JumpBar.css`)**:
   - Modal dialog with semi-transparent backdrop, auto-focused search input, clear button (`×`), cancel button, and suggestion list dropdown.
   - Closed via Cancel button, backdrop click, Escape key, or when a reference is selected/submitted.
3. **BookPicker Enhancements (`BookPicker.jsx`, `BookPicker.css`)**:
   - Accepts `currentBook` to highlight the currently active book in the grid with `.picker-cell.current`.
   - Added Escape key listener to close modal.
4. **App Wiring (`App.jsx`)**:
   - Passed `book` and `chapter` to `JumpBar`.
   - Updated `submit` handler to return a boolean indicating whether a reference was successfully parsed.

## 2026-10-03: Active Panes Word & Verse Search

### User Request

- Search for words or verses across the available panes (their respective Bible translations or notes) for the entire Bible (all 66 books).
- Show results in a list with contextual text snippets and the searched word bolded.

### Decisions & Architecture

1. **Search Engine (`src/search.js`)**:
   - Implemented `searchAvailablePanes` to query only the translations and notes active in the current panes (`top` and `bottom`).
   - Prioritizes the currently active book first so results appear instantly (<20ms), streaming the remaining 65 books asynchronously.
   - Built accent-insensitive matching (e.g., `jesus` matches `Jesús`) and case-insensitive matching.
   - Extracts contextual snippets (`createSnippet`) clipped around the target word, snapping to word boundaries.
   - Pure JS `splitSnippet` tokenizes matching phrases so UI can highlight them without `dangerouslySetInnerHTML`.
2. **Search Dialog UI (`JumpBar.jsx`, `JumpBar.css`)**:
   - Shows active sources header indicator: `In: [Source 1] & [Source 2]`.
   - If a verse reference is detected (e.g. `Jn 3:16`), renders a dedicated Quick Jump card at top.
   - Displays match items with reference, source badge (`bible` vs `notes`), and snippet with bold highlights (`.search-highlight`).
   - Clicking a match navigates to the passage, highlights the verse in both panes, and closes the modal.
   - Fully accessible with keyboard navigation, cancellation via `AbortController`, and `Escape` support.

## 2026-10-05 — Spanish Matthew commentary (full) + notes rebuild

- `sources/matthew-commentary-en.txt` replaced with the Oct 5 version from Downloads (old copy in `sources/_backup/`).
- `sources/matthew-commentary-es.txt` is now a full Spanish translation of all 28 chapters (old ch. 1–5-only file in `sources/_backup/`).
  Conventions: "Mateo N:V:" headers, "***" highlight paragraphs kept 1:1, KJV quotes rendered with exact RVG wording and labeled (RVG),
  other translations (BSB, ESV, NKJV…) translated and kept with their label, « » quotes, Spanish book abbreviations.
  Verified: every English verse header has a Spanish counterpart in the same order, with matching paragraph/highlight counts.
- Rebuilt notes: `node scripts/build-notes.mjs sources/matthew-commentary-en.txt en MAT` (897 notes) and `... es MAT` (898 notes;
  the extra one is 22:24, which the English file spells "Matthes 22:24", so the English build folds it into 22:23).
- Bumped `NOTES_VERSION` 1 -> 2 in `src/data.js` so cached notes refresh.

## 2026-10-06 — Settings: "Clear saved data"

- New `clearAllAppData()` in `src/data.js`: clears the idb-keyval store, deletes any other IndexedDB databases
  (`indexedDB.databases()` where supported), empties Cache Storage, localStorage and sessionStorage.
- `SettingsModal.jsx`: new "Saved data / Datos guardados" section above the footer with a two-step confirm
  (warns that language, text size, font, default panes and last position reset too), then reloads the page.

## 2026-10-06 — Bilingual JumpBar, BookPicker, BookFilterChart

- All visible text, tooltips and aria-labels follow `app_lang` (local `T = { en, es }` tables, same pattern as SettingsModal).
- Book names shown via new `bookName(b, lang)` in `books.js` (title bar, quick-jump card, suggestions, search results, chart).
  Book grid uses `bookAbbr(b, lang)`: English keeps the USFM ids (GEN, EXO…); Spanish uses GÉN, ÉXO, … APO (full name in the tooltip).
- Spanish Strong's toggle reads "Gr" for the NT ("Heb" for the OT). Suggestions list the other language's name as the secondary label.

## 2026-10-06 — Full-width layout

- `src/index.css` `#root`: removed the Vite-starter `width: 1126px` centered column and its side borders; the app now spans
  the full viewport width. No component changes — panes, jump bar, Strong's/info panels already size to their container.

## 2026-10-06 — BSB with Strong's (bsb-strong)

- Built from the CrossWire SWORD module in Downloads/BSB (bsb-to-sword v2.0, 2026-05-10, CC0):
  `node scripts/build-sword-bible.mjs "C:/Users/saulo/Downloads/BSB" --out public/data/bibles/bsb-strong`
  -> 66 books, 31,102 verses, 377,402 Strong's-tagged tokens (Greek + Hebrew), no morphology in the source.
- Concordance: `node scripts/build-concordance.mjs public/data/bibles/bsb-strong public/data/concord/bsb-strong` (13,642 numbers).
- New PANE_OPTIONS entry `bsb-strong` ("BSB w/Strong (CT)", strongs: true, concord: "bsb-strong/"); plain `bsb` kept.

## 2026-10-06 — MSB with Strong's (msb-strong)

- New `scripts/build-msb-strong.mjs`: keeps the MSB text exactly, aligns each verse's words to the BSB w/Strong tokens
  (LCS diff on normalized words) and copies the Strong's number of every shared word; MSB-only words stay untagged.
  `node scripts/build-msb-strong.mjs` -> 31,102 verses (29,026 identical to BSB), 95.2% of words tagged;
  13 verses fully untagged (Majority-Text-only verses such as Mt 17:21, 18:11, 23:14, Mk 7:16, 9:44/46, 11:26, 15:28, Lk 23:17, Jn 5:4, Acts 28:29, Rom 16:24; Neh 7:68).
- Concordance: `node scripts/build-concordance.mjs public/data/bibles/msb-strong public/data/concord/msb-strong`.
- New PANE_OPTIONS entry `msb-strong` ("MSB w/Strong (MT)"); plain `msb` kept. Rebuild after updating msb or bsb-strong.

## 2026-10-06 — RV1909 c/Strong: morphology + Greek forms borrowed from the KJV

- New `scripts/add-morph-from-kjv.mjs <targetDir> [sourceDir]`: for each Strong's-tagged token, copies `m` and `g` from the
  KJV w/Strong token with the same Strong's number in the same verse (k-th occurrence -> k-th occurrence; falls back to
  the form when all KJV occurrences agree; otherwise leaves it). Writes in place, safe to re-run.
- `node scripts/add-morph-from-kjv.mjs public/data/bibles/rv1909-strong` -> NT: 104,226 of 125,417 tagged tokens (83%) now
  have m + g; OT: Strong's verb codes (TH…) on verbs, as in the KJV. Untouched: numbers the KJV doesn't tag in that verse
  (often the article G3588), 691 ambiguous tokens.
- Must be re-run after rebuilding rv1909-strong with build-sword-bible.mjs.
- Bumped DATA_VERSION 2 -> 3 so cached Bible chapters refresh.

## 2026-10-06 — m/g for BSB and MSB w/Strong; smarter matching

- `add-morph-from-kjv.mjs` now picks among several KJV forms of one Strong's number by: single/agreeing form -> same count
  on both sides (k-th -> k-th) -> closest relative position in the verse. Fixes cases where the target leaves one
  occurrence untagged (BSB Jn 3:16 "Him" now αυτον, not αυτου). Ambiguous leftovers: 16–23 tokens per Bible.
- Re-ran on rv1909-strong (NT 83.5% with g) and ran on bsb-strong (89.7%) and msb-strong (90.0%).
  Order after a rebuild: build-sword-bible (bsb) -> build-msb-strong -> add-morph-from-kjv on each.
- Copyright lines for bsb-strong / msb-strong credit the KJV2003 Project for the borrowed forms.

## 2026-10-06 — Authorship notice under the study notes

- `notes:en` / `notes:es` PANE_OPTIONS got a `copyright` line; NotesPane renders it after the last note with the same
  `.pane-copyright` style as the Bible panes (only when the chapter has notes).
- NotesPane's loading / error / "no notes yet" messages are now bilingual.

## 2026-10-06 — "About the Bible Translations" page written

- public/data/pages/translations.en.md and translations.es.md: history and notes for every Bible in the app (KJV, BSB/MSB, LSV, DRC, RV1909, RVG, Torres Amat, Straubinger), with verse examples checked against the app data and RV1960 wording checked on Blue Letter Bible.

## 2026-10-06 — Compare selected verses across translations

- SelectionBar: new "Compare / Comparar" button (only when the selection is in a Bible pane); labels now bilingual.
- New `src/components/CompareModal/` — lists the selected verses in every Bible: the source translation first ("current"),
  then the others in the same language, then the other language (dashed divider). Each block shows label + localized
  reference; verse numbers appear when several verses are selected; uses the reader's font/size settings.
- Clicking a block (App.jsx `pickFromCompare`): the pane the verses were selected in keeps its translation, the other pane
  switches to the picked one, the first selected verse is highlighted (both panes scroll to it), selection is cleared.

## 2026-10-06 — "Bible Manipulations" page + tables/quotes in info pages

- InfoPanel's Markdown subset now supports `> quote` blocks (.info-quote) and pipe tables (.info-table, horizontally scrollable).
- public/data/pages/manipulations.en.md / .es.md: report on doctrinally driven renderings (penance, priest/elder, Rock,
  Marian texts, Peter's wife, Mt 6:7, Eph 5:32, NWT "a god"/"Jehovah"/"other"/"in union with"/"obeisance"), with quotes
  checked against the app's Torres Amat, DRC, Straubinger, KJV, RVG, LSV and against jw.org for the NWT/TNM; final table of
  all references from the author's notes, corrections marked †.
- translations.*.md: Torres Amat bullet now also cites "primas hermanas" / "primo hermano" (Mt 13:56; Mk 6:3; Gal 1:19).

## 2026-10-06 — "Report a bug" page

- New menu entry `report` (pages.js, `form: true`) at the bottom of the hamburger menu; InfoPanel renders
  `components/InfoPanel/ReportBugForm.jsx` instead of a Markdown file for it.
- The form (problem type, description, up to 5 screenshots / 10 MB, optional reply email, auto-filled location:
  book chapter:verse + both panes, language, browser) posts multipart to FormSubmit (https://formsubmit.co/saulojedar@gmail.com)
  into a hidden iframe, so the static GitHub Pages app needs no backend. Honeypot `_honey` for spam; `_captcha=false`.
- First report triggers FormSubmit's one-time activation email; after activating, replace REPORT_ENDPOINT with the random
  alias FormSubmit provides to hide the address from the page source.

## 2026-10-06 — Pane picker restyle

- PaneSlot header: the translation/notes <select> is now a pill (bold, full-contrast text, border, hover/focus states) with a badge (EN / ES / Notes·Notas, notes in amber) and an SVG caret; native select kept for accessibility and mobile pickers. "Study notes" optgroup label follows app_lang. Old dim rule removed from SplitPanes.css.

## 2026-10-06 — Version numbers visible to users

- data.js exports VERSIONS {data, notes, lexicon}. Shown as a small footer in the hamburger menu ("Data v3 · Notes v2 · Lexicon v3", tooltip: clear saved data in Settings when they change) and appended to the notes authorship line ("Notes version: v2" / "Versión de las notas: v2").

## 2026-10-06 — Pane picker: content-width highlighted pill

- PaneSlot: visible `.pane-current` label sizes the pill to the selected name; the native <select> sits invisibly over the whole pill (still opens the list, keyboard/a11y intact). Pill is highlighted (light: #fff2c4 bg / #5a4300 text; dark: #3d3413 bg / #f3d27a text) with matching caret and badge colors; notes badge stays amber.

## 2026-10-06 — Installable app (PWA) + offline downloads

- public/manifest.webmanifest, icons (icon-192/512, maskable, apple-touch-icon), index.html links (uses %BASE_URL%).
- public/sw.js (registered only in production by src/offline.js): caches the app shell (index.html, hashed JS/CSS
  parsed from index.html at install, icons, info pages). Bible/notes/lexicon files are deliberately NOT handled by the SW —
  they live in IndexedDB (data.js). Bump SHELL_VERSION to drop old shells.
- src/offline.js: captures beforeinstallprompt (Install button; iOS gets "Share → Add to Home Screen" instructions),
  downloads whole packs into IndexedDB via data.js `storeOffline` (4 parallel requests, cancellable, progress events),
  records completed packs in localStorage `offline_status` keyed by data/notes/lexicon version ("outdated" after a bump).
  Strong's translations also pull all lexicon shards + their own concordance. Starter pack on first installed run /
  appinstalled: kjv-strong + notes:en (app_lang en) or rvg + notes:es (es).
- data.js: `SRC` key/url builders, `storeOffline`, `NOTES_BOOKS` (search.js now uses it — add books there when notes grow).
- Menu: "Download App" (pages.js id `offline`) -> components/InfoPanel/OfflinePanel.jsx (install section + per-translation
  status/download/update/cancel, "Download everything", storage used).
- Pane menus: "✓" after names that are fully downloaded; green check badge in the pill when the current one is.

## 2026-10-06 — ⓘ grammar help in the Strong's panel

- New src/morphGlossary.js: bilingual plain-language glossary (parts of speech, case, number, gender, person, tense, voice, mood, Robinson suffixes like PRI/NUI, Hebrew stems and forms, Kethiv/Qere, Textus Receptus, Strong's numbers) + explainMorph() that splits a code (N-PRI, V-2AAI-3S, TH8804) into its letters.
- StrongsPanel MorphBlock: circled "i" button next to the parsing code toggles MorphHelp: "How to read the code" (letter → meaning), "What it means" (definitions of the terms used), and "Show all terms" (full glossary).

## 2026-10-06 — "Deuterocanonical Books" page

- pages.js entry after Bible Manipulations; public/data/pages/deuterocanonical.en.md / .es.md: author's story, Hebrew canon / Josephus / NT usage, Fathers (Melito, Origen, Athanasius, Cyril, Rufinus; Augustine & Hippo/Carthage noted fairly), Damasus/Jerome and Jerome's prefaces + Letter 107, Gregory the Great, Glossa Ordinaria, Hugh of St Victor, Lyra, Ximenes, Cajetan, Leipzig 1519, Trent 1546 & 2 Macc 12 / purgatory, textual instability (Judith, Tobit recensions, Sirach, Vulgate vs modern Catholic texts), historical/theological errors, 1 Macc on the absence of prophets, 2 Macc author disclaimers and fantastic elements. Deuterocanonical quotes from the KJV 1611 Apocrypha (translated in the Spanish page).

## 2026-10-06 — Bibliography page + tier badges

- InfoPanel Markdown: a bullet starting with {top} / {low} / {worst} gets a highlighted row and a localized badge (gold for top tier; red for low/worst).
- public/data/pages/bibliography.en.md / .es.md: Bibles grouped by tradition/language (Oneness, KJV/TR, Majority, formal, dynamic, JW, Jewish, ecumenical, Orthodox, Catholic, original-language/interlinear, Korean; Spanish Protestant/JW/Catholic), books by subject (alphabetical by author), Spanish books, podcasts. Typos fixed (Boettner, Barrett, quinta, Matthew Henry, Tertullian, etc.).

## 2026-10-07 — Greek lexicon: Spanish definitions (def-es)

- All 5,523 Greek Strong's entries in public/data/strongs/greek/*.json now have a Spanish `def-es` translated from `def-en` (17 entries with no def-en were translated from the meaning in `deriv`). G/H cross-references and Greek forms kept as-is; Spanish proper names; a common Spanish gloss appended after ";" where helpful.
- Tooling in scripts/lex-es/: dump.mjs (list untranslated), apply.mjs (write a TSV batch into the shards), status.mjs; batches/b0001–b0027.tsv are the applied translations (re-runnable).
- LEXICON_VERSION bumped 3 → 4 in src/data.js so cached shards refresh.

## 2026-10-07 — Hebrew lexicon: Spanish definitions (def-es)

- All 8,674 Hebrew Strong's entries in public/data/strongs/hebrew/*.json now have a Spanish `def-es` translated from `def-en` (same conventions as the Greek: G/H cross-references and Hebrew forms kept, Spanish proper names, common Spanish gloss appended after ";"). Braced Aramaic duplicates like `{…}` kept braced.
- scripts/lex-es/{dump,apply,status}.mjs now take `LEX=hebrew` (default `greek`); Hebrew batches in scripts/lex-es/batches-hebrew/h0001–h0041.tsv.
- LEXICON_VERSION bumped 4 → 5 in src/data.js.

## 2026-10-07 — RV1909-Strong re-versified to match RVG

- rv1909-strong used the original RV1909 verse divisions (padded with empty verses), so verses were shifted vs RVG in 12 books: Num 12–13 & 29–30, Judg 14, 1 Sam 23–25, 2 Sam 20, 1 Kgs 22, 1 Chr 1 & 21, 2 Chr 33, Job 35 & 38–40, Hos 11–12, Jonah 1–2, Acts 19, 2 Cor 13.
- New scripts/versemap/remap.mjs aligns each book to RVG by text similarity and moves/splits/merges verses; when a verse is split, its `v` text and its `w` tokens are cut at the same word, so every Strong's/morph tag stays on its word (token totals verified unchanged per book). align.mjs is the read-only diagnostic. Originals in scripts/versemap/backup/.
- Result: every chapter has RVG's verse count, no empty verses, and a full re-run reports 0 remaining moves.
- Rebuilt public/data/concord/rv1909-strong; DATA_VERSION 3 → 4 and LEXICON_VERSION 5 → 6 so cached chapters and concordance refresh.

## 2026-10-07 — Strong's panel pushed off-screen in long chapters
- Cause: `.verse` uses `content-visibility: auto` + `contain-intrinsic-size: auto 60px`. Verses scrolled off-screen keep their last rendered width as their intrinsic size. `.pane` / `.panes` had no `min-width: 0`, so when the 320px Strong's panel docked, the panes could not shrink below that stale width and the panel overflowed to the right. Reproduced in Acts 2, Acts 7, John 6, Matt 5, Rom 8 (any chapter long enough to scroll); short chapters were unaffected.
- Fix: added `min-width: 0` to `.pane` (PaneSlot.css) and `.panes` (SplitPanes.css).

## 2026-10-07 — Strong's tagging for RVG (test: Matthew)
- New scripts/rvg-strong/transfer.mjs copies the `w` tokens from rv1909-strong onto RVG, word by word: in-order alignment (exact or similar spelling), moved words, reworded spans (magos → hombres sabios), and spelling changes learned from the book (Bethlehem → Belén). Each RVG token keeps `s`, `m`, `g`, `it` from its RV1909 token; the tokens' `t` joined with spaces always equals the RVG verse text.
- Matthew (rvg/40.json): 96% of words tagged. The 841 words that couldn't be placed (wording RVG added, e.g. "en el tiempo en que fueron expatriados") are plain `{ "t": … }` tokens with no `s`, listed by verse in scripts/rvg-strong/40-untagged.tsv for manual tagging. Original kept in scripts/rvg-strong/backup/40.json.
- data.js: RVG now has `strongs: true` and uses the rv1909-strong concordance (same versification). DATA_VERSION 4 → 5.
- Extended to the rest of the New Testament (rvg/41–66.json): 94–99% of words tagged per book; unplaced words for each book in scripts/rvg-strong/<book>-untagged.tsv; originals in scripts/rvg-strong/backup/. All 7,957 NT verses verified (tokens rejoin to the exact RVG text). DATA_VERSION 5 → 6.
- Extended to the Old Testament (rvg/1–39.json, Hebrew H-numbers): 95–99% of words tagged per book (Psalms 95.5%, Job 95.3%, most books ~97%). The whole RVG Bible is now tagged; all 31,102 verses verified. Unplaced words per book in scripts/rvg-strong/<book>-untagged.tsv; originals in scripts/rvg-strong/backup/. DATA_VERSION 6 → 7.

## 2026-10-07 — Strong's tagging for Straubinger (platense)
- Same script, `TARGET=platense node scripts/rvg-strong/transfer.mjs <book> --write`. Straubinger is an independent translation, so fewer words line up than with RVG: ~82–91% tagged in most books (NT 81–91%, Psalms 82%, Job 78%, Esther 57%, Daniel 63% — the last two because their Greek additions (Esther 10:4–16, Daniel 3:24–90, 13–14) have no Hebrew source and stay untagged).
- Chapters whose verse count differs from RV1909 (Catholic versification) are matched verse by verse on shared wording, also looking at the neighbouring chapters (Job 40/41 break differs). In those chapters the concordance (borrowed from rv1909-strong) can point to a neighbouring verse number.
- All 31,355 verses verified (tokens rejoin to the exact text). Originals in scripts/rvg-strong/backup-platense/; unplaced words in scripts/rvg-strong/untagged-platense/<book>-untagged.tsv. data.js: platense gets strongs:true + rv1909-strong concordance; DATA_VERSION 7 → 8.

## 2026-10-07 — Strong's tagging for LSV (from kjv-strong)
- `SOURCE=kjv-strong TARGET=lsv node scripts/rvg-strong/transfer.mjs <book> --write`. 86–94% of words tagged per book (3 John 80%: LSV has 15 verses vs KJV's 14). Words joined by an em dash ("spirit—because") are split into separate tokens, the second with `j: true` so no space is rendered.
- For English sources the "shared start" similarity needs 5 letters (4 for short words), so "everyone" no longer grabs "everlasting"'s tag. Spanish runs are unchanged.
- Psalm titles in LSV verse 1 ("A PSALM OF DAVID.") stay untagged (KJV has no title words there).
- All 31,104 verses verified. Originals in scripts/rvg-strong/backup-lsv/; unplaced words in scripts/rvg-strong/untagged-lsv/. data.js: lsv gets strongs:true + KJV concordance; DATA_VERSION 8 → 9.

## 2026-10-07 — Moved src/*.js into src/js/
- `git mv` of books, data, locales, morph, morphGlossary, offline, pages, search, settings, strongsCode (.js) into `src/js/`. Components (.jsx) and `src/hooks/` stay where they were.
- Imports updated: App.jsx / main.jsx → `./js/…`, components → `../../js/…`, hooks → `../js/…`, scripts (build-concordance, build-notes, build-sword-bible) → `../src/js/…`; path mentions in script comments, README.md and index.html updated too. The files' imports of each other (`./data.js` etc.) are unchanged since they moved together.
- Checked: all 82 relative imports in src/ and scripts/ resolve, and the app + the three scripts bundle cleanly with esbuild. (Earlier AI-LOG entries above still say `src/data.js` etc. — that's where the files were at the time.)

## 2026-10-07 — Hebrew parsing codes (OSHB) for hand-added tags; Gen 3:15 "it"
- src/js/morph.js: `decodeMorph` now also reads Open Scriptures Hebrew Bible codes in a token's `m` (e.g. `HPp3ms` = personal pronoun, 3rd person, masculine, singular; `HVqi3ms/Sp2ms` = Qal imperfect 3ms + suffix 2ms). Covers verbs (stem, form, person/gender/number), pronouns, suffixes, nouns, adjectives, particles, prepositions. Detected by `isOshb()`, so Greek codes (ADV, ARAM, N-NSF…) and TH#### codes decode as before.
- src/js/morphGlossary.js: the ⓘ help splits OSHB codes letter by letter and explains Hebrew gender (no neuter: הוּא he/it vs הִיא she/it), common gender, dual, construct state, the Masoretic Text and the code itself (EN/ES).
- StrongsPanel: a Hebrew word in `g` is labelled "Masoretic Text" (right-to-left) instead of "Textus Receptus".
- kjv-strong/1.json Gen 3:15: `{ "t": "it", "s": "H1931", "m": "HPp3ms", "g": "הוּא" }`. DATA_VERSION 9 → 10.
- Same tag (`"s": "H1931", "m": "HPp3ms", "g": "הוּא"`) on the word translating הוּא in Gen 3:15 of bsb-strong and msb-strong ("He"), lsv ("He bruises" split into "He" + "bruises", the verb keeping H7779/TH8799), rv1909-strong ("ésta") and rvg ("Él", previously untagged). Text of every verse unchanged; originals in scripts/rvg-strong/backup-gen3-15/. DATA_VERSION 10 → 11.
- Also platense (Straubinger) Gen 3:15 "este" (already H1931) gets `"m": "HPp3ms", "g": "הוּא"`. DATA_VERSION 11 → 12.

## 2026-10-07 — kjv-strong Old Testament: Hebrew parsing from the Open Scriptures Hebrew Bible
- Source: OSHB (morphhb, commit 3d15126, 2024-08-27), copied to sources/oshb/ (wlc/*.xml + VerseMap.xml, LICENSE.md: CC BY 4.0). Attribution added to the kjv-strong copyright line in data.js.
- New scripts/oshb/apply-oshb.mjs `<bible> <book|all> [--write] [--report]`: for each verse (WLC↔KJV numbering via VerseMap.xml, e.g. Mal 4:5 = WLC 3:23, Psalm titles), each token with an H-number is matched to the OSHB word with that Strong's number (in order; qere before ketiv; a KJV word split over two tokens reuses the same Hebrew word). Five numbering differences learned automatically (H582=376 "men", H7125=7122, H3169=2396, H1941=1940, H6145=5892). Sets `m` to the OSHB code (replacing TH####) and `g` to the Hebrew word (vowels, no accents).
- Result: 226,166 of 226,774 Hebrew-tagged tokens parsed (99.7%); 608 unmatched (listed in scripts/oshb/kjv-strong-report.txt; 214 of them keep their TH#### code). Text, tokens, Strong's numbers unchanged (verified against scripts/oshb/backup-kjv-strong/).
- File layout kept per file: compact files stay compact; Genesis and Job (Prettier layout, CRLF) are written the same way — one token per line, wrapped one key per line past 80 columns — and the script refuses to write a pretty file whose layout it can't reproduce.
- morph.js: the main word of an OSHB code is the last non-suffix morpheme ("HC/Vqw3ms" → Verb … with conjunction; Aramaic "ANcmsd/Td" → Noun … with definite article); Aramaic verb stems (Peal, Haphel, …) and the "x" placeholder from the official code list (sources/oshb… parsing/HebrewMorphologyCodes.html in morphhb). DATA_VERSION 12 → 13.
- Applied to the other tagged Bibles' Old Testaments (folders renamed by the user meanwhile to lsv-strong, rvg-strong, straubinger-strong): parsed share of Hebrew-tagged tokens — kjv-strong 99.7%, bsb-strong 99.2%, msb-strong 99.3%, lsv-strong 95.0%, rv1909-strong 96.3%, rvg-strong 95.9%, straubinger-strong 93.9%. Reports per Bible in scripts/oshb/<bible>-report.txt; originals in scripts/oshb/backup-<bible>/. OSHB attribution added to each copyright line (Spanish for the Spanish Bibles). DATA_VERSION 13 → 14.
- Matching rules refined (kjv-strong re-run from its backup with them): Strong's equivalences are learned from kjv-strong only (Spanish tags produced nonsense pairs); when a number occurs a different number of times in the verse and in the Hebrew, tokens and words are paired by closest position; a leftover token may reuse a nearby token's Hebrew word — KJV up to 8 tokens either way ("made … to grow"), others only from the token just before (≤2), or a bare function word from the word just after ("the|H3556 stars|H3556"). So in Spanish Gen 3:15 only "ésta"/"Él"/"este" get הוּא, and "ti", "tu", "te", "suya", "le" (suffixes mis-tagged with pronoun numbers) stay unparsed. Name parts with the same number are joined (Isa 7:14 עִמָּנוּ אֵל).
- Straubinger: in its 55 chapters numbered differently from the KJV, each verse uses the nearby KJV verse whose Hebrew words best match its Strong's numbers. Its Greek additions (Esther 10:4–16, Daniel 3:24–90, 13–14) have no Hebrew and stay unparsed.

## 2026-10-07 — Hebrew "Meanings (outline)" in Spanish
- Every Hebrew lexicon entry's `outline` now has a parallel `outline-es` list (same length, same numbering "1a2)…"): 24,841 lines in 8,674 entries, 100%. Translated in 12 chunks following scripts/lex-es/GUIDE-outline.md (stems like (Qal) kept, Reina-Valera vocabulary and names, `n pr m` → "nombre propio masculino", Bible/Strong's refs unchanged); the batches are in scripts/lex-es/batches-outline/chunk01–12.tsv.
- Scripts: scripts/lex-es/outline-dump.mjs (lines still missing → TSV "H<n>#<i>\t…"), outline-apply.mjs (TSV → outline-es, saved immediately), outline-status.mjs (progress). Lexicon backup before the change: scripts/lex-es/backup-hebrew/.
- StrongsPanel shows `outline-es` when the app is in Spanish, line by line, falling back to the English line if one is missing. LEXICON_VERSION 6 → 7 so cached lexicon shards refresh.
- Still English: `deriv` (word origin) and `kjv` (the KJV's own English renderings — not meant to be translated).

## 2026-10-08 — Bibliography (ES) synced with the new English page
- bibliography.es.md rewritten to match bibliography.en.md section by section: new intro and Matthew 11:25 (quoted from the app's RVG), the five ratings {top} {good} {average} {bad} {terrible} (old {low}/{worst} gone), every item with the same rating and order, new items (Chalfant, Duranno, LBLA, TLA, Dios Habla Hoy, Biblia Latinoamericana…). Titles stay in their original language; Church Fathers and Thomas More/Alphonsus Liguori use their Spanish names.
- bibliography.en.md typos fixed (CRLF kept): "Claims … is" → "Claiming … is", "seminareans" → "seminarians", "an organization that leaving it" → "an organization so fully that leaving it", "wide enough to swim in it" → "deep enough to swim in", "In this page" → "On this page", "Willian" → "William" (and " - " → " — "), "Latinoameriana" → "Latinoamericana", "Traducción de Lenguaje Actual" → "Traducción en Lenguaje Actual", Mat → Matthew; The Shack ({average}) moved above Deconstruction ({bad}) to keep the rating order.
- InfoPanel inline Markdown now also reads _italic_ (underscores at word edges only), since the bibliography uses _Title_.
- Featured verse style for info pages: a `>` quote whose last line starts with "— " (e.g. `> — Matthew 11:25 (KJV)`) renders as `.info-quote.verse` — serif reading font, gold left bar and soft gold background, a large opening quotation mark, and the reference on its own line, right-aligned and small. Other `>` quotes are unchanged. Matthew 11:25 on both Bibliography pages now uses it (text without quote marks, reference on the second line).
- InfoPanel inline Markdown: bold and italic text is parsed again inside, so `**_metanoeō_**` (manipulations pages) renders bold italic instead of showing the underscores.

## 2026-10-09 — Verse arrows in the top pane header
- PaneSlot: new optional `onVerseStep` prop; when given (top pane only) the header shows ▲ on the far left (previous verse) and ▼ on the far right (next verse), picker centred between them (`.pane-head.has-verse-nav`, `.verse-step` in PaneSlot.css).
- App.jsx `stepVerse(delta)`: moves `refPos.verse`, which both panes already highlight and scroll to. With no verse highlighted, ▼ starts at verse 1 and ▲ at the last verse. Past the last verse → next chapter (or next book) verse 1; before verse 1 → previous chapter's last verse. The verse count comes from whichever pane shows a Bible (KJV if both are notes).
- Offline marker in the pane menus changed from "✓" to "⬇︎" (and the green header badge now holds a download-arrow icon): phones draw their own checkmark next to the selected option of a native dropdown, so the two checks looked alike. Download App intro text updated to match.
- Verse arrows added to the bottom pane header too (same stepVerse; both headers move the highlight in both panes).

## 2026-10-09 — RVO (Reina-Valera-Ojeda) text revision
- public/data/bibles/rvo-strong is rebuilt from the untouched RV1909-strong copy in scripts/rvo/backup-original by `python3 scripts/rvo/transform.py` (rerunnable; edit the rules or scripts/rvo/name_map.json and run again). Edits are made on the Strong's tokens (`w`) and each verse's text (`v`) is rebuilt from them, so the two stay identical; Strong's numbers are unchanged (verified). File layouts kept (compact / 2-space / tab).
- Rules, in order: names modernised (1,307 spellings matched to RVG by Strong's number in the same verse, e.g. Achâz → Acaz, Jessé → Isaí; "Adam" the city in Jos 3:16 kept); Jehová → YHWH; JAH → YAH; Dios/Señor where the 1909 renders H3068/H3069 → YHWH; lone á/é/ó/ú → a/e/o/u; enclitic pronouns detached from past/imperfect/future verbs (levantóse → se levantó; commands, infinitives, gerunds and present tense left alone); obsolete accents (fué, dió, vió, destruído…); mas/empero → pero (empero moved to the front of its clause); simiente → descendencia/semilla; heredad → herencia/posesión/propiedad by Strong's; mancebo/mozo → joven/siervo (following RVG); doncella → joven; presto → pronto/dispuesto; haz (face) → faz; henchir → llenar; criar → crear where Strong's means "create"; heme aquí → aquí estoy; vianda → comida; loor → alabanza; galardón → recompensa (with article agreement); aqueste → este; estotro → este otro; asaz → muy; ánima → alma; acicalador → forjador; parió a su hijo → dio a luz a su hijo; y/e agreement fixed afterwards.
- Review files in scripts/rvo/changes/: cambios-por-palabra.csv (every change with reference, rule, Strong's, notes — 344 "mas → pero" flagged "¿sino?"), cambios-por-versiculo.csv (each changed verse, RV1909 vs RVO), resumen.csv (counts per rule and word).
- Not changed yet: future subjunctive (hubiere, hiciere…), present-tense enclitics (dícele, hácese), tornar, vosotros, ~240 old name spellings RVG had no match for (Esther, Ruth, Hetheo, Pherezeo…).
- Concordance built for rvo-strong (public/data/concord/rvo-strong) with scripts/build-concordance.mjs.
- Added: parir → dar a luz in every tense (parió → dio a luz, paría → daba a luz, parido → dado a luz, pare → da a luz, parirá → dará a luz…; 201 places). "pare/paren/pares" meaning "stop" (ni pares, no te pares, pare mientes, se paren) and the adjective "parida(s)" are left as they are.
- Added: ALL-CAPS words (chapter openings, inscriptions) written in normal case — first word of a sentence or inscription capitalised, names keep their capital, other words lowercase, accents restored (JESUS → Jesús, JUDIOS → Judíos). Only YHWH and YAH stay in capitals. 1,285 words.
- parir kept for animals (Gén 30:39, 31:8; Job 21:10, 39:1; Jer 14:5; Ez 31:6 — PARIR_ANIMALS in transform.py).
- "que declarado es" / "que es interpretado" (Greek methermēneuō: Mt 1:23; Mr 15:22, 34; Jn 1:38, 41; Hch 4:36) → "traducido".
- Manual edits: scripts/rvo/ediciones-manuales.json ("Libro c:v": {"texto actual": "texto nuevo"}), applied last on every run; reordered words keep their Strong's tokens. First one: Mt 1:23 "Con nosotros Dios." → "Dios con nosotros."

## 2026-10-09 — New page: "Who gave us the Bible?"
- src/js/pages.js: new entry `who-gave-us-the-bible` ("Who gave us the Bible?" / "¿Quién nos dio la Biblia?") right below Deuterocanonical Books.
- public/data/pages/who-gave-us-the-bible.en.md (KJV quotations) and .es.md (RVG quotations; Fathers, councils and popes translated from their standard English editions). Sections: the claim (Rome 382 / Hippo / Carthage); Jesus and the apostles on the OT as God speaking; NT cited as Scripture inside the NT (1 Tim 5:18 + Luke 10:7, 2 Pet 3:15-16, 1 Cor 14:37, 1 Thess 5:27, Col 4:16…); the Fathers before 382 (Clement, Ignatius, Polycarp, Barnabas, 2 Clement, Justin, Irenaeus, table to Athanasius 367); recognized not created (the Jesus analogy); Rome's list vs today's Catholic Bible (Decretum Gelasianum: no Baruch, "John the elder", two books of Esdras; Trent and the Vulgate; Sixtine/Clementine/Nova Vulgata; Gen 3:15 and 1 John 5:7 shown from Douay, Torres Amat and Straubinger in the app); Latin and the fall of the West (Tours 813); restrictions (Gregory VII 1080 … Syllabus 1864); martyrs (Wycliffe, Tyndale, Hus, the Spanish translators of the Reina-Valera); literacy; alphabets created for Bible translation (Wycliffe Global Alliance 2024 figures); objections.
- Build not run here (node_modules has Windows-only binaries); pages.js imports fine.

## 2026-10-10 — New page: "Image veneration"
- src/js/pages.js: new entry `image-veneration` ("Image veneration" / "Veneración de imágenes") right below "Who gave us the Bible?".
- public/data/pages/image-veneration.en.md (KJV; Wisdom from the 1611 KJV Apocrypha) and .es.md (RVG; Wisdom, Fathers, councils and popes translated from their standard English editions). Built from the author's draft notes (sources: Ortlund, What It Means to Be Protestant; Price, Acts of Nicaea II). Sections: majority is not proof; OT (Ex 20:5 LXX proskyneō/latreuō, golden calf, Jeroboam, cherubim/bronze serpent); Wisdom 13–15 (father and king, 14:15-21); NT; ante-Nicene Fathers (Irenaeus on the Carpocratians, Justin, Minucius Felix, Clement, Tertullian, Origen, Arnobius, Elvira, Lactantius) with table; Constantine to Gregory the Great; iconoclasm and Nicaea II (Irene, Tarasios, Hieria, anathemas, legends); Western rejection (Libri Carolini, Frankfurt, Paris); later development (Aquinas, Trent); "ecumenical" is selective; objections.
- Corrections to the draft: usury = interest on loans (not simony); Leo XIII condemned slavery (1866 Holy Office instruction used instead); 1917 Code forbade, not ended, joint worship; Constantine V reigned 741–775; Irene blinded Constantine VI in 797; the Origen phrase "rejected all images and statues" was not found in Against Celsus and was replaced by 7.64; Elvira canon 36 translated literally; Psalm references given in both Hebrew and Douay numbering.

## 2026-10-10 — New page: "Development of the Trinity"
- src/js/pages.js: new entry `trinity-development` ("Development of the Trinity" / "Desarrollo de la Trinidad") right below "Image veneration".
- public/data/pages/trinity-development.en.md (KJV) and .es.md (RVG; Fathers, councils and scholars translated from standard English editions). Sections: the modern definition (Westminster 2.3) as a 7-point yardstick; Greek philosophy and the nameless God (Homer allegory, Plato, Middle Platonists, Philo, LXX Lev 24:16 / Ex 3:14); the apologists as philosophers (Justin First Apology 61, Second Apology 6); the Fathers one by one with a comparison table (Clement, Ignatius, Didache, Hermas, Justin, Theophilus, Athenagoras, Tatian, Irenaeus, Hippolytus + Zephyrinus, Tertullian, Origen, Novatian, Dionysius, Antioch 268); fourth century (Nicaea, rival councils, Cappadocians, Thessalonica 380, Constantinople 381, Priscillian, Augustine); filioque (Toledo III 589 → 1014 → Florence) with timeline; the Name (the author's post: Jesus = YHWH saves, inherited name, everything in Jesus' name, baptism, Spirit of Jesus); objections.
- Corrections to the draft: Homer dated 8th–7th c. B.C.; Plotinus (3rd c. A.D.) came after Justin, so Justin's background is Middle Platonism and Philo; Deut 32:8 dropped from the LXX "manipulation" list (the Dead Sea Scrolls support the LXX there) and early LXX papyri that kept YHWH in Hebrew letters noted; Tertullian's "majority" quote given exactly (the simple majority "maintain the Monarchy"); Priscillian's formal charge was sorcery.

## 2026-10-10 — New page: "Questions for Trinitarians"
- src/js/pages.js: new entry `trinitarian-questions` ("Questions for Trinitarians" / "Preguntas para trinitarios") right below "Development of the Trinity".
- public/data/pages/trinitarian-questions.en.md / .es.md: 95 questions in 9 sections (the Name and baptism; what "God" means — John 1:1, 1 Tim 2:5, John 4:24, 1 Cor 8:6, Acts 20:28, Heb 1:3, Gen 1:26-27…; co-equal?; throne and kingdom; one Spirit; the Father in the Son; YHWH titles of Jesus; who does it?; the begotten Son), from the author's list of 79 (typos fixed, duplicates merged, new questions added).
- Every cited verse is quoted under its question, generated from the app's own Bible files: KJV (EN) / RVG (ES) by default; BSB where the point needs the critical-text reading (Acts 16:7 "Spirit of Jesus", Jude 5 "Jesus"); MSB where it needs the Majority Text reading (John 14:14 "ask Me", John 17:11 "the name you gave Me", Rev 14:1 "His name and His Father's name"). Spanish versions of those five BSB/MSB verses are our translation.
- Generator: tmp-check/qgen/build_questions.py with the source text in tmp-check/qgen/questions.txt (`python3 tmp-check/qgen/build_questions.py tmp-check/qgen/questions.txt bible-app` from C:/dev/bible-app). Edit questions.txt and rerun rather than editing the .md files by hand.
- Fixes to the draft: Matt 24:36 replaced by Mark 13:32 (the KJV/TR of Matt 24:36 lacks "neither the Son"); the Spirit's procession is from Constantinople 381, not Nicaea 325; "First and Last" and "Comforter" duplicates merged.

## 2026-10-10 — New page: "The One True Church"
- src/js/pages.js: new entry `one-true-church` ("The One True Church" / "La única iglesia verdadera") right below "Who gave us the Bible?".
- public/data/pages/one-true-church.en.md (KJV) / .es.md (RVG), from the author's post on 1 Tim 3:15: how the claim was used (Canossa 1077, interdicts on France 1200 and England 1208–1214, Unam Sanctam 1302); 1 Tim 3:14-16 in context (the pillar holds up the truth, John 17:17); ekklesia and Tyndale; the church in Acts (baptism, receiving the Holy Ghost, worship and singing, spiritual sacrifices vs. Heb 10, Lord's Supper, prayer, elders/deacons, Acts 15, idols and Acts 19, money, forgiveness, saints, Scripture); side-by-side table Acts vs. modern Catholicism with Catechism (CCC) numbers; Matt 16:18 (Augustine, Retractations 1.21); freedom; how to recognize the true church.
- Verse quotations were filled in from the app's Bibles by tmp-check/qgen/fill_quotes.py from the templates one-true-church.{en,es}.tpl (one-off). The .md files are now ordinary pages: edit them by hand.
- Draft adjusted: Tyndale was attacked by Thomas More for "congregation" (and "elder", "repent") and later burned for heresy — not burned for that word alone.

## 2026-10-10 — New page: "First Bishops of Rome"
- src/js/pages.js: new entry `first-bishops-of-rome` ("First Bishops of Rome" / "Los primeros obispos de Roma") right below "The One True Church".
- public/data/pages/first-bishops-of-rome.en.md (KJV) / .es.md (RVG), from the author's post on the first 16 names on the papal list: not popes (Rome led by elders — 1 Clement, Ignatius' Romans, Hermas Vis. 2.4.3; Anicetus/Polycarp; Victor rebuked; "pope" title 1075); each bishop from Peter to Callistus; Hermas (Pius' brother) Sim. 5.6.5 and 9.1.1; Zephyrinus' confessions and Callistus' teaching quoted from Hippolytus, Refutation 9.6-9.7 (incl. the long Callistus passage and "You are Ditheists"); Hippolytus as the first antipope (comparison table); Tertullian, Against Praxeas 1 and 3; Nicaea's homoousian minority; Eustathius, Marcellus (received by Julius of Rome 340-341, Serdica "one hypostasis"), Photinus, Constantinople 381 canon 1; Theodosian Code 16.1.2, 16.4.2.
- Verses filled by tmp-check/qgen/fill_quotes.py from first-bishops-of-rome.{en,es}.tpl (one-off); the .md files are ordinary hand-edited pages.
- Corrections to the draft: Theodotus (excommunicated by Victor) was an adoptionist who said Jesus was a mere man — the opposite of Oneness; Praxeas persuaded the bishop of Rome to withdraw recognition of the Montanist prophets (not to "reject trinitarians"); 1 Pet 3:8 → 3:18; the Hippolytus quotes the draft paraphrased were replaced with the exact ANF text; the 380 edict did not itself ban discussion — that is the 388 law (CTh 16.4.2); "Trinitarians a minority at Nicaea" stated as "the homoousian party was a minority; the majority were Origenist subordinationists".

## 2026-10-10 — New page: "Baptism"
- src/js/pages.js: new entry `baptism` ("Baptism" / "El bautismo") right below "Questions for Trinitarians".
- public/data/pages/baptism.en.md (KJV) / .es.md (RVG), based on the Apostolic Study Bible note (pp. 1653–1654): the five Jesus-name baptisms in Acts and the allusions in the letters; James 2:7 (Greek, NRSV, AMPC); Matt 28:19 and the one name (Isa 9:6); everything done in Jesus' name (prayer, preaching, healing, tongues, thanks, word and deed…); immersion (baptizo, Naaman, mikveh, proselyte immersion, Barnabas 11, Hermas Sim. 9.16, Ferguson); early Jesus-name baptism (Hermas Vis. 3.7.3, Didache 9.5 vs 7 and its single 1056 manuscript, Thecla 34, Acts of Peter 5, Stephen via Firmilian 18, Cyprian Ep. 72[73].16-18, Treatise on Rebaptism 3-15); Apostolic Canon 50, Constantinople 381 canon 7 / Trullo 95, Pelagius I; Ambrose, Nicholas I, Lombard, Aquinas III q.66 a.6, Catholic Encyclopedia, Luther; triple immersion, infant baptism (Tertullian, Ferguson's emergency-baptism thesis), clinical baptism, pouring from the 13th c. (Catholic Encyclopedia, Aquinas q.66 a.7, Calvin 4.15.19).
- Verses filled by tmp-check/qgen/fill_quotes.py from baptism.{en,es}.tpl (one-off); the .md files are ordinary hand-edited pages.
- Not included from the draft request (could not be verified): a Zwingli quotation, and a 13th-c. council date for pouring; the Acts of Peter is described as giving the threefold formula and then calling it baptism "in thy name" (to Jesus Christ), which is what the text says; the "Jewish name" point is presented as a question, not a documented fact.
- Added afterwards: Zwingli on Matt 28:19 (Von dem Touff…, 1525, Z IV 236–237), verified in the Zurich critical edition (irg.uzh.ch zwingli-werke, Werk 56) and translated from the Swiss German, in section 6 and the sources of both baptism pages.

## 2026-10-10 — New page: "Matthew 16:18"
- src/js/pages.js: new entry `matthew-16-18` ("Matthew 16:18" / "Mateo 16:18") right below "Image veneration".
- public/data/pages/matthew-16-18.en.md (KJV) / .es.md (RVG), following William Webster, The Matthew 16 Controversy (1996): Vatican I's claim (Pastor Aeternus 1); the text (Petros/petra, Christ the foundation, all apostles, keys to all, "Get thee behind me"); the Fathers grouped by reading — confession (Hilary, Ambrose, Chrysostom, Cyril), Christ (Augustine Tract. John 124.5, Retractations 1.21; Jerome), all apostles/believers (Origen, Jerome Adv. Jov. 1.26), Peter but not papacy (Tertullian De pudicitia 21, Cyprian Unity 4 + 7th Council of Carthage, Firmilian); Gregory the Great Letters 7.33; Nicaea c. 6, Constantinople c. 3, Chalcedon c. 28; Launoy's count (44/17/16/8) via Archbishop Kenrick's undelivered Vatican I speech; "unanimous consent of the Fathers" (Trent, Vatican I, 1564 profession) vs. reality; CCC 424 and 881.
- Correction to the draft: the surveyor was Jean de Launoy (1603–1678), not "Jean Morris (1591–1659)".
- Verses filled by tmp-check/qgen/fill_quotes.py (one-off); the .md files are ordinary hand-edited pages.

## 2026-10-11 — New page: "Church History"
- src/js/pages.js: new entry `church-history` ("Church History" / "Historia de la Iglesia") right below "Matthew 16:18".
- public/data/pages/church-history.en.md / .es.md, from the author's Spanish timeline: sacraments table (when each appeared / was defined); background (332 B.C.–4 B.C.); apostolic church; 100–312; 312–600; 600–1050 with the 9th-c. Eucharistic controversy (Paschasius c. 831, Ratramnus c. 843, Augustine on John 6, Berengar 1059) and the 10th-c. papacy (Cadaver Synod, Marozia, John XII, Benedict IX); 1050–1300 with Lateran IV (Nov 11–30, 1215; canons 1, 3, 21, 67–70), host-desecration accusations (Beelitz 1243 … Knoblauch 1510), elevation/Corpus Christi; 1300–1563; modern dogmas; popes contradicting popes; relics.
- Corrections to the draft (dates/facts): James son of Zebedee c. 44; Dionysius Exiguus made A.D. dating, not the Gregorian calendar; Bar Kokhba 132–135 (Hadrian); sign of the cross and prayers for the dead c. 200; Constantine made Sunday a civil rest day (Christians already met on Sunday); Nicaea did not define the Spirit's procession; Siricius (not "Sirius") 385; Western empire fell 476, not 395; Leo I did not take "Pontifex Maximus" (title used by popes from the 15th c.); Damasus did not declare the Vulgate infallible; Pantheon 609; John 21 (not Luke 21); Gregory VI (not V) bought the papacy from Benedict IX; first papal canonization 993; Canossa was over investiture, not a massacre; First (not second) Crusade 1095; inquisition begun at Verona 1184 (papal 1231, torture 1252); Lateran IV did not "establish the Mass" (no bleeding-bread report); purgatory defined at Lyons II 1274 before Florence; 95 (not 99) theses, people spoke German (not Greek); 1525–27 drowning of Anabaptists was Protestant Zurich; the "white is black" quote is Ignatius of Loyola (1548), not Liguori; Immaculate Conception by Pius IX (not X); Morin → Launoy; first Spanish Catholic Bible from the originals was Nácar-Colunga 1944 (not the Jerusalem Bible 1967) — omitted rather than stated.
- Left out as undocumented legends or rumours: Pope Joan; Pius IX fathering a child; Gregory XVI and his barber's wife; Alexander VI incest with his sisters; "300 mothers"; Peter the Hermit inventing the rosary; fixed dates for candles (320), holy water (850), Friday fast (998), money for Masses (1100); Innocent III's "85 interdicts"; Pius XII numbering; Mexico literacy figure; Pendergast.
- Verses filled by tmp-check/qgen/fill_quotes.py (one-off); the .md files are ordinary hand-edited pages.

## 2026-10-11 — Scrollable page menu; "Download App" moved to Settings
- MainMenu.css: `.menu-dropdown` gets `max-height: calc(100dvh - 80px)` (100vh fallback), `overflow-y: auto`, `overscroll-behavior: contain`, so the long list of pages scrolls inside the dropdown on phones.
- pages.js: the `offline` entry gets `hidden: true`; MainMenu.jsx lists only pages without `hidden`. InfoPanel still finds the page by id, so OfflinePanel is unchanged.
- SettingsModal.jsx/.css: new optional `onOpenDownload` prop; a "Download App" / "Descargar la aplicación" button with a short hint under "Clear saved data" (`.settings-download`, `.settings-download-btn`).
- App.jsx: passes `onOpenDownload` → closes Settings, clears the Strong's selection, opens the `offline` info page.
- Checked: the four changed JS/JSX files parse (@babel/parser from node_modules). Build not run here (node_modules has Windows-only esbuild binaries).

## 2026-10-11 — Church History: One-God entries and the confessional booth
- church-history.en.md / .es.md (edited in place by tmp-check/qgen/ch_insert.py, one-off): entries tagged **[One God]** / **[Un solo Dios]** — Noetus/Praxeas/Sabellius/Zephyrinus/Callistus (c. 190–220), Commodian (c. 250), Pentapolis and the two Dionysii (c. 257–262), Marcellus/Julius/Serdica/Photinus (336–351), Apostolic Canon 50 (c. 380), Constantinople 381 canon 1, Leo's Letter 15 (447), Pelagius I (DH 445), Braga I (561, DH 451), Trullo canon 95 (692), Nicholas I (866), Servetus (1531, 1553), Wightman (1612), Swedenborg (1771), Arroyo Seco / Ewart / AG 1916 (1913–1916), UPC (1945); plus solicitation in confession (Pius IV 1561, Gregory XV 1622, Benedict XIV 1741) and the confessional booth (Borromeo, Milan 1565–1577; Roman Ritual 1614). An intro line explains the tag.

## 2026-10-11 — Info pages: Evidence of a Creator, Evidence for Jesus

- Added public/data/pages/evidence-creator.en.md / .es.md and evidence-jesus.en.md / .es.md (generated from tmp-check/qgen/*.tpl with fill_quotes.py; verses from KJV / RVG).
- Registered both in src/js/pages.js right after "baptism".
- Corrections to the user's source essay: DNA end to end reaches the Sun and back "hundreds of times" (not 600); ~30 trillion human cells (not 50 trillion); P52 dating stated cautiously (c. 100–150, debated); apostles' martyrdoms presented as early tradition, not all documented; the "more time" argument framed as decay/entropy; Qur'an honours Jesus' miracles but denies the crucifixion (4:157).

## 2026-10-11 — Info pages follow the Settings text size

- src/components/InfoPanel/InfoPanel.css: the info-page title, body text, headings, featured verse quotes (and their citation) and tables now use calc(<size> * var(--reading-scale, 1)), the same variable that scales the Bible panes. The report form and offline panel are unchanged.
- Follow-up: the Report a bug form and the offline download page (OfflinePanel) font sizes in InfoPanel.css now also scale with --reading-scale.
- Follow-up (user request): reverted the offline download page (.offline-*) font sizes to fixed px; only info pages and the Report a bug form scale.

## 2026-10-11 — RVO: Matthew 1 colons → semicolons

- scripts/rvo/ediciones-manuales.json: manual edits for Mateo 1:2-10, 12-15, 17, 18, 20, 25 changing ":" to ";" (1:22 and 1:23 keep their colons, as requested). Reran `python3 scripts/rvo/transform.py`: only public/data/bibles/rvo-strong/40.json changed (17 verses of Mt 1; text and Strong's tokens; Strong's numbers verified unchanged), plus the regenerated review CSVs in scripts/rvo/changes/.
- Follow-up (user request): Mateo 1:18 («fue así:») and 1:20 («diciendo:») keep their colons; their manual edits were removed and transform.py rerun.

## 2026-10-11 — Strong's fix: "Pedro" tagged G1565 instead of G4074

- The Spanish Strong's sources tagged every "Pedro" as G1565 (ekeinos, "that one") instead of G4074 (Petros); e.g. Mt 16:18 "tú eres Pedro" showed G1565.
- New rerunnable script scripts/fix-strongs.py retags those tokens (and one "Cefas" G1565 -> G2786 in Straubinger) in rvg-strong, rv1909-strong, straubinger-strong and scripts/rvo/backup-original; rvo-strong regenerated with scripts/rvo/transform.py. 777 tokens changed in Matthew, Mark, Luke, John, Acts, Galatians and 2 Peter; verified against HEAD that only Strong's numbers changed (no text, morphology or structure).
- Concordances rebuilt: public/data/concord/rv1909-strong and rvo-strong (node scripts/build-concordance.mjs).
- If any of these Bibles is rebuilt from its sources, run scripts/fix-strongs.py again afterwards.
- Follow-up: Mt 16:18 "y" after "Pedro," retagged G1161 -> G2532 (kai) in all four Spanish tagged Bibles (VERSE_FIXES in scripts/fix-strongs.py); rvo-strong and both concordances regenerated.

## 2026-10-11 — KJV concordance rebuilt; cache versions bumped

- The user's hand fix of Ex 32:4 (kjv-strong "These" -> H428) was not in the KJV concordance: rebuilt public/data/concord/{greek,hebrew} with `node scripts/build-concordance.mjs public/data/bibles/kjv-strong`. The BSB, MSB, RV1909 and RVO concordances already had it.
- src/js/data.js: DATA_VERSION 14 -> 15 (Bible chapters changed: RVO Mt 1, Pedro/G4074 and Mt 16:18 retags) and LEXICON_VERSION 7 -> 8 (concordances rebuilt), so browsers and offline downloads fetch the new data instead of their cached copies.

## 2026-10-11 — README rewritten

- README.md replaced the original step-1 setup notes (outdated: Vite scaffolding, old folder names) with current instructions: everyday commands and publishing (push to main -> GitHub Pages), where things live, the list of Bibles and which concordance each uses, hand-editing text and Strong's tags (v/w must match), rebuilding concordances, fix-strongs.py, updating the RVO (ediciones-manuales.json, transform.py, name_map.json, review CSVs), notes and info pages, cache version numbers, and rebuilding from sources.

## 2026-10-11 — Straubinger gets its own concordance

- Borrowing RV1909's concordance gave Straubinger ~10.5% extra hits and missed 0.8% of its own tags (Catholic versification in 55 chapters, independent wording). Built public/data/concord/straubinger-strong (2.8 MB) with `node scripts/build-concordance.mjs public/data/bibles/straubinger-strong public/data/concord/straubinger-strong`; data.js straubinger-strong `concord: "straubinger-strong/"`.
- Measured for the others: RVG on RV1909's misses nothing, 1.4% extra; LSV on KJV's misses nothing, 4.9% extra — left shared.
- LEXICON_VERSION 8 -> 9 (8 was already published), so installed copies re-download Straubinger with its new concordance.
- README.md updated (Bibles table, hand-edit rule 4, concordance commands).

## 2026-10-11 — Info page: Problems with Islam

- src/js/pages.js: new entry `problems-with-islam` ("Problems with Islam" / "Problemas con el islam") right below "Evidence for Jesus".
- public/data/pages/problems-with-islam.en.md / .es.md, generated with fill_quotes.py from tmp-check/qgen/problems-with-islam.{en,es}.tpl (KJV / RVG). Qur'an quoted from Pickthall (1930, public domain); Spanish Qur'an and hadith quotations translated from the English. Hadith numbers follow sunnah.com; Tirmidhi 1663, 2536, Ibn Majah 1944 and Bukhari 268, 3849 checked there.
- Sections: one witness vs. public events; late sources (table); first revelation ("poet or possessed", Bukhari 3/6982, Guillaume pp. 72, 106); the Islamic dilemma (5:68, 10:94, 6:115; Sinaiticus/Vaticanus); Mary in the "Trinity" and apocryphal sources; Deut 18 / Paraclete; preservation of the Qur'an (Yamama, forgotten verses, stoning and suckling verses, the sheep, Uthman's burning, Ibn Mas'ud and Ubayy, Sana'a, Hafs/Warsh); wives and convenient revelations; violence and 4:34; salvation by scales; strange "authentic" hadith (72 wives, strength of 100, sun in a muddy spring, fly, camel urine, rats, monkeys, adult suckling).
- Corrections to the author's draft: the Qur'an was recited, not written, by Muhammad; Sahih Muslim compiled before 875 (822 was not its date); al-Bukhari compiled c. 846; "not mad … not a devil" is 81:22-25 with 68:2; 7:157 says the Prophet is described in the Torah and Gospel; Bukhari 3808 names four teachers (Salim was Abu Hudhaifa's freed slave); the sheep hadith is Ibn Majah 1944; Qur'an 33:50 exempts Muhammad from the four-wife limit; "70 virgins" is 72 wives (Tirmidhi 1663); the "intercourse like animals" hadith was left out because it is graded weak; 22:25 and 2:23-24 (hell, which the Bible also teaches) replaced by 9:29 and others.

## 2026-10-11 — Info page: Problems with Mormonism

- src/js/pages.js: new entry `problems-with-mormonism` ("Problems with Mormonism" / "Problemas con el mormonismo") right below "Problems with Islam".
- public/data/pages/problems-with-mormonism.en.md / .es.md, generated with fill_quotes.py from tmp-check/qgen/problems-with-mormonism.{en,es}.tpl (KJV / RVG). LDS sources quoted from the Church's own Gospel Topics essays (2013–2014), the 1830 and current Book of Mormon, D&C, History of the Church, Journal of Discourses, J. F. Smith, McConkie, Benson.
- Sections: living prophet over dead prophets (polygamy, priesthood ban, Adam-God); God once a man, three Gods (with the 1830 Book of Mormon's "mother of God" / "Eternal Father" changed in 1837), physical conception, Jesus and Lucifer as spirit brothers; First Vision accounts, seer stone in a hat, polygamy/polyandry and public denial, failed prophecies (D&C 84, "fifty-six years"), Book of Abraham papyri; Book of Mormon changes, KJV copying, anachronisms, archaeology vs. Bible archaeology, DNA and the 2006 introduction change, the witnesses; salvation "after all we can do", temple recommend and tithing, Ensign Peak/SEC.
- Corrections to the author's draft: the Church's essay says 30–40 wives (not 49), and 1852 was the public announcement of polygamy, not an admission of a number; LDS teach Jesus was already God (Jehovah) before birth — it is the Father who "was once a man"; Jesus and Lucifer are presented as spirit brothers with rival plans (Moses 4); Book of Mormon published 1830; ~3,900 changes (Tanner count), not ~2,000; Ether 2:23 "windows" (no glass mentioned) and Jacob 7:27 "adieu" (an English word in 1829) left out as easily answered; "coins" reworded as Alma 11's gold and silver measures; the Independence temple prophecy is D&C 84:4-5.

## 2026-10-11 — Info page: Problems with Catholicism

- src/js/pages.js: new entry `problems-with-catholicism` ("Problems with Catholicism" / "Problemas con el catolicismo") right above "Problems with Islam".
- public/data/pages/problems-with-catholicism.en.md / .es.md, generated with fill_quotes.py from tmp-check/qgen/problems-with-catholicism.{en,es}.tpl (KJV / RVG; inline Spanish quotations checked against RVG). Organized as a summary that points to the detailed pages (Matthew 16:18, First Bishops of Rome, The One True Church, Image veneration, Baptism, Who gave us the Bible?, Deuterocanonical Books, Church History).
- Sections: the claim (CCC 882, Unam Sanctam); Peter and the rock; the keys (Matt 18:18, John 20:23, Luke 11:52, Matt 23:13, Isa 22:22 -> Rev 3:7, Acts 2/8/10); Rome's rise (elders, Victor/Stephen resisted, Constantinople c. 3, Chalcedon c. 28, Valentinian III 445, Siricius 385, legate Philip 431, Symmachian forgeries, Donation of Constantine, Pseudo-Isidore, imperial confirmation 537-752, Western Schism, 1054); Gregory to Mellitus and the Pantheon; table of added doctrines with dates; Mary (Matt 1:25, brothers, Protoevangelium, purification offering, Rosary); canon (Luke 11:51, 1 Macc 9:27, Jerome, Leipzig 1519, Trent 1546), Bible restrictions, commandment numbering; faith and works (Trent s.6 c.9, Gen 15 vs 22, Gal 2:9).
- Corrections to the author's draft: the 1054 schism was Rome vs Constantinople (not Alexandria); Siricius' statement is 385 (not 381) and the 431 "lives and judges in his successors" was the legate Philip, not Celestine; the 408 "Jupiter -> Jesus / Venus -> Mary statues" story is not documented (replaced by Gregory's letter of 601 and the Pantheon, 609); the bleeding host was Bolsena (1263, a priest from Prague), after Lateran IV, and led to Corpus Christi; the boy-killing story is in the Infancy Gospel of Thomas, not the Protoevangelium; the Protoevangelium was rejected by Jerome and the Gelasian Decree long before the Reformation; Augustine did accept Maccabees (so "not a single Father" was dropped); crusade indulgences (from 1095), not "the Inquisition's army"; the Trent Horn quote and the "infant mortality" origin of infant baptism were dropped as unverified; Gregory's purgatory is Dialogues 4.41; Matt 23:2-4 (not "23:23:2-4").

## 2026-10-11 — Light / dark theme switch in Settings (dark by default everywhere)

- The theme used to follow the device (`prefers-color-scheme`), so Android phones in light mode showed the light theme. Now it is the app's own setting: dark by default on every device, light if chosen.
- index.html: small inline script sets `data-theme` on <html> from localStorage `app_theme` before the app loads (no flash) and matches the browser bar color (meta theme-color).
- src/js/settings.js: THEME_KEY, loadTheme(), applyTheme(). src/App.jsx: `theme` state, applied with applyTheme, passed to SettingsModal (theme / onThemeChange).
- SettingsModal.jsx/.css: a sun/moon switch (role="switch", "Dark mode" / "Modo oscuro") to the right of the English / Español chips (.settings-lang-row, .settings-theme).
- Every `@media (prefers-color-scheme: dark)` block (app.css, index.css, InfoPanel.css, PaneSlot.css, SettingsModal.css) became `:root[data-theme="dark"] …` rules; `color-scheme` is light by default and dark under data-theme="dark" (form controls, scrollbars).
- White translucent fills/borders that were invisible on the light background (app.css, LanguageSelectionModal.css, StrongsPanel.css) now use `color-mix(in srgb, var(--fg) N%, transparent)` — same look in dark, visible in light.
- StrongsPanel.css: in light mode "Show other occurrences" gets the highlight fill (--hit), a darker outline and semibold text.
- "Clear saved data" removes app_theme, so the app returns to dark.

## 2026-10-11 — About the Author: photo and proofreading

- InfoPanel.jsx: new Markdown line `![description](images/file.jpg)` = picture from public/data/pages/ (only local .jpg/.png/.webp/.gif paths); InfoPanel.css `.info-img` (centered, max 240px, rounded, thin border).
- public/data/pages/images/author.jpg (the author's photo, resized to 600×600, 49 KB), shown under the name in author.en.md and author.es.md.
- author.en.md proofread (who/that, lens, Presbyterians, Evangelicals, "in my free time", Threads, non-denominational, evangelical, punctuation and curly quotes); Plutarch quote replaced by the actual wording of _On Listening to Lectures_ 18 (the popular "vessel… wood" line is a paraphrase); the two quotes split into separate blocks. KJV quotations already matched.
- author.es.md: Spanish Bible quotations changed to the RVG wording used throughout the app (2 Tim 2:15, Acts 4:13, Matt 11:25, 15:9, 15:14, Josh 1:8, Ps 119:11, 1 Thess 5:21, Hos 4:6 were from RV1960 or paraphrased); Matt 15:14 quote moved to its own block (it was inline after "> "); the teachers list split back into separate items; "hilos de discusión" -> Threads; small wording fixes.

## 2026-10-11 — Numbered lists in info pages

- InfoPanel.jsx renderMarkdown: lines starting with "1. " / "2) " etc. now form a numbered list (<ol>, keeping the first number via `start`); before, they were joined into one paragraph, so the numbers ran together on one line (e.g. About the Author → My goals). Affects 10 pages that use numbered items. InfoPanel.css: `.info-body ol` styled like `ul`.

## 2026-10-12 — RVO Mt 1:1 "Jesús el Mesías" with separate Strong's tags

- The user's manual edit `"Jesucristo"` was skipped (the verse has "Jesucristo," with a comma); now `"de Jesucristo,": "de Jesús|G2424 el Mesías,|G5547"`.
- scripts/rvo/transform.py: manual edits accept `word|G####` — the word gets its own token with that Strong's number (m and g borrowed from the kjv-strong token with that number in the same verse); unmarked words join the next marked word (or the last one at the end). `new_token()`; a lost original token is only reported if its number does not reappear. Result Mt 1:1: "de Jesús" G2424 (N-GSM, ιησου) + "el Mesías," G5547 (N-GSM, χριστου); verified that no other verse changed.
- Concordance rebuilt (concord/rvo-strong). DATA_VERSION and LEXICON_VERSION +1. README (section 4) and the _ayuda line of ediciones-manuales.json document the `|G####` syntax.

## 2026-10-12 — RVO Mt 1:22 "por el Señor por medio del profeta, cuando dijo:"

- The user's four separate edits matched the first "por el" (before "Señor") instead of the second. Replaced with one edit of the whole phrase: `"Señor, por el profeta que dijo:": "Señor|G2962 por medio del|G1223 profeta,|G4396 cuando dijo:|G3004"` (each part keeps its Strong's number, parsing from the KJV). transform.py rerun (no warnings; the user's other new Mt 1 edits applied too), RVO concordance rebuilt, DATA_VERSION and LEXICON_VERSION +1.

## 2026-10-12 — Translator notes for the RVO

- New scripts/rvo/notas-traductor.json (`"Libro c:v": { "palabra(s)": "nota" }`, `"*"` = whole verse). transform.py `attach_notes()` puts each note on its token as `n` after the manual edits (warnings for words not found / notes not applied; prints the count). First note: Mt 1:25 "primogénito;".
- BiblePane.jsx/.css: a gold superscript † after a word with `n` (or at the end of the verse when Strong's is off) toggles a note box under the verse ("Nota del traductor" for Spanish panes); open notes reset when the chapter changes.
- App.jsx passes `tok.n` to StrongsPanel (`note`), which shows it at the top of the panel (StrongsPanel.css `.strongs-tnote`).
- DATA_VERSION +1. README section 4: "To add a translator's note".
- Note: running `git diff` from the AI's shell left a .git/index.lock (deletion not permitted there); it was moved to .git/stale-index-lock-claude and stale-index-lock-claude2 — safe to delete.

## 2026-10-12 — Job 2:9 (RV1909 / RVO): comma moved to its word

- The user retagged Job 2:9 "Bendice"/"Maldice" to H1288 in the Spanish Bibles; the concordances (rv1909-strong, rvo-strong, straubinger-strong) already list Job 2:9 under H1288, so no rebuild was needed.
- In rv1909-strong and scripts/rvo/backup-original the tokens read "Bendice ," + "á Dios" (shown as "Bendice , á Dios" with Strong's on, and not matching the verse text). Changed to "Bendice" + "á Dios,"; tokens now spell the verse. transform.py rerun (RVO: "Bendice" + "a Dios,"). DATA_VERSION +1.

## 2026-10-12 — Bible Translations: TR / MT / CT section expanded

- translations.en.md / .es.md: the short TR/MT/CT list became a section: ~5,800 Greek manuscripts; the Byzantine ("Antiochian") tradition behind TR and MT (usually estimated at 80 to over 90% of manuscripts); the Alexandrian tradition behind the CT (Vaticanus and Sinaiticus, Egyptian papyri); both sides' arguments (older vs. majority/used copies); TR ≈ MT (Hodges–Farstad differs in ~1,800 mostly small places) with the TR following the Latin in Acts 9:6, 1 John 5:7-8, Rev 22:16-21 ("book" vs "tree" of life) and Acts 8:37. Inline Spanish quotations from the RVG.
- Not as requested: "0.5%" and "over 99%" were changed — the two codices are ~0.03% of manuscripts, Alexandrian-type manuscripts a small minority, and the Byzantine share is usually estimated at 80 to over 90%, not 99%.

## 2026-10-14 — Questions for Trinitarians: question 48 removed

- trinitarian-questions.en.md / .es.md (hand-edited by the author): removed question 48 ("Why did God send 'the Spirit of his Son'…" / «¿Por qué Dios envió "el Espíritu de su Hijo"…») and renumbered 49–95 as 48–94 (94 questions, checked sequential in both files).
- These .md files are now edited by hand and differ from tmp-check/qgen/questions.txt; do not rerun build_questions.py, or it will overwrite them.

## 2026-10-14 — Bibliography entries numbered

- bibliography.en.md / .es.md: every entry (not the five tier-legend lines) changed from "- {tier} …" to "N. {tier} …", numbered continuously across all sections 1–213 (same count in both languages); the intro says "213 entries in total". Rendered as numbered lists by the ordered-list support in InfoPanel (tier badges and colors unchanged; each section's list starts at its first number).

## 2026-10-14 — The One True Church: the keys before the apostles

- one-true-church.en.md / .es.md, section 7 ("The keys"): new point that the scribes and Pharisees held the "key of knowledge" before the apostles — Moses' seat (Matt 23:2-3), Luke 11:52 and its parallel Matt 23:13 — quoted in full (KJV / RVG); the key is the word declared, not an office.

## 2026-10-14 — Settings: space between "Clear saved data" confirmation and "Download App"

- SettingsModal.css `.settings-download`: margin-top 14px -> 20px, plus padding-top 16px and a divider line (border-top var(--line)), so the "Yes, clear and reload" / Cancel buttons no longer sit right above the Download App button.

## 2026-10-14 — Problems with Catholicism: petros in the LXX, Peter as skandalon

- problems-with-catholicism.en/.es (.md and tmp-check/qgen .tpl), section 1: added the Septuagint use of _petros_ for stones thrown by hand (2 Maccabees 1:16; 4:41), and expanded the Matt 16:23 point: Peter is called a _skandalon_ ("thou art an offence unto me" / «me eres tropiezo»), a stumbling stone in Christ's way, so he cannot be the foundation rock reserved for Christ.

## 2026-10-14 — Launoy's count clarified (Matthew 16:18, Problems with Catholicism)

- matthew-16-18.en/.es (summary bullet, section 3, conclusion) and problems-with-catholicism.en/.es (section 1), .md and .tpl: "four in five against the papal reading" no longer implies the fifth agreed with Rome. Added that the 17 who called Peter the rock did not draw the papal conclusion — Tertullian (promise personal to Peter, On Modesty 21), Cyprian ("a like partnership both of honour and power", no "bishop of bishops"), Origen (every confessor "becomes a Peter") — and that the transfer of Peter's rock and keys to the bishop of Rome alone appears only from the late 4th century in the Roman bishops' own letters (Siricius 385, Leo I 440s); outside Rome's own bishops, no early Father read the verse as the popes do.

## 2026-10-14 — Problems with Catholicism: "church" = ekklesia (assembly)

- problems-with-catholicism.en/.es (.md and .tpl), end of section 1: the one-line ekklesia remark became two subsections. "Church means assembly": ekklesia (G1577) used for the Ephesus mob (Acts 19:32, 39, 41 — "assembly"/«concurrencia, asamblea», quoted KJV/RVG; checked G1577 in kjv-strong), for Israel in the wilderness (Acts 7:38; LXX Deut 9:10, 18:16 qahal), house churches (Rom 16:5 etc.), Matt 18:17. "Why church and not congregation": English "church" from kyriakon; Spanish «iglesia» a transliteration via Latin ecclesia; Tyndale's "congregation" (1526), Thomas More's attack (1529), Bancroft's Rule 3 for the KJV translators ("the word church not to be translated congregation").

## 2026-10-14 — Problems with Catholicism: the keys, point 4 from a Oneness view

- problems-with-catholicism.en/.es (.md and .tpl), section 2 point 4: instead of "Christ did not hand His key to anyone", Isaiah 22 is read as a picture of Christ — King (Isa 9:6, "mighty God, everlasting Father", government on his shoulder) and Servant Eliakim who receives the key (Isa 22:20-22; Rev 3:7; Rev 22:16; Matt 22:45); the one God, the Father, invested the man Christ Jesus with authority (Phil 2:7; Matt 28:18; John 5:27; Col 2:9), not a second divine person or a line of successors; only Jesus holds the keys of death and hell (Rev 1:18); the keys of the kingdom given to all the apostles are the gospel (Matt 18:18; John 20:23; Acts 2:38), through which believers are freed from death and hell. KJV / RVG wording.

## 2026-10-14 — Bible Translations: how much CT and TR differ; John 1:18

- translations.en.md / .es.md, after "The Alexandrian tradition: CT": new subsections "How much do they really differ?" (most differences minor — Matt 1:6 "David the king" vs "David", Matt 4:18 "Jesus" supplied from context; the same gospel in every text) and "John 1:18: the one CT reading I reject" (author's position): TR/MT "only begotten Son" vs CT "only begotten God" (P66, P75, ℵ, B; BSB vs MSB in the app); God is not begotten, the man Christ Jesus declares God (1 Tim 2:5); harmony with John 3:16, 18; 1 John 4:9; Matt 1:20 (gennēthen); Heb 1:5; 1 John 5:20; majority of manuscripts read "Son"; distrust of the Alexandrian group — Origen's "second God" (Against Celsus 5.39) and Arius of Alexandria. KJV / RVG quotations checked against the app's Bibles.

## 2026-10-14 — Bible Translations: more TR/MT differences; how the Comma Johanneum entered the TR

- translations.en.md / .es.md, "TR and MT: almost the same text": new examples John 17:11 (TR "those whom" = Vulgate quos; majority "thy name which thou hast given me"; v.12 MT = TR, CT "name"), Luke 2:22 ("her" vs "their" purification), Rev 16:5 ("and shalt be", Beza's 1598 conjecture). Intro sentence now covers Latin readings and editors' choices. 1 John 5:7-8 expanded: omitted in Erasmus's 1516/1519 editions, attacked by Edward Lee and Diego López de Zúñiga (Stunica), Codex Montfortianus (c. 1520), added in 1522 "lest anyone have occasion for slander" while suspecting the MS had been conformed to the Latin. Verified against KJV/MSB/BSB/RVG in the app (MSB has "name" in 17:11 and "those You gave Me" in 17:12).

## 2026-10-15 — Stop browser auto-translation (Android: "Gr" -> "Gramo", blank screen)

- Cause: <html lang="en"> while the app showed Spanish, so Chrome on Android offered/applied Google Translate. It translated "Gr" (Greek toggle) as "Gramo" (gram), and its rewriting of text nodes breaks React's DOM updates, leaving a blank screen.
- index.html: `<html translate="no" class="notranslate">` and `<meta name="google" content="notranslate">`. App.jsx: `document.documentElement.lang` follows the app language (en/es).

## 2026-10-16 — Info page: Key Oneness verses

- src/js/pages.js: new entry `key-oneness-verses` ("Key Oneness verses" / "Versículos clave de la Unicidad") right below "Problems with Mormonism".
- public/data/pages/key-oneness-verses.en.md / .es.md, generated with fill_quotes.py from tmp-check/qgen/key-oneness-verses.{en,es}.tpl: 21 sections from the author's outline, 258 verses quoted in full per language (KJV / RVG; BSB for Acts 16:6-7, John 17:11-12, Rev 14:1 in English, with the BSB reading translated in the Spanish text; NRSV/AMPC only as short phrases for Jas 2:7 and Gal 3:20). Inline quotations checked against KJV/RVG.
- fill_quotes.py: a ref may end with [BSB] / [MSB] / [KJV] to quote that Bible (label "(BSB)").
- Added verses: Joel 2:32 + Acts 2:21, Rom 10:13; Col 3:17; Isa 64:8; Matt 23:9; John 4:24; 1 Cor 6:17; Mark 16:16; John 8:24; Mark 1:2; John 19:37; Rev 1:17-18; Isa 45:12; Luke 2:11; Isa 6:1-5 + John 12:41; Jer 17:10 + Rev 2:23; Isa 8:13-14 + 1 Pet 2:7-8; Gal 4:6 (Father); Heb 10:15-17 + Jer 31:33; Acts 5:3-4; 2 Sam 23:2-3; Rev 5:8; 8:3-4; Matt 6:6; John 14:13-14; 1 Tim 2:5; Heb 5:14; 1 Cor 14:29; 2:15; 5:12; John 1:14; Isa 55:11; Heb 11:3; Rev 19:13.
- Corrections to the outline: "one flesh" with mia is Matt 19:5-6 (Matt 26:69 is "a damsel", mia paidiskē — kept as a second mia example); "one body" in 1 Cor 12:13 is hen (sōma is neuter), and Gal 3:28 "ye are all one (heis)" is explained by Eph 2:15 "one new man"; added John 17:21-22 and 1 Cor 3:8 as hen used for a unity of persons; Ps 33:3 -> 33:6 (the verse about the word of the LORD); 1 Pet 1:1 -> 1:2 and Jude 1 -> Jude 1:1; Titus 1:3 -> 1:13; Malachi 3:1 paired with Mark 1:2 as well as John 2:19-21; Isa 45:8 -> 45:12; 2 Pet 3:5,7 moved to "The Word".

## 2026-10-16 — Info page: Sola Scriptura

- src/js/pages.js: new entry `sola-scriptura` ("Sola Scriptura") right below "Problems with Mormonism" (above "Key Oneness verses").
- public/data/pages/sola-scriptura.en.md / .es.md, generated with fill_quotes.py from tmp-check/qgen/sola-scriptura.{en,es}.tpl (84 verses per language, KJV / RVG; inline quotations checked). Sections: definition and Rome's position (CCC 82, Dei Verbum 9, Trent s.4); the Word written from the beginning (Exod 24, Deut 31, 17, 4:2, Prov 30, Isa 8:20); every believer must know it (Deut 6, 11, Neh 8, Acts 8, Eph 3:4, 2 Tim 1:5; 3:15; Toulouse 1229, Index); meditate day and night (Josh 1:8, Ps 1, 119, 19); Josiah (2 Kgs 22-23); Jesus "It is written" (Matt 4, John 10:35, Matt 22:29, Luke 16:29-31, 24); Jesus against tradition (Mark 7:6-13, Matt 15, 23, Luke 11; Gal 1:14, Col 2); Paul (1 Cor 4:6, Acts 17:11, 2 Tim 3:14-17, Acts 20:29-32, 2 Tim 4:1-6); apostolic writings as Scripture (1 Cor 14:37, 1 Thess 5:27, Col 4:16, 2 Pet 3:15-16, 1 Tim 5:18 with Luke 10:7) and sufficiency (John 20:31, 1 John 5:13, Luke 1:4, Rev 1:3; 22:18-19); Catholic tradition vs Scripture (images CCC 2132, Mary "Mediatrix" CCC 969, "Holy Father", celibacy and abstinence 1 Tim 4:1-3, Sunday obligation CCC 2181); Sola Ecclesia (CCC 100, Dei Verbum 10, 1854/1950 dogmas, Pius IX's reported "I am the tradition"); objections (canon, 2 Thess 2:15, John 21:25, 1 Tim 3:15).

## 2026-10-16 — Info page: Biblical Salvation

- src/js/pages.js: new entry `biblical-salvation` ("Biblical Salvation" / "La salvación bíblica") right below "Problems with Mormonism" (above "Sola Scriptura").
- public/data/pages/biblical-salvation.en.md / .es.md from tmp-check/qgen/biblical-salvation.{en,es}.tpl (126 verses per language, KJV / RVG; inline quotations checked). Built from the author's outline: God's common grace and courtship (Matt 5:45, Lam 3:22-23, Rev 3:20, 2 Pet 3:9); hell as chosen separation, evil as privation of good (2 Thess 1:9, Mark 9:43-48); not by works (Isa 64:6, Eph 2:8-9, Rom 11:6); the Law as mirror (Rom 3:20, Gal 3:24, Jas 1:23-25, 2:10, Gal 5:4); new nature (Ezek 36:26-27, Heb 8:10, 1 Tim 1:9, Gal 5:18, Titus 2:11-12) and new birth by the Word (1 Pet 1:23); make the tree good (Matt 12:33, lemon-tree illustration); sheep and goats separated first (Matt 25:32); Christ the one Teacher (Matt 23:8-10); believe, repent, baptism in Jesus' name (Acts 2:38, Gal 3:27, Col 2:12); "for" not "because of" remission (Mantey 1951 vs Ralph Marcus, JBL 1951–52; Matt 26:28 same phrase); million-dollar illustration; faith vs mere belief (Jas 2:19, John 2:23-25, 8:30-44, 12:42-43, Acts 8:13-23); dead faith, faith tested, works judged for rewards (1 Cor 3:11-15); no number of works (Matt 13:23, 10:42, Luke 23:43); treasury of merit (CCC 1476-1477, Unigenitus 1343) vs Luke 17:10; gifts vs fruit (Matt 7:22-23, Corinth, 1 Cor 13); fruit of the Spirit (Gal 5:22-23, Jas 3:9, Rom 13:10); not a license to sin (Rom 6, Jude 4, 1 John 3); His works, not ours (Eph 2:10, Phil 2:13).
- Section 12 expanded (now 134 verses per language): Paul's warnings to the Corinthians — 1 Cor 6:9-11 (fornicators, drunkards… "shall not inherit the kingdom of God"; "such were some of you"), 1 Cor 5:11-13, 1 Cor 10:1-5, 10:11-12, 1 Cor 15:33-34, 2 Cor 12:20-21, 2 Cor 13:5, Gal 5:19-21.

## 2026-10-18 — Info pages always fetch the latest version

- Problem: after Settings ▸ "Clear saved data", edited .md info pages still showed the old text (browser HTTP cache, ~10 min on GitHub Pages, plus the service worker's stale-while-revalidate for data/pages/).
- src/components/InfoPanel/InfoPanel.jsx: page fetch uses `{ cache: "no-cache" }` (revalidates with the server; a 304 when unchanged).
- public/sw.js: `data/pages/` (.md and images) now network-first, saved copy only when offline; SHELL_VERSION 1 → 2 so installed copies drop the old cache.
- src/js/data.js `clearAllAppData()`: also unregisters the service worker (it is registered again on the next load), in addition to clearing IndexedDB, Cache Storage and local/session storage.

## 2026-10-21 — RVO Mateo 2:1 reworded; Strong's fixes in RVO and RVG

- scripts/rvo/ediciones-manuales.json: "Mateo 2:1" now reads «Cuando nació Jesús en Belén de Judea, en los días del rey Herodes, he aquí unos magos llegaron del oriente a Jerusalén,». transform.py rerun (no warnings); only Mt 2:1 changed in public/data/bibles/rvo-strong/40.json.
- Tags (RVO via `|G####` marks, RVG edited directly in public/data/bibles/rvg-strong/40.json, text unchanged): «Cuando» G1161 δέ (as KJV "Now when"; in RVG «Y cuando» is one G1161 token — previously «cuando» showed G1080), «nació» G1080; «he aquí» G2004 (epitassō) -> G2400 (idou); «Jerusalén,» G2419 -> G2414 Hierosolyma (TR reads Ἱεροσόλυμα), parsing/Greek from the KJV token.
- Concordance rebuilt (concord/rvo-strong). DATA_VERSION 19 -> 20, LEXICON_VERSION 11 -> 12. npm run build not run (Windows node_modules can't build from the Linux shell; data-only change).
- Not changed: rv1909-strong, straubinger-strong and scripts/rvo/backup-original still carry G2004 / G2419 on this verse.

## 2026-10-21 — Mt 2:2 «adorarle» tagged G4352 in RVG, RV1909, Straubinger

- The last token «a adorarle.» / «á adorarle.» / «a adorarlo”.» carried only G846 (autō), so «adorar» had no G4352 (proskyneō). Split into «a» (G846, unchanged) + «adorarle.»/«adorarlo”.» (G4352, V-AAN, προσκυνησαι), matching the author's RVO edit. Edited directly in rvg-strong, rv1909-strong and straubinger-strong 40.json; verse text unchanged, only Mt 2:2 tokens differ. scripts/rvo/backup-original not touched (RVO already handled by ediciones-manuales.json).
- Concordances rebuilt: concord/rv1909-strong (also used by RVG) and concord/straubinger-strong. DATA_VERSION 20 -> 21, LEXICON_VERSION 12 -> 13.
- Note: a rebuild with scripts/rvg-strong/transfer.mjs would undo these direct edits.

## 2026-10-21 — Mt 2:11 «dones» tagged G1435 in RVG, RV1909, Straubinger

- «dones,» (RVG, RV1909) and «dones:» (Straubinger) were plain untagged tokens; now G1435 (dōron, N-APN, δωρα), as in the KJV. Straubinger's «sus» before it stays untagged (no Greek word). RVO already had «presentes:» on G1435. Direct edits in the three 40.json files; verse text unchanged, only Mt 2:11 tokens differ.
- Concordances rebuilt: concord/rv1909-strong (also used by RVG) and concord/straubinger-strong. DATA_VERSION 21 -> 22, LEXICON_VERSION 13 -> 14.

## 2026-10-21 — Matthew: untagged words filled in automatically (RVG, RV1909, Straubinger, RVO)

- New rerunnable script scripts/fill-untagged.py (`python3 scripts/fill-untagged.py 40` = dry run, `--write` = apply). Per verse, the Strong's numbers the KJV verse has but the Spanish verse lacks are "missing"; an untagged word gets one only if the Spanish Bibles tie that word to that number elsewhere in the NT (≥3 times and ≥15% of its tagged uses) and no other missing number qualifies. Each number is used at most as many times as it is missing. Parsing and Greek word copied from the KJV token, or left out when the KJV verse has the number in more than one Greek form. Articles (G3588) skipped. Text never changed; a multi-word untagged token is split around the word.
- Matthew results (words newly tagged / still untagged): RVG 191 / 901, RV1909 26 / 297, Straubinger 517 / 2351, RVO (via scripts/rvo/backup-original, then transform.py) 26 / 298. Verified against HEAD: verse text identical, no existing tag changed. Lists for review: scripts/fill-untagged/40-<bible>-fixed.tsv and -remaining.tsv.
- backup-original keeps its Prettier layout (the script writes it the same way). Concordances rebuilt: rv1909-strong (also RVG), straubinger-strong, rvo-strong. DATA_VERSION 22 -> 23, LEXICON_VERSION 14 -> 15.
- A rebuild with scripts/rvg-strong/transfer.mjs would undo these; rerun fill-untagged.py afterwards.

## 2026-10-22 — Mt 2:22 «avisado»/«advertido» tagged G5537 in RVG and Straubinger

- RVG «avisado» and Straubinger «advertido» were untagged; now G5537 (chrēmatizō, V-APP-NSM, χρηματισθεις) as in the KJV and RVO. Direct edits in the two 40.json files; verse text unchanged, only Mt 2:22 tokens differ. RV1909 not touched (not requested).
- Concordances rebuilt: concord/rv1909-strong (also used by RVG) and concord/straubinger-strong. DATA_VERSION 23 -> 24, LEXICON_VERSION 15 -> 16.
- Follow-up (same verse): RVG «siendo avisado» merged into one G5537 token, RVG «Y» and Straubinger «y,» tagged G1161 (second δε); Straubinger «de» before «su padre Herodes» had a stray G2264 — now untagged. Concord/straubinger-strong rebuilt. DATA_VERSION 24 -> 25, LEXICON_VERSION 16 -> 17.

## 2026-10-22 — Lexicon: G4073 πέτρα and G4074 Πέτρος rewritten (English + Spanish)

- public/data/strongs/greek/4001.json: new def-en/def-es for both, plus an outline/outline-es (shown under "Meanings (outline)"). Πέτρος: a smaller, detached rock that can be lifted and thrown, with 2 Macc 1:16 and 4:41 (LXX, πέτρους thrown as missiles), the contrast with πέτρα, and the name Peter / Cephas (Jn 1:42, Mt 16:18). πέτρα: bedrock, a fixed mass of rock — tombs hewn in the rock (Mt 27:60; Mk 15:46), the builder's foundation (Mt 7:24-25; Lk 6:48; Mt 16:18), and Christ (1Co 10:4; Rom 9:33; 1Pe 2:8).
- Both entries carry "manual": true. scripts/lexicon-write.mjs now keeps def-en, outline and outline-es of such entries on a lexicon rebuild (before, only def-es survived).
- LEXICON_VERSION 17 -> 18.

## 2026-10-22 — Lexicon: G3056 λόγος rewritten (English + Spanish)

- public/data/strongs/greek/3001.json: new def-en/def-es and outline/outline-es: NT senses (word/message, account, reason), the Logos in Greek philosophy (Heraclitus, Stoics: impersonal divine reason and plan of the cosmos), Jewish background (Ps 33:6; Philo's Logos as mediator and "second god", QG 2.62, with the scholarly debate noted), Justin Martyr's "another God" (Dial. 56, 61, 128; 1 Apol. 63), and John 1:1, 14 with the two main readings. Marked "manual": true so a lexicon rebuild keeps it. LEXICON_VERSION 18 -> 19.

## 2026-10-22 — Lexicon: G4314 πρός rewritten (English + Spanish)

- public/data/strongs/greek/4001.json: new def-en/def-es and a 10-part outline/outline-es (place: motion toward and proximity, with acc. and dat.; time; relation — "pertaining to" as the KJV renders τὰ πρὸς τὸν θεόν in Heb 2:17; 5:1, also Rom 15:17, Heb 1:7; 4:13; according to; comparison; purpose; against; genitive Ac 27:34; compounds), each with NT examples. Jn 1:1 noted under proximity with both readings. Marked "manual": true. LEXICON_VERSION 19 -> 20.

## 2026-10-22 — Lexicon: G1520 εἷς rewritten (English + Spanish)

- public/data/strongs/greek/1501.json: new def-en/def-es and outline/outline-es explaining the three genders — masculine εἷς (God: Mk 12:29, 32; 1Co 8:6; 1Ti 2:5; Gal 3:20 with the AMPC "God is [only] one Person"; one man: Jn 11:50, Rom 5; Gal 3:28 masculine tied to the "one new man" of Eph 2:15, distinct from neuter "one body"), feminine μία (one flesh Mt 19:5-6, one faith, one fold, Mt 24:41, "first day"), neuter ἕν (unity of persons Jn 10:30; 17:21-23; 1Co 3:8; 1Jn 5:7 TR; Eph 2:14; ἓν σῶμα/πνεῦμα), with the main readings of Jn 10:30 (purpose, essence, Oneness). Marked "manual": true. LEXICON_VERSION 20 -> 21.

## 2026-10-23 — Mt 3:10 «da / hace / produce» tagged G4160 in RVG, RV1909, Straubinger

- The verb sat in one token with «buen» (G2570). Split into «da»/«hace»/«produce» (G4160, V-PAP-NSN, ποιουν) + «buen» (G2570, unchanged), matching the author's RVO edit. Direct edits in the three 40.json files; verse text unchanged, only Mt 3:10 tokens differ.
- Concordances rebuilt: concord/rv1909-strong (also used by RVG) and concord/straubinger-strong. DATA_VERSION 25 -> 26, LEXICON_VERSION 21 -> 22.
- Follow-up (same verse): the "therefore" word («por tanto,» in RVO/RVG, «y» in RV1909/Straubinger) was G1161 δέ; now G3767 οὖν (TR: πᾶν οὖν δένδρον). The opening δέ (ἤδη δὲ καί) now on «Ahora,» (RVO, RV1909) and «Y» (RVG); Straubinger has no word for it. RVO via ediciones-manuales.json ("Ahora,": "Ahora,|G1161"; "por tanto,|G3767"), transform.py rerun; others edited directly. Concordances rebuilt (rv1909-strong, straubinger-strong, rvo-strong). DATA_VERSION 26 -> 27, LEXICON_VERSION 22 -> 23.

## 2026-10-24 — Mt 4:9 «dijo» tagged G3004 in RVG and RV1909

- RVG «le dijo:» (one token, G846) split into «le» (G846) + «dijo:» (G3004, V-PAI-3S, λεγει), as in the author's RVO edit. RV1909 «dícele:» is a single word (verb + enclitic «le»), so it can't be split without changing the text: retagged G846 -> G3004 (the verb), losing the αὐτῷ tag in this verse. Verse text unchanged, only Mt 4:9 tokens differ.
- Concord/rv1909-strong (also used by RVG) rebuilt. DATA_VERSION 27 -> 28, LEXICON_VERSION 23 -> 24.

## 2026-10-24 — Lexicon: G3000 λατρεύω rewritten (English + Spanish)

- public/data/strongs/greek/2501.json: new def-en/def-es and outline/outline-es covering all 21 NT uses (plus noun λατρεία G2999): worship due to God alone (Mt 4:10; Lk 4:8 from Deut 6:13 LXX, beside προσκυνέω; LXX Ex 20:5), prayer and fasting (Lk 2:37; Ac 26:7; 2Ti 1:3; Rom 1:9; Rev 7:15; 22:3), priestly service (Heb 8:5; 9:9; 10:2; 13:10; 9:1, 6; Rom 9:4), spiritual and daily worship (Php 3:3; Heb 9:14; 12:28; Rom 12:1; Ac 24:14; 27:23), idolatry (Ac 7:42; Rom 1:25; Jn 16:2), and the later latria/dulia distinction (Augustine, City of God 10.1; Nicaea II, 787) with a note that the NT does not draw it. Marked "manual": true. LEXICON_VERSION 24 -> 25.

## 2026-10-24 — Lexicon: G4352 προσκυνέω rewritten (English + Spanish)

- public/data/strongs/greek/4001.json: new def-en/def-es and outline/outline-es: the gesture (kiss toward, fall prostrate; LXX bowing to people Gen 23:7; 33:3; 42:6; Mt 18:26), worship due to God alone (Mt 4:9-10; Lk 4:8; Ex 20:5 LXX; Jn 4:23-24), worship of Jesus (Mt 2; 8:2; 14:33; 28:9, 17; Jn 9:38; Heb 1:6), refused by Peter and the angel (Ac 10:25-26; Rev 19:10; 22:8-9; Lystra Ac 14:11-15 noted without the word), idols/demons/beast (Ac 7:43; Rev 9:20; 13:15 etc.), and Nicaea II (787): images given "honorable προσκύνησις, not true latreia", the honor passing to the prototype, and the anathema on those who do not salute images. English quotes checked against the KJV, Spanish against the RVG. Marked "manual": true. LEXICON_VERSION 25 -> 26.

## 2026-10-24 — Lexicon: G1401 δοῦλος rewritten (English + Spanish)

- public/data/strongs/greek/1001.json: new def-en/def-es and outline/outline-es: literal slaves (Mt 8:9; Eph 6:5; 1Co 7:21; Phm 16; Gal 3:28), parables (Mt 25:21; Lk 17:10; Mt 20:27; Mt 6:24), slaves of God/Christ (apostles' titles; Mary the δούλη Lk 1:38; 1Co 7:22-23; Rev 19:5; Php 2:7), of sin or righteousness (Jn 8:34; Rom 6; Gal 4:7; Jn 15:15), the verb δουλεύω used of serving God (Ac 20:19; Rom 12:11; Col 3:24; 1Th 1:9) and false gods (Gal 4:8), δουλεία = bondage (Rom 8:15; Gal 5:1; Heb 2:15), and dulia/hyperdulia (Augustine, City of God 10.1; Aquinas ST II-II q.103) with the note that the NT does not draw that distinction (fellow servants Rev 19:10; 22:9). Quotes checked against KJV / RVG. Marked "manual": true. LEXICON_VERSION 26 -> 27.

## 2026-10-24 — Lexicon: H259 אֶחָד and H3173 יָחִיד rewritten (English + Spanish)

- public/data/strongs/hebrew/1.json (H259): new def-en/def-es; the original outline kept, with new sections: one person (Gen 42:11, 13; Num 16:22; 1Sa 1:1; Judg 13:2; Ezek 33:24; Isa 51:2; Eccl 4:8), of God (Deut 6:4; Mal 2:10; Job 31:15; Zech 14:9), the Shema in the NT with masculine εἷς (Mk 12:29, 32; Gal 3:20; 1Co 8:4), collective nouns and the "compound unity" debate (Gen 2:24; 11:1; Ezek 37:17; Gen 1:5), and אֶחָד vs יָחִיד (God's exclusiveness via אֵין עוֹד and לְבַד: Deut 4:35; Isa 45:5; Ps 86:10; Isa 44:24).
- public/data/strongs/hebrew/3001.json (H3173): new def-en/def-es; original outline kept, plus all 12 OT uses grouped (only child Gen 22; Judg 11:34; Prov 4:3; mourning Jer 6:26; Amos 8:10; Zech 12:10; desolate Ps 25:16; 68:6; one's life Ps 22:20; 35:17), the LXX μονογενής link to John, why God is אֶחָד not יָחִיד, and later usage (Maimonides, Yigdal) and the Christian "compound unity" argument as later readings.
- Quotes checked against KJV / RVG. Both marked "manual": true (lexicon-write.mjs keeps them on a rebuild). LEXICON_VERSION 27 -> 28.

## 2026-10-25 — Lexicon: H430 אֱלֹהִים rewritten (English + Spanish)

- public/data/strongs/hebrew/1.json: new def-en/def-es; the original BDB outline kept, plus sections 3-9: plural form for the one God, decided by the verb (Gen 1:1, 3; Ps 7:9; the few plural agreements Gen 20:13; 35:7; Deut 5:26; Josh 24:19; 2Sa 7:23 vs 1Ch 17:21; LXX/NT ὁ θεός), plurals for single overwhelming things (מַיִם, שָׁמַיִם, חַיִּים, פָּנִים, רַחֲמִים, זְקֻנִים, נְעֻרִים, אֲדֹנִים Gen 42:30; Isa 19:4, בְּעָלִים Ex 21:29, בְּהֵמוֹת Job 40:15; Gesenius §124g, with the plurality-in-God reading noted), the God of Israel, false gods (Ex 20:3; Gen 31:30; 35:2; one god Judg 11:24; 1Sa 5:7; 2Ki 1:2; goddess 1Ki 11:5, 33; the calf Ex 32:1, 4 vs Neh 9:18), Moses and judges (Ex 7:1; 4:16; 21:6; 22:8-9, 28; Ps 82:1, 6; Jn 10:34-35), angels (Ps 8:5 / Heb 2:7; Ps 97:7; 1Sa 28:13-14), the king (Ps 45:6 / Heb 1:8). Quotes checked against KJV / RVG. Marked "manual": true. LEXICON_VERSION 28 -> 29.

## 2026-10-25 — Lexicon: H3068 יְהוָה rewritten (English + Spanish)

- public/data/strongs/hebrew/3001.json: new def-en/def-es (Tetragrammaton, ~6,800 uses, link to הָיָה and Ex 3:14-15, pronunciation history: Adonai vowels -> Jehovah/Jehová, Yahweh; KJV LORD / LXX κύριος followed in NT quotes); original outline kept, plus: the name revealed (Ex 3:14-15; 6:3; 34:6), the one God (Deut 6:4; Ps 83:18; Isa 42:8; 43:11; Gen 2:4), compound names with meanings (jireh Gen 22:8, 14; "that healeth thee" / rapha Ex 15:26; nissi Ex 17:15; shalom Judg 6:24; tsidkenu Jer 23:6; 33:16; shammah Ezek 48:35; tsebaoth 1Sa 1:3; Isa 6:3; Rom 9:29; Ex 31:13; Ps 23:1), Jah (Ps 68:4; 104:35; Rev 19:1), theophoric names, Joshua/Yehoshua (Num 13:16; Neh 8:17), and Jesus = "YHWH saves" (LXX Ἰησοῦς; Ac 7:45; Heb 4:8; Mt 1:21; Joel 2:32 -> Ac 2:21; Rom 10:9, 13; Isa 45:23 -> Php 2:10; Ac 4:12 with Isa 43:11). Quotes checked against KJV / RVG. Marked "manual": true. LEXICON_VERSION 29 -> 30.

## 2026-10-25 — Lexicon: G4716 σταυρός rewritten (English + Spanish)

- public/data/strongs/greek/4501.json: new def-en/def-es and outline/outline-es: all 28 NT uses grouped (the cross Jesus carried and died on: Jn 19:17, 19, 25, 31; Mt 27:32, 37, 40, 42; Mk 15:21, 30, 32; Lk 23:26; Php 2:8; Heb 12:2 — the disciple's cross: Mt 10:38; 16:24; Mk 8:34; 10:21; Lk 9:23; 14:27 — the message: 1Co 1:17-18; Gal 5:11; 6:12, 14; Eph 2:16; Php 3:18; Col 1:20; 2:14), ξύλον (Ac 5:30; 10:39; Gal 3:13; 1Pe 2:24), and "stake or cross?" evidence answering the Jehovah's Witness "torture stake" view: word history (Homer Od. 14.11; Seneca To Marcia 20.3; Josephus War 5.451), carrying the patibulum (Plautus fragment), Mt 27:37 "over his head", Jn 20:25 plural nails, Jn 21:18-19, early Christian writers (Barnabas 9.8; Justin Dial. 91, 1 Apol. 55; Irenaeus AH 2.24.4; Minucius Felix Oct. 29), Lucian (Vowels 12), the Alexamenos graffito, and the Watchtower's use of Lipsius (De Cruce, 1593). Bible quotes checked against KJV / RVG. Marked "manual": true. LEXICON_VERSION 30 -> 31.

## 2026-10-25 — Lexicon: G4717 σταυρόω rewritten (English + Spanish)

- public/data/strongs/greek/4501.json: new def-en/def-es and outline/outline-es: root (σταυρός + -όω; classical "fence with stakes", later "crucify"; LXX Esth 7:9; 8:12r; the Roman punishment), Jesus' crucifixion foretold (Mt 20:19; 26:2; Lk 24:7; Mt 23:34), demanded and carried out (Mt 27:22-23, 35, 38, 44; Jn 19:6, 10, 41; Mk 15:25; Lk 23:33; Mt 28:5; Mk 16:6; Rev 11:8), preached (Ac 2:36; 4:10; 1Co 1:13, 23; 2:2, 8; 2Co 13:4; Gal 3:1), figurative (Gal 5:24; 6:14; συσταυρόω Rom 6:6; Gal 2:20), related verbs (ἀνασταυρόω Heb 6:6; προσπήγνυμι Ac 2:23). Bible quotes checked against KJV / RVG. G4716 entry already open in this shard (both edits present). Marked "manual": true. LEXICON_VERSION 31 -> 32.

## 2026-10-26 — Settings: hide the bottom pane; round + button to bring it back

- src/components/SettingsModal/SettingsModal.jsx/.css: new "Show bottom pane" / «Mostrar el panel inferior» switch (role="switch") in its own section above "Default panes", with a hint about the + button. New `.settings-switch` styles.
- src/App.jsx: `bottomHidden` state saved in localStorage `app_hide_bottom` ("1" = hidden). Hiding clears a verse selection made in the bottom pane. When hidden, a round + button (`.show-bottom-fab`, bottom right, 44px, safe-area aware, raised above the selection bar when it is open) shows the pane again; hiding is only possible from Settings. Compare: picking a translation that opens in the hidden bottom pane shows the pane again.
- src/components/SplitPanes/SplitPanes.jsx: `hideSecond` prop — renders only the first pane at full size, no divider.
- src/app.css: `.show-bottom-fab` styles.
- Checked with @babel/parser and eslint (no errors/warnings); `npm run build` not run here (Windows node_modules), run it locally.
- Follow-up: the "Show bottom pane" section (`.settings-bottom-toggle`) gets margin-top 22px, since it has no h3 and sat right under the Font buttons.
- Follow-up: while the bottom pane is hidden, JumpBar gets only the top pane (`visiblePanes` in App.jsx), so word search, the "In:" source list and the Strong's toggle check use only the pane on screen.

## 2026-10-26 — RVO Mt 5:22 translator's note; RVG Mt 5:24 tags fixed

- scripts/rvo/notas-traductor.json: note on «sin razón» (Mt 5:22): the CT omits εἰκῇ (G1500) following 𝔓64, Sinaiticus and Vaticanus; TR and MT include it. transform.py rerun (no warnings); only Mt 5:22 changed in rvo-strong/40.json (note on the token, text unchanged).
- public/data/bibles/rvg-strong/40.json, Mt 5:24: the first «ofrenda» had G4374 and «presenta» had G1435 (swapped) — now «ofrenda» G1435 δωρον, «presenta» G4374 προσφερε; «reconcíliate primero» (one token, G4412) split into «reconcíliate» G1259 διαλλαγηθι + «primero» G4412. Text unchanged.
- RVG uses the rv1909-strong concordance, which was rebuilt but does not include RVG's own tags, so it is unchanged. DATA_VERSION 28 -> 29.

## 2026-10-26 — RVG gets its own concordance

- New public/data/concord/rvg-strong/{greek,hebrew}, built from rvg-strong's own tags: `node scripts/build-concordance.mjs public/data/bibles/rvg-strong public/data/concord/rvg-strong`. src/js/data.js: rvg-strong `concord: "rvg-strong/"` (was RV1909's). The Strong's panel and offline downloads read the folder from this field, so nothing else changed. LEXICON_VERSION +1.
- RVG's retagging (Mt 2–5 fixes, fill-untagged.py) now shows in its concordance. Rebuild it after any further RVG tag change.

## 2026-10-26 — Lexicon: G2835 κοδράντης rewritten (English + Spanish)

- public/data/strongs/greek/2501.json: new def-en/def-es and outline/outline-es: the quadrans in the NT (Mt 5:26; Lk 12:59; Mk 12:42; Lk 21:2), the denarius as a day's wage (Mt 20:2), every NT coin from lepton to talent with its Strong's number, KJV and RVG names and value (lepton, quadrans, as, denarius, drachma, didrachma, stater, thirty pieces of silver, mina, talent), a quick equivalence table (1 denarius = 16 assaria = 64 quadrantes = 128 lepta; talent = 60 minas = 6,000 denarii), a $100-a-day illustration with Mt 18:24, 28; Lk 10:35; Jn 6:7; 12:5; Rev 6:6, and a note that the RVG uses «cuadrante»/«blancas» for more than one coin. Bible quotes checked against KJV / RVG. Marked "manual": true. LEXICON_VERSION 33 -> 34.

## 2026-10-26 — Lexicon: the other NT coins rewritten (English + Spanish)

- G3016 λεπτόν, G787 ἀσσάριον, G1220 δηνάριον, G1406 δραχμή, G1323 δίδραχμον, G4715 στατήρ, G694 ἀργύριον, G3414 μνᾶ, G5007 τάλαντον (greek shards 501, 1001, 3001, 4501, 5001): new def-en/def-es and outline/outline-es for each, with every NT use grouped, the value in denarii (day's wages) and against the other coins, a $100-a-day illustration where useful, and a pointer to G2835 for the full table. Extras: the denarius' name ("ten" asses, 16 from c. 141 BC); didrachma = Ex 30:13 half shekel; stater = shekel, temple tax for two; the thirty pieces of silver (Mt 26-27; Zech 11:12; Ex 21:32) and Ac 19:19; the talent as a weight (Rev 16:21, G5006; Ex 38:25 = 3,000 shekels). Bible quotes checked against KJV / RVG. All marked "manual": true. LEXICON_VERSION 34 -> 35.

## 2026-10-26 — Correction file for RVG, RV1909 and Straubinger

- New scripts/correcciones/correcciones.json + scripts/correcciones/aplicar.py: the RVO-style way to fix Strong's tags ("etiquetas": "palabras": "palabra|G#### ...") and add translator's notes ("notas") in rvg-strong, rv1909-strong and straubinger-strong while reading. Text is never changed (the marked words must equal the original words); unmarked words join the next mark; "|-" = untagged; parsing/Greek word from a token with that number in the verse or from the KJV; existing notes kept. Idempotent; warns with "!" when something can't be applied. When a file changes it rebuilds that Bible's concordance and bumps DATA_VERSION and LEXICON_VERSION.
- Seeded with the RVG Mt 5:24 fix (already applied, so the first run changed nothing). Tested on a copy: merge ("sin razón" -> G1500), split, "|-", a note, a bad reference and a text mismatch (both rejected), second run = no change.
- README section 3 and AI-INSTRUCTIONS updated; README rule 4 corrected (RVG has its own word search now).
- Follow-up: the correction file also covers kjv-strong, bsb-strong, msb-strong and lsv-strong ("tags"/"notes" = "etiquetas"/"notas"; English or Spanish book names). Concordance rebuilt into the right folder per Bible (KJV -> concord/, BSB/MSB/RVG/RV1909/Straubinger -> their own); LSV uses the KJV's concordance, so an LSV change only raises DATA_VERSION. Other token marks (e.g. "r", words of Jesus) are kept on retagged words. Tested on a copy (KJV retag + note, LSV note, RVO rejected).
- Note label: new noteLabelFor(code, lang) in src/js/data.js — "Nota del traductor" / "Translator's note" only for rvo-strong, "Nota" / "Note" for every other Bible; used in BiblePane.jsx and StrongsPanel.jsx. (eslint: the 3 errors reported in these files were already there at HEAD.)

## 2026-10-26 — Lexicon: G1135 γυνή rewritten (English + Spanish)

- public/data/strongs/greek/1001.json: new def-en/def-es and outline/outline-es: one word for "woman" and "wife" decided by context (like ἀνήρ), woman (Mt 9:20; Jn 4:7; Lk 7:37; Gal 4:4; Lk 4:26; address Jn 2:4; 19:26; Mt 15:28), wife (Lk 1:13; Mt 19:3, 5; betrothed Mt 1:20; 1Co 7:2; Eph 5:25), debated verses (1Co 11:3; 1Ti 2:11-12), and Mt 5:28 "woman or wife?" with arguments for each (wife: adultery = another man's wife Lev 20:10, ἐπιθυμέω of the tenth commandment Ex 20:17 LXX, πρὸς τό of intent, "with her", Mt 5:31-32, Prov 6:25, 29; woman: anarthrous γυνή, no "neighbour's", the antitheses widen the law, Mt 15:19, 1Th 4:5, Job 31:1, Mk 10:11, 2Pe 2:14, all major translations) and what both agree on. Quotes checked against KJV / RVG. Marked "manual": true. LEXICON_VERSION 35 -> 36.

## 2026-10-26 — Lexicon: G4202 πορνεία rewritten (English + Spanish)

- public/data/strongs/greek/4001.json: new def-en/def-es and outline/outline-es covering all 25 NT uses: root (πόρνη, πέρνημι) and range, listed beside adultery (Mt 15:19; Mk 7:21; Gal 5:19; Heb 13:4), sexual sin in general (1Co 6:13, 18; 1Th 4:3; Eph 5:3; Col 3:5; 1Co 7:2; Rom 1:29 TR; 2Co 12:21; Rev 9:21; 1Co 5:9-11; 6:9; Rev 21:8), incest (1Co 5:1), Jude 7, Baal-peor (1Co 10:8; Num 25:1), Jn 8:41, the apostolic decree (Ac 15:20, 29; 21:25; Lev 18 reading), the exception clause (Mt 5:32; 19:9) with three views (marital unfaithfulness / betrothal, Mt 1:19 / unlawful marriage, NABRE) and what they share (Mt 19:6), and the figurative sense (Hos 1:2; Ezek 16; Jer 3; Rev 2:20-21; 14:8; 17:2, 4; 18:3; 19:2). Quotes checked against KJV / RVG. Marked "manual": true. LEXICON_VERSION 36 -> 37.

## 2026-10-26 — Lexicon: G3426 μόδιος rewritten (English + Spanish)

- public/data/strongs/greek/3001.json: new def-en/def-es and outline/outline-es explaining the modius as a household grain measure (~8.7 L) and the tub that held it, why "bushel" / «almud» / «celemín» mislead on size, the lamp saying in all three uses (Mt 5:15; Mk 4:21; Lk 11:33; with Lk 8:16 "vessel"), lamp and lampstand (G3088, G3087), and other dry measures for comparison (χοῖνιξ Rev 6:6, σάτον Mt 13:33). Quotes checked against KJV / RVG. Marked "manual": true. LEXICON_VERSION 38 -> 39.

## 2026-10-26 — Info page: On Israel

- src/js/pages.js: new entry `on-israel` ("On Israel" / "Sobre Israel") right below "Sola Scriptura".
- public/data/pages/on-israel.en.md / .es.md, generated with fill_quotes.py from tmp-check/qgen/on-israel.{en,es}.tpl (89 verse quotes per language, KJV / RVG; inline Bible phrases checked against KJV / RVG). Sections: salvation is of the Jews; Romans 9-11 (not cast away, the olive tree, "all Israel", Paul's heart, Eph 2-3, answers to Rom 2:28-29 / Gal 3 / Gal 6:16, Jer 31:35-37); how the Jewish roots were cut (Barnabas, Justin, Ignatius, Melito; Passover: Polycrates, Victor, Nicaea and Constantine's letter, Antioch 341; Sabbath and feasts: Constantine 321, Laodicea 29, 37-38, Elvira 49-50, Jerome on the Nazarenes, with Col 2:16-17 and Rom 14:5-6 stated fairly; baptism in Jesus' name -> Apostolic Canon 49, Aquinas ST III q.66 a.6, noting the documented motive was doctrinal); emperors and bishops (CTh 16.8.1, 16.9.1, Chrysostom Adv. Jud. 1, Ambrose Ep. 40, Cyril, Augustine CD 18.46, Theodosius II Nov. 3, Justinian Nov. 146); table of councils (Elvira to Cum nimis absurdum 1555), servi camerae, Florence 1442, Good Friday prayer; Hilberg's canon-law vs Nazi-law comparison; massacres and expulsions (1096, York 1190, Paris 1242, 1290/1306/1492/1497, Inquisition, limpieza de sangre, Black Death), blood libel (with the popes who condemned it), host desecration (Paschasius c. 831, Ratramnus, Berengar 1059, Lateran IV, Corpus Christi; Beelitz 1243, Paris 1290, Rintfleisch 1298, Deggendorf, Brussels, Segovia, Berlin 1510), Luther 1543 and Sasse 1938, later repudiations (Nostra Aetate, 2015, ELCA 1994) and Acts 3:17 etc.; replacement theology today (Calvin on Rom 11:26, Knox Seminary open letter 2002, Church of Scotland 2013) with two cautions (policy criticism is not replacement theology; PCUSA 1987); prophecy as a labelled futurist reading (Dan 9:27, Antiochus pattern, Mt 24:15, 2Th 2:3-4, Rev 11, Jn 5:43, Rev 12 with the devil's wrath vs 1Th 5:9, Jer 30:7, Dan 12:1, Zech 12-14, Mt 23:39, Rom 11:26-27, Acts 3:19-21, other views noted); blessing Israel is not a blank check (Gen 12:3, Ps 122:6; prophets vs kings: Samuel, Nathan, Elijah/Naboth, Micaiah, Manasseh, Jeremiah, Isaiah/Amos/Micah, John the Baptist; same standard for every nation: Dan 4:27, Lev 19, Deut 10, Prov 24, Acts 5:29, 10:34).
- Not included as an example: the 2006 Jerusalem Declaration on Christian Zionism (political, not clearly replacement theology).
- Follow-up (author request): "The name of Jesus in baptism" (on-israel en/es, .tpl and .md) now lists Apostolic Canons 49 and 50 (one immersion "into the death of the Lord", with Rom 6:3 added to the quotes), Constantinople canon 7 (Eunomians' single immersion, Sabellians "as heathen", Quartodecimans in the same list; Trullo 95), Pelagius I (Denzinger 445) and Aquinas, and concludes that the imperial church outlawed one-immersion baptism into Christ and rejected the baptism of those who held Father and Son are one. Stated as a strong inference, since the canons don't record the Sabellians' baptismal words; points to the Baptism page, section 5.

## 2026-10-28 — Settings: "Default panes" commented out; "Hide 2nd pane" switch

- src/components/SettingsModal/SettingsModal.jsx: the "Default panes" / «Paneles predeterminados» section is commented out in the JSX (to restore it, delete the comment's first and last lines); its strings, props and the App.jsx logic stay. eslint-disable comments on the now-unused PANE_OPTIONS import and defaultPanes/onDefaultPaneChange props. A default chosen earlier is still applied at startup (App.jsx); "Clear saved data" removes it.
- The switch is now "Hide 2nd pane" / «Ocultar el 2.º panel»: on = 2nd pane hidden (aria-checked = bottomHidden), off = shown. The + button sets bottomHidden to false, so the switch reads off afterwards (same state). Hint text updated in both languages.

## 2026-10-28 — Fonts: Georgia -> Roboto, Helvetica -> Comic Relief

- src/js/settings.js FONTS: removed "georgia" (looked the same as Default, since Charter is only installed on Apple devices and falls back to Georgia) and "helvetica" (same as Arial outside Apple devices); added "roboto" (Roboto, Arial) in Georgia's place and "comic" ("Comic Relief", "Comic Sans MS") in Helvetica's. A saved georgia/helvetica choice falls back to Default (loadSettings).
- index.html: preconnect + one Google Fonts stylesheet for Roboto (400/700, italic) and Comic Relief (400/700), display=swap; the font files download only when a page uses them.
- public/sw.js: fonts.googleapis.com / fonts.gstatic.com cached (cache first) so a chosen font works offline; SHELL_VERSION 2 -> 3.
- Fonts could not be self-hosted: neither the dev machine nor the cloud session could reach npm or Google Fonts.
- Follow-up: Roboto replaced by **Oswald** (`oswald`, stack Oswald, "Arial Narrow"). Both fonts are now stored in the project instead of loaded from Google Fonts: src/assets/fonts/Oswald-Variable.woff (weights 200-700), ComicRelief-Regular.woff, ComicRelief-Bold.woff, from the google/fonts repository (SIL OFL; Oswald-OFL.txt and ComicRelief-OFL.txt beside them), subset with fontTools to Latin (Basic, Latin-1, Extended-A/B, combining marks, Extended Additional, general punctuation, €, ™, arrows; checked: á é í ó ú ñ ¿ ¡ « » — ’ “ ” †). New src/fonts.css (@font-face, font-display: swap) imported in src/main.jsx. The Google Fonts <link> and the sw.js Google Fonts handler were removed; sw.js install now also precaches the .woff files referenced by the built CSS. SHELL_VERSION 3 -> 4. README licences note added.

## 2026-10-28 — Settings: one text size for text and verse numbers; 50% removed

- src/js/settings.js: FONT_SCALES now 75-200% (50% removed; a saved 50% falls back to 100%). numScale removed from DEFAULT_SETTINGS / loadSettings / saveSettings and SETTINGS_KEYS (the old app_verse_num_scale value is ignored).
- src/App.jsx: --verse-num-scale = text size / 100, so verse numbers grow and shrink with the text.
- src/components/SettingsModal/SettingsModal.jsx: "Verse number size" section and its strings removed; the sample's verse number follows the text size.

## 2026-10-28 — Automatic data versions; old copies pruned; offline fallback

- Problem: downloaded data was stored as "<file>@<global version>" (DATA_VERSION 36, LEXICON_VERSION 45, NOTES_VERSION 2). Each bump left the old copies on the phone forever, made every downloaded Bible re-download completely, and offline readers could not open a Bible until they tapped Update.
- New scripts/build-manifest.mjs -> public/data/manifest.json: a 10-hex SHA-1 of every file in public/data/{bibles,notes,strongs,concord} (CRLF normalized), and per pack (bible:<code>, notes:<lang>, lexicon, concord:<dir>|root) a version number that rises only when the pack's files change, plus an "updated" date. All packs reset to v1 (--reset). package.json: predev / prebuild run it, so CI builds and `npm run dev` always have a current manifest.
- src/js/data.js: DATA_VERSION / NOTES_VERSION / LEXICON_VERSION / VERSIONS removed. initData() (awaited in src/main.jsx before rendering) loads the manifest (4 s timeout, then the saved copy). Keys are now "<kind>/<path>@<hash>" (SRC), so only changed files download. cachedFetch: offline or server error -> any older stored copy of the same file (anyStoredVersion). In DEV it skips the device cache. pruneOldVersions() deletes a copy only when the current one is stored or the file no longer exists (only with a fresh manifest); runs 3 s after start and after every pack download. Exports packVersion, packSig, dataUpdated.
- src/js/offline.js: a pack's "ready" signature is the manifest sig of its packs (Bible or notes, + lexicon + its concordance for Strong's Bibles); displayVersion() for the panel. Old status strings show "Update available" once.
- UI: menu footer shows "Data updated: <date>" (was the three version numbers); notes copyright line shows notes:<lang> version; Download page shows "v<n>" per item; Settings "Clear saved data" texts rewritten (only needed to free space / start over).
- public/sw.js: data/manifest.json is never served from the shell cache; SHELL_VERSION 4 -> 5. scripts/correcciones/aplicar.py no longer edits data.js. README section 6 rewritten ("Data versions (automatic)") and the per-task steps updated.
- Tested in Node with an in-memory store: new key format, old @36 copy pruned once the new one is stored, a file not re-downloaded keeps its old copy and is served offline, a removed file is pruned.

## 2026-10-28 — NotesPane lint fix (setState in effect)

- src/components/NotesPane/NotesPane.jsx: the effect no longer resets state synchronously (react-hooks/set-state-in-effect). The loaded result is stored with the chapter it belongs to ({ key, notes, error }); when the chapter changes, the old result doesn't match the wanted key, so the pane shows "Loading…" until the new one arrives. Same behavior, one render fewer per chapter change. eslint clean.

## 2026-10-28 — KJV: translators' supplied words in italics

- kjv-strong tokens already mark the supplied words ("it": 1, 27,023 tokens in 14,233 verses; 19 of them also carry a Strong's number). src/js/data.js: kjv-strong gets `italics: true`.
- src/components/BiblePane/BiblePane.jsx: with Strong's on, renderTokens adds class "supplied" to those tokens; with Strong's off, renderItalics() rebuilds the verse from its tokens with the supplied words in <em class="supplied">, falling back to the plain text if the tokens don't spell the verse (checked: all 14,233 do). BiblePane.css: .supplied { font-style: italic }.
- rv1909-strong (4,665) and rvg-strong (3,909, copied from RV1909 by transfer.mjs) also have "it" marks; not turned on.
