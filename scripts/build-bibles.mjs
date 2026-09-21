#!/usr/bin/env node
/**
 * Convert a folder of USFM files into per-book JSON for public/data/bibles/<code>/<n>.json
 *
 *   node scripts/build-bibles.mjs sources/engKJV kjv
 *   node scripts/build-bibles.mjs sources/engBSB bsb
 *
 * Output shape (deliberately terse — every byte ships to a phone):
 *   { "b": 40, "c": 28, "v": { "1": ["verse 1 text", "verse 2 text", ...], ... } }
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const [srcDir, code] = process.argv.slice(2);
if (!srcDir || !code) {
  console.error('usage: build-bibles.mjs <usfm-dir> <translation-code>');
  process.exit(1);
}

const IDS = `GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH EST JOB PSA PRO
ECC SNG ISA JER LAM EZK DAN HOS JOL AMO OBA JON MIC NAM HAB ZEP HAG ZEC MAL MAT MRK LUK JHN
ACT ROM 1CO 2CO GAL EPH PHP COL 1TH 2TH 1TI 2TI TIT PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD REV`
  .split(/\s+/);
const NUM = Object.fromEntries(IDS.map((id, i) => [id, i + 1]));

/** Strip USFM markup down to readable text. */
function clean(s) {
  return s
    .replace(/\\f\s.*?\\f\*/g, '')          // footnotes
    .replace(/\\x\s.*?\\x\*/g, '')          // cross-references
    .replace(/\\(?:w|\+w)\s([^|\\]*)(?:\|[^\\]*)?\\\+?w\*/g, '$1') // \w word|lemma\w*
    .replace(/\\(?:add|nd|wj|qt|bk|it|bd|sc|no|em)\*?/g, '')       // char styles
    .replace(/\\[a-z0-9-]+\*?/g, ' ')       // anything else
    .replace(/\s+/g, ' ')
    .replace(/\s([,.;:!?»])/g, '$1')
    .trim();
}

function parseUsfm(text) {
  const book = { id: null, chapters: {} };
  let ch = null, vn = null, buf = [];

  const flush = () => {
    if (ch != null && vn != null) {
      const t = clean(buf.join(' '));
      if (t) (book.chapters[ch] ||= {})[vn] = t;
    }
    buf = [];
  };

  for (const line of text.split(/\r?\n/)) {
    let m;
    if ((m = line.match(/^\\id\s+(\w+)/))) { book.id = m[1].toUpperCase(); continue; }
    if ((m = line.match(/^\\c\s+(\d+)/)))  { flush(); ch = +m[1]; vn = null; continue; }
    if (/^\\(?:h|toc\d|mt\d?|ms\d?|s\d?|r|d|b|ide|rem|usfm)\b/.test(line)) { continue; }

    // a line can hold several verses: \v 1 text \v 2 text
    const parts = line.split(/(?=\\v\s+\d+)/);
    for (const part of parts) {
      if ((m = part.match(/^\\v\s+(\d+[a-z]?)\s*([\s\S]*)$/))) {
        flush();
        vn = parseInt(m[1], 10);
        buf.push(m[2]);
      } else if (vn != null) {
        buf.push(part);
      }
    }
  }
  flush();
  return book;
}

const outDir = path.join('public', 'data', 'bibles', code);
fs.mkdirSync(outDir, { recursive: true });

let written = 0, bytes = 0;
for (const file of fs.readdirSync(srcDir)) {
  if (!/\.(usfm|sfm|txt)$/i.test(file)) continue;
  const parsed = parseUsfm(fs.readFileSync(path.join(srcDir, file), 'utf8'));
  const n = NUM[parsed.id];
  if (!n) { console.warn(`  skip ${file} (unknown id ${parsed.id})`); continue; }

  const chapters = {};
  for (const [c, verses] of Object.entries(parsed.chapters)) {
    const max = Math.max(...Object.keys(verses).map(Number));
    // dense array: index 0 = verse 1. Missing verses become "".
    chapters[c] = Array.from({ length: max }, (_, i) => verses[i + 1] || '');
  }

  const json = JSON.stringify({ b: n, c: Object.keys(chapters).length, v: chapters });
  fs.writeFileSync(path.join(outDir, `${n}.json`), json);
  written++;
  bytes += zlib.gzipSync(json).length;
}

console.log(`${code}: ${written} books -> ${outDir}  (~${(bytes / 1024).toFixed(0)} KB gzipped total)`);
