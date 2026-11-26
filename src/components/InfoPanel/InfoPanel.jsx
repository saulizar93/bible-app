import { useState, useEffect, useRef, useCallback } from "react";
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
/** One "## " section of a page: from the heading that contains `key` up to the next
 *  "## " or "# " heading. Returns { title, body } or null. */
function pageSection(md, key) {
  const lines = String(md || "").split("\n");
  const start = lines.findIndex((l) => l.startsWith("## ") && l.includes(key));
  if (start < 0) return null;
  let end = lines.findIndex((l, i) => i > start && /^#{1,2} /.test(l));
  if (end < 0) end = lines.length;
  return { title: lines[start].slice(3).trim(), body: lines.slice(start + 1, end).join("\n").trim() };
}

export default function InfoPanel({
  pageId,
  lang = "en",
  context = "",
  section = null, // show only the "## " section whose heading contains this (pane (i) button)
  onShowAll, // "See every translation": open the whole page
  onClose,
}) {
  const page = INFO_PAGES.find((p) => p.id === pageId);
  const [text, setText] = useState(null); // null = loading, "" = missing
  const panelRef = useRef(null);
  const [headingCount, setHeadingCount] = useState(0);

  useEffect(() => {
    let alive = true;
    if (page?.form) return; // form page: nothing to fetch
    setText(null);
    const load = async (l) => {
      const res = await fetch(
        `${import.meta.env.BASE_URL}data/pages/${pageId}.${l}.md`,
        // Skip the browser's HTTP cache so an edited page shows at once.
        { cache: "no-cache" },
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

  const part = section && text ? pageSection(text, section) : null;
  const shown = section ? part?.body ?? (text === null ? null : "") : text;
  const title = part ? part.title : page ? page.label[lang] || page.label.en : "";

  // ▲ / ▼ buttons: jump the page to the previous / next heading.
  const headings = () =>
    panelRef.current ? [...panelRef.current.querySelectorAll(".info-body h3, .info-body h4, .info-body h5")] : [];
  useEffect(() => {
    // Count headings once the page has rendered, to show the buttons only when there are some.
    const id = requestAnimationFrame(() => setHeadingCount(headings().length));
    return () => cancelAnimationFrame(id);
  }, [shown, pageId]);
  const jumpHeading = useCallback((dir) => {
    const panel = panelRef.current;
    if (!panel) return;
    const top = panel.getBoundingClientRect().top;
    const GAP = 12; // room left above the heading
    // Each heading's position inside the scrolled panel.
    const ys = headings().map((h) => h.getBoundingClientRect().top - top + panel.scrollTop - GAP);
    const now = panel.scrollTop;
    const target =
      dir > 0
        ? ys.find((y) => y > now + 4)
        : [...ys].reverse().find((y) => y < now - 4) ?? 0; // before the first heading: back to the top
    if (target === undefined) return;
    panel.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
  }, []);
  const navT =
    lang === "es"
      ? { prev: "Encabezado anterior", next: "Encabezado siguiente" }
      : { prev: "Previous heading", next: "Next heading" };

  return (
    <>
      <div className="strongs-backdrop" onClick={onClose} />
      <aside
        className="strongs-panel info-panel"
        role="dialog"
        aria-label={title}
        ref={panelRef}
      >
        {headingCount > 0 && (
          <div className="info-heading-nav">
            <button type="button" onClick={() => jumpHeading(-1)} aria-label={navT.prev} title={navT.prev}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 19V5" />
                <path d="M6 11l6-6 6 6" />
              </svg>
            </button>
            <button type="button" onClick={() => jumpHeading(1)} aria-label={navT.next} title={navT.next}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 5v14" />
                <path d="M18 13l-6 6-6-6" />
              </svg>
            </button>
          </div>
        )}
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
        ) : shown === null ? (
          <p className="dim">{lang === "es" ? "Cargando…" : "Loading…"}</p>
        ) : shown ? (
          <>
            <div className="info-body">{renderMarkdown(shown, lang)}</div>
            {section && onShowAll && (
              <button type="button" className="info-show-all" onClick={onShowAll}>
                {lang === "es" ? "Ver todas las traducciones" : "See every Bible translation"}
              </button>
            )}
          </>
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
