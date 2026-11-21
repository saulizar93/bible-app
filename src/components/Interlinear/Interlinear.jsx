import { translitGreek } from "../../js/greekTranslit.js";
import { translitHebrew } from "../../js/hebrewTranslit.js";
import { normalizeStrong } from "../../js/strongsCode.js";
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
 *  "The book" for βίβλος in the KJV, "libro" in the RVG. */
function glosses(words, tokens) {
  const queue = new Map();
  for (const tok of tokens || []) {
    if (!tok.s) continue;
    const c = normalizeStrong(tok.s);
    if (!queue.has(c)) queue.set(c, []);
    queue.get(c).push(trimPunct(tok.t));
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
