import { useRef } from 'react';
import { PANE_OPTIONS, optionFor } from '../data.js';
import BiblePane from './BiblePane.jsx';
import NotesPane from './NotesPane.jsx';

export default function PaneSlot({ code, refPos, highlight, onSelect, strongsOn, onWordClick }) {
  const opt = optionFor(code) || PANE_OPTIONS[0];
  const scroller = useRef(null);

  return (
    <section className="pane">
      <header className="pane-head">
        <select value={code} onChange={e => onSelect(e.target.value)}>
          <optgroup label="English">
            {PANE_OPTIONS.filter(o => o.kind === 'bible' && o.lang === 'en').map(o =>
              <option key={o.code} value={o.code}>{o.label}</option>)}
          </optgroup>
          <optgroup label="Español">
            {PANE_OPTIONS.filter(o => o.kind === 'bible' && o.lang === 'es').map(o =>
              <option key={o.code} value={o.code}>{o.label}</option>)}
          </optgroup>
          <optgroup label="Study notes">
            {PANE_OPTIONS.filter(o => o.kind === 'notes').map(o =>
              <option key={o.code} value={o.code}>{o.label}</option>)}
          </optgroup>
        </select>
      </header>
      <div className="pane-body" ref={scroller}>
        {opt.kind === 'bible'
          ? <BiblePane
              code={opt.code}
              refPos={refPos}
              highlight={highlight}
              scroller={scroller}
              strongsOn={strongsOn && !!opt.strongs}
              onWordClick={onWordClick}
            />
          : <NotesPane lang={opt.lang} refPos={refPos} highlight={highlight} scroller={scroller} />}
      </div>
    </section>
  );
}
