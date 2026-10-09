// Transfer Strong's tagging ("w") from rv1909-strong onto RVG, word by word.
// Usage: [TARGET=rvg|platense] node scripts/rvg-strong/transfer.mjs <book> [--write] [--report]
//        SHOW=2:1,2:6 node scripts/rvg-strong/transfer.mjs 40   (side-by-side check)
// RVG is a light revision of RV1909, so most words match exactly. Steps per verse:
//  1. align words in order (exact / similar spelling, e.g. á→a, Jerusalem→Jerusalén)
//  2. words that moved: match to an unused RV1909 word anywhere in the verse
//  3. reworded spans between aligned words (magos → hombres sabios): take that span's tag
//  4. small words ("a", "de") join the neighbouring token that contains them
// Spelling changes of names (Bethlehem→Belén, Booz→Boaz) are learned from the book itself.
// Words that can't be placed stay as plain {t} tokens with no "s", for manual tagging.
import fs from "node:fs";
const book = process.argv[2] || "40";
const WRITE = process.argv.includes("--write");
const REPORT = process.argv.includes("--report");
const root = new URL("../../public/data/bibles/", import.meta.url);
const SOURCE = process.env.SOURCE || "rv1909-strong"; // e.g. SOURCE=kjv-strong TARGET=lsv
const src = JSON.parse(
  fs.readFileSync(new URL(`${SOURCE}/${book}.json`, root)),
);
const ENGLISH = SOURCE.startsWith("kjv");
const TARGET = process.env.TARGET || "rvg-strong"; // e.g. TARGET=platense
const dst = JSON.parse(
  fs.readFileSync(new URL(`${TARGET}/${book}.json`, root)),
);

const norm = (w) =>
  w
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-zñ0-9]/g, "");
function lev(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++)
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    prev = cur;
  }
  return prev[b.length];
}
let dict = new Map(); // "rv1909word>rvgword" learned renames
function sim(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (dict.has(a + ">" + b)) return 0.9;
  let p = 0;
  while (p < a.length && p < b.length && a[p] === b[p]) p++;
  const r = 1 - lev(a, b) / Math.max(a.length, b.length);
  // shared start counts as similar: Spanish endings (bautizándolos/bautizándoles); for English
  // (SOURCE=kjv-strong) require a longer shared start so "ever-yone" ≠ "ever-lasting".
  const P = ENGLISH
    ? p >= 5 || (p >= 4 && Math.min(a.length, b.length) <= 5)
    : p >= 4;
  return Math.max(r, P ? 0.8 : 0);
}
function align(S, T) {
  const n = S.length,
    m = T.length;
  const sc = Array.from({ length: n + 1 }, () => new Float64Array(m + 1));
  const bt = Array.from({ length: n + 1 }, () => new Uint8Array(m + 1));
  for (let i = 1; i <= n; i++) bt[i][0] = 1;
  for (let j = 1; j <= m; j++) bt[0][j] = 2;
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++) {
      let best = sc[i - 1][j],
        k = 1;
      if (sc[i][j - 1] > best) {
        best = sc[i][j - 1];
        k = 2;
      }
      const s = S[i - 1] === T[j - 1] ? 2 : sim(S[i - 1], T[j - 1]);
      if (s >= 0.6 && sc[i - 1][j - 1] + s > best) {
        best = sc[i - 1][j - 1] + s;
        k = 3;
      }
      sc[i][j] = best;
      bt[i][j] = k;
    }
  const map = new Array(m).fill(-1);
  for (let i = n, j = m; i > 0 || j > 0; ) {
    const k = bt[i][j];
    if (k === 3) {
      map[j - 1] = i - 1;
      i--;
      j--;
    } else if (k === 1) i--;
    else j--;
  }
  return map;
}

// Which RV1909 verse feeds each target verse. Same number when the chapter has the
// same verse count; otherwise (Catholic versification, added passages) the nearby
// RV1909 verse with the most words in common, or none if nothing is close enough.
const words = (t) =>
  new Set(
    t
      .split(/\s+/)
      .map(norm)
      .filter((w) => w.length >= 3),
  );
const srcWords = {};
const sw = (c) => (srcWords[c] ??= (src.v[c] || []).map(words));
const srcIndex = {};
const remapped = [];
for (const c of Object.keys(dst.v)) {
  const sv = src.v[c] || [];
  if (sv.length === dst.v[c].length) continue;
  srcIndex[c] = dst.v[c].map((t, vi) => {
    const T = words(t);
    let best = null,
      bs = 0;
    for (const cc of [+c - 1, +c, +c + 1]) {
      // chapter breaks can differ (Job 40/41)
      if (!src.v[cc]) continue;
      sw(cc).forEach((S, i) => {
        if (cc === +c && Math.abs(i - vi) > 12) return;
        let n = 0;
        for (const w of T) if (S.has(w)) n++;
        const score =
          n / Math.max(1, Math.min(T.size, S.size)) -
          (cc === +c ? Math.abs(i - vi) * 0.01 : 0.15);
        if (score > bs) {
          bs = score;
          best = [String(cc), i];
        }
      });
    }
    return bs >= 0.3 ? best : null;
  });
  remapped.push(
    `${c}(${dst.v[c].length}/${sv.length}v, ${srcIndex[c].filter((x) => !x).length} unmatched)`,
  );
}

function verse(c, vi, stats, learn) {
  const text = dst.v[c][vi];
  const [sc, si] = srcIndex[c] ? srcIndex[c][vi] || [c, -1] : [c, vi];
  const toks = (si >= 0 && src.w[sc]?.[si]) || [];
  const S = [],
    St = [];
  toks.forEach((t, ti) =>
    t.t
      .split(/\s+/)
      .filter(Boolean)
      .forEach((w) => {
        S.push(norm(w));
        St.push(ti);
      }),
  );
  // words split at spaces, and also after an em dash ("spirit—because" → "spirit—" + "because",
  // the second marked J = no space before it, which the app renders via the token's j flag)
  const Traw = [],
    J = [];
  for (const piece of text.split(" ").filter(Boolean))
    piece
      .split(/(?<=—)/)
      .filter(Boolean)
      .forEach((w, k) => {
        Traw.push(w);
        J.push(k > 0);
      });
  const T = Traw.map(norm);
  const anchor = align(S, T); // 1. in-order alignment
  const map = anchor.slice();
  if (stats)
    anchor.forEach((i, j) => {
      stats.words++;
      if (i >= 0) S[i] === T[j] ? stats.exact++ : stats.fuzzy++;
    });
  const used = new Set(map.filter((i) => i >= 0));
  for (let j = 0; j < T.length; j++)
    if (map[j] < 0 && T[j].length >= 3) {
      // 2. moved words
      let best = -1,
        bs = -1;
      for (let i = 0; i < S.length; i++)
        if (!used.has(i)) {
          const s = sim(S[i], T[j]);
          const s2 = s - Math.abs(i / S.length - j / T.length) * 0.1;
          if (s >= 0.8 && s2 > bs) {
            bs = s2;
            best = i;
          }
        }
      if (best >= 0) {
        map[j] = best;
        used.add(best);
        if (stats) stats.moved++;
      }
    }
  for (let j = 0; j < T.length; ) {
    // 3. reworded spans between in-order anchors
    if (map[j] >= 0) {
      j++;
      continue;
    }
    let e = j;
    while (e < T.length && map[e] < 0) e++;
    let a = j - 1;
    while (a >= 0 && anchor[a] < 0) a--;
    let z = e;
    while (z < T.length && anchor[z] < 0) z++;
    const lo = a >= 0 ? anchor[a] + 1 : 0,
      hi = z < T.length ? anchor[z] : S.length;
    const sg = [];
    for (let i = lo; i < hi; i++) if (!used.has(i)) sg.push(i);
    const n = e - j,
      tks = [...new Set(sg.map((i) => St[i]))];
    let done = false;
    if (sg.length && T.slice(j, e).some(Boolean)) {
      if (tks.length === 1 && n <= 6) {
        for (let k = j; k < e; k++) map[k] = sg[0];
        done = true;
      } else if (n === sg.length && n <= 4) {
        for (let k = 0; k < n; k++) map[j + k] = sg[k];
        done = true;
      } else if (n === tks.length && n <= 4) {
        for (let k = 0; k < n; k++)
          map[j + k] = sg.find((i) => St[i] === tks[k]);
        done = true;
      }
    }
    if (done) {
      sg.forEach((i) => used.add(i));
      if (stats) stats.gap += n;
      if (
        learn &&
        n === 1 &&
        sg.length === 1 &&
        S[sg[0]].length >= 3 &&
        T[j].length >= 3
      )
        learn(S[sg[0]], T[j], Traw[j]);
    }
    j = e;
  }
  const tok = map.map((i) => (i >= 0 ? St[i] : -1));
  for (let j = 0; j < tok.length; j++)
    if (tok[j] < 0) {
      const has = (ti) =>
        ti >= 0 && toks[ti].t.split(/\s+/).some((w) => norm(w) === T[j]);
      if (T[j] && T[j].length <= 3) {
        // 4. small words join a neighbour containing them
        if (j + 1 < tok.length && has(tok[j + 1])) {
          tok[j] = tok[j + 1];
          if (stats) stats.filled++;
          continue;
        }
        if (j > 0 && has(tok[j - 1])) {
          tok[j] = tok[j - 1];
          if (stats) stats.filled++;
          continue;
        }
      }
      let p = j - 1;
      while (p >= 0 && tok[p] < 0) p--;
      let q = j + 1;
      while (q < tok.length && tok[q] < 0) q++;
      const tp = p >= 0 ? tok[p] : -2,
        tq = q < tok.length ? tok[q] : -3;
      if (tp === tq || (!T[j] && p >= 0)) {
        tok[j] = tp;
        if (stats) stats.filled++;
      }
    }
  const res = [];
  Traw.forEach((w, j) => {
    const ti = tok[j],
      last = res[res.length - 1];
    if (last && last._ti === ti && ti >= 0) {
      last.t += (J[j] ? "" : " ") + w;
      return;
    }
    const o = { _ti: ti, t: w };
    if (J[j]) o.j = true;
    if (ti >= 0) {
      const { t, j: _j, ...rest } = toks[ti];
      Object.assign(o, rest);
    } else if (stats) {
      stats.untagged++;
      stats.samples.push(`${c}:${vi + 1} "${w}"`);
    }
    res.push(o);
  });
  res.forEach((o) => delete o._ti);
  if (res.map((o, k) => (k && !o.j ? " " : "") + o.t).join("") !== text)
    throw new Error(`text mismatch ${c}:${vi + 1}`);
  return res;
}

// pass 1: learn renames (single word ↔ single word, seen at least twice, or capitalised names)
const seen = new Map();
for (const c of Object.keys(dst.v))
  dst.v[c].forEach((_, vi) =>
    verse(c, vi, null, (a, b, raw) => {
      const k = a + ">" + b,
        e = seen.get(k) || { n: 0, cap: /^[A-ZÁÉÍÓÚÑ]/.test(raw) };
      e.n++;
      seen.set(k, e);
    }),
  );
dict = new Map(
  [...seen].filter(
    ([k, e]) =>
      k.split(">").every((w) => w.length >= 5) &&
      (e.n >= 3 || (e.n >= 2 && e.cap)),
  ),
);
// pass 2
const stats = {
  words: 0,
  exact: 0,
  fuzzy: 0,
  moved: 0,
  gap: 0,
  filled: 0,
  untagged: 0,
  samples: [],
};
const out = {};
for (const c of Object.keys(dst.v))
  out[c] = dst.v[c].map((_, vi) => verse(c, vi, stats));
const { samples, ...st } = stats;
if (remapped.length)
  console.log(`chapters matched by wording: ${remapped.join(" ")}`);
console.log(
  book,
  st,
  `learned ${dict.size} renames`,
  `→ ${(100 * (1 - st.untagged / st.words)).toFixed(1)}% of RVG words tagged`,
);
if (REPORT)
  console.log([...dict.keys()].join("  ") + "\n" + samples.join("\n"));
if (process.env.SHOW)
  for (const r of process.env.SHOW.split(",")) {
    const [c, v] = r.split(":");
    const [sc, si] = srcIndex[c] ? srcIndex[c][v - 1] || [c, -1] : [c, v - 1];
    console.log(
      r,
      `(from ${SOURCE} ${sc}:${si + 1})`,
      `\n  ${SOURCE}:`,
      (src.w[sc]?.[si] || []).map((t) => `${t.t}|${t.s || "-"}`).join("  "),
      `\n  ${TARGET}:`,
      out[c][v - 1].map((t) => `${t.t}|${t.s || "-"}`).join("  "),
    );
  }
if (WRITE) {
  dst.w = out;
  fs.writeFileSync(
    new URL(`${TARGET}/${book}.json`, root),
    JSON.stringify(dst),
  );
  console.log(`wrote ${TARGET}/${book}.json`);
}
