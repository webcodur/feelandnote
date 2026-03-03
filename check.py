import json, os, glob
dirs = sorted(glob.glob('docs/celeb-data/persona/*/*.json'))
for p in dirs[:2]:
    print('file:', p)
