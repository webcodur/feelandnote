// 신규 조사 원고의 영어본(agy Ultra Carbon). 직접 인용은 출처 원문(영어)을 찾아 그대로 쓴다. 결과: relist/<slug>.new.en.txt
import fs from 'node:fs'; import { pathToFileURL } from 'node:url'
import { R, W } from './paths.mjs'
const { agyCall } = await import(new URL('./agy-slot.mjs', import.meta.url).href)
const D=W + '/relist'
await Promise.all(process.argv[2].split(',').filter(s=>fs.existsSync(`${D}/${s}.new.ko.txt`)||console.log(s,'SKIP 원고 없음')).map(async s=>{const ko=fs.readFileSync(`${D}/${s}.new.ko.txt`,'utf8').trim(), src=JSON.parse(fs.readFileSync(`${D}/${s}.research.json`,'utf8')).sources
 const prompt=`Write the English version of the Korean text below. Same paragraphs, same facts, nothing added or removed. For every direct quote, open the sources and use the speaker's original English wording verbatim (if the original is not English, translate faithfully). Use the usual English titles of books and films. Plain prose, no markdown, paragraphs separated by a blank line. Output only the English text.\n\n[Korean]\n${ko}\n\n[Sources]\n${src.join('\n')}`
 try{const out=(await agyCall(prompt,{model:'gemini-4-carbon-high',timeoutMs:45*60e3})).trim().replace(/^```\w*\n?|```$/g,'').trim();fs.writeFileSync(`${D}/${s}.new.en.txt`,out+'\n');const k=ko.split(/\n\n+/).length,e=out.split(/\n\n+/).length;console.log(s,'EN',out.length,'문단',k,e)}catch(e){console.log(s,'EN FAIL',String(e.message).slice(0,120))}}))
console.log('EN-NEW-DONE')
