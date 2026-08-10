/**
 * 음악 메타를 Spotify → 아이튠즈로 옮기거나 조사 후보를 즉시 최종 확정한다.
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
 *   cd sw/web-bo && node scripts/itunes-music-migrate.mjs --candidates-only --all-pending
 *   cd sw/web-bo && node scripts/itunes-music-migrate.mjs --candidates-only --celeb-id <uuid>
 *   cd sw/web-bo && node scripts/itunes-music-migrate.mjs --candidates-only --candidate-id <uuid> --review-en "<English review>"
 *   cd sw/web-bo && node scripts/itunes-music-migrate.mjs --candidates-only --candidate-id <uuid> --retry-rejected --itunes-id <trackId> --review-en "<English review>"
 *   cd sw/web-bo && node scripts/itunes-music-migrate.mjs --candidates-only --all-pending --reuse-existing-only
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
const CANDIDATES_ONLY = args.includes('--candidates-only')
const ALL_PENDING = args.includes('--all-pending')
const REUSE_EXISTING_ONLY = args.includes('--reuse-existing-only')
const RETRY_REJECTED = args.includes('--retry-rejected')
const valueAfter = (flag) => {
  const index = args.indexOf(flag)
  return index >= 0 ? args[index + 1] : null
}
const CELEB_ID = valueAfter('--celeb-id')
const CANDIDATE_ID = valueAfter('--candidate-id')
const ITUNES_ID = (valueAfter('--itunes-id') || '').replace(/^itunes-/, '') || null
const REVIEW_EN = (valueAfter('--review-en') || '').trim() || null

if (CELEB_ID && !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(CELEB_ID)) throw new Error('--celeb-id UUID가 올바르지 않다')
if (CANDIDATE_ID && !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(CANDIDATE_ID)) throw new Error('--candidate-id UUID가 올바르지 않다')
if (ITUNES_ID && !/^\d+$/.test(ITUNES_ID)) throw new Error('--itunes-id는 숫자 trackId여야 한다')
if (ITUNES_ID && !CANDIDATE_ID) throw new Error('--itunes-id는 --candidate-id와 함께 써야 한다')
if (REVIEW_EN && !CANDIDATE_ID) throw new Error('--review-en은 한 후보에만 귀속되도록 --candidate-id와 함께 써야 한다')
if ((ALL_PENDING || REUSE_EXISTING_ONLY || RETRY_REJECTED || CELEB_ID || CANDIDATE_ID || ITUNES_ID || REVIEW_EN) && !CANDIDATES_ONLY) {
  throw new Error('후보 관련 옵션은 --candidates-only와 함께 써야 한다')
}

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

function requireResult(result, context) {
  if (result.error) throw new Error(`${context}: ${result.error.message}`)
  return result.data
}

let blocked = false
let existingTrackIndex = null

function candidateTrackKeys(title, artist) {
  const artistVariants = [artist]
  const parenthetical = (artist?.match(/\(([^)]+)\)/)?.[1] || '').trim()
  if (parenthetical) artistVariants.push(parenthetical)
  return [...new Set(artistVariants.map((value) => `${norm(title)}\u0000${norm(value)}`).filter((key) => !key.endsWith('\u0000')))]
}

async function loadExistingTrackIndex() {
  if (existingTrackIndex) return existingTrackIndex
  const rows = []
  const pageSize = 500
  for (let from = 0; ; from += pageSize) {
    const page = requireResult(
      await sb.from('contents')
        .select('id,external_id,metadata,release_date,subtype,content_locales(locale,title,creator,thumbnail_url)')
        .eq('type', 'MUSIC')
        .eq('external_source', 'itunes')
        .range(from, from + pageSize - 1),
      `기존 iTunes 콘텐츠 ${from}..${from + pageSize - 1} 조회`,
    )
    rows.push(...page)
    if (page.length < pageSize) break
  }

  const index = new Map()
  for (const row of rows) {
    if (!/^itunes-\d+$/.test(row.external_id || '') || !row.metadata?.previewUrl) continue
    for (const locale of row.content_locales || []) {
      for (const key of candidateTrackKeys(locale.title, locale.creator)) {
        const matches = index.get(key) || []
        matches.push({ row, locale })
        index.set(key, matches)
      }
    }
  }
  existingTrackIndex = index
  console.log(`기존 iTunes 콘텐츠 재사용 색인 ${rows.length}건 준비`)
  return index
}

async function findExistingTrack(title, artist) {
  const index = await loadExistingTrackIndex()
  const matches = candidateTrackKeys(title, artist)
    .flatMap((key) => index.get(key) || [])
    .filter((match, position, all) => all.findIndex((item) => item.row.id === match.row.id) === position)
  if (matches.length !== 1) return null
  const { row, locale } = matches[0]
  return {
    id: Number(row.external_id.slice('itunes-'.length)),
    title: locale.title,
    artist: locale.creator || artist,
    cover: locale.thumbnail_url || null,
    preview: row.metadata.previewUrl,
    itunesUrl: row.metadata.itunesUrl || '',
    releaseDate: row.release_date || row.metadata.releaseDate || null,
    genre: row.metadata.genre || null,
    country: 'DB',
  }
}

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

async function findTrackById(trackId) {
  for (const country of ['US', 'KR']) {
    await waitForProviderSlot()
    const url = `https://itunes.apple.com/lookup?id=${trackId}&country=${country}`
    const res = await fetch(url, { headers: { 'User-Agent': 'feelandnote/1.0' } })
    if (res.status === 403 || res.status === 429) {
      blocked = true
      throw new Error(`아이튠즈 속도 제한(${res.status})`)
    }
    if (!res.ok) throw new Error(`아이튠즈 오류 ${res.status}`)
    const data = await res.json()
    const track = (data.results || []).find((row) => row.trackId && row.previewUrl)
    if (!track) continue
    const cover = (track.artworkUrl100 || track.artworkUrl60 || '').replace(/\/\d+x\d+bb\.(jpg|png)$/, '/600x600bb.$1')
    return {
      id: track.trackId,
      title: track.trackName || '',
      artist: track.artistName || '',
      cover: cover || null,
      preview: track.previewUrl,
      itunesUrl: track.trackViewUrl || '',
      releaseDate: (track.releaseDate || '').slice(0, 10) || null,
      genre: track.primaryGenreName || null,
      country,
    }
  }
  return null
}

async function ensureCandidateRegistered(candidate, hit, reviewEn) {
  if (!reviewEn) throw new Error(`${candidate.id}: review_en 없이 음악 후보를 등록할 수 없다`)
  const externalId = `itunes-${hit.id}`
  let content = requireResult(
    await sb.from('contents').select('id,type,external_source,external_id,metadata,release_date,subtype').eq('external_id', externalId).maybeSingle(),
    `기존 콘텐츠 조회 ${externalId}`,
  )

  if (content && (content.type !== 'MUSIC' || content.external_source !== 'itunes')) {
    throw new Error(`${externalId}가 다른 유형·출처 콘텐츠에 이미 사용 중이다`)
  }

  if (!content) {
    content = requireResult(
      await sb.from('contents').insert({
        type: 'MUSIC',
        subtype: 'track',
        release_date: hit.releaseDate,
        external_source: 'itunes',
        external_id: externalId,
        metadata: {
          previewUrl: hit.preview,
          itunesUrl: hit.itunesUrl,
          entityType: 'track',
          genre: hit.genre,
          artists: hit.artist ? [hit.artist] : [],
        },
      }).select('id,type,external_source,external_id,metadata,release_date,subtype').single(),
      `콘텐츠 생성 ${externalId}`,
    )
  } else {
    const metadata = { ...(content.metadata || {}) }
    if (!metadata.previewUrl) metadata.previewUrl = hit.preview
    if (!metadata.itunesUrl) metadata.itunesUrl = hit.itunesUrl
    if (!metadata.entityType) metadata.entityType = 'track'
    if (!metadata.genre && hit.genre) metadata.genre = hit.genre
    if (!Array.isArray(metadata.artists) && hit.artist) metadata.artists = [hit.artist]
    requireResult(
      await sb.from('contents').update({
        metadata,
        subtype: content.subtype || 'track',
        release_date: content.release_date || hit.releaseDate,
      }).eq('id', content.id),
      `콘텐츠 보강 ${externalId}`,
    )
  }

  const locales = [
    { locale: 'ko', title: candidate.title, creator: candidate.artist || hit.artist },
    { locale: 'en', title: hit.title, creator: hit.artist || candidate.artist },
  ]
  for (const locale of locales) {
    const existing = requireResult(
      await sb.from('content_locales').select('*').eq('content_id', content.id).eq('locale', locale.locale).maybeSingle(),
      `locale 조회 ${externalId}/${locale.locale}`,
    )
    if (!existing) {
      requireResult(
        await sb.from('content_locales').insert({
          content_id: content.id,
          locale: locale.locale,
          title: locale.title,
          creator: locale.creator || null,
          thumbnail_url: hit.cover,
          verified: true,
          sources: { primary: 'itunes', thumbnail: hit.cover ? 'itunes' : null },
        }),
        `locale 생성 ${externalId}/${locale.locale}`,
      )
    } else {
      const patch = {}
      if (!existing.title) patch.title = locale.title
      if (!existing.creator && locale.creator) patch.creator = locale.creator
      if ((!existing.thumbnail_url || /(?:i\.scdn\.co|spotifycdn)/i.test(existing.thumbnail_url)) && hit.cover) {
        patch.thumbnail_url = hit.cover
      }
      if (!existing.verified) patch.verified = true
      const sources = { ...(existing.sources || {}) }
      sources.primary = 'itunes'
      if (!sources.thumbnail && (existing.thumbnail_url || hit.cover)) sources.thumbnail = 'itunes'
      patch.sources = sources
      requireResult(
        await sb.from('content_locales').update(patch).eq('content_id', content.id).eq('locale', locale.locale),
        `locale 보강 ${externalId}/${locale.locale}`,
      )
    }
  }

  const existingLink = requireResult(
    await sb.from('celeb_contents').select('id,review,review_en,source_url,status,visibility').eq('celeb_id', candidate.celeb_id).eq('content_id', content.id).maybeSingle(),
    `인물 콘텐츠 연결 조회 ${candidate.id}`,
  )
  if (!existingLink) {
    requireResult(
      await sb.from('celeb_contents').insert({
        celeb_id: candidate.celeb_id,
        content_id: content.id,
        status: 'FINISHED',
        review: candidate.evidence || null,
        review_en: reviewEn,
        source_url: candidate.source_url,
        visibility: 'public',
      }),
      `인물 콘텐츠 연결 생성 ${candidate.id}`,
    )
  } else {
    const patch = {}
    if (!existingLink.review && candidate.evidence) patch.review = candidate.evidence
    if (!existingLink.review_en) patch.review_en = reviewEn
    if (!existingLink.source_url && candidate.source_url) patch.source_url = candidate.source_url
    if (existingLink.status !== 'FINISHED') patch.status = 'FINISHED'
    if (existingLink.visibility !== 'public') patch.visibility = 'public'
    if (Object.keys(patch).length) {
      requireResult(await sb.from('celeb_contents').update(patch).eq('id', existingLink.id), `인물 콘텐츠 연결 보강 ${candidate.id}`)
    }
  }

  requireResult(
    await sb.from('celeb_music_candidates').update({
      status: 'registered',
      content_id: content.id,
      reject_reason: null,
      updated_at: new Date().toISOString(),
    }).eq('id', candidate.id),
    `후보 등록 완료 ${candidate.id}`,
  )
}

/**
 * 과거 일괄 조사에서 적어 둔 레거시 음악 후보를 최종 등록·기각한다.
 * 신규 조사에서는 후보를 적치하지 않고 같은 인물 작업에서 즉시 최종 등록한다.
 */
async function registerCandidates(budget) {
  let query = sb
    .from('celeb_music_candidates')
    .select('id, celeb_id, title, artist, source_url, evidence')
    .order('created_at')
  query = RETRY_REJECTED ? query.in('status', ['pending', 'rejected']) : query.eq('status', 'pending')
  if (CELEB_ID) query = query.eq('celeb_id', CELEB_ID)
  if (CANDIDATE_ID) query = query.eq('id', CANDIDATE_ID)
  if (!ALL_PENDING) query = query.limit(budget)

  const { data: cands, error } = await query
  if (error) throw error
  if (!cands.length) return 0

  // 후보 등록은 locale과 감상배경까지 한 번에 끝낸다. 한국어 evidence인데 영문본이 없으면
  // 콘텐츠·locale부터 일부 생성하지 않고 provider 조회 전 배치 전체를 fail-closed한다.
  const missingReviewEn = cands.filter((candidate) => hasHangul(candidate.evidence) && (!REVIEW_EN || candidate.id !== CANDIDATE_ID))
  if (missingReviewEn.length) {
    const ids = missingReviewEn.slice(0, 5).map((candidate) => candidate.id).join(', ')
    throw new Error(`한국어 evidence 후보 ${missingReviewEn.length}건에 review_en이 없다 (${ids}). --candidate-id와 --review-en으로 한 건씩 즉시 완결하라`)
  }

  console.log(`\n조사에서 넘어온 음악 후보 ${cands.length}건 처리\n`)
  let done = 0
  for (const c of cands) {
    if (blocked) break
    let hit = null
    if (ITUNES_ID) {
      hit = await findTrackById(ITUNES_ID)
      if (hit) console.log(`  [지정 ID] ${c.title.slice(0, 30)} / ${(c.artist || '').slice(0, 20)}`)
    } else {
      hit = await findExistingTrack(c.title, c.artist || '')
      if (hit) console.log(`  [재사용] ${c.title.slice(0, 30)} / ${(c.artist || '').slice(0, 20)}`)
    }
    if (!hit && REUSE_EXISTING_ONLY) continue
    try {
      if (!hit) hit = await findTrack(c.title, c.artist || '')
    } catch (e) {
      console.log(`\n⛔ ${e.message} — 후보 처리를 여기서 멈춘다.`)
      break
    }
    if (!hit) {
      if (!DRY) {
        requireResult(
          await sb.from('celeb_music_candidates')
            .update({ status: 'rejected', reject_reason: '아이튠즈에서 정확한 곡을 못 찾거나 미리듣기 없음', updated_at: new Date().toISOString() })
            .eq('id', c.id).eq('status', 'pending'),
          `후보 기각 ${c.id}`,
        )
      }
      console.log(`  [기각] ${c.title.slice(0, 30)} / ${(c.artist || '').slice(0, 20)}`)
      continue
    }

    console.log(`  [등록] ${c.title.slice(0, 30)} / ${(c.artist || '').slice(0, 20)}`)
    done++
    if (DRY) continue

    const reviewEn = REVIEW_EN && c.id === CANDIDATE_ID ? REVIEW_EN : (hasHangul(c.evidence) ? null : (c.evidence || '').trim())
    await ensureCandidateRegistered(c, hit, reviewEn)
  }
  return done
}

async function main() {
  if (CANDIDATES_ONLY) {
    const budget = ALL_PENDING ? Number.MAX_SAFE_INTEGER : LIMIT
    console.log(`음악 후보 즉시 확정${DRY ? ' — 미리보기' : ''}`)
    const registered = await registerCandidates(budget)
    const counts = {}
    for (const status of ['pending', 'registered', 'rejected']) {
      const result = await sb.from('celeb_music_candidates').select('id', { count: 'exact', head: true }).eq('status', status)
      if (result.error) throw result.error
      counts[status] = result.count
    }
    console.log(`\n── 후보 결과 ──`)
    console.log(`이번 실행 등록 ${registered}건`)
    console.log(`현재 pending ${counts.pending} / registered ${counts.registered} / rejected ${counts.rejected}`)
    return
  }

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

  // 남은 호출 여유로 조사 후보를 처리한다. 차단됐으면 건너뛴다.
  let registered = 0
  if (!blocked) {
    const budget = Math.max(0, LIMIT - moved - held)
    if (budget > 0) registered = await registerCandidates(budget)
  }

  const { count } = await sb.from('contents')
    .select('id', { count: 'exact', head: true })
    .eq('type', 'MUSIC').eq('external_source', 'spotify')
  const { count: pending } = await sb.from('celeb_music_candidates')
    .select('id', { count: 'exact', head: true }).eq('status', 'pending')

  console.log(`\n── 결과 ──`)
  console.log(`이전 ${moved}곡 / 조사 후보 등록 ${registered}건`)
  console.log(`남은 Spotify 곡: ${count}곡${count > 0 ? ' — 내일 다시 돌린다' : ' — 이전 완료'}`)
  console.log(`대기 중인 조사 후보: ${pending}건`)
}

main().catch((e) => { console.error('실패:', e.message); process.exit(1) })
