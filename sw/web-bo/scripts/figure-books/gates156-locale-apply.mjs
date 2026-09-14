/**
 * 게이츠 156권 locale 적용 — 기본 dry-run, `--apply`로 반영.
 * ko 5건 교체(카카오 확정분) · ko 25건 삭제(한국어판 미확인) · en 10건 교체(OL eng 확정분).
 * 삭제분은 data/celeb/figure-books/gates156-deleted-ko-backup.jsonl에 원행 보관 후 삭제한다.
 * 삭제 전 ko 판본의 활성 상품이 있으면 그 작품은 건너뛴다.
 *
 * node --env-file=.env scripts/figure-books/gates156-locale-apply.mjs [--apply]
 */
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import {
  bareIsbn, dbClient, kakaoByIsbn, openLibraryByIsbn,
} from './lib/figure-work.mjs'

const APPLY = process.argv.includes('--apply')
const BACKUP = resolve(process.cwd(), '../../data/celeb/figure-books/gates156-deleted-ko-backup.jsonl')

const KO_FIX = {
  '2ba230f1': '9788947540537', '61ea5805': '9788947502436', f10d2e24: '9788986022605',
  '897a6543': '9788950933739', d30d1627: '9788925535227',
}
const KO_DEL = ['4d227e62', '43558fcd', '4069f6c3', '3874014e', '600371d8', '052bd447', 'eaa5a638',
  'fe41c94d', '3cb9416d', '857d79cd', 'ec268279', '83e1455c', 'a8145537', '26306a98', '21ee2887',
  '2bd22ff8', '81279751', 'dc2e39f9', '5a779f8e', 'a0e5af67', '12f011eb', '3dfd9155', '5cfe7663',
  '759313d2', '0faef3bb', 'd23a1bde']
const EN_FIX = {
  '42516d5f': '9780375507250', '416ae9b9': '9781982115852', '174f2934': '9780857053879',
  '8a735bbf': '9780062464316', '004d00f4': '9780735222359', '79d67c2b': '9780525591023',
  e64ed96d: '9781429537315', aa51b4e1: '9780316547611', fc204df5: '9780141977799',
  e942d34d: '9780393094268',
}
const isEngIsbn = (v) => /^(9780|9781|9798)/.test(bareIsbn(v ?? ''))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const normTitle = (t) => String(t ?? '').replace(/\s*\([^)]+\)\s*$/, '').trim()

async function daumIntro(doc) {
  const m = String(doc.url ?? '').match(/bookId=(\d+)/)
  if (!m) return { source: 'KAKAO', sourceUrl: null }
  const detail = `https://m.search.daum.net/search?w=bookpage&bookId=${m[1]}&tab=introduction&q=${encodeURIComponent(doc.title)}`
  try {
    const r = await fetch(detail, { headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148' }, signal: AbortSignal.timeout(8000) })
    const html = await r.text()
    const mm = html.match(/<p[^>]+class=["'][^"']*\bdesc\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/i)
    const t = (mm?.[1] ?? '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    const kakaoLen = String(doc.contents ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().length
    if (t.length > kakaoLen && t.length > 0) return { source: 'DAUM', sourceUrl: detail }
  } catch { /* 다음 실패 → KAKAO */ }
  return { source: 'KAKAO', sourceUrl: `https://dapi.kakao.com/v3/search/book?target=isbn&query=${doc.isbn13}` }
}

function coverOf(doc) {
  if (!doc.thumbnail) return null
  try {
    const fname = new URL(doc.thumbnail).searchParams.get('fname')
    if (!fname) return doc.thumbnail
    const o = new URL(fname); o.protocol = 'https:'; return o.toString()
  } catch { return doc.thumbnail }
}

async function main() {
  const db = dbClient()
  const idOf = async (prefix) => {
    const { data } = await db.from('contents').select('id').ilike('id', `${prefix}%`).limit(1)
    return data?.[0]?.id ?? null
  }
  const plan = []

  // ── ko 교체 ──
  for (const [prefix, isbn] of Object.entries(KO_FIX)) {
    const id = await idOf(prefix)
    const doc = await kakaoByIsbn(isbn).catch(() => null)
    if (!id || !doc) { plan.push({ op: 'ko-fix', prefix, status: 'SKIP no-id-or-doc' }); continue }
    const intro = await daumIntro({ ...doc, isbn13: isbn })
    const cover = coverOf(doc)
    plan.push({
      op: 'ko-fix', prefix, id, status: 'READY',
      row: {
        title: normTitle(doc.title), creator: (doc.authors ?? []).join(', '),
        publisher: doc.publisher, isbn, thumbnail_url: cover, description: intro.source,
        sources: { primary: 'kakao_book', thumbnail: 'kakao_book', ...(intro.sourceUrl ? { description: intro.sourceUrl } : {}) },
        release: String(doc.datetime ?? '').slice(0, 10) || null,
      },
      oldIsbn: (await db.from('content_locales').select('isbn').eq('content_id', id).eq('locale', 'ko').limit(1)).data?.[0]?.isbn,
    })
    await sleep(300)
  }

  // ── en 교체 ──
  for (const [prefix, isbn] of Object.entries(EN_FIX)) {
    const id = await idOf(prefix)
    const o = await openLibraryByIsbn(isbn).catch(() => null)
    const ok = o && o.languages.includes('/languages/eng')
    if (!id || !ok) { plan.push({ op: 'en-fix', prefix, status: 'SKIP' }); continue }
    plan.push({
      op: 'en-fix', prefix, id, status: 'READY',
      row: {
        title: o.title, creator: o.authors.join(', '), publisher: o.publisher, isbn,
        thumbnail_url: o.thumbnailUrl, description: 'OPEN',
        sources: { primary: 'openlibrary', thumbnail: o.thumbnailUrl ? 'openlibrary' : 'confirmed_unavailable', description: `https://openlibrary.org${o.workKey}` },
      },
      oldIsbn: (await db.from('content_locales').select('isbn').eq('content_id', id).eq('locale', 'en').limit(1)).data?.[0]?.isbn,
    })
    if (!o.thumbnailUrl) plan[plan.length - 1].row.thumbnail_url = null
    await sleep(200)
  }

  // ── ko 삭제: 활성 상품 확인 + 백업 ──
  for (const prefix of KO_DEL) {
    const id = await idOf(prefix)
    if (!id) { plan.push({ op: 'ko-del', prefix, status: 'SKIP no-id' }); continue }
    const { data: eds } = await db.from('figure_book_editions').select('id').eq('content_id', id).eq('locale', 'ko')
    const edIds = (eds ?? []).map((e) => e.id)
    let active = 0
    if (edIds.length > 0) {
      const { count } = await db.from('figure_book_products').select('id', { count: 'exact', head: true }).in('edition_id', edIds).eq('is_active', true)
      active = count ?? 0
    }
    const { data: loc } = await db.from('content_locales').select('*').eq('content_id', id).eq('locale', 'ko')
    const { data: en } = await db.from('content_locales').select('isbn').eq('content_id', id).eq('locale', 'en').limit(1)
    plan.push({ op: 'ko-del', prefix, id, status: active > 0 ? `SKIP active-products(${active})` : 'READY', active, koRow: loc?.[0] ?? null, enIsbn: en?.[0]?.isbn ?? null })
  }

  const ready = plan.filter((p) => p.status === 'READY')
  console.log(`계획: ko 교체 ${plan.filter((p) => p.op === 'ko-fix' && p.status === 'READY').length} / en 교체 ${plan.filter((p) => p.op === 'en-fix' && p.status === 'READY').length} / ko 삭제 ${plan.filter((p) => p.op === 'ko-del' && p.status === 'READY').length}`)
  for (const p of plan.filter((p) => p.status !== 'READY')) console.log(`  ${p.status} :: ${p.op} ${p.prefix}`)
  if (!APPLY) { console.log('dry-run이다. 반영하려면 --apply를 붙인다.'); return }

  mkdirSync(dirname(BACKUP), { recursive: true })
  const ensureCatalog = async (id) => {
    const { data } = await db.from('figure_book_contents').select('content_id').eq('content_id', id).limit(1)
    if ((data ?? []).length === 0) {
      const r = await db.from('figure_book_contents').insert({ content_id: id }).select('content_id')
      if (r.error) throw new Error(`catalog insert fail ${id}: ${r.error.message}`)
      // 트리거가 현재 locale마다 판본을 만든다. 뒤의 판본 갱신이 구 ISBN 조건으로 맞춘다.
    }
  }
  for (const p of ready) {
    if (p.op === 'ko-fix') {
      await ensureCatalog(p.id)
      const { release, ...row } = p.row
      let r = await db.from('content_locales').update(row).eq('content_id', p.id).eq('locale', 'ko').eq('isbn', p.oldIsbn).select('isbn')
      if ((r.data ?? []).length !== 1) throw new Error(`ko locale mismatch ${p.prefix}`)
      r = await db.from('figure_book_editions').update({ ...row, release_date: release }).eq('content_id', p.id).eq('locale', 'ko').eq('isbn', p.oldIsbn).select('id')
      // ko 판본이 없으면(구 시드 누락) 만든다
      if ((r.data ?? []).length === 0) {
        r = await db.from('figure_book_editions').insert({ content_id: p.id, locale: 'ko', ...row, release_date: release, sort_order: 0, verified: true }).select('id')
        if (r.error) throw new Error(`ko edition insert fail ${p.prefix}: ${r.error.message}`)
      } else if ((r.data ?? []).length !== 1) throw new Error(`ko edition mismatch ${p.prefix}`)
      r = await db.from('contents').update({ external_id: p.row.isbn, external_source: 'kakao_book' }).eq('id', p.id).select('external_id')
      console.log(`  ko-fix ${p.prefix} → ${p.row.isbn}`)
    } else if (p.op === 'en-fix') {
      await ensureCatalog(p.id)
      let q = db.from('content_locales').update(p.row).eq('content_id', p.id).eq('locale', 'en')
      q = p.oldIsbn ? q.eq('isbn', p.oldIsbn) : q.is('isbn', null)
      let r = await q.select('isbn')
      if ((r.data ?? []).length !== 1) throw new Error(`en locale mismatch ${p.prefix}`)
      let eq = db.from('figure_book_editions').update(p.row).eq('content_id', p.id).eq('locale', 'en')
      eq = p.oldIsbn ? eq.eq('isbn', p.oldIsbn) : eq.is('isbn', null)
      r = await eq.select('id')
      // en 판본이 없으면(구 시드 누락) 만든다
      if ((r.data ?? []).length === 0) {
        r = await db.from('figure_book_editions').insert({ content_id: p.id, locale: 'en', ...p.row, sort_order: 0, verified: true }).select('id')
        if (r.error) throw new Error(`en edition insert fail ${p.prefix}: ${r.error.message}`)
      }
      console.log(`  en-fix ${p.prefix} → ${p.row.isbn}`)
    } else {
      appendFileSync(BACKUP, `${JSON.stringify({ content_id: p.id, deleted_at: new Date().toISOString(), ko: p.koRow })}\n`, 'utf8')
      const { data: eds } = await db.from('figure_book_editions').select('id').eq('content_id', p.id).eq('locale', 'ko')
      for (const e of eds ?? []) {
        const r = await db.from('figure_book_editions').delete().eq('id', e.id)
        if (r.error) throw new Error(`edition del fail ${p.prefix}: ${r.error.message}`)
      }
      const r = await db.from('content_locales').delete().eq('content_id', p.id).eq('locale', 'ko').select('locale')
      if ((r.data ?? []).length !== 1) throw new Error(`ko locale del mismatch ${p.prefix}`)
      if (p.enIsbn && isEngIsbn(p.enIsbn)) {
        await db.from('contents').update({ external_id: p.enIsbn, external_source: 'openlibrary' }).eq('id', p.id)
      }
      console.log(`  ko-del ${p.prefix}`)
    }
  }
  console.log(`반영 완료. 백업: ${BACKUP}`)
}

void main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1 })
