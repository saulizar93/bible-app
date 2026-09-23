#!/usr/bin/env node
/**
 * Convert the public-domain Strong's Greek dictionary (morphgnt/strongs-dictionary-xml,
 * CC0 — https://github.com/morphgnt/strongs-dictionary-xml) into sharded JSON:
 *   public/data/strongs/greek/<shardStart>.json  ->  { "G26": {...}, "G27": {...}, ... }
 *
 *   node scripts/build-strongs-lexicon.mjs sources/strongsgreek.xml
 *
 * NOTE: this converter assumes the entry/greek/pronunciation/strongs_derivation/
 * strongs_def/kjv_def element names used by that project's public releases. If a
 * newer release renames a field, run with --sample to print one raw <entry>...</entry>
 * block so you can adjust the tag names below.
 */
import fs from 'node:fs';
import path from 'node:path';

const SHARD_SIZE = 500;
const shardStart = n => Math.floor((n - 1) / SHARD_SIZE) * SHARD_SIZE + 1;

const [srcFile] = process.argv.slice(2).filter(a => !a.startsWith('--'));
if (!srcFile) {
  console.error('usage: build-strongs-lexicon.mjs <strongsgreek.xml> [--sample]');
  process.exit(1);
}
const xml = fs.readFileSync(srcFile, 'utf8');

if (process.argv.includes('--sample')) {
  const m = xml.match(/<entry[\s\S]*?<\/entry>/);
  console.log(m ? m[0] : 'no <entry> found');
  process.exit(0);
}

function decodeEntities(s) {
  return s
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
    .replace(/&amp;/g, '&');
}
function detag(s) {
  return decodeEntities(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}
function attr(block, tag, name) {
  const m = block.match(new RegExp(`<${tag}\\b[^>]*\\b${name}="([^"]*)"`));
  return m ? decodeEntities(m[1]) : undefined;
}
function tagText(block, tag) {
  const m = block.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`));
  return m ? detag(m[1]) : undefined;
}

const shards = new Map(); // shardStart -> { "G26": {...} }
let count = 0;

for (const m of xml.matchAll(/<entry\b[^>]*\bstrongs="0*(\d+)"[^>]*>([\s\S]*?)<\/entry>/g)) {
  const num = parseInt(m[1], 10);
  const block = m[2];
  const code = `G${num}`;

  const entry = {
    gr: attr(block, 'greek', 'unicode'),
    tr: attr(block, 'greek', 'translit'),
    pron: attr(block, 'pronunciation', 'strongs'),
    deriv: tagText(block, 'strongs_derivation'),
    def: tagText(block, 'strongs_def'),
    kjv: tagText(block, 'kjv_def'),
  };
  for (const k of Object.keys(entry)) if (entry[k] === undefined) delete entry[k];
  if (!Object.keys(entry).length) continue;

  const shard = shardStart(num);
  if (!shards.has(shard)) shards.set(shard, {});
  shards.get(shard)[code] = entry;
  count++;
}

if (!count) {
  console.error(
    'No entries parsed — the XML tag names may not match what this script expects.\n' +
    'Run again with --sample to print one raw <entry> block and adjust build-strongs-lexicon.mjs.'
  );
  process.exit(1);
}

const outDir = path.join('public', 'data', 'strongs', 'greek');
fs.mkdirSync(outDir, { recursive: true });
for (const [shard, obj] of shards) {
  fs.writeFileSync(path.join(outDir, `${shard}.json`), JSON.stringify(obj));
}

console.log(`Wrote ${count} entries across ${shards.size} shard files -> ${outDir}`);
