/** 원고 HTML 을 파일로 뽑아 브라우저로 열어 본다. 올리기 전에 눈으로 확인하는 자리다. */
import fs from 'node:fs'
import path from 'node:path'
import { renderWork, renderPerson, renderList, type Material, type PersonMaterial, type ListMaterial } from './render.mts'

const ROOT = path.resolve(import.meta.dirname, '../../../..')
const name = process.argv[2]
if (!name) throw new Error('작품명을 달라')
const raw = JSON.parse(fs.readFileSync(path.join(ROOT, `data/tistory-cinema/${name}.json`), 'utf8'))
const { title, html, tags } = raw.list ? renderList(raw as ListMaterial) : raw.celeb ? renderPerson(raw as PersonMaterial) : renderWork(raw as Material)
const out = path.join(ROOT, `data/tistory-cinema/_preview-${name}.html`)
fs.writeFileSync(out, `<!doctype html><meta charset="utf-8"><title>${title}</title>
<div style="max-width:720px;margin:40px auto;padding:0 20px;font-family:-apple-system,'Malgun Gothic',sans-serif;font-size:16px;line-height:1.75;color:#222;">
<h1 style="font-size:26px;line-height:1.4;">${title}</h1>
<div style="font-size:13px;color:#888;margin-bottom:30px;">태그 ${tags.join(' · ')}</div>
${html}
</div>`)
fs.writeFileSync(path.join(ROOT, `data/tistory-cinema/_body-${name}.html`), html)
// 발행기가 읽는 메타. 제목·태그는 렌더러가 정하므로 여기서 함께 떨어뜨린다.
fs.writeFileSync(path.join(ROOT, `data/tistory-cinema/_meta-${name}.json`), JSON.stringify({ title, tags, length: html.length }, null, 2))
console.log('제목:', title)
console.log('태그:', tags.join(', '))
console.log('본문', html.length, '자 · 미리보기:', out)
