#!/usr/bin/env node
/**
 * Convert the public-domain Strong's Hebrew dictionary (OpenScriptures
 * StrongHebrewG.xml — https://github.com/openscriptures/strongs, <rights>Public
 * Domain</rights>) into sharded JSON the app reads, same layout as the Greek:
 *
 *   public/data/strongs/hebrew/<shardStart>.json -> { "H1254": {...}, ... }
 *
 *   node scripts/build-strongs-hebrew.mjs sources/StrongHebrewG.xml
 *
 * Entry fields (all optional):
 *   gr      lemma in Hebrew/Aramaic script (pointed)     "בָּרָא"
 *   tr      transliteration                               "bârâʼ"
 *   pron    Strong's pronunciation                        "baw-raw'"
 *   pos     part of speech / gender code                  "v", "n-m", "n-f", "n-pr-m"
 *           (decoded for display by src/morph.js decodeHebrewPos)
 *   deriv   derivation                                    "a primitive root;"
 *   def-en  Strong's definition (English)
 *   def-es  Spanish definition — placeholder until translated by hand; kept on rebuild
 *   kjv     KJV renderings
 *   outline the numbered sense outline, by stem           ["1) to create...", "1a) (Qal) ..."]
 */
import fs from "node:fs";
import path from "node:path";
import { writeLexiconShards } from "./lexicon-write.mjs";

const SHARD_SIZE = 500;
const shardStart = (n) => Math.floor((n - 1) / SHARD_SIZE) * SHARD_SIZE + 1;

const [srcFile] = process.argv.slice(2);
if (!srcFile) {
  console.error("usage: build-strongs-hebrew.mjs <StrongHebrewG.xml>");
  process.exit(1);
}
const xml = fs.readFileSync(srcFile, "utf8");

const decode = (s) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&amp;/g, "&");
const attr = (tag, name) => {
  const m = tag.match(new RegExp(`\\b${name}="([^"]*)"`));
  return m ? decode(m[1]) : undefined;
};

/** Notes contain inline cross-references like
 *  <w lemma="אֵל" POS="ale" src="410" xlit="ʼêl"/> — keep them readable as
 *  "אֵל (ʼêl, H410)" instead of silently dropping them. */
function noteText(inner) {
  return decode(
    inner
      .replace(/<w\b([^>]*?)\/>/g, (_, a) => {
        const lemma = attr(a, "lemma") || "";
        const xlit = attr(a, "xlit");
        const src = attr(a, "src");
        const bits = [xlit, src && `H${parseInt(src, 10)}`].filter(Boolean).join(", ");
        return bits ? `${lemma} (${bits})` : lemma;
      })
      .replace(/<w\b([^>]*)>([\s\S]*?)<\/w>/g, (_, a, t) => {
        const src = attr(a, "src");
        return src ? `${t} (H${parseInt(src, 10)})` : t;
      })
      .replace(/<[^>]+>/g, ""),
  ).replace(/\s+/g, " ").replace(/\s+([,;.:)])/g, "$1").trim();
}

const shards = new Map();
let count = 0;
for (const m of xml.matchAll(/<div type="entry" n="(\d+)">([\s\S]*?)<\/div>/g)) {
  const num = parseInt(m[1], 10);
  const block = m[2];
  const head = block.match(/<w\b[^>]*\bID="H\d+"[^>]*>/)?.[0] || "";
  const note = (type) => {
    const n = block.match(new RegExp(`<note type="${type}">([\\s\\S]*?)</note>`));
    return n ? noteText(n[1]) || undefined : undefined;
  };
  const outline = [...block.matchAll(/<item>([\s\S]*?)<\/item>/g)]
    .map((i) => noteText(i[1]))
    .filter(Boolean);

  const entry = {
    gr: attr(head, "lemma"),
    tr: attr(head, "xlit"),
    pron: attr(head, "POS"), // this file stores the pronunciation in POS=""
    pos: attr(head, "morph"),
    deriv: note("exegesis"),
    "def-en": note("explanation"), // "def-es" is added by writeLexiconShards
    kjv: note("translation"),
    outline: outline.length ? outline : undefined,
  };
  for (const k of Object.keys(entry)) if (entry[k] === undefined) delete entry[k];
  if (!Object.keys(entry).length) continue;

  const shard = shardStart(num);
  if (!shards.has(shard)) shards.set(shard, {});
  shards.get(shard)[`H${num}`] = entry;
  count++;
}

if (!count) {
  console.error("No <div type=\"entry\"> blocks parsed — is this the OpenScriptures StrongHebrewG.xml?");
  process.exit(1);
}

const outDir = path.join("public", "data", "strongs", "hebrew");
const { kept, placeholders } = writeLexiconShards(outDir, shards);
console.log(`Wrote ${count} Hebrew entries across ${shards.size} shard files -> ${outDir}`);
console.log(`Spanish definitions: ${kept} kept, ${placeholders} placeholders`);
