/**
 * Decode the morphology codes stored on KJV tokens (`m`) into readable parts.
 *
 *   Greek NT: Robinson codes, e.g. "N-NSF", "V-2AAI-3S", "P-1GS", "V-PAP-NSM"
 *   Hebrew OT: Strong's verb codes, e.g. "TH8804" (Qal Perfect). The KJV module
 *              only parses Hebrew verbs (stem + form) — Hebrew nouns carry no
 *              gender/number data in this source.
 *
 * decodeMorph("N-NSF")  ->
 *   { lang: "grc", pos: "Noun", fields: [{k:"case",v:"Nominative"}, {k:"number",v:"Singular"},
 *     {k:"gender",v:"Feminine"}], summary: "Noun · Nominative · Singular · Feminine" }
 *
 * Hebrew table verified entry-by-entry against Strong's TVM numbers 8675–8809
 * (studybible.info/strongs/H8xxx).
 */

const L = {
  en: {
    case: { N: "Nominative", G: "Genitive", D: "Dative", A: "Accusative", V: "Vocative" },
    number: { S: "Singular", P: "Plural" },
    gender: { M: "Masculine", F: "Feminine", N: "Neuter" },
    person: { 1: "1st person", 2: "2nd person", 3: "3rd person" },
    tense: { P: "Present", I: "Imperfect", F: "Future", A: "Aorist", R: "Perfect", L: "Pluperfect",
             "2F": "2nd Future", "2A": "2nd Aorist", "2R": "2nd Perfect", "2L": "2nd Pluperfect" },
    voice: { A: "Active", M: "Middle", P: "Passive", E: "Middle or Passive", D: "Middle Deponent",
             O: "Passive Deponent", N: "Middle or Passive Deponent", Q: "Impersonal Active", X: "No voice" },
    mood: { I: "Indicative", S: "Subjunctive", O: "Optative", M: "Imperative", N: "Infinitive",
            P: "Participle", R: "Imperative Participle" },
    pos: { V: "Verb", N: "Noun", A: "Adjective", T: "Article", R: "Relative pronoun",
           C: "Reciprocal pronoun", D: "Demonstrative pronoun", K: "Correlative pronoun",
           I: "Interrogative pronoun", X: "Indefinite pronoun", Q: "Correlative/interrogative pronoun",
           F: "Reflexive pronoun", S: "Possessive pronoun", P: "Personal pronoun",
           ADV: "Adverb", CONJ: "Conjunction", COND: "Conditional", PRT: "Particle",
           PREP: "Preposition", INJ: "Interjection", ARAM: "Aramaic word", HEB: "Hebrew word" },
    suffix: { C: "Comparative", S: "Superlative", N: "Negative", I: "Interrogative", K: "Crasis",
              ATT: "Attic form", ABB: "Abbreviated", PRI: "Proper name (indeclinable)",
              NUI: "Numeral (indeclinable)", LI: "Letter (indeclinable)", OI: "Indeclinable",
              P: "With particle", M: "Middle significance" },
    possessor: { S: "singular possessor", P: "plural possessor" },
    stem: "Stem", form: "Form", verb: "Verb", kethiv: "Kethiv reading", qere: "Qere reading",
    synonym: "Phrase number", multiQere: "Multiple qere readings",
  },
  es: {
    case: { N: "Nominativo", G: "Genitivo", D: "Dativo", A: "Acusativo", V: "Vocativo" },
    number: { S: "Singular", P: "Plural" },
    gender: { M: "Masculino", F: "Femenino", N: "Neutro" },
    person: { 1: "1.ª persona", 2: "2.ª persona", 3: "3.ª persona" },
    tense: { P: "Presente", I: "Imperfecto", F: "Futuro", A: "Aoristo", R: "Perfecto", L: "Pluscuamperfecto",
             "2F": "2.º futuro", "2A": "2.º aoristo", "2R": "2.º perfecto", "2L": "2.º pluscuamperfecto" },
    voice: { A: "Activa", M: "Media", P: "Pasiva", E: "Media o pasiva", D: "Media deponente",
             O: "Pasiva deponente", N: "Media o pasiva deponente", Q: "Activa impersonal", X: "Sin voz" },
    mood: { I: "Indicativo", S: "Subjuntivo", O: "Optativo", M: "Imperativo", N: "Infinitivo",
            P: "Participio", R: "Participio imperativo" },
    pos: { V: "Verbo", N: "Sustantivo", A: "Adjetivo", T: "Artículo", R: "Pronombre relativo",
           C: "Pronombre recíproco", D: "Pronombre demostrativo", K: "Pronombre correlativo",
           I: "Pronombre interrogativo", X: "Pronombre indefinido", Q: "Pronombre correlativo/interrogativo",
           F: "Pronombre reflexivo", S: "Pronombre posesivo", P: "Pronombre personal",
           ADV: "Adverbio", CONJ: "Conjunción", COND: "Condicional", PRT: "Partícula",
           PREP: "Preposición", INJ: "Interjección", ARAM: "Palabra aramea", HEB: "Palabra hebrea" },
    suffix: { C: "Comparativo", S: "Superlativo", N: "Negativo", I: "Interrogativo", K: "Crasis",
              ATT: "Forma ática", ABB: "Abreviado", PRI: "Nombre propio (indeclinable)",
              NUI: "Numeral (indeclinable)", LI: "Letra (indeclinable)", OI: "Indeclinable",
              P: "Con partícula", M: "Sentido medio" },
    possessor: { S: "poseedor singular", P: "poseedor plural" },
    stem: "Raíz", form: "Forma", verb: "Verbo", kethiv: "Lectura ketiv", qere: "Lectura qere",
    synonym: "Número de frase", multiQere: "Varias lecturas qere",
  },
};

// Hebrew Strong's TVM numbers: [stem, form]. Form keys are translated below.
const TVM = {
  8680: ["Aphel", "Imv"], 8681: ["Aphel", "Impf"], 8682: ["Aphel", "Inf"], 8683: ["Aphel", "Ptc"], 8684: ["Aphel", "Pf"],
  8685: ["Hiphil", "Imv"], 8686: ["Hiphil", "Impf"], 8687: ["Hiphil", "Inf"], 8688: ["Hiphil", "Ptc"], 8689: ["Hiphil", "Pf"],
  8690: ["Hithpael", "Imv"], 8691: ["Hithpael", "Impf"], 8692: ["Hithpael", "Inf"], 8693: ["Hithpael", "Ptc"], 8694: ["Hithpael", "Pf"],
  8695: ["Hithpalel", "Imv"], 8696: ["Hithpalel", "Impf"],
  8697: ["Hithpalpel", "Imv"], 8698: ["Hithpalpel", "Impf"], 8699: ["Hithpalpel", "Inf"], 8700: ["Hithpalpel", "Ptc"], 8701: ["Hithpalpel", "Pf"],
  8702: ["Hithpeil", "Pf"],
  8703: ["Hithpoel", "Imv"], 8704: ["Hithpoel", "Impf"], 8705: ["Hithpoel", "Inf"], 8706: ["Hithpoel", "Ptc"], 8707: ["Hithpoel", "Pf"],
  8708: ["Hithpolel", "Imv"], 8709: ["Hithpolel", "Impf"], 8710: ["Hithpolel", "Inf"], 8711: ["Hithpolel", "Ptc"], 8712: ["Hithpolel", "Pf"],
  8713: ["Hophal", "Imv"], 8714: ["Hophal", "Impf"], 8715: ["Hophal", "Inf"], 8716: ["Hophal", "Ptc"], 8717: ["Hophal", "Pf"],
  8718: ["Hothpael", "Inf"], 8719: ["Hothpael", "Pf"],
  8720: ["Ishtaphel", "Impf"],
  8721: ["Ithpael", "Impf"], 8722: ["Ithpael", "Inf"], 8723: ["Ithpael", "Ptc"], 8724: ["Ithpael", "Pf"],
  8725: ["Ithpeal", "Impf"], 8726: ["Ithpeal", "Inf"], 8727: ["Ithpeal", "Ptc"], 8728: ["Ithpeal", "Pf"],
  8729: ["Ithpeel", "Impf"], 8730: ["Ithpeel", "Pf"],
  8731: ["Ithpeil", "Impf"], 8732: ["Ithpeil", "Ptc"],
  8733: ["Ithpolel", "Impf"],
  8734: ["Niphal", "Imv"], 8735: ["Niphal", "Impf"], 8736: ["Niphal", "Inf"], 8737: ["Niphal", "Ptc"], 8738: ["Niphal", "Pf"],
  8739: ["Niphpael", "Pf"],
  8740: ["Pael", "Imv"], 8741: ["Pael", "Impf"], 8742: ["Pael", "Inf"], 8743: ["Pael", "Ptc"], 8744: ["Pael", "PtcPass"], 8745: ["Pael", "Pf"],
  8746: ["Pulpal", "Impf"],
  8747: ["Peal", "Imv"], 8748: ["Peal", "Impf"], 8749: ["Peal", "Inf"], 8750: ["Peal", "Ptc"], 8751: ["Peal", "PtcAct"],
  8752: ["Peal", "PtcPass"], 8753: ["Peal", "PtcPeil"], 8754: ["Peal", "Pf"],
  8755: ["Peel or Peil", "Impf"], 8756: ["Peel or Peil", "Inf"], 8757: ["Peel or Peil", "Ptc"], 8758: ["Peel or Peil", "Pf"],
  8759: ["Peil", "Ptc"], 8760: ["Peil", "Pf"],
  8761: ["Piel", "Imv"], 8762: ["Piel", "Impf"], 8763: ["Piel", "Inf"], 8764: ["Piel", "Ptc"], 8765: ["Piel", "Pf"],
  8766: ["Pilel", "Impf"], 8767: ["Pilel", "Ptc"], 8768: ["Pilel", "Pf"],
  8769: ["Pilpel", "Imv"], 8770: ["Pilpel", "Impf"], 8771: ["Pilpel", "Inf"], 8772: ["Pilpel", "Ptc"], 8773: ["Pilpel", "Pf"],
  8774: ["Poal", "Inf"], 8775: ["Poal", "Ptc"], 8776: ["Poal", "Pf"],
  8777: ["Poalal", "Pf"],
  8778: ["Poel", "Imv"], 8779: ["Poel", "Impf"], 8780: ["Poel", "Inf"], 8781: ["Poel", "Ptc"], 8782: ["Poel", "Pf"],
  8783: ["Polal", "Impf"], 8784: ["Polal", "Ptc"], 8785: ["Polal", "Pf"],
  8786: ["Polel", "Imv"], 8787: ["Polel", "Impf"], 8788: ["Polel", "Inf"], 8789: ["Polel", "Ptc"], 8790: ["Polel", "Pf"],
  8791: ["Polpal", "Pf"],
  8792: ["Pual", "Impf"], 8793: ["Pual", "Inf"], 8794: ["Pual", "Ptc"], 8795: ["Pual", "Pf"],
  8796: ["Pulal", "Ptc"], 8797: ["Pulal", "Pf"],
  8798: ["Qal", "Imv"], 8799: ["Qal", "Impf"], 8800: ["Qal", "Inf"], 8801: ["Qal", "Ptc"], 8802: ["Qal", "PtcAct"],
  8803: ["Qal", "PtcPass"], 8804: ["Qal", "Pf"],
  8805: ["Shaphel", "Inf"], 8806: ["Shaphel", "Pf"],
  8807: ["Tiphel", "Impf"], 8808: ["Tiphel", "Ptc"], 8809: ["Tiphel", "Pf"],
};
const HEB_FORM = {
  en: { Imv: "Imperative", Impf: "Imperfect", Inf: "Infinitive", Ptc: "Participle", Pf: "Perfect",
        PtcAct: "Participle Active", PtcPass: "Participle Passive", PtcPeil: "Participle Peil" },
  es: { Imv: "Imperativo", Impf: "Imperfecto", Inf: "Infinitivo", Ptc: "Participio", Pf: "Perfecto",
        PtcAct: "Participio activo", PtcPass: "Participio pasivo", PtcPeil: "Participio peil" },
};
const HEB_NOTE = { 8675: "kethiv", 8676: "qere", 8677: "synonym", 8678: "multiQere" };

const CNG = /^([NGDAV])([SP])([MFN])?$/;           // case-number-gender
const P_CNG = /^([123])([NGDAV])([SP])([MFN])?$/;  // person + case-number(-gender)
const POSS = /^([123])([SP])([NGDAV])([SP])([MFN])$/; // possessive: person, possessor no., case-number-gender
const PN = /^([123])([SP])$/;                      // verb person-number
const TVMOOD = /^(2?)([PIFARL])([AMPEDONQX])([ISOMNPR])$/;

function decodeGreek(code, t) {
  const parts = code.split("-");
  const head = parts[0];
  const fields = [];
  const add = (k, v) => v && fields.push({ k, v });
  let pos = t.pos[head];
  const unknown = [];

  const cng = (s) => {
    let m;
    if ((m = s.match(CNG))) { add("case", t.case[m[1]]); add("number", t.number[m[2]]); add("gender", t.gender[m[3]]); return true; }
    if ((m = s.match(P_CNG))) { add("person", t.person[m[1]]); add("case", t.case[m[2]]); add("number", t.number[m[3]]); add("gender", t.gender[m[4]]); return true; }
    if ((m = s.match(POSS))) { add("person", `${t.person[m[1]]}, ${t.possessor[m[2]]}`); add("case", t.case[m[3]]); add("number", t.number[m[4]]); add("gender", t.gender[m[5]]); return true; }
    return false;
  };

  if (head === "V") {
    const m = (parts[1] || "").match(TVMOOD);
    if (m) {
      add("tense", t.tense[m[1] + m[2]]);
      add("voice", t.voice[m[3]]);
      add("mood", t.mood[m[4]]);
    } else if (parts[1]) unknown.push(parts[1]);
    for (const p of parts.slice(2)) {
      const pn = p.match(PN);
      if (pn) { add("person", t.person[pn[1]]); add("number", t.number[pn[2]]); }
      else if (!cng(p)) t.suffix[p] ? add("note", t.suffix[p]) : unknown.push(p);
    }
  } else if (pos) {
    for (const p of parts.slice(1)) {
      if (!cng(p)) t.suffix[p] ? add("note", t.suffix[p]) : unknown.push(p);
    }
  } else {
    pos = head;
  }
  if (unknown.length) add("note", unknown.join("-"));
  return { lang: "grc", code, pos, fields };
}

function decodeHebrew(code, t, lang) {
  const n = parseInt(code.replace(/^TH?/i, ""), 10);
  if (HEB_NOTE[n]) return { lang: "heb", code, pos: t[HEB_NOTE[n]], fields: [] };
  const entry = TVM[n];
  if (!entry) return { lang: "heb", code, pos: t.verb, fields: [] };
  return {
    lang: "heb",
    code,
    pos: t.verb,
    fields: [
      { k: "stem", v: entry[0] },
      { k: "form", v: HEB_FORM[lang]?.[entry[1]] || HEB_FORM.en[entry[1]] },
    ],
  };
}

// Part of speech / gender codes on Hebrew dictionary entries (StrongHebrewG.xml).
const HEB_POS = {
  en: { v: ["Verb"], n: ["Noun"], "n-m": ["Noun", "Masculine"], "n-f": ["Noun", "Feminine"],
        "n-m-loc": ["Noun", "Masculine", "Place"],
        "n-pr": ["Proper name"], "n-pr-m": ["Proper name", "Masculine"], "n-pr-f": ["Proper name", "Feminine"],
        "n-pr-loc": ["Proper name", "Place"], np: ["Proper name"],
        a: ["Adjective"], "a-m": ["Adjective", "Masculine"], "a-f": ["Adjective", "Feminine"],
        adv: ["Adverb"], prep: ["Preposition"], conj: ["Conjunction"], inj: ["Interjection"],
        d: ["Demonstrative"], dp: ["Demonstrative particle"], p: ["Pronoun"], pron: ["Pronoun"],
        prt: ["Particle"], i: ["Interrogative"], r: ["Relative"] },
  es: { v: ["Verbo"], n: ["Sustantivo"], "n-m": ["Sustantivo", "Masculino"], "n-f": ["Sustantivo", "Femenino"],
        "n-m-loc": ["Sustantivo", "Masculino", "Lugar"],
        "n-pr": ["Nombre propio"], "n-pr-m": ["Nombre propio", "Masculino"], "n-pr-f": ["Nombre propio", "Femenino"],
        "n-pr-loc": ["Nombre propio", "Lugar"], np: ["Nombre propio"],
        a: ["Adjetivo"], "a-m": ["Adjetivo", "Masculino"], "a-f": ["Adjetivo", "Femenino"],
        adv: ["Adverbio"], prep: ["Preposición"], conj: ["Conjunción"], inj: ["Interjección"],
        d: ["Demostrativo"], dp: ["Partícula demostrativa"], p: ["Pronombre"], pron: ["Pronombre"],
        prt: ["Partícula"], i: ["Interrogativo"], r: ["Relativo"] },
};

/** decodeHebrewPos("n-f") -> ["Noun", "Feminine"]; several codes ("n-pr-m n-pr-loc")
 *  are joined: ["Proper name", "Masculine", "/", "Proper name", "Place"]. */
export function decodeHebrewPos(pos, lang = "en") {
  if (!pos) return [];
  const t = HEB_POS[lang] || HEB_POS.en;
  const groups = pos.split(/\s+/).map((p) => t[p] || HEB_POS.en[p] || [p]);
  return groups.flatMap((g, i) => (i ? ["/", ...g] : g));
}

export function decodeMorph(code, lang = "en") {
  if (!code) return null;
  const t = L[lang] || L.en;
  const d = /^TH?\d+$/i.test(code) ? decodeHebrew(code, t, lang) : decodeGreek(code, t);
  d.summary = [d.pos, ...d.fields.map((f) => f.v)].filter(Boolean).join(" · ");
  return d;
}
