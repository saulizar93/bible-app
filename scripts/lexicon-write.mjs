/**
 * Shared writer for the Strong's lexicon shards (Greek and Hebrew).
 *
 * Every entry gets two definition fields:
 *   "def-en"  English definition (from Strong's)
 *   "def-es"  Spanish definition — a placeholder until someone translates it
 *
 * Spanish definitions are entered BY HAND in public/data/strongs/<lang>/*.json,
 * so this writer never overwrites them: before writing a shard it reads the
 * existing file and keeps any "def-es" that isn't the placeholder. Re-running
 * build-strongs-lexicon.mjs / build-strongs-hebrew.mjs is therefore safe.
 *
 * Shards are written indented (one field per line) so they are easy to edit
 * in VS Code; GitHub Pages gzips them, so the extra whitespace costs little.
 */
import fs from "node:fs";
import path from "node:path";

export const DEF_ES_PLACEHOLDER = "Definición en español llegará pronto.";

/** Field order inside each entry (unknown fields go at the end). */
const ORDER = ["gr", "tr", "pron", "pos", "deriv", "def-en", "def-es", "kjv", "outline"];

function ordered(entry) {
  const out = {};
  for (const k of ORDER) if (entry[k] !== undefined) out[k] = entry[k];
  for (const k of Object.keys(entry)) if (!(k in out)) out[k] = entry[k];
  return out;
}

/**
 * @param {string} outDir                 e.g. public/data/strongs/greek
 * @param {Map<number, object>} shards    shardStart -> { "G26": { ..., "def-en": "..." } }
 * @returns {{ kept: number, placeholders: number }}
 */
export function writeLexiconShards(outDir, shards) {
  fs.mkdirSync(outDir, { recursive: true });
  let kept = 0, placeholders = 0;

  for (const [shard, entries] of shards) {
    const file = path.join(outDir, `${shard}.json`);
    let previous = {};
    if (fs.existsSync(file)) {
      try {
        previous = JSON.parse(fs.readFileSync(file, "utf8"));
      } catch (e) {
        // Refuse to continue: overwriting an unreadable file could destroy
        // hand-entered translations (e.g. a JSON typo while editing).
        console.error(`\n${file} is not valid JSON (${e.message}).\nFix it before rebuilding — it may contain hand-entered Spanish definitions.`);
        process.exit(1);
      }
    }

    const out = {};
    for (const [code, entry] of Object.entries(entries)) {
      const es = previous[code]?.["def-es"];
      const hasTranslation = typeof es === "string" && es.trim() && es !== DEF_ES_PLACEHOLDER;
      if (hasTranslation) kept++;
      else placeholders++;
      out[code] = ordered({ ...entry, "def-es": hasTranslation ? es : DEF_ES_PLACEHOLDER });
    }
    fs.writeFileSync(file, JSON.stringify(out, null, 2) + "\n");
  }
  return { kept, placeholders };
}
