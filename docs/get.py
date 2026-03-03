import os, glob, json

dirs = glob.glob(r'docs/celeb-data/persona/politician/*.json')
mis = []
done = set()
for p in dirs:
    dpath = p.replace('persona', 'dialogue')
    if not os.path.exists(dpath): 
        mis.append(p)
        continue
    try:
        with open(dpath, encoding='utf8') as f:
             dj = json.load(f)
             if 'lines' not in dj or 'answer' not in dj['lines'] or not dj['lines']['answer']:
                  mis.append(p)
             else:
                  done.add(p)
    except:
        mis.append(p)

for p in sorted(mis)[:5]:
    try:
       with open(p, encoding='utf-8') as f:
           print(p)
           print(f.read())
    except: pass
