/**
 * VIDEO 영문 썸네일 수집 - TMDB /images API
 *
 * content_locales en 행의 thumbnail_url이 NULL인 VIDEO 콘텐츠에 대해
 * TMDB /images API로 영문 포스터를 수집하여 업데이트한다.
 *
 * 실행: node scripts/video-en-thumb.mjs
 * 드라이런: node scripts/video-en-thumb.mjs --dry
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve('sw/web/.env') })
dotenv.config({ path: resolve('sw/web/.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const TMDB_API_KEY = process.env.TMDB_API_KEY
const TMDB_IMG_BASE = 'https://image.tmdb.org/t/p/w500'
const DRY_RUN = process.argv.includes('--dry')

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

/** external_id → { type: 'movie'|'tv', id: number } */
function parseTmdbId(externalId) {
  const m = externalId?.match(/^tmdb-(movie|tv)-(\d+)$/)
  if (!m) return null
  return { type: m[1], id: Number(m[2]) }
}

/** TMDB /images API → 영문 포스터 URL */
async function fetchEnPoster(type, tmdbId, retries = 2) {
  const url = `https://api.themoviedb.org/3/${type}/${tmdbId}/images?api_key=${TMDB_API_KEY}&include_image_languages=en,null`

  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url)
      if (res.status === 429) {
        const retryAfter = Number(res.headers.get('retry-after') || 2)
        await sleep(retryAfter * 1000)
        continue
      }
      if (res.status === 404) return null // 삭제된 콘텐츠
      if (!res.ok) {
        if (i < retries) { await sleep(1000); continue }
        return null
      }

      const data = await res.json()
      const posters = data.posters || []

      // en 포스터 우선 (vote_average 최고)
      const enPosters = posters
        .filter(p => p.iso_639_1 === 'en')
        .sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0))

      if (enPosters.length > 0) {
        return TMDB_IMG_BASE + enPosters[0].file_path
      }

      // fallback: 텍스트 없는 포스터 (iso_639_1 = null)
      const nullPosters = posters
        .filter(p => p.iso_639_1 === null)
        .sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0))

      if (nullPosters.length > 0) {
        return TMDB_IMG_BASE + nullPosters[0].file_path
      }

      return null // 영문 포스터 없음
    } catch (err) {
      if (i < retries) await sleep(1000)
      else console.error(`  fetch error: ${err.message}`)
    }
  }
  return null
}

async function main() {
  console.log(`VIDEO en 썸네일 수집 시작 ${DRY_RUN ? '(DRY RUN)' : ''}`)

  // 대상 조회: VIDEO 전체 → 페이지네이션
  let items = []
  const PAGE = 500
  for (let offset = 0; ; offset += PAGE) {
    const { data: page, error } = await supabase
      .from('contents')
      .select('id, external_id, subtype')
      .eq('type', 'VIDEO')
      .not('external_id', 'is', null)
      .range(offset, offset + PAGE - 1)
    if (error) { console.error('조회 실패:', error); return }
    if (!page?.length) break
    items.push(...page)
  }
  console.log(`VIDEO 전체: ${items.length}건`)

  // en 행 thumbnail_url NULL인 content_id 집합 조회 (페이지네이션)
  const nullSet = new Set()
  for (let offset = 0; ; offset += PAGE) {
    const { data: rows } = await supabase
      .from('content_locales')
      .select('content_id')
      .eq('locale', 'en')
      .is('thumbnail_url', null)
      .range(offset, offset + PAGE - 1)
    if (!rows?.length) break
    rows.forEach(r => nullSet.add(r.content_id))
  }

  items = items.filter(t => nullSet.has(t.id))

  console.log(`대상: ${items.length}건`)

  let updated = 0, notFound = 0, skipped = 0, errors = 0

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const parsed = parseTmdbId(item.external_id)

    if (!parsed) {
      console.log(`  [${i + 1}] ${item.external_id} — 파싱 불가, 스킵`)
      skipped++
      continue
    }

    const posterUrl = await fetchEnPoster(parsed.type, parsed.id)

    if (posterUrl) {
      if (!DRY_RUN) {
        const { error: upErr } = await supabase
          .from('content_locales')
          .update({
            thumbnail_url: posterUrl,
            sources: { primary: 'tmdb', thumbnail: 'tmdb_en' },
            updated_at: new Date().toISOString(),
          })
          .eq('content_id', item.id)
          .eq('locale', 'en')

        if (upErr) {
          console.error(`  [${i + 1}] UPDATE 실패:`, upErr.message)
          errors++
          continue
        }
      }
      updated++
    } else {
      // 영문 포스터 없음 — sources에 confirmed_unavailable 마킹
      if (!DRY_RUN) {
        await supabase
          .from('content_locales')
          .update({
            sources: { primary: 'tmdb', thumbnail: 'confirmed_unavailable' },
            updated_at: new Date().toISOString(),
          })
          .eq('content_id', item.id)
          .eq('locale', 'en')
      }
      notFound++
    }

    // 진행률 (100건마다)
    if ((i + 1) % 100 === 0) {
      console.log(`  진행: ${i + 1}/${items.length} (수집 ${updated}, 없음 ${notFound})`)
    }

    await sleep(50) // rate limit
  }

  console.log(`\n완료:`)
  console.log(`  수집: ${updated}`)
  console.log(`  없음: ${notFound}`)
  console.log(`  스킵: ${skipped}`)
  console.log(`  에러: ${errors}`)
}

main().catch(console.error)
