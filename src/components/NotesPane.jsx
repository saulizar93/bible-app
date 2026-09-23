import { useState, useEffect } from "react";
import { byId } from "../books.js";
import { loadNotes, keyCovers, keyStart } from "../data.js";

export default function NotesPane({ lang, refPos, highlight, scroller }) {
  const [notes, setNotes] = useState(null); // null = loading, {} = loaded-empty
  const [error, setError] = useState(null);
  const bookNum = byId[refPos.book].n;

  useEffect(() => {
    let alive = true;
    setNotes(null);
    setError(null);
    loadNotes(lang, bookNum, refPos.chapter)
      .then((data) => {
        if (alive) setNotes(data || {});
      })
      .catch((e) => {
        if (alive) {
          setNotes({});
          setError(e.message);
        }
      });
    return () => {
      alive = false;
    };
  }, [lang, bookNum, refPos.chapter]);

  useEffect(() => {
    if (!notes || !highlight) return;
    const key = Object.keys(notes).find((k) => keyCovers(k, highlight));
    if (key)
      scroller.current
        ?.querySelector(`[data-v="${keyStart(key)}"]`)
        ?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [notes, highlight, scroller]);

  if (error) return <p className="err">Couldn't load notes: {error}</p>;
  if (!notes) return <p className="dim">Loading…</p>;

  const keys = Object.keys(notes).sort((a, b) => keyStart(a) - keyStart(b));
  if (!keys.length) {
    return (
      <p className="dim">
        No {lang === "es" ? "Spanish" : "English"} notes yet for{" "}
        {byId[refPos.book].en} {refPos.chapter}.
      </p>
    );
  }

  return keys.map((key) => {
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
}
