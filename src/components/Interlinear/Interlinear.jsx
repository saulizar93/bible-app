import { translitGreek } from "../../js/greekTranslit.js";
import { normalizeStrong } from "../../js/strongsCode.js";
import "./Interlinear.css";

const T = {
  en: { title: "Greek (KJTR)", close: "Hide the Greek", missing: "No Greek text for this verse." },
  es: { title: "Griego (KJTR)", close: "Ocultar el griego", missing: "No hay texto griego para este versículo." },
};

const bare = (w) => w.replace(/[^\p{L}\p{M}]/gu, "");
const trimPunct = (w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");

/** For each Greek word, the pane's word tagged with the same Strong's number, in
 *  order ("The book" for βίβλος in the KJV, "El libro" in the RVG). */
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
 * The Greek of one verse under it, word by word: the Greek word, its
 * transliteration, the word of this Bible tagged with the same number, and the
 * Strong's number with the parsing. Tapping a word opens its definition
 * (same panel as a tagged word of the Bible). Spans only: it sits inside the
 * verse's <p>.
 */
export default function Interlinear({ words, tokens, lang = "en", onWordClick, onClose }) {
  const t = T[lang] || T.en;
  const gl = words ? glosses(words, tokens) : [];
  return (
    <span className="interlinear" lang="grc" onClick={(e) => e.stopPropagation()}>
      <span className="il-head">
        <span className="il-title">{t.title}</span>
        <button type="button" className="il-close" aria-label={t.close} title={t.close} onClick={onClose}>
          ×
        </button>
      </span>
      {!words?.length ? (
        <span className="il-missing">{t.missing}</span>
      ) : (
        <span className="il-words">
          {words.map(([w, code, morph], i) => {
            const plain = bare(w);
            const cell = (
              <>
                <span className="il-gr">{w}</span>
                <span className="il-tr" lang="en">{translitGreek(plain)}</span>
                <span className="il-gloss" lang={lang}>{gl[i] || " "}</span>
                <span className="il-code" lang="en">
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
