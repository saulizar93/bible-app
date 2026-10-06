#!/usr/bin/env node
/**
 * Add morphology ("m") and the original-language word ("g") to a Strong's-tagged
 * Bible that only has {t, s}, by borrowing them from the KJV w/Strong data,
 * verse by verse.
 *
 *   node scripts/add-morph-from-kjv.mjs public/data/bibles/rv1909-strong
 *   node scripts/add-morph-from-kjv.mjs <targetDir> [sourceDir=public/data/bibles/kjv-strong]
 *
 * Both the KJV and the RV1909 translate the Textus Receptus / Masoretic Text and
 * tag the same Strong's numbers, so within one verse a Strong's number points at
 * the same Greek/Hebrew word in both. For each tagged token in the target:
 *   - collect the KJV tokens in the same verse with the same Strong's number
 *     (consecutive repeats of one word, e.g. "should … perish" = αποληται, count once);
 *   - the k-th occurrence in the target takes the k-th KJV occurrence;
 *   - if there are fewer KJV occurrences but they all agree (same m and g),
 *     that form is used; otherwise the token is left as it was.
 * Tokens whose number the KJV doesn't tag in that verse (e.g. the Greek article
 * G3588, which the KJV often leaves untagged) stay without m/g.
 *
 * Writes the target files in place. Safe to re-run (existing m/g are recomputed).
 * Re-run after rebuilding the target from its SWORD module.
 * Note: the KJV has Greek forms ("g") for the NT only; in the OT it carries
 * Strong's verb codes ("m" = TH8804 etc.) on verbs, so OT tokens get "m" only.
 */
import fs from "node:fs";
import path from "node:path";

const [targetDir, sourceDir = "public/data/bibles/kjv-strong"] = process.argv.slice(2);
if (!targetDir) {
  console.error("usage: node scripts/add-morph-from-kjv.mjs <targetDir> [sourceDir]");
  process.exit(1);
}

const same = (a, b) => a.m === b.m && a.g === b.g;
let tagged = 0, gotM = 0, gotG = 0, ambiguous = 0, missing = 0, verseMismatch = 0;

for (const file of fs.readdirSync(targetDir)) {
  if (!/^\d+\.json$/.test(file)) continue;
  const tPath = path.join(targetDir, file), sPath = path.join(sourceDir, file);
  if (!fs.existsSync(sPath)) continue;
  const tgt = JSON.parse(fs.readFileSync(tPath, "utf8"));
  const src = JSON.parse(fs.readFileSync(sPath, "utf8"));
  if (!tgt.w) continue;

  for (const [c, verses] of Object.entries(tgt.w)) {
    verses.forEach((tokens, vi) => {
      if (!tokens?.length) return;
      const kjv = src.w?.[c]?.[vi];
      // KJV forms per Strong's number, in order, collapsing consecutive repeats
      const forms = new Map();
      for (const k of kjv || []) {
        if (!k.s || (!k.m && !k.g)) continue;
        const list = forms.get(k.s) || [];
        const last = list[list.length - 1];
        if (!last || !same(last, k)) list.push({ m: k.m, g: k.g });
        forms.set(k.s, list);
      }
      if (!kjv) verseMismatch++;
      const seen = new Map();
      for (const tok of tokens) {
        if (!tok.s) continue;
        tagged++;
        delete tok.m;
        delete tok.g;
        const list = forms.get(tok.s);
        const k = seen.get(tok.s) || 0;
        seen.set(tok.s, k + 1);
        if (!list?.length) { missing++; continue; }
        let f = list[k];
        if (!f) {
          if (list.every((x) => same(x, list[0]))) f = list[0];
          else { ambiguous++; continue; }
        }
        if (f.m) { tok.m = f.m; gotM++; }
        if (f.g) { tok.g = f.g; gotG++; }
      }
    });
  }
  fs.writeFileSync(tPath, JSON.stringify(tgt));
}

const pct = (n) => ((100 * n) / tagged).toFixed(1) + "%";
console.log(`${tagged.toLocaleString()} tagged tokens in ${targetDir}`);
console.log(`  + morphology (m):   ${gotM.toLocaleString()} (${pct(gotM)})`);
console.log(`  + original word (g): ${gotG.toLocaleString()} (${pct(gotG)})`);
console.log(`  no KJV form for that number in that verse (OT nouns, untagged articles…): ${missing.toLocaleString()} · ambiguous, left as is: ${ambiguous.toLocaleString()}`);
