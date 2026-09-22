import { useState, useEffect } from 'react';
import { byId } from '../books.js';
import { loadBook } from '../data.js';

export default function BiblePane({ code, refPos, highlight, scroller }) {
  const [verses, setVerses] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    setVerses(null);
    setError(null);
    loadBook(code, byId[refPos.book].n)
      .then(book => { if (alive) setVerses((book && book.v[refPos.chapter]) || []); })
      .catch(e => { if (alive) { setVerses([]); setError(e.message); } });
    return () => { alive = false; };
  }, [code, refPos.book, refPos.chapter]);

  useEffect(() => {
    if (!verses || !highlight) return;
    scroller.current?.querySelector(`[data-v="${highlight}"]`)
      ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [verses, highlight, scroller]);

  if (error) return <p className="err">Missing data file — run the build script for “{code}”.</p>;
  if (!verses) return <p className="dim">Loading…</p>;
  return verses.map((text, i) =>
    text ? (
      <p key={i} data-v={i + 1} className={highlight === i + 1 ? 'verse hit' : 'verse'}>
        <span className="vnum">{i + 1}</span>{text}
      </p>
    ) : null
  );
}
