# Bible App Instructions

## Project goal

This is a Bible app with Oneness Study Notes. I want to make it as user friendly as possible, with the ability to quickly search a bible verse, and that verse appearing highlighted on both panels. Each panel can be its own bible translation or bible notes in either english or spanish. I also want to make it user friendly to both English speakers and Spanish speakers, so I will need to make all renderings conditional based on the selected language. I would also like to have Greek & Hebrew lexicon for both, the KJV, and a Spanish translation like RV1909 or RVG. This App has to be mobile friendly, as it will be mostly used on mobile.

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
