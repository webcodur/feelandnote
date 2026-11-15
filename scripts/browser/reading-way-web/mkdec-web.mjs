// 웹챗 책장 보완 결과 + CLI 검수본 → books-step 결정 파일. 사용: node scripts/browser/reading-way-web/mkdec-web.mjs <slug> <매핑 JSON 파일>
// 매핑: {"route":"chrome-web ... (u/0 프로)","webModel":"Argon 높음","map":{"<title_ko>":{content_id?|new?,addLocale?}}}
// 검수에서 drop:true인 책과 매핑이 없는 책은 넣지 않는다.
import fs from 'node:fs'
import { R, W } from './paths.mjs'
const D = W + '/relist', [slug, mapFile] = process.argv.slice(2)
const src = JSON.parse(fs.readFileSync(`${D}/${slug}.books.json`, 'utf8')), ver = JSON.parse(fs.readFileSync(`${D}/${slug}.books.verified.json`, 'utf8'))
const M = JSON.parse(fs.readFileSync(mapFile, 'utf8')), now = new Date().toISOString()
const keep = src.books.map(b => ({ b, v: ver.books.find(x => x.title_ko === b.title_ko) })).filter(({ b, v }) => v && !v.drop && M.map[b.title_ko])
const final = { slug, books: keep.map(({ b, v }) => ({ ...b, review_ko: v.review_ko.trim(), ...(/^https?:\/\//.test(v.source_url ?? '') ? { source_url: v.source_url } : {}) })) }
const finalPath = `${D}/${slug}.books.final.json`
fs.writeFileSync(finalPath, JSON.stringify(final, null, 1))
// 검수 모델·계정: 매핑의 verifyModel·verifyRoute(기본 Ultra Carbon). Ultra 한도 소진 때는 Pro 계정 Argon으로 검수한다(26.11.15).
const VM = M.verifyModel ?? 'gemini-4-carbon-high', fam = /argon/.test(VM) ? 'Argon' : 'Carbon'
const mode = l => ({ mode: fam + 'High', family: fam, version: null, label: l }), lbl = `agy --model ${VM} (CLI 명시 선택)`
const dec = {
  slug, original: finalPath.replace(/\\/g, '/'),
  modelObservation: { preSendMode: mode(lbl), preSendObservedAt: now, generationModeObservations: [], collectionStartMode: mode(lbl), collectionMode: mode(lbl), collectionObservedAt: now,
    actualModel: VM, responseModelEvidence: `agy --model flag (출처 대조 검수본). 초안: ${M.route} ${M.webModel}`, route: 'agy-cli ' + (M.verifyRoute ?? 'Ultra 계정') },
  books: keep.map(({ b, v }, index) => ({ index, ...M.map[b.title_ko], review_en: v.review_en.trim() })),
}
for (const x of dec.books) if (x.review_en.split(/\n\s*\n/).length !== final.books[x.index].review_ko.split(/\n\s*\n/).length) throw Error('문단 수 불일치 ' + final.books[x.index].title_ko)
fs.writeFileSync(`${D}/${slug}.decision.json`, JSON.stringify(dec, null, 1))
console.log(slug, '넣음', keep.map(k => k.b.title_ko), '뺌', src.books.filter(b => !keep.some(k => k.b === b)).map(b => b.title_ko + (ver.books.find(x => x.title_ko === b.title_ko)?.drop ? '(drop)' : '')))
for (const { v } of keep) console.log('-', v.title_ko, '|', v.changes)
