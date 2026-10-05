import { useState, useEffect } from "react";
import { INFO_PAGES } from "../../pages.js";
import "./MainMenu.css";

/** Hamburger button + dropdown of info pages (About the Author, ...). */
export default function MainMenu({ lang = "en", onOpenPage }) {
  const [open, setOpen] = useState(false);

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
        aria-label={lang === "es" ? "Menú" : "Menu"}
        title={lang === "es" ? "Menú" : "Menu"}
        onClick={() => setOpen((v) => !v)}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="17" x2="20" y2="17" />
        </svg>
      </button>

      {open && (
        <>
          <div className="menu-backdrop" onClick={() => setOpen(false)} />
          <ul className="menu-dropdown" role="menu">
            {INFO_PAGES.map((p) => (
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
          </ul>
        </>
      )}
    </div>
  );
}
