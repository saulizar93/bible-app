#!/usr/bin/env python3
"""
RVO (Reina-Valera-Ojeda) builder.

Rebuilds public/data/bibles/rvo-strong from the untouched RV1909-strong copy in
scripts/rvo/backup-original, applying every revision rule in order, and writes a
full change log to scripts/rvo/changes/ for review.

    python3 scripts/rvo/transform.py

Each book file has the plain verse text (v) and the Strong's-tagged tokens (w).
Edits are made on the tokens and each verse's text is rebuilt from them, so the
two never drift apart. Rules that need context (Strong's number, the RVG wording
of the same verse, neighbouring words) live in pass A (inside one token) or pass B
(across words of the verse).
"""
import json, glob, re, os, csv, collections

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
SRC = os.path.join(HERE, 'backup-original')
DST = os.path.join(ROOT, 'public', 'data', 'bibles', 'rvo-strong')
RVG = os.path.join(ROOT, 'public', 'data', 'bibles', 'rvg-strong')
LOG = os.path.join(HERE, 'changes')
os.makedirs(LOG, exist_ok=True)

# ---------------------------------------------------------------- helpers
BOOKS = []
_books_js = open(os.path.join(ROOT, 'src', 'js', 'books.js'), encoding='utf-8').read()
for line in re.search(r'PACKED = `(.*?)`', _books_js, re.S).group(1).strip().splitlines():
    BOOKS.append(line.split('|')[2])

def case_like(src, out):
    """Give `out` the capitalisation pattern of `src` (lower / Capital / UPPER)."""
    if len(src) > 1 and src.isupper():
        parts = out.split(' ')
        return ' '.join([parts[0].upper()] + parts[1:])
    if src[:1].isupper():
        return out[:1].upper() + out[1:]
    return out

ACUTE = str.maketrans('áéíóú', 'aeiou')
def strip_acc(s): return s.translate(ACUTE)

PUNCT = re.compile(r'^([¿¡(«"\'\[]*)(.*?)([.,;:!?)»"\'\]]*)$', re.S)
def split_punct(w):
    m = PUNCT.match(w)
    return m.group(1), m.group(2), m.group(3)

LETTERS = r'[^\W\d_]'
WORD_RE = re.compile(r'(?<![\w\-])(' + LETTERS + r'+)(?![\w\-])')

# ---------------------------------------------------------------- change log
changes = []          # rows: book, chapter, verse, ref, rule, before, after, strong, note
cur = {}
def log(rule, before, after, strong='', note=''):
    if before == after:
        return
    changes.append([cur['b'], cur['c'], cur['v'], cur['ref'], rule, before, after, strong or '', note])

# ---------------------------------------------------------------- rule data
NM = json.load(open(os.path.join(HERE, 'name_map.json'), encoding='utf-8'))
for o, n in list(NM.items()):
    NM.setdefault(o.upper(), n.upper())
NAMES_RE = re.compile(r'(?<![\w\-])(' + '|'.join(sorted(map(re.escape, NM), key=len, reverse=True)) + r')(?![\w\-])')

TETRA = {'H3068', 'H3069'}
CREATE = {'H1254', 'G2936', 'G2937', 'G2939'}
FILL = {'H4390', 'G4137', 'G4130', 'G1072'}

# henchir (old "llenar") — unambiguous forms
HENCH = {'hinchió': 'llenó', 'henchido': 'lleno', 'henchida': 'llena', 'henchidos': 'llenos', 'henchidas': 'llenas',
         'henchirán': 'llenarán', 'henchid': 'llenad', 'henchirá': 'llenará', 'henchir': 'llenar', 'henchían': 'llenaban',
         'henchía': 'llenaba', 'hinchieron': 'llenaron', 'henchirás': 'llenarás', 'henchiré': 'llenaré', 'henchirla': 'llenarla',
         'henchiría': 'llenaría', 'henchiremos': 'llenaremos', 'henchirlas': 'llenarlas', 'henchisteis': 'llenasteis',
         'henchí': 'llené', 'hinchiendo': 'llenando', 'henchiste': 'llenaste', 'henchimos': 'llenamos', 'hinchándoos': 'llenándoos'}
# forms shared with "hinchar" (to swell): only when the Strong's number means "fill"
HENCH_AMBIG = {'hinche': 'llena', 'hinchen': 'llenan', 'hinches': 'llenas', 'hincho': 'lleno', 'hincha': 'llene', 'hinchan': 'llenen'}

LEX = {  # rule name, replacement
    'fué': ('acento', 'fue'), 'fuí': ('acento', 'fui'), 'dió': ('acento', 'dio'), 'vió': ('acento', 'vio'),
    'dí': ('acento', 'di'), 'ví': ('acento', 'vi'), 'pié': ('acento', 'pie'), 'piés': ('acento', 'pies'),
    'é': ('é/ó/ú → e/o/u', 'e'), 'ó': ('é/ó/ú → e/o/u', 'o'), 'ú': ('é/ó/ú → e/o/u', 'u'),
    'oid': ('acento', 'oíd'),
    'vianda': ('vianda → comida', 'comida'), 'viandas': ('vianda → comida', 'comidas'),
    'loor': ('loor → alabanza', 'alabanza'), 'loores': ('loor → alabanza', 'alabanzas'),
    'ánima': ('ánima → alma', 'alma'), 'acicalador': ('acicalador → forjador', 'forjador'),
    'aqueste': ('aqueste → este', 'este'), 'aquesta': ('aqueste → este', 'esta'),
    'aquestos': ('aqueste → este', 'estos'), 'aquestas': ('aqueste → este', 'estas'),
    'asaz': ('asaz → muy', 'muy'),
    'estotro': ('estotro → este otro', 'este otro'), 'estotra': ('estotro → este otro', 'esta otra'),
    'estotros': ('estotro → este otro', 'estos otros'), 'estotras': ('estotro → este otro', 'estas otras'),
    'prestamente': ('presto → pronto', 'rápidamente'),
    'doncella': ('doncella → joven', 'joven'), 'doncellas': ('doncella → joven', 'jóvenes'),
}
for k, v in HENCH.items():
    LEX[k] = ('henchir → llenar', v)
# parir -> dar a luz, every tense (applied in pass B, which can see the neighbouring words)
# verses where the subject is an animal: Spanish keeps "parir" there
PARIR_ANIMALS = {(1, 30, 39), (1, 31, 8), (18, 21, 10), (18, 39, 1), (24, 14, 5), (26, 31, 6)}
PARIR = {'parir': 'dar a luz', 'parió': 'dio a luz', 'parí': 'di a luz', 'pariste': 'diste a luz', 'parimos': 'dimos a luz',
         'parieron': 'dieron a luz', 'paría': 'daba a luz', 'parían': 'daban a luz', 'pariese': 'diese a luz',
         'pariesen': 'diesen a luz', 'pariera': 'diera a luz', 'pariere': 'diere a luz', 'parieren': 'dieren a luz',
         'pariendo': 'dando a luz', 'parido': 'dado a luz', 'pare': 'da a luz', 'paren': 'dan a luz', 'pares': 'das a luz',
         'parirá': 'dará a luz', 'parirás': 'darás a luz', 'parirán': 'darán a luz', 'pariré': 'daré a luz',
         'pariréis': 'daréis a luz', 'pariremos': 'daremos a luz', 'pariría': 'daría a luz'}

HEREDAD = {'H5159': 'herencia', 'H3425': 'herencia', 'H3426': 'herencia', 'G2817': 'herencia', 'G2819': 'herencia',
           'H272': 'posesión', 'H2506': 'porción', 'H2513': 'porción'}

CLITICS = ['les', 'los', 'las', 'nos', 'le', 'lo', 'la', 'se', 'me', 'te', 'os']
IRREG = re.compile(r'(dij|hiz|hic|pus|tuv|vin|traj|quis|pud|sup|duv|hub|cup|duj)[oe]$')
# present-tense / subjunctive look-alikes that are commands, not narration
NOT_FINITE = {'cría', 'gloría', 'expía', 'envía', 'guía', 'confía', 'fía', 'desvía', 'atavía', 'vacía', 'espía', 'porfía',
              'rocía', 'extravía', 'hastía', 'amplía', 'varía', 'enfría', 'resfría', 'esté', 'dé', 'tába'}
MONO = {'dió': 'dio', 'vió': 'vio', 'fué': 'fue', 'fuí': 'fui', 'dí': 'di', 'ví': 'vi'}

def finite_verb(v):
    """If `v` (still carrying its enclitic-era accent) is a finite preterite /
    imperfect / future form, return it with modern accentuation, else None."""
    lv = v.lower()
    if lv in MONO:
        return MONO[lv]
    if not re.search('[áéíóú]', lv):
        return None
    if lv == 'rió':
        return 'rio'
    if lv.endswith('ó') and len(lv) >= 3:                       # levantó
        return strip_acc(lv[:-1]) + 'ó'
    if lv.endswith('é') and len(lv) >= 4:                       # torné, llevé
        return strip_acc(lv[:-1]) + 'é'
    if re.search(r'(á|ié|é)ron$', lv):                           # levantáron
        return strip_acc(lv)
    if lv in NOT_FINITE:
        return None
    if re.search(r'ába(n|mos)?$', lv) and len(lv) >= 5:          # llamábale
        return strip_acc(lv)
    if re.search(r'ía(n|mos)?$', lv):                            # decíale
        return lv
    if re.search(r'(rá|rán|ré|rás)$', lv):                      # tornaráse (future)
        return lv
    if lv.endswith('íste'):                                     # hicístelo
        return strip_acc(lv)
    if IRREG.search(strip_acc(lv)) and re.search('[áéíóú]', lv[:-1]):   # díjole, púsolas
        return strip_acc(lv)
    return None

def split_enclitic(word):
    lw = word.lower()
    for c1 in CLITICS:
        if not lw.endswith(c1) or len(lw) <= len(c1) + 1:
            continue
        stem = lw[:-len(c1)]
        options = [(stem, c1)]
        for c2 in CLITICS:
            if stem.endswith(c2) and len(stem) > len(c2) + 1:
                options.insert(0, (stem[:-len(c2)], c2 + ' ' + c1))
        for v, cl in options:
            fv = finite_verb(v)
            if fv:
                return case_like(word, cl + ' ' + fv)
    return None

# ---------------------------------------------------------------- pass A (inside one token)
def pass_a(text, strong, ctx):
    # names
    def nm(m):
        log('nombre', m.group(1), NM[m.group(1)], strong); return NM[m.group(1)]
    text = NAMES_RE.sub(nm, text)
    if ctx['b'] != 6:  # "Adam", the city in Josué 3:16, stays
        text = re.sub(r'(?<![\w\-])Adam(?![\w\-])', lambda m: (log('nombre', 'Adam', 'Adán', strong), 'Adán')[1], text)
    # divine name
    text = re.sub(r'(?<![\w\-])(Jehová|JEHOVÁ)(?!\w)', lambda m: (log('Jehová → YHWH', m.group(1), 'YHWH', strong), 'YHWH')[1], text)
    text = re.sub(r'(?<![\w\-])JAH(?!\w)', lambda m: (log('JAH → YAH', 'JAH', 'YAH', strong), 'YAH')[1], text)
    if strong in TETRA and 'YHWH' not in text:
        new = re.sub(r'\bal Señor\b', 'a YHWH', text)
        new = re.sub(r'\bdel Señor\b', 'de YHWH', new)
        new = re.sub(r'\b(el )?Señor\b', 'YHWH', new)
        new = re.sub(r'\bDios\b', 'YHWH', new)
        if new != text:
            log('tetragrámaton (Dios/Señor) → YHWH', text, new, strong); text = new
    if strong == 'H3050' and 'Señor' in text:
        new = re.sub(r'\b(el )?Señor\b', 'YAH', text)
        log('JAH → YAH', text, new, strong); text = new

    def word(m):
        w = m.group(1); lw = w.lower()
        # crear (Strong's: create)
        if strong in CREATE and re.match(r'cri(ó|é|ad[oa]s?|aste|ará|aré|aron|ar|ador|adores)$', lw):
            out = case_like(w, 'cre' + lw[3:]); log('criar → crear', w, out, strong); return out
        # simiente: descendencia / semilla
        if lw == 'simiente':
            rv = ' '.join(ctx['rvg'].get(strong, [])).lower() if strong else ''
            if 'semilla' in rv or ctx['agri']:
                out = 'semilla'
            else:
                out = 'descendencia'
            out = case_like(w, out)
            log('simiente → descendencia/semilla', w, out, strong, 'RVG: ' + rv if rv else ''); return out
        # mancebo / mozo: siervo or joven, following RVG
        if lw in ('mancebo', 'mancebos', 'mozo', 'mozos'):
            rv = ' '.join(ctx['rvg'].get(strong, [])).lower() if strong else ''
            pl = lw.endswith('s')
            if re.search(r'\b(siervos?|criados?)\b', rv):
                out = 'siervos' if pl else 'siervo'
            else:
                out = 'jóvenes' if pl else 'joven'
            out = case_like(w, out)
            log(lw.rstrip('s') + ' → joven/siervo', w, out, strong, 'RVG: ' + rv if rv else ''); return out
        # heredad by Strong's
        if lw in ('heredad', 'heredades'):
            base = HEREDAD.get(strong, 'propiedad' if strong in ('H7704', 'G68', 'G5564', 'H2513') else 'herencia')
            if lw == 'heredades':
                base = (base[:-2] + 'ones') if base.endswith('ón') else (base + 'es' if base.endswith('d') else base + 's')
            out = case_like(w, base); log('heredad → herencia/posesión', w, out, strong); return out
        # henchir forms shared with hinchar
        if lw in HENCH_AMBIG:
            if strong in FILL:
                out = case_like(w, HENCH_AMBIG[lw]); log('henchir → llenar', w, out, strong); return out
            return w
        # lone accented vowels (old "á" = "a", etc.)
        if lw == 'á':
            out = case_like(w, 'a'); log('á → a', w, out, strong); return out
        # verb + attached pronoun
        if len(lw) > 3 and lw not in LEX:
            enc = split_enclitic(w)
            if enc:
                # the detached verb may itself need a lexical update (henchir etc.)
                parts = enc.split(' ')
                vb = parts[-1]
                if vb.lower() in LEX:
                    parts[-1] = case_like(vb, LEX[vb.lower()][1])
                if vb.lower() in HENCH_AMBIG and strong in FILL:
                    parts[-1] = case_like(vb, HENCH_AMBIG[vb.lower()])
                out = ' '.join(parts)
                log('pronombre enclítico', w, out, strong); return out
        if lw in LEX:
            rule, rep = LEX[lw]
            out = case_like(w, rep); log(rule, w, out, strong); return out
        if re.search(r'uí(d[oa]s?|r)$', lw):
            out = re.sub(r'uí(?=(d[oa]s?|r)$)', 'ui', w); out = re.sub(r'UÍ', 'UI', out)
            log('acento', w, out, strong); return out
        return w
    return WORD_RE.sub(word, text)

# ---------------------------------------------------------------- pass B (across words)
NEG = {'no', 'ni', 'nunca', 'jamás', 'tampoco', 'nada', 'nadie'}
ESTAR = re.compile(r'^(est(á|án|ás|oy|amos|aba|aban|ad|ará|arán|uvo|uviere|é|és|én)|sea|seas|sean|ser|seréis|serán|será|fue|fueron)$')
COMMONFIRST = {'tú', 'yo', 'él', 'ella', 'ellos', 'ellas', 'nosotros', 'vosotros', 'vosotras', 'la', 'el', 'los', 'las',
               'en', 'a', 'cada', 'esto', 'este', 'esta', 'estos', 'si', 'mi', 'tu', 'su', 'sus', 'mis', 'tus', 'aquel',
               'aquella', 'todo', 'toda', 'todos', 'el', 'un', 'una', 'siguieron', 'ahora', 'entonces', 'aun', 'aquí',
               'cuando', 'de', 'por', 'como', 'lo', 'le', 'les', 'se', 'me', 'te', 'nos', 'os'}
GALARDON_DET = {'el': 'la', 'del': 'de la', 'al': 'a la', 'un': 'una', 'este': 'esta', 'ese': 'esa', 'aquel': 'aquella',
                'nuestro': 'nuestra', 'vuestro': 'vuestra', 'mucho': 'mucha', 'buen': 'buena', 'los': 'las'}

def first_lower(w):
    pre, core, suf = split_punct(w)
    if core.lower() in COMMONFIRST:
        return pre + core.lower() + suf
    return w

def pass_b(words):
    """words: list of [text, tag]. Returns the new list."""
    cores = lambda: [split_punct(w[0])[1] for w in words]
    # clause starts
    def clause_start(k):
        s = 0
        for i in range(k):
            if re.search(r'[.;:,!?]["»\')]*$', words[i][0]):
                s = i + 1
        return s

    out = []
    k = 0
    while k < len(words):
        w, tag = words[k]
        pre, core, suf = split_punct(w)
        lc = core.lower()
        nxt = [split_punct(x[0])[1].lower() for x in words[k + 1:k + 4]]
        prev = split_punct(words[k - 1][0])[1].lower() if k else ''

        # parir -> dar a luz (every tense); "pare/paren/pares" from parar (to stop) are skipped
        if lc in PARIR and (cur['b'], cur['c'], cur['v']) not in PARIR_ANIMALS:
            nxt1 = nxt[0] if nxt else ''
            if not (lc in ('pare', 'paren', 'pares') and (prev in ('ni', 'te', 'se') or nxt1 == 'mientes')):
                new = pre + case_like(core, PARIR[lc]) + suf
                log('parir → dar a luz', w, new); out.append([new, tag]); k += 1; continue
        # "que declarado es" / "que es interpretado" (Greek methermēneuō) -> "traducido"
        if lc in ('declarado', 'interpretado') and prev in ('que', 'es') and nxt:
            if nxt[0] in ('es', 'quiere') or prev == 'es':
                s2 = '' if (suf == ',' and nxt[0] in ('es', 'quiere')) else suf
                new = pre + case_like(core, 'traducido') + s2
                log('declarado → traducido', w, new); out.append([new, tag]); k += 1; continue
        # heme / hete / henos
        if lc in ('heme', 'hete', 'henos'):
            if nxt[:1] == ['aquí']:
                apre, acore, asuf = split_punct(words[k + 1][0])
                if lc == 'hete':
                    out.append([pre + case_like(core, 'he') + suf, tag]); out.append(words[k + 1])
                    log('heme aquí → aquí estoy', w + ' ' + words[k + 1][0], out[-2][0] + ' ' + out[-1][0])
                else:
                    verb = 'estoy' if lc == 'heme' else 'estamos'
                    a = [pre + case_like(core, 'aquí') + suf, words[k + 1][1]]
                    b = [apre + verb + asuf, tag]
                    out += [a, b]
                    log('heme aquí → aquí estoy', w + ' ' + words[k + 1][0], a[0] + ' ' + b[0])
                k += 2; continue
            if nxt and re.search(r'(ad|id|ech|ich|uest|ierto)[oa]s?$', nxt[0]):   # participle
                rep = {'heme': 'me he', 'hete': 'te he', 'henos': 'nos hemos'}[lc]
                new = pre + case_like(core, rep) + suf
                log('heme hecho → me he hecho', w, new); out.append([new, tag]); k += 1; continue
        # empero -> pero (moved to the front of its clause)
        if lc == 'empero':
            s = clause_start(k)
            p = k - s
            if p == 0:
                new = pre + case_like(core, 'pero') + suf
                log('empero → pero', w, new); out.append([new, tag]); k += 1; continue
            if p in (1, 2) and len(out) >= p:
                moved = out[-p:]
                del out[-p:]
                before = ' '.join(m[0] for m in moved) + ' ' + w
                first = moved[0][0]
                fpre, fcore, fsuf = split_punct(first)
                pero = [fpre + case_like(fcore, 'pero'), tag]
                moved[0] = [first_lower(fcore + fsuf) if fcore[:1].isupper() else fcore + fsuf, moved[0][1]]
                moved[-1] = [moved[-1][0] + suf, moved[-1][1]]
                out.append(pero); out += moved
                log('empero → pero', before, ' '.join(x[0] for x in [pero] + moved))
                k += 1; continue
            new = pre + case_like(core, 'pero') + suf
            log('empero → pero', w, new, note='revisar orden'); out.append([new, tag]); k += 1; continue
        # mas -> pero
        if core in ('mas', 'Mas', 'MAS'):
            s = max(0, k - 10)
            back = [split_punct(x[0])[1].lower() for x in out[s:]]
            note = 'revisar: ¿sino?' if NEG & set(back) else ''
            new = pre + case_like(core, 'pero') + suf
            log('mas → pero', w, new, note=note); out.append([new, tag]); k += 1; continue
        # la haz -> la faz
        if lc == 'haz' and prev == 'la':
            new = pre + case_like(core, 'faz') + suf
            log('haz → faz', w, new); out.append([new, tag]); k += 1; continue
        # presto
        if lc in ('presto', 'prestos'):
            if ESTAR.match(prev):
                rep = 'dispuesto' if lc == 'presto' else 'dispuestos'
            else:
                rep = 'pronto' if lc == 'presto' else 'rápidos'
            new = pre + case_like(core, rep) + suf
            log('presto → pronto', w, new); out.append([new, tag]); k += 1; continue
        # galardón -> recompensa (with article agreement)
        if lc in ('galardón', 'galardones'):
            rep = 'recompensa' if lc == 'galardón' else 'recompensas'
            if out:
                ppre, pcore, psuf = split_punct(out[-1][0])
                if pcore.lower() in GALARDON_DET and not psuf:
                    old = out[-1][0]
                    out[-1] = [ppre + case_like(pcore, GALARDON_DET[pcore.lower()]) + psuf, out[-1][1]]
                    log('galardón → recompensa', old + ' ' + w, out[-1][0] + ' ' + pre + case_like(core, rep) + suf)
                else:
                    log('galardón → recompensa', w, pre + case_like(core, rep) + suf)
            else:
                log('galardón → recompensa', w, pre + case_like(core, rep) + suf)
            out.append([pre + case_like(core, rep) + suf, tag]); k += 1; continue
        out.append([w, tag]); k += 1
    # y / e agreement: "e" only before an i-sound (e hijas, e Israel), otherwise "y"
    for k in range(len(out) - 1):
        pre, core, suf = split_punct(out[k][0])
        if suf or core not in ('e', 'E', 'y', 'Y'):
            continue
        nxt = split_punct(out[k + 1][0])[1].lower()
        isound = bool(re.match(r'(i|í|hi|hí)', nxt)) and not re.match(r'hi[aeoáéó]', nxt)
        want = ('e' if isound else 'y')
        if core.lower() != want:
            new = pre + case_like(core, want) + suf
            log('conjunción y/e', core + ' ' + out[k + 1][0], new + ' ' + out[k + 1][0])
            out[k] = [new, out[k][1]]
    return out

# ---------------------------------------------------------------- pass C (ALL-CAPS words)
KEEP_CAPS = {'YHWH', 'YAH'}
CASEFORM = {}   # accent-free lowercase key -> the usual written form in the 1909 (with accents)
def _build_caseform():
    cnt = collections.defaultdict(collections.Counter)
    for f in glob.glob(os.path.join(SRC, '*.json')):
        for vs in json.load(open(f, encoding='utf-8'))['v'].values():
            for t in vs:
                for w in re.findall(r'[^\W\d_]+', t):
                    if not (len(w) > 1 and w.isupper()):
                        cnt[strip_acc(w.lower())][w] += 1
    for key, c in cnt.items():
        # prefer the lowercase form unless the word is (almost) always capitalised, i.e. a name
        low = sum(n for w, n in c.items() if w[0].islower())
        best = c.most_common(1)[0][0]
        CASEFORM[key] = best if best[0].isupper() and low * 4 < sum(c.values()) else best.lower() if low else best

def pass_c(words):
    orig = [split_punct(w)[1] for w, _ in words]
    is_caps = [len(c) > 1 and c.isupper() and c not in KEEP_CAPS for c in orig]
    for k, (w, tag) in enumerate(words):
        pre, core, suf = split_punct(w)
        prevw = words[k - 1][0] if k else ''
        start = k == 0 or bool(pre) or bool(re.search(r'[.!?:]["»\')]*$', prevw))
        # first word of an all-caps inscription in mid-verse (SANTIDAD A YHWH, REY DE REYES…)
        if is_caps[k] and k and not orig[k - 1].isupper() and k + 1 < len(words):
            nc = orig[k + 1]
            if nc.isupper() and (len(nc) > 1 or (k + 2 < len(words) and orig[k + 2].isupper())):
                start = True
        # a one-letter word (Y, A, O, E) inside an all-caps heading
        if len(core) == 1 and core.isupper() and not start and \
                ((k and is_caps[k - 1]) or (k + 1 < len(words) and is_caps[k + 1])):
            new = pre + core.lower() + suf
            log('MAYÚSCULAS → normal', w, new); words[k] = [new, tag]
            continue
        if not is_caps[k]:
            continue
        parts = []
        for part in core.split('-'):
            low = part.lower()
            if re.search('[áéíóú]', low):            # accent written in capitals: keep it
                form = CASEFORM.get(strip_acc(low), low)
                form = form if form.lower() == low else low
            else:
                form = CASEFORM.get(low, part[:1] + low[1:])
                if strip_acc(form.lower()) != low:
                    form = part[:1] + low[1:]
            if form.lower() in LEX:                  # 1909 spellings already modernised elsewhere (fué, oid…)
                form = case_like(form, LEX[form.lower()][1])
            parts.append(form)
        new = '-'.join(parts)
        if start:
            new = new[:1].upper() + new[1:]
        new = pre + new + suf
        if new != w:
            log('MAYÚSCULAS → normal', w, new)
            words[k] = [new, tag]
    return words

# ---------------------------------------------------------------- manual edits (ediciones-manuales.json)
MANUAL = {k: v for k, v in json.load(open(os.path.join(HERE, 'ediciones-manuales.json'), encoding='utf-8')).items()
          if not k.startswith('_')}
manual_done = set()

def _key(w):
    return strip_acc(split_punct(w)[1].lower())

def apply_manual(words):
    """Replace whole-word phrases in the verse. Each new word keeps the Strong's token of the
    old word it matches (same word, ignoring case/accents/punctuation), so reordered words
    carry their numbers with them; brand-new words join the token of the word before them."""
    edits = MANUAL.get(cur['ref'])
    if not edits:
        return words
    for old, new in edits.items():
        ow, nw = old.split(), new.split()
        texts = [w for w, _ in words]
        pos = next((i for i in range(len(texts) - len(ow) + 1) if texts[i:i + len(ow)] == ow), None)
        if pos is None:
            print(f'  ! {cur["ref"]}: no encuentro «{old}» en «{" ".join(texts)}»')
            continue
        olds = words[pos:pos + len(ow)]
        used = set()
        repl = []
        for j, w in enumerate(nw):
            m = next((i for i, (x, _) in enumerate(olds) if i not in used and _key(x) == _key(w)), None)
            if m is None:
                tag = repl[-1][1] if repl else olds[min(j, len(olds) - 1)][1]
            else:
                used.add(m); tag = olds[m][1]
            repl.append([w, tag])
        words = words[:pos] + repl + words[pos + len(ow):]
        log('edición manual', old, new)
        manual_done.add((cur['ref'], old))
    return words

# ---------------------------------------------------------------- token plumbing
def join(ts):
    s = ''
    for i, t in enumerate(ts):
        s += ('' if i == 0 or t.get('j') else ' ') + t['t']
    return s

def words_of(tokens):
    ws = []
    for i, t in enumerate(tokens):
        for x in t['t'].split(' '):
            if x:
                ws.append([x, i])
    return ws

def rebuild(tokens, words):
    """Regroup words into tokens (keeping each token's Strong's data); a word whose
    token was already closed stays with the current token so tokens stay contiguous."""
    groups = []   # [tag, [words]]
    seen = set()
    for w, tag in words:
        if groups and (tag == groups[-1][0] or tag in seen):
            groups[-1][1].append(w)
        else:
            if groups:
                seen.add(groups[-1][0])
            groups.append([tag, [w]])
    new = []
    used = set()
    for tag, ws in groups:
        t = dict(tokens[tag]); t['t'] = ' '.join(ws); new.append(t); used.add(tag)
    for i, t in enumerate(tokens):          # tokens that lost all their words
        if i not in used:
            log('token sin texto', t['t'], '', t.get('s'), 'el número Strong se perdió en este versículo')
    return new

AGRI = re.compile(r'(?i)\b(sembr|siembr|sement|hierba|grano|trigo|campo|árbol|fruto|sembrad)')

def dump_like(obj, raw):
    """Write the file back in the same layout it came in (compact, 2-space or tab)."""
    if raw.startswith('{"'):
        kw = dict(separators=(',', ':'))
    elif raw.startswith('{\n\t'):
        kw = dict(indent='\t')
    else:
        kw = dict(indent=2)
    return json.dumps(obj, ensure_ascii=False, **kw) + ('\n' if raw.endswith('\n') else '')

# ---------------------------------------------------------------- main
_build_caseform()
verse_rows = []
for f in sorted(glob.glob(os.path.join(SRC, '*.json')), key=lambda p: int(os.path.basename(p)[:-5])):
    name = os.path.basename(f)
    raw = open(f, encoding='utf-8').read()
    d = json.loads(raw)
    b = d['b']
    rvg = json.load(open(os.path.join(RVG, name), encoding='utf-8')) if os.path.exists(os.path.join(RVG, name)) else {'w': {}}
    for c in d['v']:
        vs = d['v'][c]
        ws = d['w'].get(c, [])
        gv = rvg['w'].get(c, [])
        for i, text in enumerate(vs):
            cur.update(b=b, c=int(c), v=i + 1, ref=f'{BOOKS[b - 1]} {c}:{i + 1}')
            rmap = collections.defaultdict(list)
            if i < len(gv):
                for t in gv[i]:
                    rmap[t.get('s')].append(t['t'])
            ctx = {'b': b, 'rvg': rmap, 'agri': bool(AGRI.search(text))}
            toks = ws[i] if i < len(ws) else None
            if toks and join(toks) == text:
                for t in toks:
                    t['t'] = pass_a(t['t'], t.get('s'), ctx)
                toks = rebuild(toks, apply_manual(pass_c(pass_b(words_of(toks)))))
                ws[i] = toks
                new = join(toks)
            else:   # no tokens, or tokens that don't spell the verse (Job 2:9)
                new = pass_a(text, None, ctx)
                new = ' '.join(w for w, _ in apply_manual(pass_c(pass_b([[x, 0] for x in new.split(' ') if x]))))
                if toks:
                    n0 = len(changes)
                    for t in toks:
                        t['t'] = pass_a(t['t'], t.get('s'), ctx)
                    toks = rebuild(toks, apply_manual(pass_c(pass_b(words_of(toks)))))
                    ws[i] = toks
                    del changes[n0:]       # already logged from the verse text
            if new != text:
                verse_rows.append([b, int(c), i + 1, cur['ref'], text, new])
            vs[i] = new
    open(os.path.join(DST, name), 'w', encoding='utf-8').write(dump_like(d, raw))

# ---------------------------------------------------------------- reports
with open(os.path.join(LOG, 'cambios-por-palabra.csv'), 'w', newline='', encoding='utf-8-sig') as fh:
    w = csv.writer(fh)
    w.writerow(['libro', 'capítulo', 'versículo', 'referencia', 'regla', 'antes', 'después', 'strong', 'nota'])
    w.writerows(changes)
with open(os.path.join(LOG, 'cambios-por-versiculo.csv'), 'w', newline='', encoding='utf-8-sig') as fh:
    w = csv.writer(fh)
    w.writerow(['libro', 'capítulo', 'versículo', 'referencia', 'RV1909', 'RVO'])
    w.writerows(verse_rows)
summary = collections.Counter((r[4], r[5].lower(), r[6].lower(), r[8]) for r in changes)
with open(os.path.join(LOG, 'resumen.csv'), 'w', newline='', encoding='utf-8-sig') as fh:
    w = csv.writer(fh)
    w.writerow(['regla', 'antes', 'después', 'nota', 'veces'])
    for (rule, a, bb, note), n in sorted(summary.items(), key=lambda x: (x[0][0], -x[1])):
        w.writerow([rule, a, bb, note, n])
by_rule = collections.Counter(r[4] for r in changes)
for ref, edits in MANUAL.items():
    for old in edits:
        if (ref, old) not in manual_done:
            print(f'  ! edición manual sin aplicar: {ref} «{old}»')
print('verses changed', len(verse_rows), 'word changes', len(changes))
for k, v in by_rule.most_common():
    print(f'{v:7d}  {k}')
