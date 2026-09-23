#!/usr/bin/env node
/**
 * Scan a translation's tokenized books (the "w" field build-bibles.mjs writes when
 * Strong's tags are present) and build a reverse index: Strong's number -> every
 * verse it occurs in. Run this AFTER build-bibles.mjs for that translation.
 *
 *   node scripts/build-concordance.mjs public/data/bibles/kjv
 *
 * Output: public/data/concord/greek/<shardStart>.json -> { "G26": [40024012, ...], ... }
 * Verse ids are encoded as book*1_000_000 + chapter*1_000 + verse (see data.js vidOf).
 */
import fs from 'node:fs';
import path from 'node:path';
import { normalizeStrong } from '../src/strongsCode.js';

const SHARD_SIZE = 500;
const shardStart = n => Math.floor((n - 1) / SHARD_SIZE) * SHARD_SIZE + 1;

const [bibleDir] = process.argv.slice(2);
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
        if (!code || !code.startsWith('G')) continue; // Greek only, for now
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

const outDir = path.join('public', 'data', 'concord', 'greek');
fs.mkdirSync(outDir, { recursive: true });
for (const [shard, obj] of shards) {
  fs.writeFileSync(path.join(outDir, `${shard}.json`), JSON.stringify(obj));
}

console.log(`${index.size} Strong's numbers, ${shards.size} shard files -> ${outDir}`);
