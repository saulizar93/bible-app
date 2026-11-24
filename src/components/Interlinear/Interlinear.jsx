import { translitGreek } from "../../js/greekTranslit.js";
import { translitHebrew } from "../../js/hebrewTranslit.js";
import { normalizeStrong } from "../../js/strongsCode.js";
import { LEAD } from "../../js/renderings.js";
import "./Interlinear.css";

const T = {
  en: {
    greek: "Greek (KJTR)",
    hebrew: "Hebrew (WLC)",
    close: (h) => `Hide the ${h ? "Hebrew" : "Greek"}`,
    missing: (h) => `No ${h ? "Hebrew" : "Greek"} text for this verse.`,
  },
  es: {
    greek: "Griego (KJTR)",
    hebrew: "Hebreo (WLC)",
    close: (h) => `Ocultar el ${h ? "hebreo" : "griego"}`,
    missing: (h) => `No hay texto ${h ? "hebreo" : "griego"} para este versículo.`,
  },
};

const bare = (w) => w.replace(/[^\p{L}\p{M}]/gu, "");
const trimPunct = (w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");

/** For each original word, the word tagged with the same Strong's number in the
 *  gloss Bible (KJV for English panes, RVG for Spanish ones), in order:
 *  "The book" for βίβλος in the KJV, "libro" in the RVG.
 *  The Bible sometimes tags one Greek/Hebrew word on two separate pieces of its
 *  text: "the Holy Ghost" is the (G4151) Holy (G40) Ghost (G4151) for πνεύματος
 *  ἁγίου. When a number has more pieces than the verse has words with it, the
 *  pieces are joined into one gloss per word ("the Ghost"): a piece made only of
 *  articles/prepositions joins the next piece, otherwise the two closest pieces. */
function glosses(words, tokens) {
  const pieces = new Map(); // code -> [{ t, at }]
  (tokens || []).forEach((tok, at) => {
    if (!tok.s) return;
    const c = normalizeStrong(tok.s);
    if (!pieces.has(c)) pieces.set(c, []);
    pieces.get(c).push({ t: trimPunct(tok.t), at, last: at });
  });
  const need = new Map();
  for (const [, code] of words) if (code) need.set(code, (need.get(code) || 0) + 1);
  const queue = new Map();
  for (const [code, list] of pieces) {
    const n = need.get(code) || 0;
    const groups = list.map((p) => ({ ...p }));
    const merge = (i) => {
      const a = groups[i];
      const b = groups[i + 1];
      groups.splice(i, 2, { t: `${a.t} ${b.t}`.trim(), at: a.at, last: b.last });
    };
    // "the" + "Ghost": a piece of only articles/prepositions goes with the next one
    for (let i = 0; groups.length > n && n > 0 && i < groups.length - 1; ) {
      const onlyLead = groups[i].t && groups[i].t.toLowerCase().split(" ").every((w) => LEAD.has(w));
      if (onlyLead) merge(i);
      else i++;
    }
    // still too many: join the two pieces that stand closest together
    while (n > 0 && groups.length > n) {
      let best = 0;
      for (let i = 1; i < groups.length - 1; i++)
        if (groups[i + 1].at - groups[i].last < groups[best + 1].at - groups[best].last) best = i;
      merge(best);
    }
    queue.set(code, groups.map((g) => g.t));
  }
  return words.map(([, code]) => (code && queue.get(code)?.shift()) || "");
}

/**
 * The Greek (New Testament) or Hebrew (Old Testament) of one verse under it, word
 * by word: the original word, its transliteration, the word the KJV (English panes)
 * or RVG (Spanish panes) tags with the same number, whatever Bible the pane shows,
 * and the Strong's number with the parsing. Hebrew runs right
 * to left. Tapping a word opens its definition (same panel as a tagged word of the
 * Bible). Spans only: it sits inside the verse's <p>.
 */
export default function Interlinear({ words, tokens, glossLabel, hebrew = false, lang = "en", onWordClick, onClose }) {
  const t = T[lang] || T.en;
  const gl = words ? glosses(words, tokens) : [];
  const translit = hebrew ? translitHebrew : translitGreek;
  return (
    <span
      className={hebrew ? "interlinear hebrew" : "interlinear"}
      lang={hebrew ? "hbo" : "grc"}
      onClick={(e) => e.stopPropagation()}
    >
      <span className="il-head" lang={lang}>
        <span className="il-title">
          {hebrew ? t.hebrew : t.greek}
          {glossLabel ? ` · ${glossLabel}` : ""}
        </span>
        <button type="button" className="il-close" aria-label={t.close(hebrew)} title={t.close(hebrew)} onClick={onClose}>
          ×
        </button>
      </span>
      {!words?.length ? (
        <span className="il-missing" lang={lang}>{t.missing(hebrew)}</span>
      ) : (
        <span className="il-words" dir={hebrew ? "rtl" : undefined}>
          {words.map(([w, code, morph], i) => {
            const plain = hebrew ? w : bare(w);
            const cell = (
              <>
                <span className="il-gr" dir={hebrew ? "rtl" : undefined}>{w}</span>
                <span className="il-tr" lang="en" dir="ltr">{translit(plain)}</span>
                <span className="il-gloss" lang={lang} dir="ltr">{gl[i] || " "}</span>
                <span className="il-code" lang="en" dir="ltr">
                  {code || "—"}
                  {morph ? ` · ${morph}` : ""}
                </span>
              </>
            );
            return code ? (
              <button
                key={i}
                type="button"
                className="il-word"
                onClick={() => onWordClick?.(code, plain, { m: morph, g: plain })}
              >
                {cell}
              </button>
            ) : (
              <span key={i} className="il-word">
                {cell}
              </span>
            );
          })}
        </span>
      )}
    </span>
  );
}
