"""Apply hand-made Strong's corrections and notes to the tagged Bibles whose text is
not rebuilt by a script: kjv-strong, bsb-strong, msb-strong, lsv-strong, rvg-strong,
rv1909-strong, straubinger-strong (rvo-strong keeps using
scripts/rvo/ediciones-manuales.json + notas-traductor.json).

Edit scripts/correcciones/correcciones.json, then run:

    python3 scripts/correcciones/aplicar.py

It never changes the Bible text, only how its words are tagged. Safe to run any
number of times: a correction that is already applied changes nothing. If a file
changed, the matching concordance is rebuilt and DATA_VERSION / LEXICON_VERSION
in src/js/data.js go up by one.

Format (see the "_ayuda" / "_help" lines in the JSON; "etiquetas"/"tags" and
"notas"/"notes" are the same, and book names may be English or Spanish):
  "rvg-strong": {
    "etiquetas": { "Mateo 5:24": { "reconcíliate primero": "reconcíliate|G1259 primero|G4412" } },
    "notas":     { "Mateo 5:22": { "sin razón": "Nota..." } }
  }
- The reference uses the full book name in English or Spanish ("Matthew 5:24", "Mateo 5:24").
- The key is the words exactly as they read in that Bible (with punctuation).
- The value is the same words, each marked |G#### (|H#### in the OT). Unmarked words
  join the next marked word ("a|G846 su hermano,|G80" -> "a" + "su hermano,"), words
  after the last mark join the last one. "|-" = no Strong's number.
- Parsing and Greek/Hebrew word come from a token of that Bible that already has the
  number in the same verse, otherwise from the KJV token with the number.
- Notes: the key is the word(s) the note goes on, "*" = the end of the verse.
"""
import json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
BIBLES = os.path.join(ROOT, 'public', 'data', 'bibles')
CONCORD = os.path.join(ROOT, 'public', 'data', 'concord')
# Bible -> concordance folder its word search is built into (None = it uses another
# Bible's concordance: LSV uses the KJV's, so retagging LSV doesn't change any index)
CONCORD_OF = {
    'kjv-strong': CONCORD,
    'bsb-strong': os.path.join(CONCORD, 'bsb-strong'),
    'msb-strong': os.path.join(CONCORD, 'msb-strong'),
    'lsv-strong': None,
    'rvg-strong': os.path.join(CONCORD, 'rvg-strong'),
    'rv1909-strong': os.path.join(CONCORD, 'rv1909-strong'),
    'straubinger-strong': os.path.join(CONCORD, 'straubinger-strong'),
}
ALLOWED = tuple(CONCORD_OF)
SECTIONS = {'etiquetas': 'tags', 'tags': 'tags', 'notas': 'notes', 'notes': 'notes'}

_books = open(os.path.join(ROOT, 'src', 'js', 'books.js'), encoding='utf-8').read()
BOOK_NO = {}
for n, line in enumerate(re.search(r'PACKED = `(.*?)`', _books, re.S).group(1).strip().splitlines(), 1):
    _id, en, es, _ = line.split('|')
    for name in (en, es, _id):
        BOOK_NO[name.lower()] = n

def parse_ref(ref):
    m = re.match(r'^\s*(.+?)\s+(\d+):(\d+)\s*$', ref)
    if not m or m.group(1).lower() not in BOOK_NO:
        return None
    return BOOK_NO[m.group(1).lower()], m.group(2), int(m.group(3))

def join(toks):
    s = ''
    for i, t in enumerate(toks):
        s += ('' if i == 0 or t.get('j') else ' ') + t['t']
    return s

def dump_like(obj, raw):
    if raw.startswith('{"'):
        s = json.dumps(obj, ensure_ascii=False, separators=(',', ':'))
    elif raw.startswith('{\n\t'):
        s = json.dumps(obj, ensure_ascii=False, indent='\t')
    else:
        s = json.dumps(obj, ensure_ascii=False, indent=2)
    return s + ('\n' if raw.endswith('\n') else '')

_kjv = {}
def kjv_token(book, ch, v, strong):
    if book not in _kjv:
        f = os.path.join(BIBLES, 'kjv-strong', f'{book}.json')
        _kjv[book] = json.load(open(f, encoding='utf-8'))['w'] if os.path.exists(f) else {}
    toks = _kjv[book].get(ch, [])
    toks = toks[v - 1] if v - 1 < len(toks) else []
    return next((t for t in toks if t.get('s') == strong), None)

def retag(toks, old, new, book, ch, v):
    """Return (new tokens, message or None)."""
    ow = old.split()
    nw = [w.split('|', 1)[0] for w in new.split()]
    marks = [w.split('|', 1)[1] if '|' in w else None for w in new.split()]
    if nw != ow:
        return toks, f'«{new}» no tiene las mismas palabras que «{old}» (aquí solo se cambian etiquetas, no el texto)'
    if not any(marks):
        return toks, f'«{new}»: ninguna palabra lleva |G#### o |H####'
    bad = [m for m in marks if m and m != '-' and not re.fullmatch(r'[GH]\d+', m)]
    if bad:
        return toks, f'«{new}»: marca no válida {bad}'
    # words of the verse: (word, token index, first word of its token?)
    words = []
    for ti, t in enumerate(toks):
        for k, w in enumerate(t['t'].split(' ')):
            if w:
                words.append((w, ti, k == 0))
    texts = [w for w, _, _ in words]
    pos = next((i for i in range(len(texts) - len(ow) + 1) if texts[i:i + len(ow)] == ow), None)
    if pos is None:
        return toks, f'no encuentro «{old}»'
    # each word of the phrase gets a mark: its own, else the next one, else the last one
    tags, nxt = [None] * len(ow), None
    for k in range(len(ow) - 1, -1, -1):
        nxt = marks[k] or nxt
        tags[k] = nxt
    last = None
    for k in range(len(ow)):
        last = marks[k] or last
        tags[k] = tags[k] or last
    # group into keys: words outside the phrase keep their token; inside, consecutive
    # words with the same mark form one new token
    keys = []
    for i, (w, ti, first) in enumerate(words):
        if pos <= i < pos + len(ow):
            k = i - pos
            gid = sum(1 for a in range(1, k + 1) if tags[a] != tags[a - 1])
            keys.append((w, ('new', tags[k], gid), ti, first))
        else:
            keys.append((w, ('old', ti), ti, first))
    span_toks = {toks[words[i][1]].get('s'): toks[words[i][1]] for i in range(pos, pos + len(ow))}
    verse_toks = {t.get('s'): t for t in toks if t.get('s')}
    out, cur = [], None
    for w, key, ti, first in keys:
        if cur and cur[0] == key:
            cur[1].append(w)
            continue
        cur = (key, [w], ti, first)
        out.append(cur)
    result = []
    for key, ws, ti, first in out:
        if key[0] == 'old':
            t = dict(toks[ti]); t['t'] = ' '.join(ws)
            if not first:
                t.pop('j', None)
        else:
            mark = key[1]
            t = {'t': ' '.join(ws)}
            if mark != '-':
                src = span_toks.get(mark) or verse_toks.get(mark) or kjv_token(book, ch, v, mark) or {}
                t['s'] = mark
                for f in ('m', 'g'):
                    if f in src:
                        t[f] = src[f]
            o = toks[ti]
            # keep the word's other marks from its old token (e.g. "r" = words of Jesus in red)
            for f, val in o.items():
                if f not in ('t', 's', 'm', 'g', 'n', 'j') and f not in t:
                    t[f] = val
            if first and o.get('j'):
                t['j'] = True
        result.append(t)
    # keep any translator's note of a token in the phrase on the token that ends where it ended
    for ti in sorted({words[i][1] for i in range(pos, pos + len(ow))}):
        n = toks[ti].get('n')
        if n:
            last_word = max(i for i, (_, x, _) in enumerate(words) if x == ti)
            count = 0
            for t in result:
                count += len(t['t'].split())
                if count > last_word:
                    t['n'] = n
                    break
    if join(result) != join(toks):
        return toks, 'el texto resultante no coincide (no se aplicó)'
    return result, None

def set_note(toks, key, note):
    if not toks:
        return False, 'el versículo no tiene palabras etiquetadas'
    if key == '*':
        hit = toks[-1]
    else:
        kw = key.split()
        hit = None
        for t in toks:
            tw = t['t'].split()
            if any(tw[j:j + len(kw)] == kw for j in range(len(tw) - len(kw) + 1)):
                hit = t
                break
        if hit is None:
            return False, f'no encuentro «{key}» (si abarca dos grupos, ajuste primero las etiquetas)'
    if hit.get('n') == note:
        return False, None
    hit['n'] = note
    return True, None

def main():
    cfg = json.load(open(os.path.join(HERE, 'correcciones.json'), encoding='utf-8'))
    changed_bibles, warnings = set(), []
    for bible, sections in cfg.items():
        if bible.startswith('_'):
            continue
        if bible not in ALLOWED:
            warnings.append(f'{bible}: no permitido aquí (la RVO usa scripts/rvo/)')
            continue
        files = {}
        def get(book):
            if book not in files:
                p = os.path.join(BIBLES, bible, f'{book}.json')
                raw = open(p, encoding='utf-8', newline='').read()
                files[book] = [p, raw, json.loads(raw), False]
            return files[book]
        work = []
        for name, items in sections.items():
            if name.startswith('_'):
                continue
            if name not in SECTIONS:
                warnings.append(f'{bible}: sección desconocida «{name}» (use etiquetas/tags o notas/notes)'); continue
            work.append((SECTIONS[name], items or {}))
        for kind, refs in sorted(work, key=lambda x: x[0] != 'tags'):
            for ref, items in refs.items():
                r = parse_ref(ref)
                if not r:
                    warnings.append(f'{bible} {ref}: referencia no válida'); continue
                book, ch, v = r
                rec = get(book)
                d = rec[2]
                vv = d['w'].get(ch, [])
                if v - 1 >= len(vv) or v - 1 >= len(d['v'].get(ch, [])):
                    warnings.append(f'{bible} {ref}: el versículo no existe'); continue
                for old, new in items.items():
                    toks = vv[v - 1]
                    if kind == 'tags':
                        res, msg = retag(toks, old, new, book, ch, v)
                        if msg:
                            warnings.append(f'{bible} {ref}: {msg}')
                        elif res != toks:
                            vv[v - 1] = res; rec[3] = True
                    else:
                        ok, msg = set_note(toks, old, new)
                        if msg:
                            warnings.append(f'{bible} {ref}: {msg}')
                        if ok:
                            rec[3] = True
        for book, (p, raw, d, ch) in files.items():
            if ch:
                for c, vv in d['w'].items():
                    for i, toks in enumerate(vv):
                        assert join(toks) == d['v'][c][i] or i >= len(d['v'][c]), (bible, book, c, i)
                open(p, 'w', encoding='utf-8', newline='').write(dump_like(d, raw))
                changed_bibles.add(bible)
                print(f'{bible}/{book}.json actualizado')
    for w in warnings:
        print('  !', w)
    if not changed_bibles:
        print('Nada que cambiar.')
        return
    # rebuild concordances and bump cache versions
    rebuilt = []
    for bible in sorted(changed_bibles):
        out = CONCORD_OF[bible]
        if out is None:
            continue
        subprocess.run(['node', os.path.join(ROOT, 'scripts', 'build-concordance.mjs'),
                        os.path.join(BIBLES, bible), out], check=True)
        rebuilt.append(bible)
    dj = os.path.join(ROOT, 'src', 'js', 'data.js')
    s = open(dj, encoding='utf-8', newline='').read()
    for name in ('DATA_VERSION',) + (('LEXICON_VERSION',) if rebuilt else ()):
        s = re.sub(rf'(const {name} = )(\d+);', lambda m: f'{m.group(1)}{int(m.group(2)) + 1};', s, count=1)
    open(dj, 'w', encoding='utf-8', newline='').write(s)
    print('DATA_VERSION +1' + (f'; concordancias reconstruidas: {", ".join(rebuilt)}; LEXICON_VERSION +1' if rebuilt else ''))

if __name__ == '__main__':
    main()
