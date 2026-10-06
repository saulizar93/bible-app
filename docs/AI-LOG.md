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
