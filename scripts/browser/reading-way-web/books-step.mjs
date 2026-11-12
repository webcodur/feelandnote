// 책장 후처리 결정 파일 → 영어 감상경위 번역·결합 파일·반영 계획 작성 → 반영기 미리보기(또는 --apply).
// 결정 파일: {slug, original, log, books:[{index, content_id?|new:{ko:{title,creator,title_kind},en:{title,creator,title_kind}}, edits:[{field,from,to}]}]}
// 사용(저장소 루트): node --import tsx <이 파일> <결정 파일 절대경로> [--apply]
import { R } from './paths.mjs'
import fs from 'node:fs/promises'
import crypto from 'node:crypto'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
process.loadEnvFile(R + '/sw/web-bo/.env')
const { agyCall } = await import(pathToFileURL(R + '/.agents/skills/agy-antigravity/scripts/agy-call.mjs').href)
const { applyPlan } = await import(pathToFileURL(R + '/scripts/browser/reading-way-books-apply.mjs').href)
const kakao = await import(pathToFileURL(R + '/packages/content-search/src/kakao-books.ts').href)
const decisionPath = process.argv[2], APPLY = process.argv.includes('--apply')
const d = JSON.parse(await fs.readFile(decisionPath, 'utf8'))
const W = path.dirname(decisionPath)
const raw = await fs.readFile(d.original, 'utf8')
const original = JSON.parse(raw.replace(/^\uFEFF/, ''))
if (original.slug !== d.slug) throw Error('original slug mismatch')

// 회수 로그의 books_ready 기록에서 실제 모델 확인값을 그대로 가져온다(지어내지 않는다).
const logLine = d.modelObservation ? { modelObservation: d.modelObservation } : (await fs.readFile(d.log, 'utf8')).split('\n').map((l) => { try { return JSON.parse(l) } catch { return null } })
  .filter((e) => e?.event === 'books_ready' && e.slug === d.slug).pop()
if (!logLine?.modelObservation) throw Error('no books_ready modelObservation for ' + d.slug)

const apply = (text, edits, field) => (edits ?? []).filter((e) => e.field === field).reduce((t, e) => {
  if (t.indexOf(e.from) < 0 || t.indexOf(e.from) !== t.lastIndexOf(e.from)) throw Error(`edit not unique/found: ${e.from.slice(0, 40)}`)
  return t.replace(e.from, e.to)
}, text)

const combined = structuredClone(original)
for (const b of d.books) {
  const src = original.books[b.index]
  if (!src) throw Error('book index ' + b.index)
  const ko = apply(src.review_ko, b.edits, 'review')
  const prompt = `다음 한국어 감상배경을 영어로 번역해 주세요. 문단 구분(빈 줄)을 그대로 유지하고, 인물·작품 이름은 통용 영어 표기로 옮기며, 내용을 더하거나 빼지 마세요. 마크다운 강조와 제목·머리말 없이 번역문만 주세요. (참고: 이 책의 영어 제목은 ${src.title_en}, 저자는 ${src.author_en}입니다.)\n\n${ko}`
  const en = b.review_en ?? (await agyCall(prompt, { model: 'gemini-4-carbon-high', timeoutMs: 600_000 })).trim().replace(/\*{1,2}([^*\n]+?)\*{1,2}/g, '$1')
  b.review_en = en
  const kp = ko.split(/\n\s*\n/).length, ep = en.split(/\n\s*\n/).length
  if (kp !== ep) throw Error(`paragraph mismatch ${src.title_ko} ${kp}/${ep}\n${en}`)
  combined.books[b.index].review_en = en
  console.log('EN', b.index, src.title_ko, en.length)
}
const combinedPath = path.join(W, `${d.slug}.books.combined.json`)
const text = JSON.stringify(combined, null, 2)
await fs.writeFile(combinedPath, text)
const sha256 = crypto.createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex')

const newWorks = [], relations = [], newLocales = []
for (const b of d.books) {
  let id = b.content_id
  if (b.new) {
    id = b.new.id ?? crypto.randomUUID(); b.new.id = id
    if (b.new.kakaoIsbn) {
      // 카카오 실판본: 한국어 행은 카카오 서지·다음 상세 소개, 영어는 표시용 제목 행(celeb-02-02).
      const hit = await kakao.getBookByIsbnWithFullDescription(b.new.kakaoIsbn)
      if (!hit || kakao.toIsbn13(hit.book.metadata.isbn) !== b.new.kakaoIsbn) throw Error('kakao edition not found ' + b.new.kakaoIsbn)
      const k = hit.book, link = k.metadata.link, cover = k.coverImageUrl
      const ko = { locale: 'ko', title: k.title, creator: k.creator, isbn: b.new.kakaoIsbn, publisher: k.metadata.publisher, thumbnail_url: cover, description: hit.fullDescription || k.metadata.description || null,
        sources: { primary: 'kakao_book', isbn: link, title: link, creator: link, publisher: link, thumbnail: cover ? link : 'confirmed_unavailable', ...((hit.fullDescription || k.metadata.description) ? { description: link } : {}), ...(/절판|품절/.test(k.metadata.salesStatus) ? { availability: 'out_of_print' } : {}) } }
      const en = { locale: 'en', title: b.new.en.title, creator: b.new.en.creator, isbn: null, publisher: null, thumbnail_url: null, description: null, sources: { primary: 'none', title: b.new.en.title_kind } }
      newWorks.push({ id, external_source: 'kakao_book', external_id: b.new.kakaoIsbn, locales: [ko, en] })
    } else if (b.new.openlibrary) {
      // OpenLibrary 영문판: 영어 행은 직접 확인한 판본 기록, 한국어는 표시용 제목 행(celeb-02-02).
      const o = b.new.openlibrary, page = `https://openlibrary.org${o.olKey}`
      const en = { locale: 'en', title: o.title, creator: o.creator, isbn: o.isbn13, publisher: o.publisher, thumbnail_url: o.cover ?? null, description: null,
        sources: { primary: 'openlibrary', isbn: page, title: page, creator: page, publisher: page, thumbnail: o.cover ? page : 'confirmed_unavailable' } }
      const ko = { locale: 'ko', title: b.new.ko.title, creator: b.new.ko.creator, isbn: null, publisher: null, thumbnail_url: null, description: null, sources: { primary: 'none', title: b.new.ko.title_kind } }
      newWorks.push({ id, external_source: 'openlibrary', external_id: o.isbn13, locales: [ko, en] })
    } else {
      const row = (locale, x) => ({ locale, title: x.title, creator: x.creator, isbn: null, publisher: null, thumbnail_url: null, description: null, sources: { primary: 'none', title: x.title_kind, availability: 'out_of_print' } })
      newWorks.push({ id, external_source: null, external_id: null, locales: [row('ko', b.new.ko), row('en', b.new.en)] })
    }
  }
  relations.push({ content_id: id, original_index: 0, book_index: b.index, ...(b.edits?.length ? { factual_edits: b.edits } : {}) })
  // 기존 작품에 빠진 언어 행은 표시용 제목 행으로 보탠다(celeb-02-02 「한국어판 확인」).
  if (b.addLocale) newLocales.push({ content_id: id, locale: b.addLocale.locale, title: b.addLocale.title, creator: b.addLocale.creator, isbn: null, publisher: null, thumbnail_url: null, description: null, sources: { primary: 'none', title: b.addLocale.title_kind } })
}
await fs.writeFile(decisionPath, JSON.stringify(d, null, 2)) // 새 작품 ID를 고정해 재실행해도 같게 한다
const plan = { slug: d.slug, originals: [{ path: combinedPath, sha256, modelObservation: logLine.modelObservation }], relations, ...(newWorks.length ? { newWorks } : {}), ...(newLocales.length ? { newLocales } : {}) }
const planPath = path.join(W, `${d.slug}.books.plan.json`)
await fs.writeFile(planPath, JSON.stringify(plan, null, 2))
console.log(JSON.stringify(await applyPlan(planPath, APPLY)))
