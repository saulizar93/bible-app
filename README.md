# Oneness Study Bible

A bilingual (English / Spanish) parallel Bible with Strong's Greek and Hebrew lexicon, Oneness study notes and info pages. React + Vite, installable as an app (PWA), published on GitHub Pages.

- Project folder (Windows): `C:\dev\bible-app\bible-app`
- Decisions and change history: `docs/AI-LOG.md`
- Rules for AI assistants: `AI-INSTRUCTIONS.md`

All commands below are run from the project folder in a terminal (PowerShell or Command Prompt). On Windows, `python3` may be called `python` or `py`.

---

## 1. Everyday commands

| What                         | Command                                                                                                                    |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Run the app on your computer | `npm run dev`, then open the address it prints (`npm run dev -- --host` to also open it from your phone on the same Wi-Fi) |
| Check that it builds         | `npm run build`                                                                                                            |
| Publish                      | commit and push to `main` (see below)                                                                                      |

### Publishing

Pushing to the `main` branch on GitHub publishes the app automatically (`.github/workflows/deploy.yml` builds it and uploads it to GitHub Pages). It's live a minute or two after the push; you can watch it in the repository's **Actions** tab.

```bash
git add -A
git commit -m "what changed"
git push
```

---

## 2. Where things live

| Folder / file                            | What's in it                                                       |
| ---------------------------------------- | ------------------------------------------------------------------ |
| `public/data/bibles/<bible>/<book>.json` | Bible text, one file per book (1 = Genesis … 66 = Revelation)      |
| `public/data/concord/`                   | Word search by Strong's number (concordance) for each tagged Bible |
| `public/data/strongs/`                   | Greek and Hebrew lexicon                                           |
| `public/data/notes/`                     | Study notes (built from `sources/matthew-commentary-*.txt`)        |
| `public/data/pages/`                     | Info pages of the ☰ menu (`<id>.en.md` / `<id>.es.md`)            |
| `src/js/data.js`                         | List of Bibles shown in the app, and the **cache version numbers** |
| `src/js/pages.js`                        | Order and titles of the info pages in the ☰ menu                  |
| `scripts/`                               | Build and fix scripts                                              |
| `sources/`                               | Original downloaded texts the Bibles were built from               |

### The Bibles

| Code                 | Name                     | Concordance used for word search                                      |
| -------------------- | ------------------------ | --------------------------------------------------------------------- |
| `kjv-strong`         | KJV (TR)                 | its own (`public/data/concord/greek`, `hebrew`)                       |
| `bsb-strong`         | BSB (CT)                 | its own (`concord/bsb-strong`)                                        |
| `msb-strong`         | MSB (MT)                 | its own (`concord/msb-strong`)                                        |
| `lsv-strong`         | LSV (TR)                 | KJV's                                                                 |
| `drc1750`            | Douay-Rheims             | none (no Strong's)                                                    |
| `rv1909-strong`      | RV1909 (TR)              | its own (`concord/rv1909-strong`)                                     |
| `rvg-strong`         | RVG (TR)                 | RV1909's                                                              |
| `rvo-strong`         | RVO (Reina-Valera-Ojeda) | its own (`concord/rvo-strong`) — **built by a script, see section 4** |
| `torres-amat`        | Torres Amat              | none                                                                  |
| `straubinger-strong` | Straubinger              | its own (`concord/straubinger-strong`)                                |

---

## 3. Editing a Bible's text or Strong's tags by hand

(For the **RVO**, don't edit its files directly — use section 4.)

### What a book file looks like

Each chapter has the plain text of every verse (`v`) and, in tagged Bibles, the same verse split into tokens (`w`). Each token has the words (`t`), the Strong's number (`s`) and, when known, the parsing code (`m`) and the Greek or Hebrew word (`g`). Exodus 32:4 in the RVG:

```json
{ "t": "Y dijeron:", "s": "H559", "m": "HC/Vqw3mp", "g": "וַיֹּאמְרוּ" },
{ "t": "Estos", "s": "H428", "m": "HPdxcp", "g": "אֵלֶּה" },
{ "t": "son tus dioses,", "s": "H430", "m": "HNcmpc/Sp2ms", "g": "אֱלֹהֶיךָ" }
```

### Rules

1. **Keep `v` and `w` matching.** The tokens' `t` joined with single spaces must spell the verse in `v` exactly (same words and punctuation). If you change a word, change it in both places.
2. **To move a tag**, move the words between tokens or change the `s` number. If you change `s`, also fix or delete that token's `m` and `g` (they belong to the old word).
3. **Keep the file valid JSON** — commas between tokens, double quotes. A broken file stops that book from loading. Editors like VS Code underline mistakes.
4. **RVG uses RV1909's word search** (and LSV uses the KJV's). If you retag a word in the RVG, make the same change in `rv1909-strong` (and in `scripts/rvo/backup-original` so the RVO gets it too), then rebuild RV1909's word search.

### After a hand edit

1. **Rebuild the word search** if you changed any Strong's number (`s`):

   ```bash
   # KJV (also used by LSV)
   node scripts/build-concordance.mjs public/data/bibles/kjv-strong
   # the others: <bible> and the output folder
   node scripts/build-concordance.mjs public/data/bibles/bsb-strong    public/data/concord/bsb-strong
   node scripts/build-concordance.mjs public/data/bibles/msb-strong    public/data/concord/msb-strong
   node scripts/build-concordance.mjs public/data/bibles/rv1909-strong public/data/concord/rv1909-strong
   node scripts/build-concordance.mjs public/data/bibles/rvo-strong    public/data/concord/rvo-strong
   node scripts/build-concordance.mjs public/data/bibles/straubinger-strong public/data/concord/straubinger-strong
   ```

   Text-only edits (spelling, punctuation) don't need it.

2. **Raise the cache version** in `src/js/data.js` (see section 6).
3. Add a line to `docs/AI-LOG.md` saying what you changed and why.

### Fixes that must survive a rebuild

`scripts/fix-strongs.py` holds tag corrections for the Spanish Bibles (for example "Pedro" G1565 → G4074, Mt 16:18 "y" → G2532). Add a rule there instead of hand-editing when the same mistake appears many times, then run:

```bash
python3 scripts/fix-strongs.py
python3 scripts/rvo/transform.py
```

and rebuild the RV1909, RVO and Straubinger word search (above). It's safe to run any number of times.

---

## 4. Updating the RVO (Reina-Valera-Ojeda)

The RVO is **generated**: `scripts/rvo/transform.py` starts every time from the untouched RV1909 copy in `scripts/rvo/backup-original/`, applies all the modernisation rules, then your hand edits, and writes `public/data/bibles/rvo-strong/`. Anything typed directly into `public/data/bibles/rvo-strong/` is **lost the next time the script runs**.

### To change wording or punctuation in a verse

1. Open `scripts/rvo/ediciones-manuales.json` and add a line:

   ```json
   "Mateo 1:23": { "Con nosotros Dios.": "Dios con nosotros." },
   ```

   - The key is the Spanish book name + `chapter:verse` (as the app shows it: `Génesis 1:1`, `1 Corintios 13:4`).
   - The left text is how the verse reads **in the RVO now** (after the rules), the right text is what you want. Use whole words with their punctuation, exactly as they appear.
   - Several changes in one verse go in the same `{ }`, separated by commas.
   - Every line except the last one ends with a comma.
   - Moved words keep their Strong's numbers automatically.

2. Run the script (about 20 seconds):

   ```bash
   python3 scripts/rvo/transform.py
   ```

3. Read the end of its output. A line starting with **`!`** means an edit didn't match the verse text and was skipped — fix the left-hand text and run it again.
4. Check the verse in the app (`npm run dev`).
5. If you changed words (not just punctuation), rebuild the RVO word search:

   ```bash
   node scripts/build-concordance.mjs public/data/bibles/rvo-strong public/data/concord/rvo-strong
   ```

6. Raise `DATA_VERSION` in `src/js/data.js` (section 6), then commit and push.

### To change a Strong's tag in the RVO

Edit the token in `scripts/rvo/backup-original/<book>.json` (the RV1909 wording, same rules as section 3), or add a rule to `scripts/fix-strongs.py`. Then run `python3 scripts/rvo/transform.py` and rebuild the RVO word search.

### To change a rule for the whole Bible

- A name spelling: `scripts/rvo/name_map.json` (`"1909 spelling": "RVO spelling"`).
- Other rules (Jehová → YHWH, mas → pero, enclitic pronouns, …): `scripts/rvo/transform.py`.

Run the script afterwards. Every change it makes is listed for review in `scripts/rvo/changes/`:

- `cambios-por-versiculo.csv` — each changed verse, RV1909 next to RVO
- `cambios-por-palabra.csv` — each changed word, with its rule and Strong's number
- `resumen.csv` — counts per rule

---

## 5. Study notes and info pages

### Study notes (Matthew commentary)

Edit `sources/matthew-commentary-en.txt` or `-es.txt`, then:

```bash
node scripts/build-notes.mjs sources/matthew-commentary-en.txt en MAT
node scripts/build-notes.mjs sources/matthew-commentary-es.txt es MAT
```

and raise `NOTES_VERSION` in `src/js/data.js`.

### Info pages (☰ menu)

- Edit the text in `public/data/pages/<id>.en.md` and `<id>.es.md`. You can edit these by hand; the supported Markdown is listed at the top of `src/components/InfoPanel/InfoPanel.jsx`.
- To add a page or change its position or title, edit `src/js/pages.js`.
- No version number to raise: installed apps pick up page changes on their own.
- "Questions for Trinitarians" is generated — see `AI-INSTRUCTIONS.md`.

---

## 6. Cache version numbers (don't skip this)

Phones and installed apps keep the Bible chapters, notes and lexicon they have already loaded (and everything downloaded for offline use). They only fetch new copies when a version number at the top of `src/js/data.js` goes up. After changing data, raise the matching number by 1 before you publish:

| You changed                                                                 | Raise                             |
| --------------------------------------------------------------------------- | --------------------------------- |
| Any file in `public/data/bibles/` (text or tags)                            | `DATA_VERSION`                    |
| Any concordance or lexicon (`public/data/concord/`, `public/data/strongs/`) | `LEXICON_VERSION`                 |
| Study notes (`public/data/notes/`)                                          | `NOTES_VERSION`                   |
| The app's offline shell itself (`public/sw.js`)                             | `SHELL_VERSION` in `public/sw.js` |

One bump covers any number of changes made before the same push. After it, the app's Download page shows the downloaded Bibles as "update available".

---

## 7. Rebuilding a Bible from its sources (rarely needed)

Rebuilding regenerates a Bible from the files in `sources/` and **erases every hand edit and later fix** in that Bible. Several steps were applied on top of the first build (parsing codes, Hebrew from the Open Scriptures Hebrew Bible, the tag transfer to RVG/Straubinger/LSV, `fix-strongs.py`); each is described with its command in `docs/AI-LOG.md`. Read those entries — or ask an AI assistant to — before rebuilding, and back up the folder first.

Main scripts:

| Script                                                          | Builds                                                                   |
| --------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `scripts/build-sword-bible.mjs`                                 | A tagged Bible from a SWORD module (KJV, RV1909, BSB)                    |
| `scripts/build-msb-strong.mjs`                                  | MSB with Strong's                                                        |
| `scripts/build-bibles.mjs`                                      | An untagged Bible from USFM files                                        |
| `scripts/add-morph-from-kjv.mjs`                                | Copies Greek parsing from the KJV onto another tagged Bible              |
| `scripts/oshb/apply-oshb.mjs`                                   | Hebrew parsing from the Open Scriptures Hebrew Bible                     |
| `scripts/rvg-strong/transfer.mjs`                               | Copies Strong's tags from one Bible onto another (RVG, Straubinger, LSV) |
| `scripts/fix-strongs.py`                                        | Tag corrections for the Spanish Bibles                                   |
| `scripts/rvo/transform.py`                                      | The RVO                                                                  |
| `scripts/build-concordance.mjs`                                 | Word search for a tagged Bible                                           |
| `scripts/build-strongs-hebrew.mjs`, `build-strongs-lexicon.mjs` | The lexicon                                                              |
| `scripts/build-notes.mjs`                                       | Study notes                                                              |

### Licences

Check a source's licence before publishing a Bible built from it. The RVG module is CC BY-NC-ND (non-commercial, no derivatives), and the RV1909 Strong's tagging is distributed with permission to CrossWire; see `docs/AI-LOG.md` (RV1909 con Strong) and the copyright lines in `src/js/data.js`.
