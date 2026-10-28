#!/usr/bin/env node
/**
 * Writes public/data/manifest.json: a short content hash for every data file the
 * app stores on the device (bibles, notes, strongs, concord), and a version
 * number per pack (one Bible, one set of notes, the lexicon, one concordance).
 *
 * The app saves each file under "<file>@<hash>", so after an update a phone only
 * downloads the files whose contents actually changed, and deletes the old copies
 * once the new ones are stored (src/js/data.js). Nobody has to raise version
 * numbers by hand any more.
 *
 * A pack's version goes up by 1 only when one of its files changed since the
 * previous manifest.json, so commit manifest.json together with the data.
 * Runs automatically before `npm run dev` and `npm run build`.
 *
 *   node scripts/build-manifest.mjs           update the manifest
 *   node scripts/build-manifest.mjs --reset   start every pack again at version 1
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DATA = path.join(ROOT, "public", "data");
const OUT = path.join(DATA, "manifest.json");
const reset = process.argv.includes("--reset");

const hash = (buf, n = 10) => crypto.createHash("sha1").update(buf).digest("hex").slice(0, n);

/** "bibles/rvg-strong/40.json" -> "bible:rvg-strong"; concord at the root (KJV's) -> "concord:root". */
function packOf(rel) {
  const p = rel.split("/");
  if (p[0] === "bibles") return `bible:${p[1]}`;
  if (p[0] === "notes") return `notes:${p[1]}`;
  if (p[0] === "strongs") return "lexicon";
  if (p[0] === "concord") return p[1] === "greek" || p[1] === "hebrew" ? "concord:root" : `concord:${p[1]}`;
  return null;
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (e.name.endsWith(".json")) out.push(full);
  }
  return out;
}

const files = {};
for (const top of ["bibles", "notes", "strongs", "concord"]) {
  const dir = path.join(DATA, top);
  if (!fs.existsSync(dir)) continue;
  for (const f of walk(dir).sort()) {
    const rel = path.relative(DATA, f).split(path.sep).join("/");
    // Line endings don't change the content: hash with \n so Windows and Linux agree.
    const text = fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n");
    files[rel] = hash(text);
  }
}

const prev = !reset && fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};
const groups = {};
for (const [rel, h] of Object.entries(files)) {
  const p = packOf(rel);
  (groups[p] ||= []).push(`${rel}:${h}`);
}
const packs = {};
const bumped = [];
for (const [p, list] of Object.entries(groups).sort()) {
  const sig = hash(list.join("\n"), 12);
  const old = prev.packs?.[p];
  if (old && old.sig === sig) packs[p] = old;
  else {
    packs[p] = { v: old ? old.v + 1 : 1, sig };
    if (old) bumped.push(`${p} v${packs[p].v}`);
  }
}

const unchanged = prev.packs && JSON.stringify(prev.packs) === JSON.stringify(packs) && JSON.stringify(prev.files) === JSON.stringify(files);
const manifest = { updated: unchanged ? prev.updated : new Date().toISOString().slice(0, 10), packs, files };
const json = JSON.stringify(manifest, null, 1) + "\n";
if (!fs.existsSync(OUT) || fs.readFileSync(OUT, "utf8") !== json) fs.writeFileSync(OUT, json);
console.log(
  `manifest: ${Object.keys(files).length} files, ${Object.keys(packs).length} packs` +
    (reset ? " (all reset to v1)" : bumped.length ? `; new versions: ${bumped.join(", ")}` : unchanged ? "; no changes" : ""),
);
