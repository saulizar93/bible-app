/**
 * Finds Bible references in plain text ("1 Sam 16:11-13", "Is 11:10 KJV",
 * "Hch 2:38; 8:12", "1 Crón 16:4, 9, 23") so the notes can show them as links.
 * Nothing in the note files has to be marked up.
 *
 *   findRefs(text) -> [ "plain text", { text: "1 Sam 16:11-13", ref }, " more text", ... ]
 *   ref = { book: "1SA", chapter: 16, verses: [11, 12, 13], version: "KJV" | null }
 *
 * Rules that keep ordinary words from becoming links:
 *  - the book name must start with a capital letter ("Is 11:10", not "is"),
 *  - it must be followed by chapter:verse (a chapter alone is left as text),
 *  - the name must match a book (aliases below, or the start of an English or
 *    Spanish book name), so "Qur'an 3:59" stays plain.
 * Escape hatches: "!Mark 4:3" stays plain text (the "!" is removed);
 * "[[Jn 3]]"-style brackets are not needed for chapter:verse references.
 */
import { BOOKS, byId } from "./books.js";

const strip = (s) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

// Abbreviations that are not simply the start of a book name, or that would
// otherwise pick the wrong book ("Jud" = Jude, not Judges; "Ez" = Ezekiel).
const ALIAS = {
  gn: "GEN", ex: "EXO", lv: "LEV", nm: "NUM", dt: "DEU", jos: "JOS", jdg: "JDG", jue: "JDG", rt: "RUT",
  "1s": "1SA", "2s": "2SA", "1r": "1KI", "2r": "2KI", "1k": "1KI", "2k": "2KI", "1kgs": "1KI", "2kgs": "2KI",
  "1cr": "1CH", "2cr": "2CH", "1chr": "1CH", "2chr": "2CH",
  ps: "PSA", psa: "PSA", sal: "PSA", pr: "PRO", prv: "PRO", ecl: "ECC", ec: "ECC", qo: "ECC",
  sng: "SNG", cnt: "SNG", cant: "SNG", is: "ISA", isa: "ISA", jr: "JER", lm: "LAM",
  ez: "EZK", eze: "EZK", ezk: "EZK", dn: "DAN", os: "HOS", jl: "JOL", am: "AMO", abd: "OBA", ob: "OBA",
  jon: "JON", mi: "MIC", nah: "NAM", na: "NAM", hab: "HAB", sof: "ZEP", zep: "ZEP", ag: "HAG", hag: "HAG",
  zac: "ZEC", zec: "ZEC", mal: "MAL",
  mt: "MAT", mat: "MAT", matt: "MAT", mk: "MRK", mc: "MRK", mr: "MRK", mrk: "MRK", lk: "LUK", lc: "LUK", luk: "LUK",
  jn: "JHN", jhn: "JHN", jua: "JHN", hch: "ACT", hech: "ACT", ac: "ACT", act: "ACT",
  ro: "ROM", rom: "ROM", "1co": "1CO", "2co": "2CO", ga: "GAL", gal: "GAL", ef: "EPH", eph: "EPH",
  fil: "PHP", flp: "PHP", php: "PHP", phil: "PHP", col: "COL",
  "1ts": "1TH", "2ts": "2TH", "1th": "1TH", "2th": "2TH", "1tes": "1TH", "2tes": "2TH",
  "1ti": "1TI", "2ti": "2TI", "1tm": "1TI", "2tm": "2TI", tit: "TIT", tt: "TIT",
  flm: "PHM", phm: "PHM", phlm: "PHM", film: "PHM",
  heb: "HEB", he: "HEB", stg: "JAS", sant: "JAS", jas: "JAS", js: "JAS", jms: "JAS", jm: "JAS", stgo: "JAS",
  "1p": "1PE", "2p": "2PE", "1pe": "1PE", "2pe": "2PE", "1pet": "1PE", "2pet": "2PE",
  "1jn": "1JN", "2jn": "2JN", "3jn": "3JN", "1jo": "1JN", "2jo": "2JN", "3jo": "3JN", "1juan": "1JN", "2juan": "2JN", "3juan": "3JN",
  jud: "JUD", jude: "JUD", judas: "JUD", ap: "REV", apoc: "REV", rev: "REV", rv: "REV",
};

/** "1 Sam" / "Hch" / "Gál" / "Song of Solomon" -> book id, or null. */
export function bookIdOf(name) {
  const key = strip(name);
  if (!key) return null;
  if (ALIAS[key]) return ALIAS[key];
  const exact = BOOKS.find((b) => strip(b.id) === key);
  if (exact) return exact.id;
  if (key.length < 2) return null;
  const pref = BOOKS.find((b) => strip(b.en).startsWith(key) || strip(b.es).startsWith(key));
  return pref ? pref.id : null;
}

// Book: optional 1/2/3 (or I/II/III), a word starting with a capital ("Jn", "JOHN", may end in "."),
// or the two multi-word names. Then chapter:verse, a range or list of verses,
// and an optional version in capitals ("KJV", "RVG", "RV1909").
const NAME = String.raw`(?:(?:[123]|I{1,3})\s?)?(?:Song of Solomon|Song of Songs|Cantar de los Cantares|\p{Lu}\p{L}{0,12}\.?)`;
// More verses after a comma ("4, 9, 23"), but not the start of another reference:
// "Rom 8:28, 1 Cor 2:9" (a number then a book name) or "Jn 1:1, 3:16" (chapter:verse).
const ITEM = String.raw`\d+(?:\s?[-–]\s?\d+)?`;
const VERSES = String.raw`${ITEM}(?:,\s?${ITEM}(?![\d:])(?!\s?\p{L}+\.?\s?\d))*`;
const RE = new RegExp(
  String.raw`(!)?(?<![\p{L}\p{N}'’])(${NAME})\s?(\d+):(${VERSES})(?:\s(\p{Lu}{2,6}\d{0,4})\b)?`,
  "gu",
);
// "; 8:12" or ", 3:16" right after a reference: same book, another chapter.
const MORE = new RegExp(String.raw`^([;,]\s?)(\d+):(${VERSES})(?:\s(\p{Lu}{2,6}\d{0,4})\b)?`, "u");

/** "11-13, 15" -> [11, 12, 13, 15] (at most 40 verses). */
function verseList(s) {
  const out = [];
  for (const part of s.split(",")) {
    const [a, b] = part.split(/[-–]/).map((x) => parseInt(x, 10));
    if (!a) continue;
    const end = b && b >= a ? Math.min(b, a + 39) : a;
    for (let v = a; v <= end && out.length < 40; v++) out.push(v);
  }
  return out;
}

const okChapter = (id, ch) => ch >= 1 && ch <= (byId[id]?.chapters || 0);

/** Split text into plain strings and reference objects. */
export function findRefs(text) {
  const src = String(text || "");
  const out = [];
  let last = 0;
  RE.lastIndex = 0;
  let m;
  while ((m = RE.exec(src))) {
    const [whole, bang, name, ch, vs, ver] = m;
    const id = bookIdOf(name);
    if (bang) {
      // "!Mark 4:3": keep as text, drop the "!"
      if (m.index > last) out.push(src.slice(last, m.index));
      out.push(whole.slice(1));
      last = m.index + whole.length;
      continue;
    }
    if (!id || !okChapter(id, +ch)) continue;
    if (m.index > last) out.push(src.slice(last, m.index));
    out.push({ text: whole, ref: { book: id, chapter: +ch, verses: verseList(vs), version: ver || null } });
    last = m.index + whole.length;
    // follow-on "; 8:12; 10:48" for the same book
    let rest;
    while ((rest = MORE.exec(src.slice(last)))) {
      const [all, sep, ch2, vs2, ver2] = rest;
      if (!okChapter(id, +ch2)) break;
      out.push(sep);
      out.push({
        text: all.slice(sep.length),
        ref: { book: id, chapter: +ch2, verses: verseList(vs2), version: ver2 || ver || null },
      });
      last += all.length;
    }
    RE.lastIndex = last;
  }
  if (last < src.length) out.push(src.slice(last));
  return out;
}
