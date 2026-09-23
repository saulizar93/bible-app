import { useState, useEffect } from 'react';
import { byNum } from '../books.js';
import { loadStrongsEntry, loadConcordance, decodeVid } from '../data.js';

const MAX_SHOWN = 50;

export default function StrongsPanel({ code, word, onClose, onJump }) {
  const [entry, setEntry] = useState(undefined); // undefined = loading, null = not found
  const [refs, setRefs] = useState(null);

  useEffect(() => {
    let alive = true;
    setEntry(undefined);
    setRefs(null);
    loadStrongsEntry(code).then(e => { if (alive) setEntry(e); }).catch(() => { if (alive) setEntry(null); });
    loadConcordance(code).then(list => { if (alive) setRefs(list); }).catch(() => { if (alive) setRefs([]); });
    return () => { alive = false; };
  }, [code]);

  const shown = (refs || []).slice(0, MAX_SHOWN);

  return (
    <aside className="strongs-panel" role="dialog" aria-label="Strong's definition">
      <button type="button" className="strongs-close" onClick={onClose} aria-label="Close">×</button>

      <div className="strongs-head">
        <span className="strongs-code">{code}</span>
        {entry?.gr && <span className="strongs-greek">{entry.gr}</span>}
      </div>
      {entry?.tr && (
        <p className="dim strongs-translit">
          {entry.tr}{entry.pron ? ` · ${entry.pron}` : ''}
        </p>
      )}
      {word && <p className="dim">Translated “{word}” here.</p>}

      {entry === undefined ? (
        <p className="dim">Loading…</p>
      ) : entry === null ? (
        <p className="dim">No lexicon entry found for {code}.</p>
      ) : (
        <>
          {entry.def && <p className="note-p">{entry.def}</p>}
          {entry.deriv && <p className="dim">{entry.deriv}</p>}
          {entry.kjv && <p className="strongs-kjv">KJV usage: {entry.kjv}</p>}
        </>
      )}

      <h4 className="strongs-sub">Other occurrences{refs ? ` (${refs.length})` : ''}</h4>
      {refs === null ? (
        <p className="dim">Loading…</p>
      ) : shown.length === 0 ? (
        <p className="dim">No other tagged occurrences yet.</p>
      ) : (
        <ul className="strongs-refs">
          {shown.map(vid => {
            const { n, c, v } = decodeVid(vid);
            const b = byNum[n];
            if (!b) return null;
            return (
              <li key={vid}>
                <button type="button" onClick={() => onJump({ book: b.id, chapter: c, verse: v })}>
                  {b.en} {c}:{v}
                </button>
              </li>
            );
          })}
          {refs.length > MAX_SHOWN && (
            <li className="dim">+{refs.length - MAX_SHOWN} more not shown</li>
          )}
        </ul>
      )}
    </aside>
  );
}
