// 웹채팅에서 수집한 응답 원문(web/<slug>.raw.txt)을 파싱해 scoped/<slug>.agy.json과 obs/<slug>.web.json으로 저장한다.
// 사용: node webrecv.mjs <slug> "<수집 시 모드 라벨>" <수집 시각 ISO>
import { W } from './paths.mjs'
import fs from 'node:fs'
const [slug, colMode, colAt] = process.argv.slice(2)
const p = JSON.parse(fs.readFileSync(`${W}/web/${slug}.raw.txt`, 'utf8'))
if (p.slug !== slug || !Array.isArray(p.books)) throw Error('bad shape')
const send = fs.readFileSync(`${W}/web-sends.jsonl`, 'utf8').trim().split('\n').map((l) => JSON.parse(l)).filter((s) => s.slug === slug).pop()
if (!send) throw Error('no send record')
fs.writeFileSync(`${W}/scoped/${slug}.agy.json`, JSON.stringify(p, null, 2))
fs.writeFileSync(`${W}/obs/${slug}.web.json`, JSON.stringify({ route: 'chrome-web', account: send.account, preMode: send.preMode, preAt: send.preAt, collectionMode: colMode, collectionAt: colAt }, null, 2))
console.log('saved', slug, 'books', p.books.length, 'unresolved', (p.unresolved ?? []).length)
