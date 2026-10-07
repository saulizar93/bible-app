// node remap.mjs <book...> [--write]
// Re-versifies rv1909-strong to RVG's verse numbering by text alignment.
// Splits one verse into several (text + w tokens cut at the same word boundary) or merges verses when needed.
import fs from "node:fs";
const dir = new URL("../../public/data/bibles/", import.meta.url);
const WRITE = process.argv.includes("--write");
const books = process.argv.slice(2).filter((a) => !a.startsWith("--")).map(Number);
const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zñ ]/g, " ").split(/\s+/).filter((x) => x.length > 2);
const simSet = (a, b) => { if (!a.size || !b.size) return 0; let i = 0; for (const t of a) if (b.has(t)) i++; return (2 * i) / (a.size + b.size); };
const sim = (x, y) => simSet(new Set(norm(x)), new Set(norm(y)));
const uni = (...sets) => { const u = new Set(); for (const s of sets) for (const t of s) u.add(t); return u; };
const chs = (o) => Object.keys(o.v).map(Number).sort((a, b) => a - b);

// split one S verse (text + tokens) into k pieces best matching rTexts
function splitVerse(s, rTexts) {
  const toks = s.w || [];
  const k = rTexts.length, n = toks.length;
  if (n < k) return null;
  const piece = (a, b) => toks.slice(a, b).map((x) => x.t).join(" ");
  // dp[j][i] best score using first i tokens for first j pieces
  const dp = Array.from({ length: k + 1 }, () => new Array(n + 1).fill(-1e9)), bk = Array.from({ length: k + 1 }, () => new Array(n + 1).fill(0));
  dp[0][0] = 0;
  for (let j = 1; j <= k; j++) for (let i = j; i <= n - (k - j); i++) for (let p = j - 1; p < i; p++) {
    if (dp[j - 1][p] < -1e8) continue;
    const prevTok = p > 0 ? toks[p - 1].t : "";
    const bonus = p === 0 || /[.:;?!]["»”)]?$/.test(prevTok) ? 0.15 : /,$/.test(prevTok) ? 0.05 : 0;
    const sc = dp[j - 1][p] + sim(piece(p, i), rTexts[j - 1]) + (j > 1 ? bonus : 0);
    if (sc > dp[j][i]) { dp[j][i] = sc; bk[j][i] = p; }
  }
  const cuts = []; let i = n;
  for (let j = k; j > 0; j--) { const p = bk[j][i]; cuts.unshift([p, i]); i = p; }
  // map token cuts to text positions (ignore whitespace differences)
  const text = s.t; const ends = []; let pos = 0;
  for (const tk of toks) { for (const ch of tk.t) { if (/\s/.test(ch)) continue; while (pos < text.length && /\s/.test(text[pos])) pos++; pos++; } ends.push(pos); }
  return cuts.map(([a, b]) => ({ t: text.slice(a === 0 ? 0 : ends[a - 1], ends[b - 1]).trim(), w: toks.slice(a, b) }));
}

for (const book of books) {
  const fA = new URL(`rv1909-strong/${book}.json`, dir);
  const A = JSON.parse(fs.readFileSync(fA)), B = JSON.parse(fs.readFileSync(new URL(`rvg/${book}.json`, dir)));
  const S = [], R = [];
  for (const c of chs(A)) A.v[c].forEach((t, i) => { if (t && t.trim()) S.push({ c, v: i + 1, t, w: A.w[c][i] || [] }); });
  for (const c of chs(B)) B.v[c].forEach((t, i) => R.push({ c, v: i + 1, t: t || "" }));
  for (const x of S) x.set = new Set(norm(x.t)); for (const x of R) x.set = new Set(norm(x.t));
  const n = S.length, m = R.length, W = 40, K = (i, j) => i * (m + 1) + j;
  const dp = new Map([[0, 0]]), bk = new Map();
  for (let i = 0; i <= n; i++) for (let j = Math.max(0, i - W); j <= Math.min(m, i + W); j++) {
    const cur = dp.get(K(i, j)); if (cur === undefined) continue;
    const upd = (ii, jj, sc, op) => { const k = K(ii, jj); if (!(dp.get(k) >= cur + sc)) { dp.set(k, cur + sc); bk.set(k, [i, j, op]); } };
    if (i < n) for (let l = 1; l <= 10 && j + l <= m; l++) {
      const rl = R.slice(j, j + l).reduce((a, x) => a + x.t.length, 0), lp = 0.5 * Math.abs(S[i].t.length - rl) / Math.max(S[i].t.length, rl);
      const sc = -lp + (l === 1 ? simSet(S[i].set, R[j].set) : simSet(S[i].set, uni(...R.slice(j, j + l).map((x) => x.set))) - 0.12 * (l - 1));
      upd(i + 1, j + l, sc, ["S", l]);
    }
    for (let g = 2; g <= 3 && i + g <= n && j < m; g++) upd(i + g, j + 1, simSet(uni(...S.slice(i, i + g).map((x) => x.set)), R[j].set) - 0.3 * (g - 1), ["G", g]);
    if (j < m) upd(i, j + 1, -0.5, ["X", 0]);
    if (i < n) upd(i + 1, j, -0.5, ["D", 0]);
  }
  let i = n, j = m; const ops = [];
  while (i || j) { const [pi, pj, op] = bk.get(K(i, j)); ops.push([pi, pj, op]); i = pi; j = pj; }
  ops.reverse();
  // build new v / w using RVG chapter sizes
  const nv = {}, nw = {};
  for (const c of chs(B)) { nv[c] = new Array(B.v[c].length).fill(""); nw[c] = Array.from({ length: B.v[c].length }, () => []); }
  const report = [];
  for (const [pi, pj, [op, k]] of ops) {
    if (op === "S" && k === 1) { const s = S[pi], r = R[pj]; nv[r.c][r.v - 1] = s.t; nw[r.c][r.v - 1] = s.w; if (s.c !== r.c || s.v !== r.v) report.push(`move ${s.c}:${s.v} -> ${r.c}:${r.v}`); }
    else if (op === "S") { const s = S[pi], rs = R.slice(pj, pj + k); const parts = splitVerse(s, rs.map((x) => x.t));
      if (!parts) { report.push(`!! cannot split ${s.c}:${s.v}`); continue; }
      parts.forEach((p, q) => { const r = rs[q]; nv[r.c][r.v - 1] = p.t; nw[r.c][r.v - 1] = p.w; });
      report.push(`split ${s.c}:${s.v} -> ${rs.map((r) => r.c + ":" + r.v).join(", ")}\n    ` + parts.map((p, q) => `[${rs[q].c}:${rs[q].v}] ${p.t}`).join("\n    ")); }
    else if (op === "G") { const ss = S.slice(pi, pi + k), r = R[pj]; nv[r.c][r.v - 1] = ss.map((x) => x.t).join(" "); nw[r.c][r.v - 1] = ss.flatMap((x) => x.w); report.push(`merge ${ss.map((s) => s.c + ":" + s.v).join("+")} -> ${r.c}:${r.v}`); }
    else if (op === "X") report.push(`!! no RV1909 text for ${R[pj].c}:${R[pj].v}`);
    else report.push(`!! RV1909 ${S[pi].c}:${S[pi].v} unmatched (dropped?)`);
  }
  console.log(`=== book ${book}: ${report.length} changes`);
  for (const r of report) console.log("  " + r);
  // sanity: token count preserved
  const before = S.reduce((a, s) => a + s.w.length, 0), after = Object.values(nw).flat().reduce((a, x) => a + x.length, 0);
  console.log(`  tokens before ${before} after ${after}`);
  if (WRITE && before === after && !report.some((r) => r.startsWith("!!"))) { A.v = nv; A.w = nw; fs.writeFileSync(fA, JSON.stringify(A)); console.log("  written"); }
  else if (WRITE) console.log("  NOT written (check issues)");
}
