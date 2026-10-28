import { useState, useEffect } from "react";
import { byId } from "../../js/books.js";
import { loadNotes, keyCovers, keyStart, optionFor, packVersion } from "../../js/data.js";
import "./NotesPane.css";

export default function NotesPane({ lang, refPos, highlight, scroller }) {
  const bookNum = byId[refPos.book].n;
  // The loaded result remembers which chapter it belongs to; while a new chapter
  // loads, the old result simply doesn't match, so it counts as "loading" without
  // resetting state inside the effect.
  const want = `${lang}/${bookNum}/${refPos.chapter}`;
  const [result, setResult] = useState({ key: null, notes: null, error: null });
  const current = result.key === want;
  const notes = current ? result.notes : null; // null = loading, {} = loaded-empty
  const error = current ? result.error : null;

  useEffect(() => {
    let alive = true;
    loadNotes(lang, bookNum, refPos.chapter)
      .then((data) => {
        if (alive) setResult({ key: want, notes: data || {}, error: null });
      })
      .catch((e) => {
        if (alive) setResult({ key: want, notes: {}, error: e.message });
      });
    return () => {
      alive = false;
    };
  }, [lang, bookNum, refPos.chapter, want]);

  useEffect(() => {
    if (!notes || !highlight) return;
    const key = Object.keys(notes).find((k) => keyCovers(k, highlight));
    if (key)
      scroller.current
        ?.querySelector(`[data-v="${keyStart(key)}"]`)
        ?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [notes, highlight, scroller]);

  const es = lang === "es";
  if (error) return <p className="err">{es ? "No se pudieron cargar las notas" : "Couldn't load notes"}: {error}</p>;
  if (!notes) return <p className="dim">{es ? "Cargando…" : "Loading…"}</p>;

  const keys = Object.keys(notes).sort((a, b) => keyStart(a) - keyStart(b));
  if (!keys.length) {
    return (
      <p className="dim">
        {es
          ? `Aún no hay notas para ${byId[refPos.book].es} ${refPos.chapter}.`
          : `No notes yet for ${byId[refPos.book].en} ${refPos.chapter}.`}
      </p>
    );
  }

  // Authorship notice under the last note, styled like the Bible copyright (BiblePane.css .pane-copyright).
  const copyright = optionFor(`notes:${lang}`)?.copyright;

  const noteEls = keys.map((key) => {
    const isHit = highlight != null && keyCovers(key, highlight);
    return (
      <div
        key={key}
        data-v={keyStart(key)}
        className={isHit ? "note hit" : "note"}
      >
        <span className="note-ref">
          {refPos.chapter}:{key}
        </span>
        {notes[key].map((para, i) =>
          para.t === "hl" ? (
            <blockquote key={i} className="note-hl">
              {para.x}
            </blockquote>
          ) : (
            <p key={i} className="note-p">
              {para.x}
            </p>
          ),
        )}
      </div>
    );
  });

  return (
    <>
      {noteEls}
      {copyright && (
        <p className="pane-copyright">
          {copyright} {lang === "es" ? "Versión de las notas" : "Notes version"}: v{packVersion(`notes:${lang}`)}.
        </p>
      )}
    </>
  );
}
