import React from "react";
import { TRANSLATIONS } from "../../locales.js";
import "./LanguageSelectionModal.css";

export default function LanguageSelectionModal({
  lang = "en",
  onSelectLanguage,
}) {
  return (
    <div className="lang-modal-backdrop">
      <div className="lang-modal" role="dialog" aria-modal="true">
        <h2>{TRANSLATIONS[lang]?.selectLanguage || "Select Language"}</h2>
        <p>
          {TRANSLATIONS[lang]?.choosePreference ||
            "Choose your primary translation preference:"}
        </p>
        <div className="lang-options">
          <button
            type="button"
            className="lang-btn"
            onClick={() => onSelectLanguage("en")}
          >
            <img
              src="https://flagcdn.com/w80/us.png"
              alt="United States Flag"
              className="flag-img"
            />
            <span className="lang-label">English</span>
            <span className="lang-sub">KJV + English Notes</span>
          </button>
          <button
            type="button"
            className="lang-btn"
            onClick={() => onSelectLanguage("es")}
          >
            <img
              src="https://flagcdn.com/w80/mx.png"
              alt="Mexico Flag"
              className="flag-img"
            />
            <span className="lang-label">Español</span>
            <span className="lang-sub">RVG + Notas en Español</span>
          </button>
        </div>
      </div>
    </div>
  );
}
