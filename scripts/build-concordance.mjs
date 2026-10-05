#!/usr/bin/env node
/**
 * Scan a translation's tokenized books (the "w" field build-bibles.mjs writes when
 * Strong's tags are present) and build a reverse index: Strong's number -> every
 * verse it occurs in. Run this AFTER build-bibles.mjs for that translation.
 *
 *   node scripts/build-concordance.mjs public/data/bibles/kjv-strong
 *   node scripts/build-concordance.mjs public/data/bibles/rv1909-strong public/data/concord/rv1909-strong
 *
 * The optional second argument is the output root (default public/data/concord),
 * so each tagged translation can have its own concordance. src/data.js maps a
 * translation to its folder via PANE_OPTIONS[].concord.
 *
 * Output: public/data/concord/greek/<shardStart>.json  -> { "G26": [40024012, ...], ... }
 *         public/data/concord/hebrew/<shardStart>.json -> { "H1254": [1001001, ...], ... }
 * Verse ids are encoded as book*1_000_000 + chapter*1_000 + verse (see data.js vidOf).
 */
import fs from 'node:fs';
import path from 'node:path';
import { normalizeStrong } from '../src/strongsCode.js';

const SHARD_SIZE = 500;
const shardStart = n => Math.floor((n - 1) / SHARD_SIZE) * SHARD_SIZE + 1;

const [bibleDir, outRoot = path.join('public', 'data', 'concord')] = process.argv.slice(2);
if (!bibleDir) {
  console.error('usage: build-concordance.mjs <path/to/public/data/bibles/kjv>');
  process.exit(1);
}

const index = new Map(); // "G26" -> Set(vid)

for (const file of fs.readdirSync(bibleDir)) {
  if (!/^\d+\.json$/.test(file)) continue;
  const data = JSON.parse(fs.readFileSync(path.join(bibleDir, file), 'utf8'));
  if (!data.w) continue;
  const bookNum = data.b;

  for (const [chapter, verses] of Object.entries(data.w)) {
    verses.forEach((tokens, i) => {
      const verseNum = i + 1;
      const vid = bookNum * 1_000_000 + Number(chapter) * 1_000 + verseNum;
      for (const tok of tokens) {
        const code = normalizeStrong(tok.s);
        if (!code || !/^[GH]\d+$/.test(code)) continue;
        if (!index.has(code)) index.set(code, new Set());
        index.get(code).add(vid);
      }
    });
  }
}

if (!index.size) {
  console.error(`No tagged tokens found under ${bibleDir} — did you run build-bibles.mjs on a Strong's-tagged source?`);
  process.exit(1);
}

const shards = new Map();
for (const [code, vids] of index) {
  const num = parseInt(code.slice(1), 10);
  const shard = shardStart(num);
  if (!shards.has(shard)) shards.set(shard, {});
  shards.get(shard)[code] = [...vids].sort((a, b) => a - b);
}

// Greek and Hebrew numbers overlap (G26 vs H26), so each language gets its own folder.
let files = 0;
for (const [lang, prefix] of [['greek', 'G'], ['hebrew', 'H']]) {
  const outDir = path.join(outRoot, lang);
  fs.mkdirSync(outDir, { recursive: true });
  for (const [shard, obj] of shards) {
    const part = Object.fromEntries(Object.entries(obj).filter(([c]) => c[0] === prefix));
    if (!Object.keys(part).length) continue;
    fs.writeFileSync(path.join(outDir, `${shard}.json`), JSON.stringify(part));
    files++;
  }
}

console.log(`${index.size} Strong's numbers, ${files} shard files -> ${outRoot}/{greek,hebrew}`);
