// id | English | Spanish | chapters   (index+1 = canonical book number)
const PACKED = `GEN|Genesis|Génesis|50
EXO|Exodus|Éxodo|40
LEV|Leviticus|Levítico|27
NUM|Numbers|Números|36
DEU|Deuteronomy|Deuteronomio|34
JOS|Joshua|Josué|24
JDG|Judges|Jueces|21
RUT|Ruth|Rut|4
1SA|1 Samuel|1 Samuel|31
2SA|2 Samuel|2 Samuel|24
1KI|1 Kings|1 Reyes|22
2KI|2 Kings|2 Reyes|25
1CH|1 Chronicles|1 Crónicas|29
2CH|2 Chronicles|2 Crónicas|36
EZR|Ezra|Esdras|10
NEH|Nehemiah|Nehemías|13
EST|Esther|Ester|10
JOB|Job|Job|42
PSA|Psalms|Salmos|150
PRO|Proverbs|Proverbios|31
ECC|Ecclesiastes|Eclesiastés|12
SNG|Song of Solomon|Cantares|8
ISA|Isaiah|Isaías|66
JER|Jeremiah|Jeremías|52
LAM|Lamentations|Lamentaciones|5
EZK|Ezekiel|Ezequiel|48
DAN|Daniel|Daniel|12
HOS|Hosea|Oseas|14
JOL|Joel|Joel|3
AMO|Amos|Amós|9
OBA|Obadiah|Abdías|1
JON|Jonah|Jonás|4
MIC|Micah|Miqueas|7
NAM|Nahum|Nahúm|3
HAB|Habakkuk|Habacuc|3
ZEP|Zephaniah|Sofonías|3
HAG|Haggai|Hageo|2
ZEC|Zechariah|Zacarías|14
MAL|Malachi|Malaquías|4
MAT|Matthew|Mateo|28
MRK|Mark|Marcos|16
LUK|Luke|Lucas|24
JHN|John|Juan|21
ACT|Acts|Hechos|28
ROM|Romans|Romanos|16
1CO|1 Corinthians|1 Corintios|16
2CO|2 Corinthians|2 Corintios|13
GAL|Galatians|Gálatas|6
EPH|Ephesians|Efesios|6
PHP|Philippians|Filipenses|4
COL|Colossians|Colosenses|4
1TH|1 Thessalonians|1 Tesalonicenses|5
2TH|2 Thessalonians|2 Tesalonicenses|3
1TI|1 Timothy|1 Timoteo|6
2TI|2 Timothy|2 Timoteo|4
TIT|Titus|Tito|3
PHM|Philemon|Filemón|1
HEB|Hebrews|Hebreos|13
JAS|James|Santiago|5
1PE|1 Peter|1 Pedro|5
2PE|2 Peter|2 Pedro|3
1JN|1 John|1 Juan|5
2JN|2 John|2 Juan|1
3JN|3 John|3 Juan|1
JUD|Jude|Judas|1
REV|Revelation|Apocalipsis|22`;

export const BOOKS = PACKED.split('\n').map((line, i) => {
  const [id, en, es, ch] = line.split('|');
  return { n: i + 1, id, en, es, chapters: +ch };
});

// Spanish 3-letter abbreviations for the book grid (same order as BOOKS).
const ES_ABBR = `GÉN ÉXO LEV NÚM DEU JOS JUE RUT 1SA 2SA 1RE 2RE 1CR 2CR ESD NEH EST JOB SAL PRO ECL CNT ISA JER LAM EZE DAN OSE JOE AMÓ ABD JON MIQ NAH HAB SOF HAG ZAC MAL MAT MAR LUC JUA HCH ROM 1CO 2CO GÁL EFE FIL COL 1TS 2TS 1TI 2TI TIT FLM HEB SAN 1PE 2PE 1JN 2JN 3JN JUD APO`.split(' ');
BOOKS.forEach((b, i) => { b.esAbbr = ES_ABBR[i]; });

/** Book name in the interface language ("Matthew" / "Mateo"). */
export const bookName = (b, lang = 'en') => (b ? (lang === 'es' ? b.es : b.en) : '');
/** Short label for the book grid ("MAT" / "MAT", "GEN" / "GÉN"). */
export const bookAbbr = (b, lang = 'en') => (b ? (lang === 'es' ? b.esAbbr : b.id) : '');

export const byId = Object.fromEntries(BOOKS.map(b => [b.id, b]));
export const byNum = Object.fromEntries(BOOKS.map(b => [b.n, b]));

const strip = s =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

// Extra shorthands people actually type
const ALIAS = {
  mt: 'MAT', mat: 'MAT', mk: 'MRK', mr: 'MRK', lk: 'LUK', jn: 'JHN', jhn: 'JHN',
  rom: 'ROM', ro: 'ROM', apoc: 'REV', ap: 'REV', rev: 'REV', sal: 'PSA', ps: 'PSA',
  gn: 'GEN', ex: 'EXO', dt: 'DEU', is: 'ISA', jer: 'JER', hch: 'ACT', ac: 'ACT',
};

/**
 * Parse "jn 3:16", "1 co 13", "mateo 5:3-12", "Salmos 23" -> {book, chapter, verse}
 * Returns null if no book matched.
 */
export function parseRef(input) {
  const raw = (input || '').trim();
  if (!raw) return null;
  const m = raw.match(/^(.*?)[\s.]*(\d+)?(?::(\d+))?(?:\s*-\s*\d+)?$/);
  if (!m) return null;
  const [, namePart, ch, vs] = m;
  const key = strip(namePart);
  if (!key) return null;

  if (ALIAS[key]) return hit(ALIAS[key], ch, vs);

  // exact id, then prefix match on either language
  const exact = BOOKS.find(b => strip(b.id) === key);
  if (exact) return hit(exact.id, ch, vs);

  const pref = BOOKS.filter(
    b => strip(b.en).startsWith(key) || strip(b.es).startsWith(key)
  );
  if (pref.length) return hit(pref[0].id, ch, vs);
  return null;
}

function hit(id, ch, vs) {
  const b = byId[id];
  return {
    book: id,
    chapter: Math.min(Math.max(+ch || 1, 1), b.chapters),
    verse: vs ? +vs : null,
  };
}

/** Suggestions for the quick-jump dropdown. */
export function suggest(input, lang = 'en', limit = 6) {
  const raw = (input || '').trim();
  const m = raw.match(/^(.*?)[\s.]*(\d+)?(?::(\d+))?$/) || [];
  const key = strip(m[1] || '');
  if (!key) return [];
  return BOOKS.filter(
    b => strip(b.en).startsWith(key) || strip(b.es).startsWith(key) || strip(b.id) === key
  )
    .slice(0, limit)
    .map(b => ({ ...b, label: lang === 'es' ? b.es : b.en, chapter: +m[2] || 1, verse: m[3] ? +m[3] : null }));
}
