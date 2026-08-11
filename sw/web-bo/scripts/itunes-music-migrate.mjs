/**
 * 기존 음악 메타를 Spotify → 아이튠즈로 옮긴다.
 *
 * Spotify가 2026-02 개발자 모드 정책 변경으로 앱 소유자의 유료 구독을 요구하게 됐고
 * 26.08.01 우리 앱에 적용돼 조회가 전부 403이다. 아이튠즈가 그 자리를 대신한다.
 *
 * ⚠️ 아이튠즈는 인증이 없는 대신 IP 단위 속도 제한이 빡빡하다.
 *    26.08.01 실측: 한 번에 하나씩 0.7초 간격으로 두드려도 **232곡에서 차단**됐다.
 *    그래서 기본 상한을 200곡으로 두고, 차단이 감지되면 즉시 멈춘다.
 *    하루 한 번 돌리면 1,500여 곡이 일주일 남짓에 정리된다.
 *
 * ⚠️ 미리듣기 음원(previewUrl)이 없는 곡은 옮기지 않는다.
 *    옮기는 순간 재생이 끊기기 때문이다(실제로 한 번 겪어 80곡을 되돌렸다).
 *
 * 사용법:
 *   cd sw/web-bo && node scripts/itunes-music-migrate.mjs              # 200곡 처리
 *   cd sw/web-bo && node scripts/itunes-music-migrate.mjs --limit 50   # 50곡만
 *   cd sw/web-bo && node scripts/itunes-music-migrate.mjs --dry-run    # DB 미수정, 판정만
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env') })

const args = process.argv.slice(2)
const limitIndex = args.indexOf('--limit')
const parsedLimit = limitIndex >= 0 ? Number(args[limitIndex + 1]) : 200
if (!Number.isInteger(parsedLimit) || parsedLimit < 1) throw new Error('--limit은 1 이상의 정수여야 한다')
const LIMIT = parsedLimit
const DRY = args.includes('--dry-run')
const unknownArgs = args.filter((arg, index) => (
  arg !== '--dry-run' && arg !== '--limit' && args[index - 1] !== '--limit'
))
if (unknownArgs.length > 0) throw new Error(`지원하지 않는 옵션: ${unknownArgs.join(', ')}`)

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const norm = (s) => (s || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
const hasHangul = (s) => /[가-힣]/.test(s || '')

let nextProviderRequestAt = 0

async function waitForProviderSlot() {
  const waitMs = Math.max(0, nextProviderRequestAt - Date.now())
  if (waitMs) await sleep(waitMs)
  nextProviderRequestAt = Date.now() + 2000
}

let blocked = false

/** 403/429는 조용히 삼키지 않는다 — 차단을 "결과 없음"으로 오인하면 멀쩡한 곡이 실패로 기록된다 */
async function itunes(term, entity, country) {
  await waitForProviderSlot()
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}`
    + `&entity=${entity}&limit=25&country=${country}`
  const res = await fetch(url, { headers: { 'User-Agent': 'feelandnote/1.0' } })
  if (res.status === 403 || res.status === 429) {
    blocked = true
    throw new Error(`아이튠즈 속도 제한(${res.status})`)
  }
  if (!res.ok) throw new Error(`아이튠즈 오류 ${res.status}`)
  const data = await res.json()
  return data.results || []
}

/**
 * 제목·아티스트가 모두 맞고 미리듣기가 있는 후보만 채택.
 * 한국 스토어는 아티스트를 한국어로 준다(Nirvana→너바나). 미국을 먼저 보고 한국으로 되짚는다.
 */
async function findTrack(title, creator) {
  const countries = hasHangul(`${title} ${creator}`) ? ['KR', 'US'] : ['US', 'KR']
  const parentheticalArtist = (creator.match(/\(([^)]+)\)/)?.[1] || '').trim()
  const searchTerms = [...new Set([
    `${title} ${creator}`.trim(),
    parentheticalArtist ? `${title} ${parentheticalArtist}`.trim() : null,
  ].filter(Boolean))]

  for (const country of countries) {
    for (const searchTerm of searchTerms) {
      const results = await itunes(searchTerm, 'song', country)
      const matches = []
      for (const [index, r] of results.entries()) {
        const name = r.trackName || ''
        const artist = r.artistName || ''
        const nt = norm(title), nn = norm(name), nc = norm(creator), na = norm(artist)
        if (!r.trackId || !r.previewUrl || !nt || !nn) continue

        const titleExact = nn === nt
        const titleNear = nn.includes(nt) || nt.includes(nn)
        const artistExact = nc && na === nc
        const artistNear = nc && na && (na.includes(nc) || nc.includes(na))
        const parentheticalMatch = parentheticalArtist && (
          na.includes(norm(parentheticalArtist)) || norm(parentheticalArtist).includes(na)
        )
        const crossScriptTopMatch = index === 0 && titleNear && hasHangul(creator) !== hasHangul(artist)
        if (!(titleExact || titleNear) || !(artistExact || artistNear || parentheticalMatch || crossScriptTopMatch)) continue

        matches.push({
          score: (titleExact ? 100 : 70)
            + (artistExact ? 50 : artistNear || parentheticalMatch ? 30 : 10)
            - index,
          row: r,
        })
      }

      matches.sort((a, b) => b.score - a.score)
      const best = matches[0]?.row
      if (best) {
        const cover = (best.artworkUrl100 || best.artworkUrl60 || '').replace(/\/\d+x\d+bb\.(jpg|png)$/, '/600x600bb.$1')
        return {
          id: best.trackId,
          title: best.trackName || title,
          artist: best.artistName || creator,
          cover: cover || null,
          preview: best.previewUrl,
          itunesUrl: best.trackViewUrl || '',
          releaseDate: (best.releaseDate || '').slice(0, 10) || null,
          genre: best.primaryGenreName || null,
          country,
        }
      }
    }
  }
  return null
}

async function main() {
  const { data: rows, error } = await sb
    .from('contents')
    .select('id, metadata, content_locales(locale, title, creator, sources)')
    .eq('type', 'MUSIC')
    .eq('external_source', 'spotify')
    .order('id')
    .limit(LIMIT)

  if (error) throw error
  console.log(`대상 ${rows.length}곡 (상한 ${LIMIT})${DRY ? ' — 미리보기' : ''}\n`)

  let moved = 0, held = 0
  for (const row of rows) {
    if (blocked) break
    const ko = (row.content_locales || []).find((l) => l.locale === 'ko')
    if (!ko?.title) { held++; continue }

    let hit = null
    try {
      hit = await findTrack(ko.title, ko.creator || '')
    } catch (e) {
      console.log(`\n⛔ ${e.message} — 여기서 멈춘다. 남은 곡은 다음 회차에 처리한다.`)
      break
    }
    if (!hit) { held++; continue }

    moved++
    console.log(`  [이전] ${ko.title.slice(0, 34)} / ${(ko.creator || '').slice(0, 22)}`)
    if (DRY) continue

    const sources = { ...(ko.sources || {}), primary: 'itunes' }
    const patch = { sources }
    if (hit.cover) { sources.thumbnail = 'itunes'; patch.thumbnail_url = hit.cover }
    await sb.from('content_locales').update(patch).eq('content_id', row.id).eq('locale', 'ko')

    // 재생은 미리듣기 음원으로 한다. 플레이어가 metadata에서 읽는다.
    const metadata = { ...(row.metadata || {}), previewUrl: hit.preview, itunesUrl: hit.itunesUrl, entityType: 'track' }
    await sb.from('contents')
      .update({ external_source: 'itunes', external_id: `itunes-${hit.id}`, metadata })
      .eq('id', row.id)
  }

  console.log(`\n이전 ${moved} / 보류 ${held}${blocked ? ' / 차단으로 조기 종료' : ''}`)

  const { count } = await sb.from('contents')
    .select('id', { count: 'exact', head: true })
    .eq('type', 'MUSIC').eq('external_source', 'spotify')

  console.log(`\n── 결과 ──`)
  console.log(`이전 ${moved}곡 / 보류 ${held}곡`)
  console.log(`남은 Spotify 곡: ${count}곡${count > 0 ? ' — 내일 다시 돌린다' : ' — 이전 완료'}`)
}

main().catch((e) => { console.error('실패:', e.message); process.exit(1) })
