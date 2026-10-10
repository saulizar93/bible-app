# Bible App Instructions

## Project goal

This is a Bible app with Oneness Study Notes. I want to make it as user friendly as possible, with the ability to quickly search a bible verse, and that verse appearing highlighted on both panels. Each panel can be its own bible translation or bible notes in either english or spanish. I also want to make it user friendly to both English speakers and Spanish speakers, so I will need to make all renderings conditional based on the selected language. I would also like to have Greek & Hebrew lexicon for both, the KJV, and a Spanish translation like RV1909 or RVG. This App has to be mobile friendly, as it will be mostly used on mobile.

## Location

- On the author's Windows computer the project lives at `C:\dev\bible-app\bible-app` (git repo, branch `main`). The parent folder `C:\dev\bible-app` also holds scratch folders (`tmp-check`, `public`) that are not part of the repo.
- A new Claude chat does not remember this: ask for access to `C:\dev\bible-app` (or have the author attach it with "Add folder"), then read this file and `docs/AI-LOG.md` before changing anything.

## Rules

- The code baseline is always the last git commit.
- Inspect the existing code before editing.
- Do not replace entire files unless explicitly requested.
- Preserve all existing features and custom changes.
- Make the smallest practical change.
- Do not add packages without explaining why.
- Do not change Bible text or source data without explicit approval.
- Keep mobile and desktop layouts working.
- Run the build after meaningful changes.
- Report and explain every file changed.

## Important files

- Main app: `src/App.jsx`
- Components: `src/components/`
- Bible data: `public/data/bibles/`
- Concordance: `public/data/concord'`
- Application settings: `vite.config.js/`
- Decisions: `docs/AI-LOG.md`

## Commands

- Start app: `npm run dev`
- Build app: `npm run build`

## Info pages (hamburger menu)

- Menu entries: `src/js/pages.js` (`INFO_PAGES`, in menu order, labels in `en` and `es`).
- Each page's text: `public/data/pages/<id>.en.md` and `<id>.es.md`. Supported Markdown subset is documented at the top of `src/components/InfoPanel/InfoPanel.jsx`.
- Bible quotations on these pages: KJV in English, RVG in Spanish (BSB / MSB only where a textual variant matters); quote from the app's own files in `public/data/bibles/` rather than from memory.
- "Questions for Trinitarians" (`trinitarian-questions`) is generated: edit `C:\dev\bible-app\tmp-check\qgen\questions.txt`, then from `C:\dev\bible-app` run `python3 tmp-check/qgen/build_questions.py tmp-check/qgen/questions.txt bible-app`. Don't edit its .md files by hand.
