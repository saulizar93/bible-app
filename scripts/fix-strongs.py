"""Post-build Strong's corrections for the Spanish tagged Bibles.

The Spanish Strong's sources tag every "Pedro" as G1565 (ekeinos, "that one")
instead of G4074 (Petros). This retags those tokens, plus the one-off
verse fixes in VERSE_FIXES. Safe to run any number of
times; run it again after rebuilding any of these Bibles from their sources.

    python3 scripts/fix-strongs.py
    python3 scripts/rvo/transform.py          # rebuilds rvo-strong from the fixed backup
    node scripts/build-concordance.mjs public/data/bibles/rv1909-strong public/data/concord/rv1909-strong
    node scripts/build-concordance.mjs public/data/bibles/rvo-strong public/data/concord/rvo-strong
"""
import glob, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FOLDERS = [
    'public/data/bibles/rvg-strong',
    'public/data/bibles/rv1909-strong',
    'public/data/bibles/straubinger-strong',
    'scripts/rvo/backup-original',   # source of rvo-strong (transform.py)
]
# (word in the token text, wrong Strong's, right Strong's)
RULES = [
    ('Pedro', 'G1565', 'G4074'),
    ('Cefas', 'G1565', 'G2786'),
]

# One-off fixes for a single verse: (book, regex with the text before the number as group 1, right Strong's, note)
VERSE_FIXES = [
    # Mt 16:18 "tú eres Pedro, y sobre esta piedra": the "y" is kai (G2532), not de (G1161)
    (40, r'("t":\s*"Pedro,",\s*"s":\s*"G4074"\s*\},\s*\{\s*"t":\s*"y",\s*"s":\s*)"G1161"', 'G2532',
     'Mt 16:18 "y" G1161 -> G2532'),
]

total = 0
for folder in FOLDERS:
    for f in glob.glob(os.path.join(ROOT, folder, '*.json')):
        raw = open(f, encoding='utf-8', newline='').read()
        new = raw
        for word, bad, good in RULES:
            pat = re.compile(r'("t":\s*"[^"]*\b' + word + r'\b[^"]*",\s*"s":\s*)"' + bad + '"')
            new, n = pat.subn(r'\1"' + good + '"', new)
            total += n
            if n:
                print(f'{folder}/{os.path.basename(f)}: {word} {bad} -> {good} x{n}')
        for book, pattern, good, why in VERSE_FIXES:
            if os.path.basename(f) == f'{book}.json':
                new, n = re.subn(pattern, r'\1"' + good + '"', new)
                total += n
                if n:
                    print(f'{folder}/{os.path.basename(f)}: {why} x{n}')
        if new != raw:
            open(f, 'w', encoding='utf-8', newline='').write(new)
print('tokens fixed:', total)
