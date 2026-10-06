import "./BookFilterChart.css";

const T = {
  en: { region: "Filter matches by book", filtered: (l) => `Filtered by ${l}`, byBook: (n) => `Matches by Book (${n})`,
        clearTitle: "Clear filter and show all matches", showAll: "Show All",
        bar: (l, n) => `${l}: ${n} match${n === 1 ? "" : "es"} (click to filter)` },
  es: { region: "Filtrar coincidencias por libro", filtered: (l) => `Filtrado por ${l}`, byBook: (n) => `Coincidencias por libro (${n})`,
        clearTitle: "Quitar el filtro y mostrar todas las coincidencias", showAll: "Mostrar todo",
        bar: (l, n) => `${l}: ${n} coincidencia${n === 1 ? "" : "s"} (clic para filtrar)` },
};

export default function BookFilterChart({
  items = [],
  selectedKey = null,
  onSelectKey,
  totalCount,
  lang = "en",
}) {
  const t = T[lang] || T.en;
  if (!items || items.length === 0) return null;

  const maxCount = Math.max(...items.map((i) => i.count), 1);
  const selectedItem = items.find((i) => i.key === selectedKey);

  return (
    <div
      className="book-filter-chart"
      role="region"
      aria-label={t.region}
    >
      <div className="filter-chart-header">
        <span className="filter-chart-title">
          {selectedItem
            ? t.filtered(selectedItem.label)
            : t.byBook(items.length)}
        </span>
        {selectedKey && (
          <button
            type="button"
            className="filter-chart-clear"
            onClick={() => onSelectKey(null)}
            title={t.clearTitle}
          >
            {t.showAll} {totalCount ? `(${totalCount})` : ""}
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
              title={t.bar(item.label, item.count)}
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
