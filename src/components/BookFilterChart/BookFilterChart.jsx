import "./BookFilterChart.css";

export default function BookFilterChart({
  items = [],
  selectedKey = null,
  onSelectKey,
  totalCount,
}) {
  if (!items || items.length === 0) return null;

  const maxCount = Math.max(...items.map((i) => i.count), 1);
  const selectedItem = items.find((i) => i.key === selectedKey);

  return (
    <div
      className="book-filter-chart"
      role="region"
      aria-label="Filter matches by book"
    >
      <div className="filter-chart-header">
        <span className="filter-chart-title">
          {selectedItem
            ? `Filtered by ${selectedItem.label}`
            : `Matches by Book (${items.length})`}
        </span>
        {selectedKey && (
          <button
            type="button"
            className="filter-chart-clear"
            onClick={() => onSelectKey(null)}
            title="Clear filter and show all matches"
          >
            Show All {totalCount ? `(${totalCount})` : ""}
          </button>
        )}
      </div>

      <div className="filter-chart-bars">
        {items.map((item) => {
          const isSelected = selectedKey === item.key;
          const pct = Math.max(6, Math.round((item.count / maxCount) * 100));

          return (
            <button
              key={item.key}
              type="button"
              className={`filter-bar-row ${isSelected ? "selected" : ""}`}
              onClick={() => onSelectKey(isSelected ? null : item.key)}
              title={`${item.label}: ${item.count} match${item.count === 1 ? "" : "es"} (click to filter)`}
              aria-pressed={isSelected}
            >
              <span className="filter-bar-label">{item.label}</span>
              <div className="filter-bar-track">
                <div
                  className="filter-bar-fill"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="filter-bar-count">{item.count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
