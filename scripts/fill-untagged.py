"""Fill in Strong's numbers on untagged words of the Spanish tagged Bibles.

For each verse, the Strong's numbers the KJV verse has but the Spanish verse lacks are
"missing". An untagged Spanish word gets one of them only when the Spanish Bibles
themselves tie that word to that number elsewhere in the New Testament (at least
MIN_COUNT times and MIN_RATIO of the word's tagged uses), and no other missing number
qualifies. Parsing (m) and Greek word (g) come from the KJV token (left out when the KJV verse
has that number in more than one Greek form). Articles (G3588) are
left alone. Text is never changed; a multi-word untagged token is split around the word.

    python3 scripts/fill-untagged.py 40            # dry run: report only
    python3 scripts/fill-untagged.py 40 --write    # apply
Reports: scripts/fill-untagged/<book>-<bible>-fixed.tsv and -remaining.tsv
"""
import collections, json, os, re, sys, unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
B = os.path.join(ROOT, 'public', 'data', 'bibles')
TARGETS = {
    'rvg-strong': os.path.join(B, 'rvg-strong'),
    'rv1909-strong': os.path.join(B, 'rv1909-strong'),
    'straubinger-strong': os.path.join(B, 'straubinger-strong'),
    'rvo-source': os.path.join(ROOT, 'scripts', 'rvo', 'backup-original'),  # rvo-strong is rebuilt from this
}
LEARN = ['rvg-strong', 'rv1909-strong', 'straubinger-strong', 'rvo-strong']
MIN_COUNT, MIN_RATIO = 3, 0.15
SKIP = {'G3588'}
OUT = os.path.join(ROOT, 'scripts', 'fill-untagged')

def norm(w):
    w = unicodedata.normalize('NFD', w.lower())
    w = ''.join(ch for ch in w if unicodedata.category(ch) != 'Mn')
    return re.sub(r'[^\w]', '', w)

def load(folder, book):
    p = os.path.join(folder, f'{book}.json')
    raw = open(p, encoding='utf-8', newline='').read()
    return p, raw, json.loads(raw)

# Prettier layout (2 spaces, each token on one line when it fits in 80 columns),
# used by scripts/rvo/backup-original
def _pretty(o, ind=0, last=True):
    pad=' '*ind; tail='' if last else ','
    if isinstance(o, dict) and 't' in o:
        one=pad+'{ '+', '.join(json.dumps(k,ensure_ascii=False)+': '+json.dumps(v,ensure_ascii=False) for k,v in o.items())+' }'+tail
        if len(one)<=80: return [one]
    if isinstance(o, dict):
        if not o: return [pad+'{}'+tail]
        out=[pad+'{']; items=list(o.items())
        for i,(k,v) in enumerate(items):
            sub=_pretty(v,ind+2,i==len(items)-1)
            sub[0]=' '*(ind+2)+json.dumps(k,ensure_ascii=False)+': '+sub[0].lstrip()
            out+=sub
        return out+[pad+'}'+tail]
    if isinstance(o, list):
        if not o: return [pad+'[]'+tail]
        out=[pad+'[']
        for i,v in enumerate(o): out+=_pretty(v,ind+2,i==len(o)-1)
        return out+[pad+']'+tail]
    return [pad+json.dumps(o,ensure_ascii=False)+tail]
def _pretty_dumps(o): return '\n'.join(_pretty(o))+'\n'

def dump_like(obj, raw):
    if '{ "t": ' in raw:
        return _pretty_dumps(obj)
    if raw.startswith('{"'):
        s = json.dumps(obj, ensure_ascii=False, separators=(',', ':'))
    elif raw.startswith('{\n\t'):
        s = json.dumps(obj, ensure_ascii=False, indent='\t')
    else:
        s = json.dumps(obj, ensure_ascii=False, indent=2)
    return s + ('\n' if raw.endswith('\n') else '')

# word -> Strong's -> weight, learned from the tagged NT of the Spanish Bibles
assoc = collections.defaultdict(collections.Counter)
for name in LEARN:
    for bk in range(40, 67):
        f = os.path.join(B, name, f'{bk}.json')
        if not os.path.exists(f):
            continue
        d = json.load(open(f, encoding='utf-8'))
        for vv in d['w'].values():
            for v in vv:
                for t in v:
                    s = t.get('s')
                    if not s:
                        continue
                    ws = [norm(x) for x in t['t'].split()]
                    ws = [x for x in ws if x]
                    for x in ws:
                        assoc[x][s] += 1 / len(ws)

def score(w, s):
    c = assoc[w][s]; tot = sum(assoc[w].values())
    return c, (c / tot if tot else 0)

def main():
    book = int(sys.argv[1]); write = '--write' in sys.argv
    os.makedirs(OUT, exist_ok=True)
    _, _, kjv = load(os.path.join(B, 'kjv-strong'), book)
    for name, folder in TARGETS.items():
        p, raw, d = load(folder, book)
        fixed, remaining = [], []
        for c, vv in d['w'].items():
            kv = kjv['w'].get(c, [])
            for i, toks in enumerate(vv):
                ref = f'{book} {c}:{i + 1}'
                ktoks = kv[i] if i < len(kv) else []
                have = collections.Counter(t.get('s') for t in toks if t.get('s'))
                need = collections.Counter(t['s'] for t in ktoks if t.get('s') and t['s'] not in SKIP)
                missing = need - have
                kinfo = {}
                forms = collections.defaultdict(set)
                for t in ktoks:
                    if t.get('s') in missing:
                        forms[t['s']].add(t.get('g'))
                        kinfo.setdefault(t['s'], t)
                # same number in two Greek forms (αυτω / αυτου): we can't tell which one is
                # missing, so keep only the number, without parsing or Greek word
                for s_, fs in forms.items():
                    if len(fs) > 1:
                        kinfo[s_] = {'s': s_, 't': kinfo[s_].get('t', '')}
                # candidate (word position) -> best missing number
                cands = []
                for ti, t in enumerate(toks):
                    if t.get('s'):
                        continue
                    for wi, w in enumerate(t['t'].split()):
                        n = norm(w)
                        ok = []
                        for s in missing:
                            cnt, r = score(n, s)
                            if cnt >= MIN_COUNT and r >= MIN_RATIO:
                                ok.append((r, cnt, s))
                        if len(ok) == 1:
                            cands.append((ok[0][0], ok[0][1], ok[0][2], ti, wi, w))
                        elif n:
                            remaining.append([name, ref, w, ' '.join(sorted(s for _, _, s in ok)) or '', d['v'][c][i]])
                # hand out each missing number at most as many times as it is missing, best first
                left = collections.Counter(missing)
                assign = {}
                for r, cnt, s, ti, wi, w in sorted(cands, reverse=True):
                    if left[s] > 0:
                        left[s] -= 1; assign[(ti, wi)] = s
                        k = kinfo[s]
                        fixed.append([name, ref, w, s, k.get('g', ''), k.get('t', ''), f'{r:.2f}', int(cnt), d['v'][c][i]])
                    else:
                        remaining.append([name, ref, w, s + ' (already used)', d['v'][c][i]])
                if not assign:
                    continue
                new = []
                for ti, t in enumerate(toks):
                    if t.get('s') or not any(k[0] == ti for k in assign):
                        new.append(t); continue
                    words = t['t'].split(); buf = []
                    def flush():
                        if buf:
                            nt = {k: v for k, v in t.items() if k != 'j'}; nt['t'] = ' '.join(buf)
                            new.append(nt); buf.clear()
                    first = len(new)
                    for wi, w in enumerate(words):
                        s = assign.get((ti, wi))
                        if s:
                            flush()
                            k = kinfo[s]; nt = {'t': w, 's': s}
                            for key in ('m', 'g'):
                                if key in k: nt[key] = k[key]
                            new.append(nt)
                        else:
                            buf.append(w)
                    flush()
                    if t.get('j'):
                        new[first]['j'] = True
                assert ' '.join(x['t'] for x in new).replace(' ', '') == ' '.join(x['t'] for x in toks).replace(' ', '')
                vv[i] = new
        for kind, rows, head in [('fixed', fixed, ['bible', 'ref', 'word', 'strong', 'greek', 'kjv', 'ratio', 'count', 'verse']),
                                 ('remaining', remaining, ['bible', 'ref', 'word', 'candidates', 'verse'])]:
            if kind == 'fixed' and not rows:
                continue    # keep the list from the run that made the fixes
            with open(os.path.join(OUT, f'{book}-{name}-{kind}.tsv'), 'w', encoding='utf-8') as fh:
                fh.write('\t'.join(head) + '\n')
                for r in rows:
                    fh.write('\t'.join(str(x) for x in r) + '\n')
        print(f'{name:20} tagged {len(fixed):5}  still untagged {len(remaining):5}')
        if write:
            open(p, 'w', encoding='utf-8', newline='').write(dump_like(d, raw))

main()
