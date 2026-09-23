// node scripts/inspect-folder.mjs public/data/bibles/kjv-strong
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2];
if (!dir) { console.error('usage: inspect-folder.mjs <path-to-bible-folder>'); process.exit(1); }

const files = fs.readdirSync(dir)
  .filter(f => /^\d+\.json$/.test(f))
  .map(f => parseInt(f, 10))
  .sort((a, b) => a - b);

console.log('Books present (numbers):', files.join(', ') || '(none)');
console.log('Matthew(40)..Revelation(66) present:', files.some(n => n >= 40 && n <= 66));

let greekFound = false, taggedBooks = [];
for (const n of files) {
  const data = JSON.parse(fs.readFileSync(path.join(dir, `${n}.json`), 'utf8'));
  if (!data.w) continue;
  let hasGreek = false;
  for (const verses of Object.values(data.w)) {
    for (const toks of verses) {
      if (toks.some(t => t.s && t.s.startsWith('G'))) { hasGreek = true; break; }
    }
    if (hasGreek) break;
  }
  if (hasGreek) { greekFound = true; taggedBooks.push(n); }
}
console.log('Any Greek (G-prefixed) tags found:', greekFound);
if (taggedBooks.length) console.log('  in books:', taggedBooks.join(', '));
