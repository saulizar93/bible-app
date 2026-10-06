import { useEffect, useMemo, useRef, useState } from "react";

/**
 * "Report a bug" form shown in the info panel. The app is a static site
 * (GitHub Pages), so the report is delivered by FormSubmit (https://formsubmit.co),
 * a free form-to-email service that accepts file attachments (10 MB total).
 *
 * The form posts as a normal multipart form into a hidden iframe so the app
 * never navigates away; the iframe's load event tells us it went through.
 *
 * FIRST USE: the first report sent triggers a confirmation email from
 * FormSubmit to REPORT_ENDPOINT's address — click "Activate" in it once.
 * That email also gives you a random alias (e.g. https://formsubmit.co/abc123…);
 * put it in REPORT_ENDPOINT to keep your address out of the page source.
 */
const REPORT_ENDPOINT = "https://formsubmit.co/onenessstudybible@gmail.com";
const MAX_FILES = 5;
const MAX_BYTES = 10 * 1024 * 1024;

const T = {
  en: {
    intro:
      "Found a typo, a wrong verse, a mistake in a note, or something that doesn't work? Tell me here and it will be sent to the author.",
    kind: "What kind of problem?",
    kinds: {
      typo: "Typo",
      content: "Error in a translation or note",
      bug: "App bug",
      other: "Other",
    },
    message: "Describe the problem",
    messageHint: "Include the verse or page if you can.",
    where: "Where you are in the app (sent automatically)",
    shots: "Screenshots (optional)",
    addShots: "Add images",
    remove: "Remove",
    shotsHint: `Up to ${MAX_FILES} images, 10 MB in total.`,
    email: "Your email (optional, if you'd like a reply)",
    send: "Send report",
    sending: "Sending…",
    sent: "Thank you! Your report was sent.",
    another: "Send another report",
    tooBig:
      "The images are larger than 10 MB in total. Remove some or use smaller screenshots.",
    tooMany: `You can attach up to ${MAX_FILES} images.`,
    empty: "Please describe the problem.",
    failed:
      "The report could not be sent. Check your connection and try again.",
  },
  es: {
    intro:
      "¿Encontró una errata, un versículo equivocado, un error en una nota o algo que no funciona? Cuéntelo aquí y se le enviará al autor.",
    kind: "¿Qué tipo de problema?",
    kinds: {
      typo: "Errata",
      content: "Error en una traducción o nota",
      bug: "Falla de la aplicación",
      other: "Otro",
    },
    message: "Describa el problema",
    messageHint: "Incluya el versículo o la página si puede.",
    where: "Dónde está en la aplicación (se envía automáticamente)",
    shots: "Capturas de pantalla (opcional)",
    addShots: "Agregar imágenes",
    remove: "Quitar",
    shotsHint: `Hasta ${MAX_FILES} imágenes, 10 MB en total.`,
    email: "Su correo (opcional, si desea respuesta)",
    send: "Enviar reporte",
    sending: "Enviando…",
    sent: "¡Gracias! Su reporte fue enviado.",
    another: "Enviar otro reporte",
    tooBig:
      "Las imágenes suman más de 10 MB. Quite algunas o use capturas más pequeñas.",
    tooMany: `Puede adjuntar hasta ${MAX_FILES} imágenes.`,
    empty: "Por favor describa el problema.",
    failed:
      "No se pudo enviar el reporte. Revise su conexión e inténtelo de nuevo.",
  },
};

export default function ReportBugForm({ lang = "en", context = "" }) {
  const t = T[lang] || T.en;
  const formRef = useRef(null);
  const pickerRef = useRef(null);
  const fileInputs = useRef([]);
  const [kind, setKind] = useState("typo");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | sending | sent
  const [error, setError] = useState("");
  const [frameKey, setFrameKey] = useState(0);
  const timer = useRef(null);

  const previews = useMemo(
    () => files.map((f) => URL.createObjectURL(f)),
    [files],
  );
  useEffect(
    () => () => previews.forEach((u) => URL.revokeObjectURL(u)),
    [previews],
  );
  const totalBytes = files.reduce((n, f) => n + f.size, 0);

  const addFiles = (list) => {
    setError("");
    const imgs = [...list].filter((f) => f.type.startsWith("image/"));
    const next = [...files, ...imgs];
    if (next.length > MAX_FILES) setError(t.tooMany);
    setFiles(next.slice(0, MAX_FILES));
  };

  const submit = (e) => {
    e.preventDefault();
    setError("");
    if (!message.trim()) return setError(t.empty);
    if (totalBytes > MAX_BYTES) return setError(t.tooBig);
    // Put each picked file into its own <input type=file name="attachmentN">.
    fileInputs.current.forEach((input, i) => {
      if (!input) return;
      const dt = new DataTransfer();
      if (files[i]) dt.items.add(files[i]);
      input.files = dt.files;
    });
    setStatus("sending");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setStatus((s) => (s === "sending" ? "idle" : s));
      setError((m) => m || t.failed);
    }, 60000);
    formRef.current.submit();
  };

  const onFrameLoad = () => {
    if (status !== "sending") return; // initial about:blank load
    clearTimeout(timer.current);
    setStatus("sent");
  };

  const reset = () => {
    setKind("typo");
    setMessage("");
    setFiles([]);
    setStatus("idle");
    setError("");
    setFrameKey((k) => k + 1);
  };

  if (status === "sent") {
    return (
      <div className="report-form report-done">
        <p>{t.sent}</p>
        <button type="button" className="report-send" onClick={reset}>
          {t.another}
        </button>
      </div>
    );
  }

  const kindLabel = t.kinds[kind];
  return (
    <>
      <iframe
        key={frameKey}
        name="report-sink"
        title="report-sink"
        className="report-sink"
        onLoad={onFrameLoad}
      />
      <form
        ref={formRef}
        className="report-form"
        action={REPORT_ENDPOINT}
        method="POST"
        encType="multipart/form-data"
        target="report-sink"
        onSubmit={submit}
      >
        <p className="report-intro">{t.intro}</p>

        {/* FormSubmit settings */}
        <input
          type="hidden"
          name="_subject"
          value={`Bible app report: ${T.en.kinds[kind]}`}
        />
        <input type="hidden" name="_captcha" value="false" />
        <input type="hidden" name="_template" value="table" />
        <input
          type="text"
          name="_honey"
          className="report-honey"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
        />
        <input type="hidden" name="Type" value={kindLabel} />
        <input type="hidden" name="Location" value={context} />
        <input type="hidden" name="Language" value={lang} />
        <input type="hidden" name="Browser" value={navigator.userAgent} />
        {Array.from({ length: MAX_FILES }, (_, i) => (
          <input
            key={i}
            type="file"
            name={`attachment${i + 1}`}
            ref={(el) => {
              fileInputs.current[i] = el;
            }}
            className="report-hidden-file"
            tabIndex={-1}
            aria-hidden="true"
          />
        ))}

        <label className="report-label">{t.kind}</label>
        <div className="report-kinds" role="radiogroup" aria-label={t.kind}>
          {Object.entries(t.kinds).map(([k, label]) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              className={kind === k ? "report-chip on" : "report-chip"}
              onClick={() => setKind(k)}
            >
              {label}
            </button>
          ))}
        </div>

        <label className="report-label" htmlFor="report-message">
          {t.message}
        </label>
        <textarea
          id="report-message"
          name="Message"
          rows={6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t.messageHint}
        />

        {context && (
          <p className="report-context">
            <span>{t.where}:</span> {context}
          </p>
        )}

        <label className="report-label">{t.shots}</label>
        <div
          className="report-drop"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            addFiles(e.dataTransfer.files);
          }}
          onPaste={(e) => addFiles(e.clipboardData.files)}
        >
          {files.length > 0 && (
            <ul className="report-thumbs">
              {files.map((f, i) => (
                <li key={i}>
                  <img src={previews[i]} alt={f.name} />
                  <button
                    type="button"
                    onClick={() => setFiles(files.filter((_, j) => j !== i))}
                    aria-label={`${t.remove} ${f.name}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          {files.length < MAX_FILES && (
            <button
              type="button"
              className="report-add"
              onClick={() => pickerRef.current?.click()}
            >
              + {t.addShots}
            </button>
          )}
          <input
            ref={pickerRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <p className="report-hint">
            {t.shotsHint}
            {files.length > 0 && ` (${(totalBytes / 1048576).toFixed(1)} MB)`}
          </p>
        </div>

        <label className="report-label" htmlFor="report-email">
          {t.email}
        </label>
        <input
          id="report-email"
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        {email && <input type="hidden" name="_replyto" value={email} />}

        {error && (
          <p className="report-error" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="report-send"
          disabled={status === "sending"}
        >
          {status === "sending" ? t.sending : t.send}
        </button>
      </form>
    </>
  );
}
