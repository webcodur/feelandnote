
import json, os
persona = os.path.dirname(os.path.abspath(__file__)) + '/celeb-data/persona'
dialog_d = os.path.dirname(os.path.abspath(__file__)) + '/celeb-data/ dialogue'.replace(' dialogue', 'dialogue')
out = set()
for p in os.listdir(persona):
   if not os.path.isdir(os.path.join(persona, p)): continue
   for f in os.listdir(os.path.join(persona, p)):
       if f.endswith('.json'):
           dpath = os.path.join(dialog_d, p, f)
           has_dialogue = False
           if os.path.exists(dpath):
               try:
                   with open(dpath, 'r', encoding='utf-8') as fi:
                       data = json.load(fi)
                       if 'lines' in data and len(data.get('lines', {}).get('answer', [])) > 0:
                           has_dialogue = True
               except: pass
           if not has_dialogue:
               out.add(p + "/" + f)
print("MISSING COUNT", len(out))
