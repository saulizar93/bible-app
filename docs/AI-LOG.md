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
