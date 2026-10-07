// Add Hebrew word parsing from the Open Scriptures Hebrew Bible (OSHB) to a
// Strong's-tagged Old Testament: each token with an H-number gets
//   "m": the OSHB morphology code (e.g. "HC/Vqw3ms"; replaces the KJV's TH#### verb code)
//   "g": the Hebrew word as it stands in the Westminster Leningrad Codex (vowels, no accents)
// Usage: node scripts/oshb/apply-oshb.mjs <bible> <book|all> [--write] [--report]
//        e.g. node scripts/oshb/apply-oshb.mjs kjv-strong 1
// Source: sources/oshb/wlc (OSHB, CC BY 4.0: "Original work of the Open Scriptures
// Hebrew Bible available at https://github.com/openscriptures/morphhb").
// Verse numbers are converted with OSHB's wlc/VerseMap.xml (WLC ↔ KJV versification).
import fs from "node:fs";

const [bible = "kjv-strong", which = "1"] = process.argv.slice(2);
const WRITE = process.argv.includes("--write");
const REPORT = process.argv.includes("--report");
const root = new URL("../../", import.meta.url);
const wlcDir = new URL("sources/oshb/wlc/", root);
const OSIS = ["Gen", "Exod", "Lev", "Num", "Deut", "Josh", "Judg", "Ruth", "1Sam", "2Sam", "1Kgs", "2Kgs",
  "1Chr", "2Chr", "Ezra", "Neh", "Esth", "Job", "Ps", "Prov", "Eccl", "Song", "Isa", "Jer", "Lam", "Ezek",
  "Dan", "Hos", "Joel", "Amos", "Obad", "Jonah", "Mic", "Nah", "Hab", "Zeph", "Hag", "Zech", "Mal"];

// ---- verse map: KJV ref -> [WLC refs] (only refs that differ are listed) ----
const vm = fs.readFileSync(new URL("VerseMap.xml", wlcDir), "utf8");
const kjv2wlc = new Map();
for (const m of vm.matchAll(/<verse wlc="([^"]+)" kjv="([^"]+)" type="(\w+)"/g)) {
  const w = m[1].replace(/!.*/, ""), k = m[2].replace(/!.*/, "");
  if (!kjv2wlc.has(k)) kjv2wlc.set(k, new Set());
  kjv2wlc.get(k).add(w);
  if (m[3] === "partial") kjv2wlc.get(k).add(k); // the KJV verse also keeps its own WLC verse
}

const heb = (s) => s.replace(/\//g, "").replace(/[֑-ֽ֯׀׃ׅׄ]/g, "").normalize("NFC");
function loadBook(n) {
  const xml = fs.readFileSync(new URL(`${OSIS[n - 1]}.xml`, wlcDir), "utf8");
  const verses = new Map();
  for (const v of xml.matchAll(/<verse osisID="([^"]+)">([\s\S]*?)<\/verse>/g)) {
    const words = [];
    for (const w of v[2].matchAll(/<w ([^>]*)>([^<]*)<\/w>/g)) {
      const a = Object.fromEntries([...w[1].matchAll(/(\w+)="([^"]*)"/g)].map((x) => [x[1], x[2]]));
      const nums = (a.lemma || "").split("/").map((x) => parseInt(x, 10)).filter((x) => x > 0);
      words.push({ nums, morph: a.morph, text: heb(w[2]), ketiv: a.type === "x-ketiv", pos: words.length });
    }
    // qere before ketiv: the KJV translates the qere
    verses.set(v[1], [...words.filter((w) => !w.ketiv), ...words.filter((w) => w.ketiv)]);
  }
  return verses;
}

// ---- writing in the file's own style (compact, or one token per line like Genesis) ----
const tokenLine = (t) => "{ " + Object.entries(t).map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(", ") + " }";
function pretty(o) {
  const out = ["{"];
  const keys = Object.keys(o);
  keys.forEach((k, ki) => {
    const last = ki === keys.length - 1 ? "" : ",";
    if (k === "v" || k === "w") {
      out.push(`  ${JSON.stringify(k)}: {`);
      const chs = Object.keys(o[k]);
      chs.forEach((c, ci) => {
        out.push(`    ${JSON.stringify(c)}: [`);
        o[k][c].forEach((x, xi) => {
          const comma = xi === o[k][c].length - 1 ? "" : ",";
          if (k === "v") out.push(`      ${JSON.stringify(x)}${comma}`);
          else {
            out.push("      [");
            x.forEach((t, ti) => {
              const comma = ti === x.length - 1 ? "" : ",";
              const line = `        ${tokenLine(t)}${comma}`;
              // Prettier style (printWidth 80): a token that doesn't fit goes one key per line.
              // Hebrew vowel points take no width, as in Prettier's own measuring.
              if (line.replace(/[\u0591-\u05C7]/g, "").length <= 80) out.push(line);
              else {
                const e = Object.entries(t);
                out.push("        {");
                e.forEach(([k, v], i) => out.push(`          ${JSON.stringify(k)}: ${JSON.stringify(v)}${i === e.length - 1 ? "" : ","}`));
                out.push(`        }${comma}`);
              }
            });
            out.push(`      ]${comma}`);
          }
        });
        out.push(`    ]${ci === chs.length - 1 ? "" : ","}`);
      });
      out.push(`  }${last}`);
    } else out.push(`  ${JSON.stringify(k)}: ${JSON.stringify(o[k])}${last}`);
  });
  out.push("}");
  return out.join("\n") + "\n";
}

const books = which === "all" ? OSIS.map((_, i) => i + 1) : which.split(",").map(Number);

// Strong's numbering differs for some words (KJV H582 "men" = OSHB 376 אֲנָשִׁים, H120/H121 Adam…).
// Pass 1 learns pairs across the whole OT from verses where exactly one tagged word is left on
// each side; pairs seen 3+ times are then accepted as equivalents.
const cache = new Map();
const wlcBook = (n) => (cache.has(n) ? cache.get(n) : (cache.set(n, loadBook(n)), cache.get(n)));
// (learned from kjv-strong whatever bible is being processed: its tags are the most precise)
const readBible = (b) => JSON.parse(fs.readFileSync(new URL(`public/data/bibles/kjv-strong/${b}.json`, root), "utf8"));
function verseWords(b, c, vi) {
  const ref = `${OSIS[b - 1]}.${c}.${vi + 1}`;
  const ws = [...(kjv2wlc.get(ref) || [ref])].flatMap((r) => wlcBook(b).get(r) || []);
  return ws.length && kjv2wlc.has(ref) ? ws.map((w, i) => ({ ...w, pos: i })) : ws;
}
// Bibles whose verse numbers differ from the KJV in some chapters (Straubinger: Catholic
// numbering): there, each verse takes the nearby KJV verse (same chapter ±4, or the
// neighbouring chapters) whose Hebrew words best match its Strong's numbers.
const kjvCache = new Map();
const kjvBook = (b) => (kjvCache.has(b) ? kjvCache.get(b) : (kjvCache.set(b, JSON.parse(fs.readFileSync(new URL(`public/data/bibles/kjv-strong/${b}.json`, root), "utf8"))), kjvCache.get(b)));
function wordsFor(b, c, vi, toks, data) {
  const kc = kjvBook(b).v[c];
  if (bible === "kjv-strong" || (kc && kc.length === data.v[c].length)) return verseWords(b, c, vi);
  const nums = toks.filter((t) => /^H\d+$/.test(t.s || "")).map((t) => parseInt(t.s.slice(1), 10));
  if (!nums.length) return [];
  let best = [], bs = 0;
  for (const cc of [+c, +c - 1, +c + 1]) {
    const n = kjvBook(b).v[cc]?.length || 0;
    for (let i = 0; i < n; i++) {
      if (cc === +c ? Math.abs(i - vi) > 4 : cc < +c ? i < n - 6 : i > 6) continue;
      const words = verseWords(b, String(cc), i);
      const avail = words.flatMap((w) => w.nums);
      const hit = nums.filter((x) => avail.includes(x)).length / nums.length - (cc === +c ? Math.abs(i - vi) * 0.01 : 0.05);
      if (hit > bs) { bs = hit; best = words; }
    }
  }
  return bs >= 0.4 ? best : [];
}
let equiv = new Map(); // kjvN -> Set(oshbN)
const has = (w, n) => w.nums.includes(n) || w.nums.some((x) => equiv.get(n)?.has(x));
const KJV = bible === "kjv-strong";
const REUSE = KJV ? 8 : 2;
const FUNC = /^[\W_]*(and|the|of|to|a|an|in|on|for|with|by|from|at|y|e|o|u|el|la|lo|los|las|de|del|a|al|en|que|por|con|un|una)[\W_]*$/i;
function matchVerse(toks, words, onMiss) {
  const st = { tokens: 0, matched: 0, reused: 0, unmatched: 0 };
  const res = new Map(), miss = [];
  const tagged = toks.map((t, i) => ({ t, i })).filter((x) => /^H\d+$/.test(x.t.s || ""));
  st.tokens = tagged.length;
  const rel = (i, n) => (n > 1 ? i / (n - 1) : 0.5);
  const used = new Set();
  const byNum = new Map();
  for (const x of tagged) {
    const n = parseInt(x.t.s.slice(1), 10);
    if (!byNum.has(n)) byNum.set(n, []);
    byNum.get(n).push(x);
  }
  for (const [n, T] of byNum) {
    let W0 = words.filter((w) => !used.has(w) && w.nums.includes(n));
    if (!W0.length) W0 = words.filter((w) => !used.has(w) && has(w, n)); // learned equivalent number
    // neighbouring Hebrew name parts with the same number are one name (עִמָּנוּ אֵל "Immanuel")
    const W = [];
    for (const w of W0) {
      const last = W[W.length - 1];
      const name = (x) => /(^|\/)Np/.test(x.morph.slice(1));
      if (last && w.pos === last.pos + last.span && name(w) && name(last)) { last.parts.push(w); last.span++; last.text += " " + w.text; }
      else W.push({ ...w, parts: [w], span: 1 });
    }
    let pairs = [];
    if (T.length === W.length) pairs = T.map((x, k) => [x, W[k]]);      // same count: in order
    else {                                                              // otherwise closest position
      const all = [];
      for (const x of T) for (const w of W) all.push([Math.abs(rel(x.i, toks.length) - rel(w.pos, words.length)), x, w]);
      all.sort((p, q) => p[0] - q[0]);
      const tu = new Set(), wu = new Set();
      for (const [, x, w] of all) if (!tu.has(x) && !wu.has(w)) { tu.add(x); wu.add(w); pairs.push([x, w]); }
    }
    for (const [x, w] of pairs) { w.parts.forEach((p) => used.add(p)); res.set(x.t, w); st.matched++; }
    // tokens left over: the same Hebrew word only when a nearby token has it — KJV splits one
    // Hebrew verb around other words ("made … to grow", "brought … thither again"), so up to 8
    // tokens away there; in the other Bibles a repeated number is usually a suffix tagged with
    // the pronoun's number ("ti", "tu" for אַתָּה), so only right next to it (≤2).
    for (const x of T) if (!res.has(x.t)) {
      // (other Bibles: only a continuation, the matched token coming first — so in Gen 3:15
      // "suya" doesn't borrow the הוּא of the "ésta" that follows it)
      // A bare function word ("the", "and", "of"; "el", "y", "de"…) split off a tagged phrase
      // may also borrow from the word right after it ("the|H3556" "stars|H3556").
      const fw = FUNC.test(x.t.t);
      const near = pairs.find(([y]) => KJV ? Math.abs(y.i - x.i) <= REUSE
        : (y.i < x.i && x.i - y.i <= REUSE) || (fw && y.i > x.i && y.i - x.i <= REUSE));
      if (near) { res.set(x.t, near[1]); st.reused++; }
      else { st.unmatched++; miss.push(x.t); }
    }
  }
  if (onMiss) onMiss(miss, words.filter((w) => !used.has(w) && w.nums.length));
  return { st, res, miss };
}
const pairCount = new Map();
for (let b = 1; b <= 39; b++) {
  const data = readBible(b);
  for (const c of Object.keys(data.w || {})) data.w[c].forEach((toks, vi) => {
    const words = verseWords(b, c, vi);
    if (words.length) matchVerse(toks, words, (miss, left) => {
      if (miss.length !== 1 || left.length !== 1) return;
      const k = `${parseInt(miss[0].s.slice(1), 10)}>${left[0].nums[left[0].nums.length - 1]}`;
      pairCount.set(k, (pairCount.get(k) || 0) + 1);
    });
  });
}
for (const [k, n] of pairCount) if (n >= 3) {
  const [a, b] = k.split(">").map(Number);
  if (!equiv.has(a)) equiv.set(a, new Set());
  equiv.get(a).add(b);
}
console.log(`learned ${[...equiv.values()].reduce((s, x) => s + x.size, 0)} Strong's equivalences` +
  (REPORT ? ": " + [...equiv].map(([a, s]) => `H${a}=${[...s].join("/")}`).join(" ") : ""));

const total = { tokens: 0, matched: 0, reused: 0, unmatched: 0, noVerse: 0 };
for (const b of books) {
  const path = new URL(`public/data/bibles/${bible}/${b}.json`, root);
  const raw = fs.readFileSync(path, "utf8");
  const isPretty = /^\{\r?\n/.test(raw);           // one token per line (hand-edited files like Genesis)
  const crlf = raw.includes("\r\n");               // keep Windows line endings if the file has them
  const eol = (txt) => (crlf ? txt.replace(/\n/g, "\r\n") : txt);
  const endsNl = /\n$/.test(raw);
  if (isPretty && eol(pretty(JSON.parse(raw))).replace(/\r?\n$/, "") !== raw.replace(/\r?\n$/, ""))
    throw new Error(`${b}.json: layout not reproducible, not touching it`);
  const data = JSON.parse(raw);
  const st = { tokens: 0, matched: 0, reused: 0, unmatched: 0, noVerse: 0 };
  const misses = [];
  for (const c of Object.keys(data.w || {})) {
    data.w[c].forEach((toks, vi) => {
      const words = wordsFor(b, c, vi, toks, data);
      if (!words.length) { st.noVerse++; return; }
      const r = matchVerse(toks, words);
      for (const k of ["tokens", "matched", "reused", "unmatched"]) st[k] += r.st[k];
      for (const t of r.miss) if (misses.length < 300) misses.push(`${c}:${vi + 1} ${t.s} "${t.t}"`);
      for (const [t, w] of r.res) { t.m = w.morph; t.g = w.text; }
      if (process.env.SHOW && process.env.SHOW.split(",").includes(`${b}/${c}:${vi + 1}`))
        console.log(`  ${b}/${c}:${vi + 1}  ` + toks.map((t) => `${t.t}|${t.s || "-"}${t.m ? "|" + t.m : ""}${t.g ? "|" + t.g : ""}`).join("  "));
    });
  }
  for (const k in st) total[k] += st[k];
  const pct = ((100 * (st.matched + st.reused)) / Math.max(1, st.tokens)).toFixed(1);
  console.log(`${b} ${OSIS[b - 1]}: ${st.tokens} Hebrew-tagged tokens, ${pct}% parsed (${st.unmatched} unmatched${st.noVerse ? `, ${st.noVerse} verses not in WLC` : ""})`);
  if (REPORT) console.log(misses.join("\n"));
  if (WRITE) fs.writeFileSync(path, isPretty ? eol(endsNl ? pretty(data) : pretty(data).replace(/\n$/, "")) : JSON.stringify(data));
}
if (books.length > 1) console.log("TOTAL", total, `${((100 * (total.matched + total.reused)) / total.tokens).toFixed(1)}%`);
