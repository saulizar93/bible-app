/**
 * Pointed Hebrew -> simple Latin transliteration, for the interlinear and for
 * searching the Hebrew text by sound: בְּרֵאשִׁית -> "bereʼshit", אֱלֹהִים -> "ʼelohim",
 * שָׁלוֹם -> "shalom", מִצְוֹת -> "mitsvot", מֶלֶךְ -> "melekh", רוּחַ -> "ruach".
 *
 * Plain letters (no macrons): ʼ = aleph, ʽ = ayin; b/v, k/kh, p/f by dagesh;
 * ח = ch, צ = ts, שׁ = sh, שׂ = s; vocal shva = e, silent shva = nothing;
 * dagesh forte doubles the letter; vav with holam/shureq and yod after i/e are
 * read as vowels. A reading aid, not a scholarly transliteration (qamats is
 * always a, and so on). Plain module: scripts/build-oshb-interlinear.mjs uses it too.
 */
const CONS = {
  "\u05D0": "ʼ", "\u05D1": "v", "\u05D2": "g", "\u05D3": "d", "\u05D4": "h", "\u05D5": "v",
  "\u05D6": "z", "\u05D7": "ch", "\u05D8": "t", "\u05D9": "y", "\u05DB": "kh", "\u05DA": "kh",
  "\u05DC": "l", "\u05DE": "m", "\u05DD": "m", "\u05E0": "n", "\u05DF": "n", "\u05E1": "s",
  "\u05E2": "ʽ", "\u05E4": "f", "\u05E3": "f", "\u05E6": "ts", "\u05E5": "ts", "\u05E7": "q",
  "\u05E8": "r", "\u05E9": "sh", "\u05EA": "t",
};
// with dagesh: bet, kaf, final kaf, pe, final pe
const HARD = { "\u05D1": "b", "\u05DB": "k", "\u05DA": "k", "\u05E4": "p", "\u05E3": "p" };
const VOWEL = {
  "\u05B1": "e", "\u05B2": "a", "\u05B3": "o", "\u05B4": "i", "\u05B5": "e", "\u05B6": "e",
  "\u05B7": "a", "\u05B8": "a", "\u05B9": "o", "\u05BA": "o", "\u05BB": "u", "\u05C7": "o",
};
const VAV = "\u05D5";
const YOD = "\u05D9";
const HE = "\u05D4";
const SHIN = "\u05E9";
const SHVA = "\u05B0";
const PATAH = "\u05B7";
const DAGESH = "\u05BC";
const SIN_DOT = "\u05C2";
const HOLAM = /[\u05B9\u05BA]/;
const OTHER_VOWEL = /[\u05B0-\u05B8\u05BB]/;
const GUTTURAL_END = /[\u05D7\u05E2\u05D4]/; // ח ע ה: furtive patah
// accents, meteg, rafe, paseq, sof pasuq and other marks; "/" (OSHB morpheme break); CGJ
const DROP = /[\u0591-\u05AF\u05BD\u05BF\u05C0\u05C3-\u05C6/]|\u034F/g;

/** Letters of a word with their points: [{ ch, pts }]. */
function letters(word) {
  const out = [];
  for (const c of String(word || "").normalize("NFD").replace(DROP, "")) {
    if (/[\u05B0-\u05C7]/.test(c)) {
      if (out.length) out[out.length - 1].pts += c;
    } else out.push({ ch: c, pts: "" });
  }
  return out;
}

// all vowels on the letter, in order (יְרוּשָׁלַ͏ִם has patah and hiriq on the lamed)
const vowelOf = (pts) => [...pts].map((c) => VOWEL[c] || "").join("");

function word(w) {
  const L = letters(w);
  let out = "";
  let prev = "start"; // what the previous letter carried: "start" | "vowel" | "shva" | "none"
  for (let i = 0; i < L.length; i++) {
    const { ch, pts } = L[i];
    if (!CONS[ch]) {
      out += ch; // punctuation, maqaf, etc.
      prev = "start";
      continue;
    }
    const last = i === L.length - 1 || !CONS[L[i + 1]?.ch];
    const dagesh = pts.includes(DAGESH);
    const v = vowelOf(pts);
    if (ch === VAV) {
      // holam male (וֹ) after a letter with no vowel; after a silent shva the vav is a
      // consonant (מִצְוֹת mitsvot)
      if (prev === "none" && HOLAM.test(pts) && !OTHER_VOWEL.test(pts)) {
        out += "o";
        prev = "vowel";
        continue;
      }
      // shureq (וּ): after a letter with no vowel, or the conjunction at the start
      if (dagesh && !v && !pts.includes(SHVA) && prev !== "vowel") {
        out += "u";
        prev = "vowel";
        continue;
      }
    }
    // yod after i/e with nothing of its own: a vowel letter, not y
    if (ch === YOD && !v && !pts.includes(SHVA) && !dagesh && /[ie]$/.test(out)) {
      prev = "vowel";
      continue;
    }
    let c = CONS[ch];
    if (ch === SHIN) c = pts.includes(SIN_DOT) ? "s" : "sh";
    if (dagesh && HARD[ch]) c = HARD[ch];
    // dagesh forte: the letter is doubled after a vowel (not a final mappiq he)
    const forte = dagesh && prev === "vowel" && ch !== VAV && !(last && ch === HE);
    if (forte) c += c;
    // furtive patah under a final ח, ע or הּ is read before the letter: rûach
    if (last && pts.includes(PATAH) && GUTTURAL_END.test(ch) && prev !== "start") {
      out += "a" + c;
      prev = "vowel";
      continue;
    }
    if (pts.includes(SHVA) && !v) {
      const vocal = !last && (prev === "start" || prev === "shva" || forte);
      out += c + (vocal ? "e" : "");
      prev = vocal ? "vowel" : "shva";
      continue;
    }
    out += c + v;
    prev = v ? "vowel" : "none";
  }
  return out;
}

/** Transliterate pointed Hebrew (one word or several; maqaf -> "-"). */
export function translitHebrew(text) {
  return String(text || "")
    .split(/(\s+|־)/)
    .map((part) => (/[\u05D0-\u05EA]/.test(part) ? word(part) : part === "\u05BE" ? "-" : part))
    .join("");
}
