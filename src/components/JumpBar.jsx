export default function JumpBar({ query, onQueryChange, open, onOpenChange, options, placeholder, onSubmit, onPick, onStep }) {
  return (
    <form className="jump" onSubmit={onSubmit} autoComplete="off">
      <button type="button" onClick={() => onStep(-1)} aria-label="Previous chapter">‹</button>
      <div className="field">
        <input
          value={query}
          placeholder={placeholder}
          onChange={e => { onQueryChange(e.target.value); onOpenChange(true); }}
          onFocus={() => onOpenChange(true)}
          onBlur={() => setTimeout(() => onOpenChange(false), 150)}
          enterKeyHint="go"
        />
        {open && options.length > 0 && (
          <ul className="menu">
            {options.map(o => (
              <li key={o.id}>
                <button type="button" onMouseDown={() => onPick(o)}>
                  {o.en} {Math.min(o.chapter, o.chapters)}{o.verse ? `:${o.verse}` : ''}
                  <span className="dim"> · {o.es}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <button type="button" onClick={() => onStep(1)} aria-label="Next chapter">›</button>
    </form>
  );
}
