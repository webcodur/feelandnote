/**
 * LLM이 찾아온 ISBN으로 국내 출간본을 등록하고 목록 항목에 잇는다
 *
 * 앞 단계 `find-missing.mjs --ask` 가 만든 `missing-answers.json` 을 읽는다.
 * ISBN으로 카카오를 조회하면 제목·저자 표기 차이가 아예 문제되지 않는다.
 * ISBN이 없으면 제목+출판사로 물러난다.
 *
 * 🔴 등록 전에 저자를 대조한다. 번호가 틀리면 전혀 다른 책이 서비스에 박힌다.
 *
 * 사용법 (sw/web-bo 에서):
 *   npx tsx scripts/curated/register-missing.ts         # 무엇이 등록될지 보기만
 *   npx tsx scripts/curated/register-missing.ts --yes   # 실제 등록·연결
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { REPO_ROOT } from '../lib/paths'
import { creatorMatches, titleMatches } from './lib/match'

const ROOT = REPO_ROOT
const WORK = join(ROOT, 'data/curated-lists/_korean-titles')

function loadEnv(p: string) {
  if (!existsSync(p)) return
  for (const raw of readFileSync(p, 'utf-8').split('\n')) {
    const m = raw.replace(/\r$/, '').match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}
loadEnv(join(ROOT, '.env'))
loadEnv(join(ROOT, 'sw/web-bo/.env'))
loadEnv(join(ROOT, 'sw/web/.env'))

const db = createClient(
  process.env.NEXT_PUBLIC_DB_API_URL!,
  (process.env.DB_SECRET_KEY || process.env.NEXT_PUBLIC_DB_PUBLISHABLE_KEY)!,
)

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const go = process.argv.includes('--yes')

function fullSizeCover(url: string | null | undefined): string | null {
  if (!url) return null
  const m = url.match(/[?&]fname=([^&]+)/)
  if (!m) return url
  return decodeURIComponent(m[1]).replace(/^http:\/\//, 'https://')
}

type Book = { title: string; creator: string; thumbnail: string | null; publisher: string | null; isbn: string | null }

async function searchKakao(query: string, target?: 'isbn' | 'title'): Promise<Book[]> {
  const key = process.env.KAKAO_REST_API_KEY
  if (!key) throw new Error('KAKAO_REST_API_KEY 없음')
  const url = `https://dapi.kakao.com/v3/search/book?query=${encodeURIComponent(query)}&size=20${target ? `&target=${target}` : ''}`
  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${key}` } })
  if (!res.ok) return []
  const j = (await res.json()) as { documents?: { title: string; authors: string[]; thumbnail: string; publisher: string; isbn: string }[] }
  return (j.documents ?? []).map((d) => ({
    title: d.title,
    creator: (d.authors ?? []).join('^'),
    thumbnail: fullSizeCover(d.thumbnail),
    publisher: d.publisher || null,
    isbn: (d.isbn || '').split(' ').pop() || null,
  }))
}

type Answer = {
  id: string
  rawTitle: string
  published: boolean
  title: string | null
  author: string | null
  publisher: string | null
  isbn: string | null
}

async function main() {
  const path = join(WORK, 'missing-answers.json')
  if (!existsSync(path)) throw new Error(`${path} 가 없다. 먼저 find-missing.mjs --ask 를 돌려라`)
  const answers: Record<string, Answer> = JSON.parse(readFileSync(path, 'utf-8'))
  const rows = Object.values(answers).filter((a) => a.published && (a.isbn || a.title))
  console.log(`국내 출간 확인 ${rows.length}건 (ISBN 있음 ${rows.filter((r) => r.isbn).length})`)

  let linked = 0
  let registered = 0
  let notFound = 0
  let rejected = 0

  for (const [idx, r] of rows.entries()) {
    if (idx % 25 === 0 && idx > 0) console.log(`  ... ${idx}/${rows.length}`)
    try {
      // ISBN이 가장 확실하다. 없으면 제목+출판사, 그다음 제목+저자
      let found: Book[] = []
      if (r.isbn) found = await searchKakao(r.isbn, 'isbn')
      if (!found.length && r.title) found = await searchKakao([r.title, r.publisher].filter(Boolean).join(' '))
      if (!found.length && r.title) found = await searchKakao([r.title, r.author].filter(Boolean).join(' '))
      await sleep(120)
      if (!found.length) { notFound++; continue }

      // ISBN으로 찾은 건 번호가 신원이다. 제목 검색으로 온 건 저자를 대조한다
      const byIsbn = Boolean(r.isbn) && found.length > 0 && found[0].isbn === r.isbn
      const best = byIsbn
        ? found[0]
        : found.find((f) => {
            const ck = r.author ? creatorMatches(r.author, f.creator) : false
            return (r.author ? ck : true) && titleMatches(r.title ?? '', f.title, ck)
          })
      if (!best) { rejected++; continue }

      if (!go) { registered++; continue }

      // 🔴 그 ISBN이 이미 서재에 있으면 새로 만들지 않는다. contents.external_id 에 유니크 제약이 있어
      //    삽입이 거부되고, 억지로 만들면 같은 작품이 두 행으로 갈린다(5-3 참고).
      const isbnKey = best.isbn ?? r.isbn
      if (isbnKey) {
        const { data: dup } = await db.from('contents').select('id').eq('external_id', isbnKey).maybeSingle()
        if (dup?.id) {
          const { error } = await db.from('curated_list_items').update({ content_id: dup.id }).eq('id', r.id)
          if (error) notFound++
          else { linked++; registered++ }
          continue
        }
      }

      const { data: content, error: e1 } = await db
        .from('contents')
        .insert({ type: 'BOOK', external_source: 'kakao_book', external_id: best.isbn ?? null })
        .select('id')
        .single()
      if (e1 || !content) { notFound++; continue }

      const { error: e2 } = await db.from('content_locales').insert({
        content_id: content.id,
        locale: 'ko',
        title: best.title,
        creator: best.creator || null,
        thumbnail_url: best.thumbnail,
        publisher: best.publisher,
        isbn: best.isbn,
      })
      if (e2) { notFound++; continue }

      const { error: e3 } = await db.from('curated_list_items').update({ content_id: content.id }).eq('id', r.id)
      if (e3) { notFound++; continue }
      registered++
      linked++
    } catch {
      notFound++
    }
  }

  if (!go) {
    console.log(`\n[점검만] 등록 가능 ${registered}건 · 서점에 없음 ${notFound}건 · 저자 불일치로 거부 ${rejected}건`)
    console.log('실제로 등록하려면 --yes 를 붙인다.')
    return
  }
  console.log(`\n완료 — 등록·연결 ${linked}건 · 서점에 없음 ${notFound}건 · 저자 불일치로 거부 ${rejected}건`)
}

main().catch((e) => {
  console.error(String(e?.message ?? e))
  process.exit(1)
})
