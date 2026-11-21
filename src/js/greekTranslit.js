/**
 * Greek -> Latin transliteration in the style of the lexicon's own entries
 * (public/data/strongs: "heîs", "psychḗ", "Iēsoûs", "huiós"), so a word of the
 * Greek text and its dictionary form look alike: μία -> "mía", ἕν -> "hén",
 * οὗτος -> "hoûtos", ῥῆμα -> "rhēma", ἄγγελος -> "ángelos".
 *
 *   η -> ē, ω -> ō, θ -> th, φ -> ph, χ -> ch, ψ -> ps, ξ -> x;
 *   υ -> y, but u in αυ, ευ, ηυ, ου, υι; γ before γ κ ξ χ -> n;
 *   rough breathing -> h (rh on ρ); smooth breathing (U+0313) dropped; iota subscript -> i
 *   (ᾳ -> ai, ῳ -> ōi); acute, grave and circumflex (^) stay on the vowel
 *   that carries it; no circumflex on ē/ō (as the lexicon writes them: rhēma, sōma).
 *
 * Plain module (no browser APIs): scripts/build-kjtr.mjs imports it too.
 */
const LETTERS = {
  α: "a", β: "b", γ: "g", δ: "d", ε: "e", ζ: "z", η: "ē", θ: "th", ι: "i", κ: "k",
  λ: "l", μ: "m", ν: "n", ξ: "x", ο: "o", π: "p", ρ: "r", σ: "s", ς: "s", τ: "t",
  υ: "y", φ: "ph", χ: "ch", ψ: "ps", ω: "ō", ϝ: "w",
};
const ACUTE = "\u0301";
const GRAVE = "\u0300";
const CIRC = "\u0342";
const ROUGH = "\u0314";
const DIAER = "\u0308";
const YPOGEGRAMMENI = "\u0345";
const VOWELS = "αεηιουω";
const U_DIPH = new Set(["αυ", "ευ", "ηυ", "ου", "υι"]);

/** One word (or several, separated by spaces/punctuation, which pass through). */
export function translitGreek(text) {
  // Split into base letters, each with its combining marks.
  const chars = [];
  for (const ch of String(text || "").normalize("NFD")) {
    if (/\p{M}/u.test(ch) && chars.length) chars[chars.length - 1].marks += ch;
    else chars.push({ ch, marks: "" });
  }
  let out = "";
  let wordStart = true;
  for (let i = 0; i < chars.length; i++) {
    const { ch, marks } = chars[i];
    const low = ch.toLowerCase();
    const upper = low !== ch;
    let lat = LETTERS[low];
    if (lat === undefined) {
      out += ch;
      wordStart = !/\p{L}/u.test(ch);
      continue;
    }
    const prev = i > 0 ? chars[i - 1].ch.toLowerCase() : "";
    const next = i + 1 < chars.length ? chars[i + 1].ch.toLowerCase() : "";
    const nextMarks = i + 1 < chars.length ? chars[i + 1].marks : "";
    if (low === "υ") {
      const inDiph =
        (U_DIPH.has(prev + "υ") && !marks.includes(DIAER)) ||
        (U_DIPH.has("υ" + next) && !nextMarks.includes(DIAER));
      if (inDiph) lat = "u";
    }
    if (low === "γ" && "γκξχ".includes(next) && next) lat = "n";
    // Rough breathing: on the first vowel, or on the second of a diphthong
    // (οὗτος, αἷμα) -> "h" before the word; on ρ -> "rh".
    let h = "";
    if (marks.includes(ROUGH)) {
      if (low === "ρ") lat = "rh";
      else if (wordStart) h = "h";
    } else if (
      wordStart &&
      VOWELS.includes(low) &&
      next &&
      VOWELS.includes(next) &&
      nextMarks.includes(ROUGH)
    ) {
      h = "h";
    }
    let accent = "";
    if (marks.includes(ACUTE)) accent = ACUTE;
    else if (marks.includes(GRAVE)) accent = GRAVE;
    else if (marks.includes(CIRC) && low !== "η" && low !== "ω") accent = "\u0302";
    const diaer = marks.includes(DIAER) ? DIAER : "";
    // Accent goes on the vowel letter itself (the first letter of "ē"/"ō" is the vowel).
    let piece = lat[0] + diaer + accent + lat.slice(1);
    if (marks.includes(YPOGEGRAMMENI)) piece += "i";
    piece = h + piece;
    if (upper) piece = piece[0].toUpperCase() + piece.slice(1);
    out += piece;
    wordStart = false;
  }
  return out.normalize("NFC");
}

/** Lower case, no accents/marks: "Μία", "mía" -> "μια", "mia" (for matching). */
export const foldGreek = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ς/g, "σ")
    .toLowerCase();
