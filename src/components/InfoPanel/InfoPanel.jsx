import { useState, useEffect } from "react";
import { INFO_PAGES } from "../../pages.js";
import "../StrongsPanel/StrongsPanel.css"; // same panel look as the Strong's panel
import "./InfoPanel.css";

/**
 * Side/centered panel showing one info page from
 * public/data/pages/<id>.<lang>.md (falls back to the English file).
 *
 * Supported formatting (a small Markdown subset):
 *   # Heading / ## Subheading / ### Small heading
 *   - bullet item
 *   **bold**, *italic*, [link text](https://...)
 *   blank line = new paragraph
 */
export default function InfoPanel({ pageId, lang = "en", onClose }) {
  const page = INFO_PAGES.find((p) => p.id === pageId);
  const [text, setText] = useState(null); // null = loading, "" = missing

  useEffect(() => {
    let alive = true;
    setText(null);
    const load = async (l) => {
      const res = await fetch(`${import.meta.env.BASE_URL}data/pages/${pageId}.${l}.md`);
      const body = res.ok ? await res.text() : "";
      // Vite's dev server answers a missing file with index.html — treat as missing.
      return /^\s*<!doctype html/i.test(body) ? "" : body;
    };
    (async () => {
      let body = "";
      try {
        body = await load(lang);
        if (!body && lang !== "en") body = await load("en");
      } catch {
        body = "";
      }
      if (alive) setText(body);
    })();
    return () => {
      alive = false;
    };
  }, [pageId, lang]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const title = page ? page.label[lang] || page.label.en : "";

  return (
    <>
      <div className="strongs-backdrop" onClick={onClose} />
      <aside className="strongs-panel info-panel" role="dialog" aria-label={title}>
        <button type="button" className="strongs-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <h2 className="info-title">{title}</h2>
        {text === null ? (
          <p className="dim">{lang === "es" ? "Cargando…" : "Loading…"}</p>
        ) : text ? (
          <div className="info-body">{renderMarkdown(text)}</div>
        ) : (
          <p className="dim">{lang === "es" ? "Contenido próximamente." : "Content coming soon."}</p>
        )}
      </aside>
    </>
  );
}

/* ---------- tiny Markdown subset -> React elements (no innerHTML) ---------- */

function renderMarkdown(src) {
  const blocks = [];
  let para = [];
  let list = [];
  const flushPara = () => {
    if (para.length) blocks.push(<p key={blocks.length}>{inline(para.join(" "))}</p>);
    para = [];
  };
  const flushList = () => {
    if (list.length)
      blocks.push(
        <ul key={blocks.length}>
          {list.map((item, i) => (
            <li key={i}>{inline(item)}</li>
          ))}
        </ul>,
      );
    list = [];
  };

  for (const raw of src.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trim();
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    const li = line.match(/^[-*]\s+(.*)$/);
    if (!line) {
      flushPara();
      flushList();
    } else if (h) {
      flushPara();
      flushList();
      const Tag = `h${h[1].length + 2}`; // # -> h3 (the panel title is h2)
      blocks.push(<Tag key={blocks.length}>{inline(h[2])}</Tag>);
    } else if (li) {
      flushPara();
      list.push(li[1]);
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();
  return blocks;
}

function inline(text) {
  const out = [];
  const re = /\*\*(.+?)\*\*|\*(.+?)\*|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) out.push(<strong key={out.length}>{m[1]}</strong>);
    else if (m[2]) out.push(<em key={out.length}>{m[2]}</em>);
    else
      out.push(
        <a key={out.length} href={m[4]} target="_blank" rel="noopener noreferrer">
          {m[3]}
        </a>,
      );
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
