// node align.mjs <book> [--json]  -> aligns rv1909-strong verses to RVG verses by text similarity
import fs from "node:fs";
const dir = new URL("../../public/data/bibles/", import.meta.url);
const book = +process.argv[2];
const A = JSON.parse(fs.readFileSync(new URL(`rv1909-strong/${book}.json`, dir)));
const B = JSON.parse(fs.readFileSync(new URL(`rvg/${book}.json`, dir)));
const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zñ ]/g, " ").split(/\s+/).filter((x) => x.length > 2);
const sim = (x, y) => { const a = new Set(norm(x)), b = new Set(norm(y)); if (!a.size || !b.size) return 0; let i = 0; for (const t of a) if (b.has(t)) i++; return i / Math.min(a.size, b.size); };
const chs = (o) => Object.keys(o.v).map(Number).sort((a, b) => a - b);
const S = [], R = [];
for (const c of chs(A)) A.v[c].forEach((t, i) => { if (t && t.trim()) S.push({ c, v: i + 1, t, w: A.w[c][i] }); });
for (const c of chs(B)) B.v[c].forEach((t, i) => R.push({ c, v: i + 1, t }));
// DP: ops match(1:1), split(1 S -> 2 R), merge(2 S -> 1 R), skipS, skipR
const n = S.length, m = R.length, NEG = -1e9;
const W = 60; // band around diagonal
const dp = new Map(), bk = new Map(); const K = (i, j) => i * (m + 1) + j;
dp.set(K(0, 0), 0);
for (let i = 0; i <= n; i++) for (let j = Math.max(0, i - W); j <= Math.min(m, i + W); j++) {
  const cur = dp.get(K(i, j)); if (cur === undefined) continue;
  const upd = (ii, jj, sc, op) => { const k = K(ii, jj); if (dp.get(k) === undefined || dp.get(k) < cur + sc) { dp.set(k, cur + sc); bk.set(k, [i, j, op]); } };
  if (i < n && j < m) upd(i + 1, j + 1, sim(S[i].t, R[j].t), "m");
  if (i < n && j + 1 < m) upd(i + 1, j + 2, sim(S[i].t, R[j].t + " " + R[j + 1].t) - 0.3, "s");
  if (i + 1 < n && j < m) upd(i + 2, j + 1, sim(S[i].t + " " + S[i + 1].t, R[j].t) - 0.3, "g");
  if (i < n) upd(i + 1, j, -0.6, "xS");
  if (j < m) upd(i, j + 1, -0.6, "xR");
}
let i = n, j = m; const ops = [];
while (i || j) { const [pi, pj, op] = bk.get(K(i, j)); ops.push({ op, i: pi, j: pj }); i = pi; j = pj; }
ops.reverse();
const out = [];
for (const o of ops) {
  const s = S[o.i], r = R[o.j];
  if (o.op === "m") out.push({ op: "m", s: [o.i], r: [o.j], sc: sim(s.t, r.t) });
  else if (o.op === "s") out.push({ op: "split", s: [o.i], r: [o.j, o.j + 1] });
  else if (o.op === "g") out.push({ op: "merge", s: [o.i, o.i + 1], r: [o.j] });
  else if (o.op === "xS") out.push({ op: "extraS", s: [o.i], r: [] });
  else out.push({ op: "missingR", s: [], r: [o.j] });
}
if (process.argv.includes("--json")) { process.stdout.write(JSON.stringify({ S, R, out })); process.exit(0); }
const ref = (x) => `${x.c}:${x.v}`;
for (const o of out) {
  const moved = o.op !== "m" || ref(S[o.s[0]]) !== ref(R[o.r[0]]);
  const low = o.op === "m" && o.sc < 0.35;
  if (moved || low) console.log(o.op, o.s.map((k) => ref(S[k])).join("+") || "-", "->", o.r.map((k) => ref(R[k])).join("+") || "-", o.sc !== undefined ? o.sc.toFixed(2) : "");
}
