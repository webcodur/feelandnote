// 실행자가 원출처를 직접 열어 대조하고 쓴 감상배경을 원고·결정 파일로 만들어 books-step.mjs로 미리 보거나 반영한다.
// 사용(저장소 루트): node --import tsx <이 파일> <spec.mjs 절대경로> [--apply]
// spec(export default): {slug, books:[{title_ko, title_en, author_ko, author_en, source_url, extra_sources?, evidence, review_ko, review_en,
//   content_id | new:{kakaoIsbn, en:{title, creator, title_kind}}, addLocale?:{locale:'en', title, creator, title_kind}}]}
// - 기존 작품은 find-work.mjs로 찾아 content_id를 쓴다. 영어 행이 없는 기존 작품은 addLocale로 채운다.
// - 새 작품은 카카오 ISBN(new.kakaoIsbn)으로 넣는다. 반영기가 「ISBN already exists」로 멈추면 그 ISBN의 content_id로 바꿔 다시 부른다.
// - 반영기가 「Relationship already exists」로 멈추면 이미 반영된 것이다. 다시 부르지 말고 책장을 재조회한다.
import { R, W } from './paths.mjs'
import fs from 'node:fs'
import { pathToFileURL } from 'node:url'
import { execFileSync } from 'node:child_process'
const [specPath, flag] = process.argv.slice(2)
const spec = (await import(pathToFileURL(specPath).href + '?t=' + Date.now())).default
const D = `${W}/bkdec/`
fs.mkdirSync(D, { recursive: true })
const original = {
  slug: spec.slug,
  books: spec.books.map((b) => ({ title_ko: b.title_ko, title_en: b.title_en, author_ko: b.author_ko, author_en: b.author_en, source_url: b.source_url, evidence: b.evidence, review_ko: b.review_ko })),
}
const op = D + spec.slug + '.books.original.json'
fs.writeFileSync(op, JSON.stringify(original, null, 2))
for (const b of spec.books) {
  const kp = b.review_ko.split(/\n\s*\n/).length, ep = b.review_en.split(/\n\s*\n/).length
  if (kp !== ep) throw Error(`paragraphs ${b.title_ko} ${kp}/${ep}`)
  if (!!b.content_id === !!b.new) throw Error('content_id xor new: ' + b.title_ko)
}
const d = {
  slug: spec.slug,
  original: op,
  modelObservation: { route: 'executor', author: process.env.RW_AUTHOR || 'executor', verifiedSources: [...new Set(spec.books.flatMap((b) => [b.source_url, ...(b.extra_sources || [])]))] },
  books: spec.books.map((b, index) => ({ index, ...(b.content_id ? { content_id: b.content_id } : { new: b.new }), review_en: b.review_en, ...(b.addLocale ? { addLocale: b.addLocale } : {}) })),
}
const dp = D + spec.slug + '.decision.json'
fs.writeFileSync(dp, JSON.stringify(d, null, 2))
const out = execFileSync(process.execPath, ['--import', 'tsx', 'scripts/browser/reading-way-web/books-step.mjs', dp, ...(flag === '--apply' ? ['--apply'] : [])], { cwd: R, encoding: 'utf8', maxBuffer: 64 << 20 })
console.log(out.slice(-1500))
