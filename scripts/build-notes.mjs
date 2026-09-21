#!/usr/bin/env node
/**
 * Convert a plain-text commentary export (Google Docs -> .txt) into
 * public/data/notes/<lang>/<bookNum>/<chapter>.json
 *
 *   node scripts/build-notes.mjs sources/matthew-commentary-en.txt en MAT
 *   node scripts/build-notes.mjs sources/matthew-commentary-es.txt es MAT
 *
 * Expected input shape (yours):
 *   Matthew 1:1: Matthew begins with three human titles...
 *   Matthew 1:2: Abraham's wife Sarah was barren...
 *   ***Who suffered more, the Spirit or the Flesh?...   <- continuation of 1:2
 *   Matthew 2:1: Approximately 2 years pass...
 *
 * Output per chapter file:
 *   { "1": [ {"t":"p","x":"..."} ],
 *     "2": [ {"t":"p","x":"..."}, {"t":"hl","x":"..."} ],
 *     "3-5": [ {"t":"p","x":"..."} ] }   <- verse ranges keep their own key
 */
import fs from 'node:fs';
import path from 'node:path';
import { byId } from '../src/books.js';

const [srcFile, lang, bookId] = process.argv.slice(2);
if (!srcFile || !lang || !bookId) {
  console.error('usage: build-notes.mjs <txt-file> <lang: en|es> <BOOKID e.g. MAT>');
  process.exit(1);
}
const book = byId[bookId.toUpperCase()];
if (!book) { console.error(`unknown book id ${bookId}`); process.exit(1); }

// The book name may differ from the English id ("Matthew" vs "Mateo"); accept either
// plus the id itself, so the same script works on the Spanish file too.
const NAME_ALTS = [book.en, book.es, book.id].filter(Boolean);
const NAME_RE = NAME_ALTS.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');

const HEADER_RE = new RegExp(`^(?:${NAME_RE})\\s+(\\d+):(\\d+)(?:-(\\d+))?:\\s*`, 'i');
const CHAPTER_ONLY_RE = new RegExp(`^(?:${NAME_RE})\\s+\\d+\\s*$`, 'i');
const TOC_LINE_RE = new RegExp(`^(?:${NAME_RE})\\s+\\d+\\s+\\d+\\s*$`, 'i');

let raw = fs.readFileSync(srcFile, 'utf8').replace(/\r\n/g, '\n');

// 1. Cut off the title + table of contents: real content starts at the first
//    line that is an actual verse header ("Matthew 1:1: ..."), not a bare
//    chapter/page pair ("Matthew 1        2").
const lines = raw.split('\n');
let startIdx = lines.findIndex(l => HEADER_RE.test(l.trim()));
if (startIdx === -1) {
  console.error('Could not find any "Matthew N:V:" header — check the book name matches your file.');
  process.exit(1);
}
raw = lines.slice(startIdx).join('\n');

// 2. Drop stray "Matthew N" divider lines and any leftover TOC lines.
raw = raw
  .split('\n')
  .filter(l => !TOC_LINE_RE.test(l.trim()) && !CHAPTER_ONLY_RE.test(l.trim()))
  .join('\n');

// 3. Walk the text, splitting at each verse-header match.
const headerG = new RegExp(HEADER_RE.source, 'gim');
const marks = [...raw.matchAll(headerG)];
if (!marks.length) {
  console.error('No verse headers found after trimming TOC — nothing to write.');
  process.exit(1);
}

const chapters = {}; // { "1": { "1": [...], "2-3": [...] } }

marks.forEach((m, i) => {
  const [, ch, v1, v2] = m;
  const bodyStart = m.index + m[0].length;
  const bodyEnd = i + 1 < marks.length ? marks[i + 1].index : raw.length;
  const body = raw.slice(bodyStart, bodyEnd);

  const paras = body
    .split(/\n\s*\n/)
    .map(p => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .map(p => {
      const highlight = p.startsWith('***');
      return { t: highlight ? 'hl' : 'p', x: highlight ? p.replace(/^\*+/, '').trim() : p };
    });
  if (!paras.length) return;

  const key = v2 ? `${v1}-${v2}` : v1;
  (chapters[ch] ||= {})[key] = paras;
});

// 4. Write one file per chapter.
const outDir = path.join('public', 'data', 'notes', lang, String(book.n));
fs.mkdirSync(outDir, { recursive: true });

let totalNotes = 0, totalBytes = 0;
for (const [ch, obj] of Object.entries(chapters)) {
  const json = JSON.stringify(obj);
  fs.writeFileSync(path.join(outDir, `${ch}.json`), json);
  totalNotes += Object.keys(obj).length;
  totalBytes += Buffer.byteLength(json);
}

console.log(
  `${bookId} (${lang}): ${Object.keys(chapters).length} chapters, ${totalNotes} notes ` +
  `-> ${outDir}  (~${(totalBytes / 1024).toFixed(0)} KB total)`
);

// 5. Sanity check: flag chapters your TOC says should exist but produced nothing,
//    and flag any header line that failed to parse (helps catch typos like a
//    missing colon or "Ch 1" shorthand you might have used inconsistently).
const gotChapters = new Set(Object.keys(chapters).map(Number));
const missing = [];
for (let c = 1; c <= book.chapters; c++) if (!gotChapters.has(c)) missing.push(c);
if (missing.length) {
  console.warn(`No notes found for ${bookId} chapters: ${missing.join(', ')}`);
}
