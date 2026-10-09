import json,glob,re,collections,os
B=os.path.expanduser('~/mnt/bible-app/bible-app/public/data/bibles/')
cap=re.compile(r"[A-ZÁÉÍÓÚÑÜ][\wáéíóúñüâêîôûÂÊÎÔÛ\-]*")
pairs=collections.defaultdict(collections.Counter)
oldcount=collections.Counter()
skip={'Jehová','JEHOVÁ','Dios','Señor','SEÑOR','DIOS','Y','E','Mas','Porque','Entonces','Y','Así','Pero','El','La','Los','Las'}
def caps(t): return [w for w in cap.findall(t) if w not in skip]
for f in sorted(glob.glob(B+'rvo-strong/*.json')):
  n=os.path.basename(f)
  o=json.load(open(f)); g=json.load(open(B+'rvg-strong/'+n))
  for c,vv in o['w'].items():
    gv=g['w'].get(c,[])
    for i,v in enumerate(vv):
      if i>=len(gv): continue
      gmap=collections.defaultdict(list)
      for tok in gv[i]:
        if tok.get('s'): gmap[tok['s']]+=caps(tok['t'])
      for tok in v:
        s=tok.get('s'); m=tok.get('m','')
        if not s: continue
        if not ('Np' in m or 'N-PRI' in m or m.startswith('N-')): continue
        ow=caps(tok['t'])
        if s.startswith('G') and not ow: continue
        gw=gmap.get(s,[])
        if len(ow)==1 and len(set(gw))==1:
          pairs[ow[0]][gw[0]]+=1
res=[]
for old,c in pairs.items():
  tot=sum(c.values()); new,k=c.most_common(1)[0]
  if new!=old: res.append((old,new,k,tot,dict(c)))
res.sort(key=lambda r:-r[3])
json.dump(res,open(os.path.expanduser('~/work/name_pairs.json'),'w'),ensure_ascii=False)
print(len(res))
for r in res[:400]: print(r[0],'->',r[1],r[2],'/',r[3], '' if r[2]==r[3] else r[4])
