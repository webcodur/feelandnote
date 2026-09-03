/**
 * GPT가 알려준 한국어 출간명으로 목록 항목을 다시 잇는다
 *
 * 앞 단계(`curated-korean-titles.mjs`)가 만든 answers.json 을 읽어 세 가지를 한다.
 *   1) 오연결 해제 — 같은 작품이 아니라고 판정된 연결을 끊는다
 *   2) 이미 가진 한국어 책과 잇기 — 우리 서재에 그 책이 이미 있으면 검색 없이 잇는다
 *   3) 없으면 카카오 책 검색으로 등록한 뒤 잇는다
 *
 * 🔴 저자를 반드시 대조한다. 「American Gods / Neil Gaiman」이 「AI, 신들의 전쟁」에
 *    붙어 있던 사고가 제목만 보고 이었기 때문이다.
 *
 * 사용법 (sw/web-bo 에서):
 *   npx tsx scripts/curated-apply-korean.ts --dry        # 무엇이 바뀔지 보기만
 *   npx tsx scripts/curated-apply-korean.ts --unlink     # 오연결 해제만
 *   npx tsx scripts/curated-apply-korean.ts              # 전량 반영
 */
import { createClient, type SupabaseClient as DatabaseClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { REPO_ROOT } from '../lib/paths'
import { normTitle, creatorMatches, titleMatches, titleAlternatives } from './lib/match'

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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// ────────────────────────────────────────────────────
// #region 대조 규칙
// 판별 규칙은 lib/match.ts 하나가 쥔다. 여기에 복사본을 만들지 마라 —
// 진단 스크립트와 자가 어긋나 「진단은 통과인데 적재는 실패」가 난다.
// #endregion

// ────────────────────────────────────────────────────
// #region 카카오 책 검색
/** 🔴 네이버 책 검색 API는 종료됐다(404 SE05). 한국어 책 메타의 창구는 카카오다 */
async function searchKakao(query: string): Promise<{ title: string; creator: string; thumbnail: string | null; publisher: string | null; isbn: string | null }[]> {
  const key = process.env.KAKAO_REST_API_KEY
  if (!key) throw new Error('KAKAO_REST_API_KEY 없음')
  const url = `https://dapi.kakao.com/v3/search/book?query=${encodeURIComponent(query)}&size=20`
  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${key}` } })
  if (!res.ok) return []
  const json = (await res.json()) as { documents?: { title: string; authors: string[]; thumbnail: string; publisher: string; isbn: string }[] }
  return (json.documents ?? []).map((d) => ({
    title: d.title,
    creator: (d.authors ?? []).join('^'),
    thumbnail: fullSizeCover(d.thumbnail),
    publisher: d.publisher || null,
    isbn: (d.isbn || '').split(' ').pop() || null,
  }))
}

/** 카카오 썸네일은 R120x174로 줄여 준다. fname 쿼리에 원본 주소가 들어 있다 */
function fullSizeCover(url: string | null | undefined): string | null {
  if (!url) return null
  const m = url.match(/[?&]fname=([^&]+)/)
  if (!m) return url
  return decodeURIComponent(m[1]).replace(/^http:\/\//, 'https://')
}

/**
 * 카카오에서 그 책을 찾는다. 제목+저자 → 제목 → 대체 제목 순으로 물러난다.
 *
 * 도서관 표기가 두 작품을 묶어 둔 「등대로, 자기만의 방」 같은 항목은 그대로 검색하면
 * 0건이라 그냥 「없는 책」이 됐다. 저자가 맞을 때만 부제 뒤에 제목이 오는 표기도 인정한다.
 */
async function findOnKakao(koTitle: string, koCreator: string | null) {
  const queries = [
    koCreator ? `${koTitle} ${koCreator}` : koTitle,
    koTitle,
    ...titleAlternatives(koTitle).map((t) => (koCreator ? `${t} ${koCreator}` : t)),
  ]
  for (const q of queries) {
    const found = await searchKakao(q)
    await sleep(120)
    if (!found.length) continue
    const best = found.find((f) => {
      const ck = koCreator ? creatorMatches(koCreator, f.creator) : false
      const gate = koCreator ? ck : true // 저자를 모르면 제목만 본다(엄격)
      return gate && titleMatches(koTitle, f.title, ck)
    })
    if (best) return best
  }
  return null
}
// #endregion

async function selectAll<T>(db: DatabaseClient, table: string, columns: string, tune: (q: any) => any = (q) => q): Promise<T[]> {
  const out: T[] = []
  const SIZE = 1000
  for (let from = 0; ; from += SIZE) {
    const { data, error } = await tune(db.from(table).select(columns)).range(from, from + SIZE - 1)
    if (error) throw new Error(`${table}: ${error.message}`)
    if (!data?.length) break
    out.push(...(data as T[]))
    if (data.length < SIZE) break
  }
  return out
}

interface Answer {
  id: string
  rawTitle: string
  koTitle: string | null
  koCreator: string | null
  linkedOk: boolean | null
}

interface Target {
  id: string
  contentId: string | null
  state: 'unlinked' | 'linked-ko' | 'linked-en-only'
}

async function main() {
  const args = process.argv.slice(2)
  const dry = args.includes('--dry')
  const unlinkOnly = args.includes('--unlink')
  /**
   * 이미 한국어 책이 붙어 있고 GPT도 같은 작품이라 한 항목은 그대로 둔다.
   * 다시 이으면 같은 작품의 다른 판으로 갈아 끼워질 뿐이고(「레베카」→「레베카(양장본)」)
   * 축약본·합본으로 내려앉는 쪽도 섞인다. --relink 를 주면 옛 동작대로 전부 다시 잇는다
   */
  const relink = args.includes('--relink')

  const db = createClient(
    process.env.NEXT_PUBLIC_DB_API_URL!,
    process.env.DB_SECRET_KEY || process.env.NEXT_PUBLIC_DB_PUBLISHABLE_KEY!
  )

  const answers: Record<string, Answer> = JSON.parse(readFileSync(join(WORK, 'answers.json'), 'utf-8'))
  const targets: Target[] = JSON.parse(readFileSync(join(WORK, 'targets.json'), 'utf-8'))
  const targetById = new Map(targets.map((t) => [t.id, t]))
  // answers.json 은 지난 회차 답까지 누적한다. 이번 대상(targets.json)에 든 것만 손댄다 —
  // 그래야 --list 로 목록을 한정했을 때 다른 목록의 기존 연결이 흔들리지 않는다
  const rows = Object.values(answers).filter((r) => targetById.has(r.id))
  console.log(`답변 ${Object.keys(answers).length}건 중 이번 대상 ${rows.length}건`)

  // ── 1) 오연결 해제
  const wrong = rows.filter((r) => r.linkedOk === false)
  console.log(`\n오연결 판정 ${wrong.length}건`)
  if (!dry && wrong.length > 0) {
    for (let i = 0; i < wrong.length; i += 100) {
      const chunk = wrong.slice(i, i + 100).map((r) => r.id)
      const { error } = await db.from('curated_list_items').update({ content_id: null }).in('id', chunk)
      if (error) console.log('  해제 실패:', error.message)
    }
    console.log(`  ${wrong.length}건 연결 해제`)
  }
  if (unlinkOnly) return

  // ── 2) 한국어 제목이 있는 항목을 우리 서재와 대조
  const withKo = rows.filter((r) => r.koTitle)
  console.log(`\n한국어 출간명 확보 ${withKo.length}건`)

  const locales = await selectAll<{ content_id: string; locale: string; title: string; creator: string | null }>(
    db,
    'content_locales',
    'content_id, locale, title, creator',
    (q) => q.eq('locale', 'ko').order('content_id', { ascending: true })
  )
  const koIndex = new Map<string, { contentId: string; title: string; creator: string | null }[]>()
  for (const l of locales) {
    const k = normTitle(l.title)
    if (!k) continue
    const arr = koIndex.get(k) ?? []
    arr.push({ contentId: l.content_id, title: l.title, creator: l.creator })
    koIndex.set(k, arr)
  }
  console.log(`  서재의 한국어 책 ${locales.length}권`)

  let matchedExisting = 0
  let registered = 0
  let addedLocale = 0
  let notFound = 0
  let keptLinked = 0
  /** 영문판만 있는 책에 한국어판을 더해야 하는 것 — 새 책을 만들면 같은 작품이 둘로 갈린다 */
  const needKoLocale: { id: string; contentId: string; koTitle: string; koCreator: string | null }[] = []
  const stillMissing: { id: string; koTitle: string; koCreator: string | null }[] = []

  for (const [idx, r] of withKo.entries()) {
    if (idx % 200 === 0 && idx > 0) console.log(`  ... ${idx}/${withKo.length}`)
    const tgt = targetById.get(r.id)

    // 멀쩡히 붙어 있는 한국어 연결은 건드리지 않는다
    if (!relink && tgt?.state === 'linked-ko' && tgt.contentId && r.linkedOk !== false) {
      keptLinked++
      continue
    }

    // 이미 붙어 있는 책이 영문판만 가진 경우 — 그 책에 한국어판을 더한다.
    // 갈아 끼우면 감상 기록이 붙은 원래 작품과 갈라진다
    if (tgt?.state === 'linked-en-only' && tgt.contentId && r.linkedOk !== false) {
      needKoLocale.push({ id: r.id, contentId: tgt.contentId, koTitle: r.koTitle!, koCreator: r.koCreator })
      continue
    }

    // 우리가 이미 가진 한국어 책인가
    const cands = koIndex.get(normTitle(r.koTitle!)) ?? []
    const hit =
      cands.find((c) => !r.koCreator || creatorMatches(r.koCreator, c.creator)) ??
      (cands.length === 1 && !r.koCreator ? cands[0] : undefined)
    if (hit) {
      matchedExisting++
      if (!dry) await db.from('curated_list_items').update({ content_id: hit.contentId }).eq('id', r.id)
      continue
    }

    stillMissing.push({ id: r.id, koTitle: r.koTitle!, koCreator: r.koCreator })
  }

  console.log(`\n이미 맞게 붙어 있어 그대로 둔 것 ${keptLinked}건`)
  console.log(`서재에 이미 있어 이어 붙인 것 ${matchedExisting}건`)
  console.log(`영문판 책에 한국어판을 더할 것 ${needKoLocale.length}건`)
  console.log(`서점에서 찾아야 하는 것 ${stillMissing.length}건`)
  if (dry) {
    console.log('\n[점검만] 여기까지. 실제 등록은 --dry 없이 실행한다.')
    for (const m of stillMissing.slice(0, 15)) console.log(`  · ${m.koTitle} / ${m.koCreator ?? ''}`)
    return
  }

  // ── 3) 영문판만 있는 책에 한국어판을 더한다
  for (const [idx, m] of needKoLocale.entries()) {
    if (idx % 100 === 0) console.log(`  한국어판 추가 ${idx}/${needKoLocale.length}`)
    try {
      const best = await findOnKakao(m.koTitle, m.koCreator)
      if (!best) {
        notFound++
        continue
      }
      // 한국어 자리가 아예 비어 있을 수도, 영문 제목이 들어 있을 수도 있다.
      // 뒤엣것은 덮어써야 하므로 넣기와 고치기를 한 번에 처리한다
      const { error } = await db.from('content_locales').upsert(
        {
          content_id: m.contentId,
          locale: 'ko',
          title: best.title,
          creator: best.creator || null,
          thumbnail_url: best.thumbnail,
          publisher: best.publisher,
          isbn: best.isbn,
        },
        { onConflict: 'content_id,locale' }
      )
      if (error) notFound++
      else addedLocale++
    } catch {
      notFound++
    }
  }

  // ── 4) 카카오에서 찾아 등록
  for (const [idx, m] of stillMissing.entries()) {
    if (idx % 50 === 0) console.log(`  등록 ${idx}/${stillMissing.length}`)
    try {
      const best = await findOnKakao(m.koTitle, m.koCreator)
      if (!best) {
        notFound++
        continue
      }

      const { data: content, error } = await db
        .from('contents')
        .insert({ type: 'BOOK', external_source: 'kakao_book', external_id: best.isbn })
        .select('id')
        .single()
      if (error || !content) {
        notFound++
        continue
      }
      await db.from('content_locales').insert({
        content_id: content.id,
        locale: 'ko',
        title: best.title,
        creator: best.creator || null,
        thumbnail_url: best.thumbnail,
        publisher: best.publisher,
        isbn: best.isbn,
      })
      await db.from('curated_list_items').update({ content_id: content.id }).eq('id', m.id)
      registered++
    } catch {
      notFound++
    }
  }

  console.log(
    `\n완료 — 기존 책 연결 ${matchedExisting} / 한국어판 추가 ${addedLocale} / 새로 등록 ${registered} / 못 찾음 ${notFound} / 오연결 해제 ${wrong.length}`
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
