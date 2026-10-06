#!/usr/bin/env node
/**
 * Build "MSB w/Strong" by carrying the BSB's Strong's tags over to the
 * Majority Standard Bible. The MSB is the BSB with the NT conformed to the
 * Majority Text, so ~93% of verses are word-for-word identical and the rest
 * differ only where the Majority Text reads differently.
 *
 *   node scripts/build-msb-strong.mjs [msbDir] [bsbStrongDir] [outDir]
 *   defaults: public/data/bibles/msb  public/data/bibles/bsb-strong  public/data/bibles/msb-strong
 *
 * Per verse: the MSB text is kept exactly as is (v). Its words are aligned to
 * the BSB's tagged words with a longest-common-subsequence diff on normalized
 * words (case, punctuation and quote styles ignored). Every MSB word that lines
 * up with a BSB word inherits that word's Strong's number; consecutive MSB
 * words from the same BSB token are re-grouped into one token ("He gave").
 * Words the MSB adds or changes (e.g. the doxology in Mt 6:13, Mt 17:21) are
 * left untagged rather than guessed.
 */
import fs from "node:fs";
import path from "node:path";

const [msbDir = "public/data/bibles/msb", bsbDir = "public/data/bibles/bsb-strong", outDir = "public/data/bibles/msb-strong"] =
  process.argv.slice(2);

const norm = (w) =>
  w.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

/** BSB tokens -> flat word list [{key, tok}] (tok = index into tokens). */
function bsbWords(tokens) {
  const out = [];
  tokens.forEach((tk, i) => {
    const parts = tk.t.split(/\s+/).filter(Boolean);
    parts.forEach((p, k) => {
      if (k === 0 && tk.j && out.length) {
        // glued to the previous word in the source ("Gessur"+"i"): merge, keep the first tag
        out[out.length - 1].key += norm(p);
      } else out.push({ key: norm(p), tok: i });
    });
  });
  return out;
}

/** LCS alignment: returns, for each a-index, the matched b-index or -1. */
function align(a, b) {
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = a[i] && a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const map = new Array(n).fill(-1);
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] && a[i] === b[j]) { map[i] = j; i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  return map;
}

fs.mkdirSync(outDir, { recursive: true });
let verses = 0, identical = 0, words = 0, tagged = 0, untaggedVerses = [];
for (let b = 1; b <= 66; b++) {
  const mf = path.join(msbDir, `${b}.json`), sf = path.join(bsbDir, `${b}.json`);
  if (!fs.existsSync(mf) || !fs.existsSync(sf)) continue;
  const msb = JSON.parse(fs.readFileSync(mf, "utf8"));
  const bsb = JSON.parse(fs.readFileSync(sf, "utf8"));
  const w = {};
  for (const [c, list] of Object.entries(msb.v)) {
    w[c] = list.map((text, vi) => {
      verses++;
      const mWords = (text || "").split(/\s+/).filter(Boolean);
      if (!mWords.length) return [];
      const tokens = bsb.w?.[c]?.[vi] || [];
      const bw = bsbWords(tokens);
      const mKeys = mWords.map(norm);
      const map = align(mKeys, bw.map((x) => x.key));
      if (mKeys.length === bw.length && map.every((x, k) => x === k)) identical++;

      const out = [];
      let cur = null; // { idx, words: [] }
      const flush = () => {
        if (!cur) return;
        const tok = { t: cur.words.join(" ") };
        if (cur.idx >= 0 && tokens[cur.idx].s) tok.s = tokens[cur.idx].s;
        out.push(tok);
        cur = null;
      };
      mWords.forEach((word, k) => {
        const idx = map[k] >= 0 ? bw[map[k]].tok : -1;
        words++;
        if (idx >= 0 && tokens[idx].s) tagged++;
        if (cur && cur.idx === idx) cur.words.push(word);
        else { flush(); cur = { idx, words: [word] }; }
      });
      flush();
      if (!out.some((t) => t.s)) untaggedVerses.push(`${b}:${c}:${vi + 1}`);
      return out;
    });
  }
  fs.writeFileSync(path.join(outDir, `${b}.json`), JSON.stringify({ b: msb.b ?? b, c: msb.c, v: msb.v, w }));
}
console.log(`${verses} verses (${identical} word-for-word identical to the BSB)`);
console.log(`${tagged.toLocaleString()} of ${words.toLocaleString()} words tagged (${((100 * tagged) / words).toFixed(1)}%) -> ${outDir}`);
console.log(`${untaggedVerses.length} verses with no tags at all: ${untaggedVerses.slice(0, 40).join(" ")}${untaggedVerses.length > 40 ? " …" : ""}`);
