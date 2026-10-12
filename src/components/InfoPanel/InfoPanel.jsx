import { useState, useEffect } from "react";
import { INFO_PAGES } from "../../js/pages.js";
import "../StrongsPanel/StrongsPanel.css"; // same panel look as the Strong's panel
import ReportBugForm from "./ReportBugForm.jsx";
import OfflinePanel from "./OfflinePanel.jsx";
import "./InfoPanel.css";

/**
 * Side/centered panel showing one info page from
 * public/data/pages/<id>.<lang>.md (falls back to the English file).
 *
 * Supported formatting (a small Markdown subset):
 *   # Heading / ## Subheading / ### Small heading
 *   - bullet item
 *   1. numbered item (any number followed by "." or ")")
 *   - {top} / {low} / {worst} at the start of a bullet = tier badge + highlight (Bibliography)
 *   > quoted line (consecutive > lines form one quote block)
 *   > — Reference   as the last line of a quote = featured verse with its reference below
 *   | a | table |   (first row = header; a |---|---| separator row is optional and skipped)
 *   **bold**, *italic* or _italic_, [link text](https://...)
 *   ![description](images/photo.jpg) alone on a line = picture from public/data/pages/
 *   blank line = new paragraph
 */
export default function InfoPanel({
  pageId,
  lang = "en",
  context = "",
  onClose,
}) {
  const page = INFO_PAGES.find((p) => p.id === pageId);
  const [text, setText] = useState(null); // null = loading, "" = missing

  useEffect(() => {
    let alive = true;
    if (page?.form) return; // form page: nothing to fetch
    setText(null);
    const load = async (l) => {
      const res = await fetch(
        `${import.meta.env.BASE_URL}data/pages/${pageId}.${l}.md`,
      );
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
  }, [pageId, lang, page?.form]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const title = page ? page.label[lang] || page.label.en : "";

  return (
    <>
      <div className="strongs-backdrop" onClick={onClose} />
      <aside
        className="strongs-panel info-panel"
        role="dialog"
        aria-label={title}
      >
        <button
          type="button"
          className="strongs-close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="info-title">{title}</h2>
        {page?.id === "offline" ? (
          <OfflinePanel lang={lang} />
        ) : page?.form ? (
          <ReportBugForm lang={lang} context={context} />
        ) : text === null ? (
          <p className="dim">{lang === "es" ? "Cargando…" : "Loading…"}</p>
        ) : text ? (
          <div className="info-body">{renderMarkdown(text, lang)}</div>
        ) : (
          <p className="dim">
            {lang === "es" ? "Contenido próximamente." : "Content coming soon."}
          </p>
        )}
      </aside>
    </>
  );
}

/* ---------- tiny Markdown subset -> React elements (no innerHTML) ---------- */

const TIERS = {
  en: {
    top: "Top tier",
    good: "Good",
    average: "Average",
    bad: "Bad",
    terrible: "Terrible",
  },

  es: {
    top: "Excelente",
    good: "Bueno",
    average: "Promedio",
    bad: "Deficiente",
    terrible: "Terrible",
  },
};

function renderMarkdown(src, lang = "en") {
  const tierLabel = TIERS[lang] || TIERS.en;
  const blocks = [];
  let para = [];
  let list = [];
  let ordered = false; // current list is numbered (1. 2. 3.)
  let start = 1; // number of its first item
  const flushPara = () => {
    if (para.length)
      blocks.push(<p key={blocks.length}>{inline(para.join(" "))}</p>);
    para = [];
  };
  let quote = [];
  let table = [];
  const flushQuote = () => {
    // A quote whose last line starts with "—" is a featured verse: the text, then the
    // reference on its own line ("> — Matthew 11:25 (KJV)"), styled as .info-quote.verse.
    const last = quote[quote.length - 1] || "";
    const cite = quote.length > 1 && /^(—|--)\s*/.test(last) ? last.replace(/^(—|--)\s*/, "") : null;
    const lines = cite ? quote.slice(0, -1) : quote;
    if (quote.length)
      blocks.push(
        <blockquote key={blocks.length} className={cite ? "info-quote verse" : "info-quote"}>
          {lines.map((q, i) => (
            <p key={i}>{inline(q)}</p>
          ))}
          {cite && <cite>— {inline(cite)}</cite>}
        </blockquote>,
      );
    quote = [];
  };
  const cells = (row) =>
    row
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((c) => c.trim());
  const flushTable = () => {
    if (table.length) {
      const rows = table.filter((r) => !/^\|?\s*:?-{2,}/.test(r)).map(cells);
      const [head, ...body] = rows;
      blocks.push(
        <div key={blocks.length} className="info-table-wrap">
          <table className="info-table">
            <thead>
              <tr>
                {head.map((c, i) => (
                  <th key={i}>{inline(c)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((r, ri) => (
                <tr key={ri}>
                  {r.map((c, i) => (
                    <td key={i}>{inline(c)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
    }
    table = [];
  };
  const flushList = () => {
    const List = ordered ? "ol" : "ul";
    if (list.length)
      blocks.push(
        <List key={blocks.length} start={ordered && start !== 1 ? start : undefined}>
          {list.map((item, i) =>
            (() => {
              const m = item.match(/^\{(top|good|average|bad|terrible)\}\s*/);
              if (!m) return <li key={i}>{inline(item)}</li>;
              return (
                <li key={i} className={`tier tier-${m[1]}`}>
                  <span className="tier-badge">{tierLabel[m[1]]}</span>
                  {inline(item.slice(m[0].length))}
                </li>
              );
            })(),
          )}
        </List>,
      );
    list = [];
    ordered = false;
  };

  for (const raw of src.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trim();
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    const li = line.match(/^[-*]\s+(.*)$/);
    const oli = line.match(/^(\d+)[.)]\s+(.*)$/);
    const qt = line.match(/^>\s?(.*)$/);
    const img = line.match(/^!\[([^\]]*)\]\(([\w./-]+\.(?:jpe?g|png|webp|gif))\)$/i);
    if (!line.startsWith("|")) flushTable();
    if (!qt) flushQuote();
    if (!line) {
      flushPara();
      flushList();
    } else if (line.startsWith("|")) {
      flushPara();
      flushList();
      table.push(line);
    } else if (qt) {
      flushPara();
      flushList();
      quote.push(qt[1]);
    } else if (img) {
      flushPara();
      flushList();
      blocks.push(
        <img
          key={blocks.length}
          className="info-img"
          src={`${import.meta.env.BASE_URL}data/pages/${img[2]}`}
          alt={img[1]}
          loading="lazy"
        />,
      );
    } else if (h) {
      flushPara();
      flushList();
      const Tag = `h${h[1].length + 2}`; // # -> h3 (the panel title is h2)
      blocks.push(<Tag key={blocks.length}>{inline(h[2])}</Tag>);
    } else if (li || oli) {
      flushPara();
      if (list.length && ordered !== !!oli) flushList(); // bullets <-> numbers: new list
      if (oli && !list.length) start = Number(oli[1]);
      ordered = !!oli;
      list.push(oli ? oli[2] : li[1]);
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();
  flushQuote();
  flushTable();
  return blocks;
}

function inline(text) {
  const out = [];
  // **bold**, *italic* or _italic_ (underscores only at word edges, so snake_case stays), [link](url)
  const re = /\*\*(.+?)\*\*|\*(.+?)\*|(?<![\w])_(.+?)_(?![\w])|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    // bold/italic text is formatted again, so **_metanoeō_** = bold + italic
    if (m[1]) out.push(<strong key={out.length}>{inline(m[1])}</strong>);
    else if (m[2] || m[3]) out.push(<em key={out.length}>{inline(m[2] || m[3])}</em>);
    else
      out.push(
        <a
          key={out.length}
          href={m[5]}
          target="_blank"
          rel="noopener noreferrer"
        >
          {m[4]}
        </a>,
      );
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
