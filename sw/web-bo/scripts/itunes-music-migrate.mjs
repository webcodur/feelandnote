/**
 * 기존 음악 메타를 Spotify → 아이튠즈로 옮긴다.
 *
 * Spotify가 2026-02 개발자 모드 정책 변경으로 앱 소유자의 유료 구독을 요구하게 됐고
 * 26.08.01 우리 앱에 적용돼 조회가 전부 403이다. 아이튠즈가 그 자리를 대신한다.
 *
 * ⚠️ 아이튠즈 Search API는 약 분당 20회로 제한된다.
 *    요청은 분당 20회보다 느리게 보내고, 429는 냉각 후 제한된 횟수만 재시도한다.
 *    곡 하나가 국가·검색어 조합에 따라 여러 요청을 쓸 수 있으므로 처리 곡 수와 호출 수는 다르다.
 *
 * ⚠️ 미리듣기 음원(previewUrl)이 없는 곡은 옮기지 않는다.
 *    옮기는 순간 재생이 끊기기 때문이다(실제로 한 번 겪어 80곡을 되돌렸다).
 *
 * 사용법:
 *   cd sw/web-bo && node scripts/itunes-music-migrate.mjs              # 200곡 처리
 *   cd sw/web-bo && node scripts/itunes-music-migrate.mjs --limit 50   # 50곡만
 *   cd sw/web-bo && node scripts/itunes-music-migrate.mjs --after UUID # 보류 구간 뒤에서 재개
 *   cd sw/web-bo && node scripts/itunes-music-migrate.mjs --continuous --after UUID # 끝까지 연속 실행
 *   cd sw/web-bo && node scripts/itunes-music-migrate.mjs --dry-run    # DB 미수정, 판정만
 *   cd sw/web-bo && node scripts/itunes-music-migrate.mjs --status     # 잔존량·정합성만 확인
 */

import { createClient } from '@supabase/supabase-js'
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import dotenv from 'dotenv'
import { dirname, resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env') })

const args = process.argv.slice(2)
const limitIndex = args.indexOf('--limit')
const parsedLimit = limitIndex >= 0 ? Number(args[limitIndex + 1]) : 200
if (!Number.isInteger(parsedLimit) || parsedLimit < 1) throw new Error('--limit은 1 이상의 정수여야 한다')
const LIMIT = parsedLimit
const afterIndex = args.indexOf('--after')
const AFTER = afterIndex >= 0 ? args[afterIndex + 1] : null
if (AFTER && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(AFTER)) {
  throw new Error('--after는 contents.id UUID여야 한다')
}
const DRY = args.includes('--dry-run')
const STATUS = args.includes('--status')
const CONTINUOUS = args.includes('--continuous')
const unknownArgs = args.filter((arg, index) => (
  arg !== '--dry-run' && arg !== '--status' && arg !== '--continuous' && arg !== '--limit' && arg !== '--after'
  && args[index - 1] !== '--limit' && args[index - 1] !== '--after'
))
if (unknownArgs.length > 0) throw new Error(`지원하지 않는 옵션: ${unknownArgs.join(', ')}`)
if (CONTINUOUS && (DRY || STATUS)) throw new Error('--continuous는 --dry-run 또는 --status와 함께 쓸 수 없다')

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const PROVIDER_REQUEST_INTERVAL_MS = 3500
const RATE_LIMIT_COOLDOWN_MS = 65000
const MAX_RATE_LIMIT_RETRIES = 2
const CONTINUOUS_STATE_PATH = resolve(process.cwd(), '../../.codex/runtime/itunes-music-migrate-state.json')
const norm = (s) => (s || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
const hasHangul = (s) => /[가-힣]/.test(s || '')
const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value)
const asObject = (value) => isObject(value) ? value : {}
const hasSpotifyValue = (value) => /spotify\.com|scdn\.co/i.test(JSON.stringify(value ?? ''))

function withoutSpotifyMetadata(metadata) {
  const cleaned = { ...asObject(metadata) }
  for (const key of Object.keys(cleaned)) {
    if (/spotify/i.test(key)) delete cleaned[key]
  }
  return cleaned
}

let nextProviderRequestAt = 0
let providerRequestCount = 0
let rateLimitWaitCount = 0

async function waitForProviderSlot() {
  const waitMs = Math.max(0, nextProviderRequestAt - Date.now())
  if (waitMs) await sleep(waitMs)
  nextProviderRequestAt = Date.now() + PROVIDER_REQUEST_INTERVAL_MS
}

let blocked = false

function retryAfterMilliseconds(value) {
  if (!value) return 0
  const seconds = Number(value)
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000
  const date = Date.parse(value)
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : 0
}

/** 403/429는 "결과 없음"으로 오인하지 않는다. 429만 냉각 후 제한적으로 재시도한다. */
async function itunes(term, entity, country) {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}`
    + `&entity=${entity}&limit=25&country=${country}`

  for (let attempt = 0; attempt <= MAX_RATE_LIMIT_RETRIES; attempt++) {
    await waitForProviderSlot()
    providerRequestCount++
    const res = await fetch(url, { headers: { 'User-Agent': 'feelandnote/1.0' } })

    if (res.status === 429 && attempt < MAX_RATE_LIMIT_RETRIES) {
      const retryAfter = retryAfterMilliseconds(res.headers.get('retry-after'))
      const cooldown = Math.max(retryAfter, RATE_LIMIT_COOLDOWN_MS * (attempt + 1))
      rateLimitWaitCount++
      nextProviderRequestAt = Date.now() + cooldown
      console.log(`  [속도제한] ${Math.ceil(cooldown / 1000)}초 냉각 후 재시도 ${attempt + 1}/${MAX_RATE_LIMIT_RETRIES}`)
      continue
    }

    if (res.status === 403 || res.status === 429) {
      blocked = true
      throw new Error(`아이튠즈 속도 제한(${res.status})`)
    }
    if (!res.ok) throw new Error(`아이튠즈 오류 ${res.status}`)
    const data = await res.json()
    return data.results || []
  }

  throw new Error('아이튠즈 요청 재시도 상태가 올바르지 않다')
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

async function loadItunesRows() {
  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from('contents')
      .select('id, external_id, metadata, content_locales(locale, title, creator, thumbnail_url, sources)')
      .eq('type', 'MUSIC')
      .eq('external_source', 'itunes')
      .order('id')
      .range(from, from + 999)

    if (error) throw new Error(`기존 iTunes 데이터 조회 실패: ${error.message}`)
    rows.push(...(data || []))
    if ((data || []).length < 1000) break
  }
  return rows
}

function cleanedItunesSources(value, { artwork, itunesUrl }) {
  const sources = { ...asObject(value) }
  for (const [key, sourceValue] of Object.entries(sources)) {
    if (/spotify/i.test(key)) {
      delete sources[key]
      continue
    }
    if (hasSpotifyValue(sourceValue)) {
      if (key === 'url' && itunesUrl) sources[key] = itunesUrl
      else delete sources[key]
    }
  }
  sources.primary = 'itunes'
  if (artwork) sources.thumbnail = 'itunes'
  return sources
}

/**
 * 초기 이전 도구가 KO locale만 바꿔 EN 표지·출처와 일부 metadata에 Spotify 흔적을 남겼다.
 * 새 배치 전에 기존 iTunes 행부터 바로잡아 같은 결함이 누적되지 않게 한다.
 */
async function repairExistingItunesRows(rows, write) {
  let contentRepairs = 0
  let localeRepairs = 0

  for (const row of rows) {
    const locales = row.content_locales || []
    const artwork = locales
      .map((locale) => locale.thumbnail_url)
      .find((url) => /mzstatic\.com/i.test(url || '')) || null
    const itunesUrl = typeof row.metadata?.itunesUrl === 'string' ? row.metadata.itunesUrl : ''
    const cleanedMetadata = withoutSpotifyMetadata(row.metadata)
    const metadataNeedsRepair = JSON.stringify(cleanedMetadata) !== JSON.stringify(asObject(row.metadata))

    if (metadataNeedsRepair) {
      contentRepairs++
      if (write) {
        const { data, error } = await sb.from('contents')
          .update({ metadata: cleanedMetadata })
          .eq('id', row.id)
          .select('id')
        if (error || data?.length !== 1) {
          throw new Error(`기존 iTunes metadata 교정 실패(${row.id}): ${error?.message || '대상 1행을 찾지 못함'}`)
        }
      }
    }

    for (const locale of locales) {
      const sources = cleanedItunesSources(locale.sources, { artwork, itunesUrl })
      const thumbnail = artwork && hasSpotifyValue(locale.thumbnail_url)
        ? artwork
        : locale.thumbnail_url
      const needsRepair = JSON.stringify(sources) !== JSON.stringify(asObject(locale.sources))
        || thumbnail !== locale.thumbnail_url
      if (!needsRepair) continue

      localeRepairs++
      if (!write) continue
      const { data, error } = await sb.from('content_locales')
        .update({ sources, thumbnail_url: thumbnail })
        .eq('content_id', row.id)
        .eq('locale', locale.locale)
        .select('content_id, locale')
      if (error || data?.length !== 1) {
        throw new Error(`기존 iTunes locale 교정 실패(${row.id}/${locale.locale}): ${error?.message || '대상 1행을 찾지 못함'}`)
      }
    }
  }

  return { contentRepairs, localeRepairs }
}

async function migrateRow(row, hit) {
  const originals = (row.content_locales || []).map((locale) => ({
    locale: locale.locale,
    sources: locale.sources,
    thumbnail_url: locale.thumbnail_url,
  }))
  const metadata = {
    ...withoutSpotifyMetadata(row.metadata),
    previewUrl: hit.preview,
    itunesUrl: hit.itunesUrl,
    entityType: 'track',
  }

  try {
    for (const locale of row.content_locales || []) {
      const sources = cleanedItunesSources(locale.sources, {
        artwork: hit.cover,
        itunesUrl: hit.itunesUrl,
      })
      const patch = { sources }
      if (hit.cover) patch.thumbnail_url = hit.cover

      const { data, error } = await sb.from('content_locales')
        .update(patch)
        .eq('content_id', row.id)
        .eq('locale', locale.locale)
        .select('content_id, locale')
      if (error || data?.length !== 1) {
        throw new Error(`locale 저장 실패(${locale.locale}): ${error?.message || '대상 1행을 찾지 못함'}`)
      }
    }

    const { data, error } = await sb.from('contents')
      .update({ external_source: 'itunes', external_id: `itunes-${hit.id}`, metadata })
      .eq('id', row.id)
      .select('id')
    if (error || data?.length !== 1) {
      throw new Error(`contents 저장 실패: ${error?.message || '대상 1행을 찾지 못함'}`)
    }

    const { data: saved, error: verifyError } = await sb.from('contents')
      .select('id, external_id, external_source, metadata, content_locales(locale, thumbnail_url, sources)')
      .eq('id', row.id)
      .single()
    if (verifyError) throw new Error(`저장 후 재조회 실패: ${verifyError.message}`)

    const validContent = saved.external_source === 'itunes'
      && saved.external_id === `itunes-${hit.id}`
      && saved.metadata?.previewUrl === hit.preview
      && !Object.keys(asObject(saved.metadata)).some((key) => /spotify/i.test(key))
    const validLocales = (saved.content_locales || []).length === originals.length
      && (saved.content_locales || []).every((locale) => (
        locale.sources?.primary === 'itunes'
        && !hasSpotifyValue(locale.sources)
        && (!hit.cover || (locale.thumbnail_url === hit.cover && locale.sources?.thumbnail === 'itunes'))
      ))
    if (!validContent || !validLocales) throw new Error('저장 후 정합성 검증 실패')
  } catch (error) {
    const rollbackErrors = []
    const contentRollback = await sb.from('contents')
      .update({
        external_source: row.external_source,
        external_id: row.external_id,
        metadata: row.metadata,
      })
      .eq('id', row.id)
    if (contentRollback.error) rollbackErrors.push(`contents: ${contentRollback.error.message}`)

    for (const original of originals) {
      const localeRollback = await sb.from('content_locales')
        .update({ sources: original.sources, thumbnail_url: original.thumbnail_url })
        .eq('content_id', row.id)
        .eq('locale', original.locale)
      if (localeRollback.error) rollbackErrors.push(`${original.locale}: ${localeRollback.error.message}`)
    }

    const suffix = rollbackErrors.length > 0 ? ` / 롤백 오류: ${rollbackErrors.join(', ')}` : ' / 원상복구 완료'
    throw new Error(`${row.id}: ${error.message}${suffix}`)
  }
}

async function main() {
  let itunesRows = await loadItunesRows()
  const repair = await repairExistingItunesRows(itunesRows, !DRY && !STATUS)
  console.log(`기존 iTunes 정합성: metadata ${repair.contentRepairs}행 / locale ${repair.localeRepairs}행${DRY || STATUS ? ' 교정 필요' : ' 교정'}`)

  if (!DRY && !STATUS && (repair.contentRepairs > 0 || repair.localeRepairs > 0)) {
    itunesRows = await loadItunesRows()
    const remainingRepair = await repairExistingItunesRows(itunesRows, false)
    if (remainingRepair.contentRepairs > 0 || remainingRepair.localeRepairs > 0) {
      throw new Error(`기존 iTunes 정합성 재검증 실패: metadata ${remainingRepair.contentRepairs}행 / locale ${remainingRepair.localeRepairs}행`)
    }
    console.log('기존 iTunes 정합성 재검증 완료\n')
  }

  const { count: spotifyCount, error: spotifyCountError } = await sb.from('contents')
    .select('id', { count: 'exact', head: true })
    .eq('type', 'MUSIC')
    .eq('external_source', 'spotify')
  if (spotifyCountError) throw new Error(`Spotify 잔존량 조회 실패: ${spotifyCountError.message}`)

  if (STATUS) {
    console.log(`iTunes 곡: ${itunesRows.length}곡`)
    console.log(`남은 Spotify 곡: ${spotifyCount}곡`)
    return
  }

  const existingItunesIds = new Set(itunesRows.map((row) => row.external_id).filter(Boolean))
  let targetQuery = sb
    .from('contents')
    .select('id, external_id, external_source, metadata, content_locales(locale, title, creator, thumbnail_url, sources)')
    .eq('type', 'MUSIC')
    .eq('external_source', 'spotify')
    .order('id')
  if (AFTER) targetQuery = targetQuery.gt('id', AFTER)
  const { data: rows, error } = await targetQuery.limit(LIMIT)

  if (error) throw error
  console.log(`대상 ${rows.length}곡 (상한 ${LIMIT})${AFTER ? ` — ${AFTER} 뒤에서 재개` : ''}${DRY ? ' — 미리보기' : ''}\n`)

  let moved = 0, held = 0
  let lastCompletedId = AFTER
  for (const row of rows) {
    if (blocked) break
    const ko = (row.content_locales || []).find((l) => l.locale === 'ko')
    if (!ko?.title) { held++; lastCompletedId = row.id; continue }

    let hit = null
    try {
      hit = await findTrack(ko.title, ko.creator || '')
    } catch (e) {
      console.log(`\n⛔ ${e.message} — 여기서 멈춘다. 남은 곡은 다음 회차에 처리한다.`)
      break
    }
    lastCompletedId = row.id
    if (!hit) { held++; continue }

    const nextExternalId = `itunes-${hit.id}`
    if (existingItunesIds.has(nextExternalId)) {
      held++
      console.log(`  [중복보류] ${ko.title.slice(0, 34)} / ${(ko.creator || '').slice(0, 22)} → ${nextExternalId}`)
      continue
    }

    console.log(`  [이전] ${ko.title.slice(0, 34)} / ${(ko.creator || '').slice(0, 22)}`)
    if (!DRY) await migrateRow(row, hit)
    existingItunesIds.add(nextExternalId)
    moved++
  }

  console.log(`\n이전 ${moved} / 보류 ${held}${blocked ? ' / 차단으로 조기 종료' : ''}`)
  console.log(`아이튠즈 요청 ${providerRequestCount}회 / 속도제한 냉각 ${rateLimitWaitCount}회`)

  const { count, error: countError } = await sb.from('contents')
    .select('id', { count: 'exact', head: true })
    .eq('type', 'MUSIC').eq('external_source', 'spotify')
  if (countError) throw new Error(`최종 Spotify 잔존량 조회 실패: ${countError.message}`)

  console.log(`\n── 결과 ──`)
  console.log(`이전 ${moved}곡 / 보류 ${held}곡`)
  const reachedEnd = count > 0 && AFTER && rows.length === 0
  console.log(`남은 Spotify 곡: ${count}곡${count === 0 ? ' — 이전 완료' : reachedEnd ? ' — 1차 순회 완료' : ' — 다음 커서에서 이어간다'}`)
  if (count > 0 && rows.length > 0 && lastCompletedId) {
    console.log(`다음 재개: node scripts/itunes-music-migrate.mjs --after ${lastCompletedId}`)
  } else if (reachedEnd) {
    console.log('1차 순회 완료. 남은 곡은 자동 매칭 보류분이므로 같은 조건으로 반복 조회하지 않는다.')
  }
}

function replaceAfterArg(childArgs, cursor) {
  const nextArgs = [...childArgs]
  const index = nextArgs.indexOf('--after')
  if (index >= 0) nextArgs[index + 1] = cursor
  else nextArgs.push('--after', cursor)
  return nextArgs
}

async function runMigrationChild(childArgs) {
  return await new Promise((resolveChild, rejectChild) => {
    const child = spawn(process.execPath, [process.argv[1], ...childArgs], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let output = ''
    const collect = (chunk, stream) => {
      const text = chunk.toString()
      stream.write(text)
      output = `${output}${text}`.slice(-131072)
    }
    child.stdout.on('data', (chunk) => collect(chunk, process.stdout))
    child.stderr.on('data', (chunk) => collect(chunk, process.stderr))
    child.on('error', rejectChild)
    child.on('close', (code) => {
      if (code === 0) resolveChild(output)
      else rejectChild(new Error(`이전 자식 프로세스 종료 코드 ${code}`))
    })
  })
}

async function writeContinuousState(state) {
  await mkdir(dirname(CONTINUOUS_STATE_PATH), { recursive: true })
  await writeFile(CONTINUOUS_STATE_PATH, `${JSON.stringify({
    ...state,
    updatedAt: new Date().toISOString(),
  }, null, 2)}\n`, 'utf8')
}

async function runContinuous() {
  let childArgs = args.filter((arg) => arg !== '--continuous')
  const initialAfter = childArgs.indexOf('--after')
  await writeContinuousState({
    status: 'running',
    cursor: initialAfter >= 0 ? childArgs[initialAfter + 1] : null,
  })

  try {
    for (;;) {
      const output = await runMigrationChild(childArgs)
      const remaining = Number(output.match(/남은 Spotify 곡:\s*(\d+)곡/)?.[1])
      if (remaining === 0) {
        await writeContinuousState({ status: 'complete', cursor: null, remaining: 0 })
        return
      }
      if (/1차 순회 완료/.test(output)) {
        await writeContinuousState({ status: 'first_pass_complete', cursor: null, remaining })
        return
      }

      const cursors = [...output.matchAll(/다음 재개:.*--after\s+([0-9a-f-]{36})/gi)]
      const cursor = cursors.at(-1)?.[1]
      if (!cursor) throw new Error('다음 cursor를 출력에서 찾지 못했다')
      childArgs = replaceAfterArg(childArgs, cursor)
      await writeContinuousState({ status: 'running', cursor, remaining })

      if (/아이튠즈 속도 제한\(429\)/.test(output)) {
        console.log('\n[연속 실행] 429 냉각 5분 후 같은 cursor에서 재개한다.\n')
        await sleep(300000)
      }
    }
  } catch (error) {
    const afterIndex = childArgs.indexOf('--after')
    await writeContinuousState({
      status: 'error',
      cursor: afterIndex >= 0 ? childArgs[afterIndex + 1] : null,
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

const entry = CONTINUOUS ? runContinuous : main
entry().catch((e) => { console.error('실패:', e.message); process.exit(1) })
