import os, glob

dirs = sorted(glob.glob('docs/celeb-data/persona/*/*.json')) # alphabetical sort!
mis_files = [] 

# Check each persona file
for p_path in dirs: 
    target = p_path.replace('persona', 'dialogue')
    if 'politician' not in p_path: continue
    
    is_missing = True
    
    if os.path.exists(target):
        try:
           import json
           with open(target, 'r', encoding='utf-8') as fin:
              dat = json.load(fin)
              if 'lines' in dat and 'answer' in dat['lines'] and len(dat['lines']['answer']) > 0:
                   is_missing = False 
        except: pass
    
    if is_missing:
        mis_files.append(p_path)

print('Total politician missing:', len(mis_files))
for f in mis_files[:3]:
    target = f.replace('persona', 'dialogue')
    print('Will work on:', f)
