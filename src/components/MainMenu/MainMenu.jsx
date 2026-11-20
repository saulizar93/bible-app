import { useState, useEffect } from "react";
import { INFO_PAGES } from "../../js/pages.js";
import { dataUpdated } from "../../js/data.js";
import "./MainMenu.css";

/** Dropdown of info pages. variant "main": hamburger button with the study pages;
 *  variant "help": ? button with the pages marked help: true in pages.js
 *  (Bibliography, About the Author, Report a bug). */
export default function MainMenu({ lang = "en", onOpenPage, variant = "main" }) {
  const [open, setOpen] = useState(false);
  const isHelp = variant === "help";
  const label = isHelp ? (lang === "es" ? "Ayuda" : "Help") : lang === "es" ? "Menú" : "Menu";
  const pages = INFO_PAGES.filter((p) => !p.hidden && !!p.help === isHelp);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="main-menu">
      <button
        type="button"
        className="nav-step menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        title={label}
        onClick={() => setOpen((v) => !v)}
      >
        {isHelp ? (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9.5" />
            <path d="M9.3 9.2a2.8 2.8 0 0 1 5.4 1c0 1.9-2.7 2.5-2.7 4.1" />
            <line x1="12" y1="17.6" x2="12" y2="17.7" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <line x1="4" y1="7" x2="20" y2="7" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="17" x2="20" y2="17" />
          </svg>
        )}
      </button>

      {open && (
        <>
          <div className="menu-backdrop" onClick={() => setOpen(false)} />
          <ul className="menu-dropdown" role="menu">
            {pages.map((p) => (
              <li key={p.id} role="none">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    onOpenPage(p.id);
                  }}
                >
                  {p.label[lang] || p.label.en}
                </button>
              </li>
            ))}
            {/* manifest date: last change to the Bibles, notes, lexicon or concordance */}
            {dataUpdated() && (
              <li role="none" className="menu-versions">
                {lang === "es" ? "Datos actualizados" : "Data updated"}: {dataUpdated()}
              </li>
            )}
          </ul>
        </>
      )}
    </div>
  );
}
