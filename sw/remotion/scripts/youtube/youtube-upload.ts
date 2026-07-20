/**
 * youtube-upload.ts — YouTube 업로드 스크립트
 *
 * Usage:
 *   pnpm youtube:auth                                        # OAuth2 인증 (최초 1회)
 *   pnpm youtube:upload -- --episode alexander-the-great      # 4종 업로드 (KO/EN × L/S)
 *   pnpm youtube:upload -- --episode alexander-the-great --lang ko         # 한글만
 *   pnpm youtube:upload -- --episode alexander-the-great --type longform   # 롱폼만
 *   pnpm youtube:upload -- --episode alexander-the-great --dry             # 드라이런
 */

import { google } from 'googleapis'
import { readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { lineup, buildTitle, buildDescription, buildTags, calcChapterTimestamps, buildYouTubeSnippet, type EpisodeMeta } from './youtube-lineup.js'
import { buildSoloTitle, buildSoloDescription } from '@feelandnote/shared/lib/youtube-meta'
import { ROOT, findEpisodeDir, parseEpName, resolveEpisodePath, loadEpisode } from '../lib/episode.js'
import {
  OUT_DIR,
  authenticate,
  getAuthedClient,
  uploadVideoWithSnippet,
  uploadCaption,
  upsertCaption,
  setThumbnail,
} from './youtube-core.js'
import { uploadFaction, patchFactionMetadata } from './youtube-faction.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ─── 파일 탐색 ──────────────────────────────────────────

function toCompLabel(episodeName: string): string {
  return episodeName.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join('')
}

type Variant = {
  lang: 'ko' | 'en'
  type: 'longform' | 'shorts' | 'solo'
  shortsIndex?: number
  /** 1권 모드 책 인덱스 (0-based). solo 전용. */
  bookIndex?: number
}

/**
 * variant → 출력 파일 suffix. 옵션 2: shortsIndex는 1-based 일관.
 * longform=LH-VID, shorts={shortsIndex}는 S{shortsIndex}-VID, solo={bookIndex+1, 2자리}는 B{NN}-VID
 */
function variantFileSuffix(v: Variant): string {
  if (v.type === 'longform') return 'LH-VID'
  if (v.type === 'solo') {
    const num = String((v.bookIndex ?? 0) + 1).padStart(2, '0')
    return `B${num}-VID`
  }
  const idx = v.shortsIndex ?? 1
  return `S${idx}-VID`
}

/**
 * variant → uploads 키. 옵션 2: shortsIndex는 1-based 일관.
 * longform={lang}-longform, shorts={lang}-shorts-{shortsIndex}, solo={lang}-solo-{bookIndex+1}
 */
function variantKey(v: Variant): string {
  if (v.type === 'longform') return `${v.lang}-longform`
  if (v.type === 'solo') return `${v.lang}-solo-${(v.bookIndex ?? 0) + 1}`
  const idx = v.shortsIndex ?? 1
  return `${v.lang}-shorts-${idx}`
}

function findFiles(label: string, lang: 'ko' | 'en', variant: Variant) {
  const langCode = lang.toUpperCase()
  const dir = path.join(OUT_DIR, label, langCode)
  const suffix = variantFileSuffix(variant)
  // 썸네일 — 롱폼은 LH-THUMB.png 존재, 쇼츠/솔로는 동일 prefix-THUMB 자동 생성 시도
  const thumbCode = variant.type === 'longform' ? 'LH-THUMB' : `${suffix.replace('-VID', '')}-THUMB`

  const video = path.join(dir, `${suffix}.mp4`)
  const thumb = path.join(dir, `${thumbCode}.png`)
  const srt = path.join(dir, `${suffix}.srt`)

  return {
    video: existsSync(video) ? video : null,
    srt: existsSync(srt) ? srt : null,
    thumb: existsSync(thumb) ? thumb : null,
  }
}

// ─── lineup.json 업로드 기록 ─────────────────────────────

const LINEUP_PATH = path.join(__dirname, 'youtube-lineup.json')

/**
 * 업로드 기록 저장.
 *
 * 키(ko-shorts-3)의 슬롯 번호만으로는 어떤 책이 올라갔는지 사후 확인이 불가능하다.
 * 책 폴더명·업로드 시점 제목을 함께 박아 videoId → 책 정체 고리를 남긴다.
 * 롱폼은 책 하나가 아니므로 book 인자를 넘기지 않는다.
 */
async function saveUploadRecord(
  episodeName: string,
  variantKey: string,
  videoId: string,
  book?: { folder?: string; title?: string },
) {
  const all = JSON.parse(await readFile(LINEUP_PATH, 'utf-8'))
  if (!all[episodeName]) all[episodeName] = {}
  if (!all[episodeName].uploads) all[episodeName].uploads = {}
  const record: Record<string, string> = { videoId, uploadedAt: new Date().toISOString() }
  if (book?.folder) record.bookFolder = book.folder
  if (book?.title) record.titleAtUpload = book.title
  all[episodeName].uploads[variantKey] = record
  await writeFile(LINEUP_PATH, JSON.stringify(all, null, 2) + '\n', 'utf-8')
  const suffix = book?.folder ? ` (${book.folder})` : ''
  console.log(`  lineup.json 기록: ${variantKey} → ${videoId}${suffix}`)
}

// ─── 메인 ───────────────────────────────────────────────

async function upload(episodeName: string, filterLang?: string, filterType?: string, filterShortsIndex?: number, filterBookIndex?: number, dry = false) {
  const meta: EpisodeMeta | undefined = lineup[episodeName]
  if (!meta) console.log(`편성표에 '${episodeName}' 없음 — 에피소드 데이터 기반으로 진행`)

  const label = toCompLabel(episodeName)

  // 에피소드 데이터 로드 (content + timing + shorts 외부 파일까지 머지)
  // parseEpName은 locale 접미사를 강제한다 — `${name}-ko` / `${name}-en` 으로 호출.
  const koData = await loadEpisode(`${episodeName}-ko`).catch(() => null) as any
  const enData = await loadEpisode(`${episodeName}-en`).catch(() => null) as any

  const koShortsCount = Array.isArray(koData?.shorts) ? koData.shorts.length : 0
  const enShortsCount = Array.isArray(enData?.shorts) ? enData.shorts.length : 0
  // 1권 모드(SOLO) 후보 — 별도 데이터 없이 책 본문에서 자동 변환되므로 책 배열을 그대로 후보로 삼는다.
  const koBooksCount = Array.isArray(koData?.books) ? koData.books.length : 0
  const enBooksCount = Array.isArray(enData?.books) ? enData.books.length : 0

  // shortsIndex = 고정 slot(쇼츠 데이터에 박힘). 로더가 slot을 보장(없으면 폴더순).
  const koShortsArr: any[] = Array.isArray(koData?.shorts) ? koData.shorts : []
  const enShortsArr: any[] = Array.isArray(enData?.shorts) ? enData.shorts : []
  const variants: Variant[] = []
  if (koData) variants.push({ lang: 'ko', type: 'longform' })
  for (const s of koShortsArr) variants.push({ lang: 'ko', type: 'shorts', shortsIndex: s.slot })
  for (let i = 0; i < koBooksCount; i++) variants.push({ lang: 'ko', type: 'solo', bookIndex: i })
  if (enData) variants.push({ lang: 'en', type: 'longform' })
  for (const s of enShortsArr) variants.push({ lang: 'en', type: 'shorts', shortsIndex: s.slot })
  for (let i = 0; i < enBooksCount; i++) variants.push({ lang: 'en', type: 'solo', bookIndex: i })

  // 필터
  const filtered = variants.filter(v => {
    if (filterLang && v.lang !== filterLang) return false
    if (filterType && v.type !== filterType) return false
    if (typeof filterShortsIndex === 'number' && v.type === 'shorts' && v.shortsIndex !== filterShortsIndex) return false
    if (typeof filterBookIndex === 'number' && v.type === 'solo' && v.bookIndex !== filterBookIndex) return false
    return true
  })

  // youtube-meta.json 커스텀 메타 로드
  const metaPath = path.join(OUT_DIR, label, 'youtube-meta.json')
  let ytMeta: Record<string, { title?: string; description?: string }> = {}
  if (existsSync(metaPath)) {
    try { ytMeta = JSON.parse(await readFile(metaPath, 'utf-8')) } catch { /* ignore */ }
  }

  // 채널별 YouTube 클라이언트 (lang에 따라 자동 선택)
  const ytClients: Partial<Record<string, ReturnType<typeof google.youtube>>> = {}
  async function getYt(channel: 'ko' | 'en') {
    if (dry) return null
    if (!ytClients[channel]) {
      const auth = await getAuthedClient(channel)
      ytClients[channel] = google.youtube({ version: 'v3', auth })
    }
    return ytClients[channel]!
  }

  console.log(`\n에피소드: ${episodeName}`)
  if (Object.keys(ytMeta).length) console.log('메타 오버라이드: youtube-meta.json 적용')
  console.log(`대상: ${filtered.map(v => variantKey(v)).join(', ')}\n`)

  for (const variant of filtered) {
    const data = variant.lang === 'ko' ? koData : enData
    if (!data) { console.log(`── ${variant.lang.toUpperCase()} ${variant.type}: 에피소드 데이터 없음, 건너뜀`); continue }
    const celebName = data.host.nickname as string
    const books = data.books as any[]
    const isShorts = variant.type === 'shorts'
    const isSolo = variant.type === 'solo'
    const shortsIdx = variant.shortsIndex ?? 1 // 1-based
    const soloBookIdx = variant.bookIndex ?? 0

    const vKey = variantKey(variant)
    // 솔로·쇼츠는 챕터 없음. 롱폼만 챕터 계산.
    const chapters = (!isShorts && !isSolo) ? calcChapterTimestamps(data, variant.lang) : undefined
    // shorts 배열에서 해당 인덱스의 featuredBookIndex 사용 (없으면 0). 배열 접근은 shortsIdx - 1
    // 고정 slot으로 해당 쇼츠 데이터 탐색 (배열 위치 아님 — 미발행분이 끼어도 안 밀림)
    const targetShortsCfg = isShorts && Array.isArray(data.shorts)
      ? data.shorts.find((s: any) => s.slot === shortsIdx)
      : undefined
    const shortsBookTitle = isShorts
      ? books[targetShortsCfg?.featuredBookIndex ?? 0]?.title
      : undefined
    // 업로드 기록에 박을 책 정체 — 쇼츠·솔로만. 롱폼은 여러 권이라 특정 책이 없다.
    // __folder 는 로더가 책 폴더명을 실어준 값(신구조 전용, 레거시 레이아웃은 undefined).
    const recordBookIdx = isShorts ? (targetShortsCfg?.featuredBookIndex ?? 0) : isSolo ? soloBookIdx : undefined
    const recordBook = recordBookIdx != null
      ? { folder: books[recordBookIdx]?.__folder as string | undefined, title: books[recordBookIdx]?.title as string | undefined }
      : undefined
    // 롱폼 신규 포맷 — 다부 에피소드면 totalBooks + part, 단일 부면 books.length
    const epSeries = (data as any).series as { part: number; totalParts: number; totalBooks: number } | undefined
    const isMultipart = (epSeries?.totalParts ?? 1) > 1
    const longformBookCount = isMultipart ? (epSeries?.totalBooks ?? books.length) : books.length
    const longformPart = isMultipart ? epSeries?.part : undefined
    // meta가 없어도 자동 생성 가능 — 빈 meta 폴백. 솔로는 별도 빌더 사용.
    const titleMeta = meta ?? {}
    const links = (ytMeta[vKey] as any)?.links as { label: string; url: string }[] | undefined
    let fallbackTitle: string
    let fallbackDescription: string
    if (isSolo) {
      const featuredBook = books[soloBookIdx]
      fallbackTitle = featuredBook?.title
        ? buildSoloTitle(celebName, variant.lang, featuredBook.title)
        : `[한 권 깊이] ${celebName}` // 책 제목 누락 시 안전 폴백 (실제로는 거의 없음)
      fallbackDescription = featuredBook
        ? buildSoloDescription(celebName, featuredBook, variant.lang, links, episodeName)
        : ''
    } else {
      fallbackTitle = buildTitle(titleMeta, celebName, variant.lang, isShorts, shortsIdx, shortsBookTitle, longformBookCount, longformPart)
      const featuredBookIndex = isShorts ? (targetShortsCfg?.featuredBookIndex ?? 0) : undefined
      fallbackDescription = (buildDescription as any)(celebName, books, variant.lang, isShorts, chapters, links, episodeName, shortsIdx, featuredBookIndex)
    }
    const title = ytMeta[vKey]?.title || fallbackTitle
    const description = ytMeta[vKey]?.description || fallbackDescription
    // 솔로는 isShorts=false로 일반 태그 사용. (1권 깊이 전용 태그는 향후 buildTags 분기에서)
    const tags = (buildTags as any)(celebName, variant.lang, isShorts, shortsIdx, episodeName)

    const files = findFiles(label, variant.lang, variant)

    const variantLabel = isSolo
      ? `SOLO B${String(soloBookIdx + 1).padStart(2, '0')}`
      : `${variant.type}${isShorts ? `#${shortsIdx}` : ''}`
    console.log(`── ${variant.lang.toUpperCase()} ${variantLabel} (${variant.lang === 'en' ? 'EN채널' : 'KO채널'}) ──`)
    console.log(`  제목: ${title}`)

    if (!files.video) {
      console.log('  건너뜀: 영상 파일 없음')
      continue
    }

    if (dry) {
      console.log(`  영상: ${files.video}`)
      console.log(`  자막: ${files.srt ?? '없음'}`)
      console.log(`  썸네일: ${files.thumb ?? '없음'}`)
      console.log(`  공개: private (고정)`)
      if (recordBook) console.log(`  기록 예정: bookFolder=${recordBook.folder ?? '(없음)'} · titleAtUpload=${recordBook.title ?? '(없음)'}`)
      else console.log(`  기록 예정: 책 정체 없음 (롱폼)`)
      continue
    }

    const yt = await getYt(variant.lang)
    if (!yt) continue
    const videoId = await uploadVideoWithSnippet(yt, files.video, buildYouTubeSnippet({ title, description, tags, lang: variant.lang }), 'private')
    if (files.srt) {
      // 영상 처리 대기 후 자막 업로드 (즉시 시도 시 거부될 수 있음)
      console.log('  자막 업로드 대기 (10초)...')
      await new Promise(r => setTimeout(r, 10_000))
      try {
        await uploadCaption(yt, videoId, files.srt, variant.lang)
      } catch (e: any) {
        console.warn(`  자막 업로드 실패: ${e.message}`)
      }
    }
    if (files.thumb) await setThumbnail(yt, videoId, files.thumb)

    // videoId를 lineup.json에 기록
    await saveUploadRecord(episodeName, vKey, videoId, recordBook)
    console.log()
  }

  console.log('완료.')
}

// ─── 메타 패치 (영상 파일은 그대로, 제목·설명·태그만 갱신) ─

/**
 * 이미 업로드된 영상의 snippet(제목·설명·태그)만 다시 만들어 YouTube 에 PUT 한다.
 * youtube-meta.json 캐시가 깨졌거나 책 구성이 바뀐 뒤 영상을 다시 렌더하지 않고
 * 메타데이터만 정정할 때 사용한다.
 *
 * - 캐시(youtube-meta.json)는 무시하고 항상 fresh 생성한다(잘못된 캐시 잔존 차단).
 * - 패치 직후 fresh snippet 으로 캐시 파일을 다시 쓴다.
 * - lineup.json 의 uploads 기록을 videoId 출처로 사용한다.
 */
async function patchMetadata(episodeName: string, filterLang?: string, filterType?: string, filterShortsIndex?: number, dry = false, withCaption = true) {
  const meta: EpisodeMeta | undefined = lineup[episodeName]
  if (!meta?.uploads) {
    console.error(`업로드 기록 없음: lineup.json 의 ${episodeName}.uploads 가 비어 있다.`)
    process.exit(1)
  }

  const label = toCompLabel(episodeName)

  const koData = await loadEpisode(`${episodeName}-ko`).catch(() => null) as any
  const enData = await loadEpisode(`${episodeName}-en`).catch(() => null) as any

  // 업로드 기록이 있는 variant 만 대상으로 한다(파일 존재 여부와 무관).
  const variants: Variant[] = []
  for (const vKey of Object.keys(meta.uploads)) {
    // ko-longform | ko-shorts-1 | en-longform | en-shorts-2 ...
    const parts = vKey.split('-')
    const lang = parts[0] as 'ko' | 'en'
    const type = parts[1] === 'longform' ? 'longform' : 'shorts'
    const shortsIndex = type === 'shorts' ? parseInt(parts[2] ?? '1', 10) : undefined
    variants.push({ lang, type, shortsIndex })
  }

  const filtered = variants.filter(v => {
    if (filterLang && v.lang !== filterLang) return false
    if (filterType && v.type !== filterType) return false
    if (typeof filterShortsIndex === 'number' && v.type === 'shorts' && v.shortsIndex !== filterShortsIndex) return false
    return true
  })

  const metaPath = path.join(OUT_DIR, label, 'youtube-meta.json')
  let ytMeta: Record<string, { title?: string; description?: string; links?: { label: string; url: string }[] }> = {}
  if (existsSync(metaPath)) {
    try { ytMeta = JSON.parse(await readFile(metaPath, 'utf-8')) } catch { /* ignore */ }
  }

  const ytClients: Partial<Record<string, ReturnType<typeof google.youtube>>> = {}
  async function getYt(channel: 'ko' | 'en') {
    if (dry) return null
    if (!ytClients[channel]) {
      const auth = await getAuthedClient(channel)
      ytClients[channel] = google.youtube({ version: 'v3', auth })
    }
    return ytClients[channel]!
  }

  console.log(`\n에피소드: ${episodeName} (메타 패치 모드)`)
  console.log(`대상: ${filtered.map(v => variantKey(v)).join(', ')}\n`)

  for (const variant of filtered) {
    const vKey = variantKey(variant)
    const data = variant.lang === 'ko' ? koData : enData
    if (!data) { console.log(`── ${vKey}: 에피소드 데이터 없음, 건너뜀`); continue }

    const celebName = data.host.nickname as string
    const books = data.books as any[]
    const isShorts = variant.type === 'shorts'
    const shortsIdx = variant.shortsIndex ?? 1

    const chapters = !isShorts ? calcChapterTimestamps(data, variant.lang) : undefined
    // 고정 slot으로 해당 쇼츠 데이터 탐색 (배열 위치 아님 — 미발행분이 끼어도 안 밀림)
    const targetShortsCfg = isShorts && Array.isArray(data.shorts)
      ? data.shorts.find((s: any) => s.slot === shortsIdx)
      : undefined
    const shortsBookTitle = isShorts
      ? books[targetShortsCfg?.featuredBookIndex ?? 0]?.title
      : undefined
    const epSeries = (data as any).series as { part: number; totalParts: number; totalBooks: number } | undefined
    const isMultipart = (epSeries?.totalParts ?? 1) > 1
    const longformBookCount = isMultipart ? (epSeries?.totalBooks ?? books.length) : books.length
    const longformPart = isMultipart ? epSeries?.part : undefined

    // fresh 재생성 — 캐시 ytMeta 의 title/description 은 무시한다(깨진 캐시 차단).
    const links = ytMeta[vKey]?.links
    const featuredBookIndex = isShorts ? (targetShortsCfg?.featuredBookIndex ?? 0) : undefined
    const title = buildTitle({}, celebName, variant.lang, isShorts, shortsIdx, shortsBookTitle, longformBookCount, longformPart)
    const description = (buildDescription as any)(celebName, books, variant.lang, isShorts, chapters, links, episodeName, shortsIdx, featuredBookIndex)
    const tags = (buildTags as any)(celebName, variant.lang, isShorts, shortsIdx, episodeName)
    const snippet = buildYouTubeSnippet({ title, description, tags, lang: variant.lang, shortsIndex: shortsIdx })

    const videoId = meta.uploads?.[vKey]?.videoId
    if (!videoId) { console.log(`── ${vKey}: 업로드 기록 없음, 건너뜀`); continue }

    console.log(`── ${vKey} (videoId=${videoId}) ──`)
    console.log(`  제목: ${title}`)
    if (chapters?.length) {
      console.log(`  타임라인 첫 5줄:`)
      for (const c of chapters.slice(0, 5)) console.log(`    ${c.time} ${c.label}`)
    }

    if (dry) { console.log(`  (dry: PUT 호출 생략)`); continue }

    const yt = await getYt(variant.lang)
    if (!yt) continue
    try {
      await yt.videos.update({
        part: ['snippet'],
        requestBody: { id: videoId, snippet },
      })
      console.log(`  YouTube 갱신 완료`)
    } catch (e: any) {
      console.error(`  YouTube 갱신 실패: ${e.message}`)
      continue
    }

    // 캐시 파일에도 fresh 값으로 덮어쓰기
    ytMeta[vKey] = { ...ytMeta[vKey], title, description }

    // 자막 — 동일 언어 트랙이 있으면 update, 없으면 insert
    if (withCaption) {
      const files = findFiles(label, variant.lang, variant)
      if (!files.srt) {
        console.log('  자막 srt 없음, 자막 단계 생략')
      } else {
        try {
          await upsertCaption(yt, videoId, files.srt, variant.lang)
        } catch (e: any) {
          console.warn(`  자막 처리 실패: ${e.message}`)
        }
      }
    }
  }

  if (!dry) {
    await writeFile(metaPath, JSON.stringify(ytMeta, null, 2) + '\n', 'utf-8')
    console.log(`\nyoutube-meta.json 갱신: ${metaPath}`)
  }
  console.log('완료.')
}

// ─── CLI ────────────────────────────────────────────────

const args = process.argv.slice(2)
const command = args[0]

if (command === 'auth') {
  const chIdx = args.indexOf('--channel')
  const ch = chIdx >= 0 ? args[chIdx + 1] : 'ko'
  authenticate(ch as 'ko' | 'en').catch(console.error)
} else if (command === 'upload') {
  const epIdx = args.indexOf('--episode')
  const episode = epIdx >= 0 ? args[epIdx + 1] : null
  if (!episode) { console.error('--episode 필수'); process.exit(1) }

  const langIdx = args.indexOf('--lang')
  const lang = langIdx >= 0 ? args[langIdx + 1] : undefined

  const typeIdx = args.indexOf('--type')
  const type = typeIdx >= 0 ? args[typeIdx + 1] : undefined

  // 옵션 2: shortsIndex는 1-based (S1, S2, ...)
  const shortsIdxFlag = args.indexOf('--shorts-index')
  const shortsIndex = shortsIdxFlag >= 0 ? Number(args[shortsIdxFlag + 1]) : undefined

  // 1권 모드: bookIndex는 0-based
  const bookIdxFlag = args.indexOf('--book-index')
  const bookIndex = bookIdxFlag >= 0 ? Number(args[bookIdxFlag + 1]) : undefined

  const dry = args.includes('--dry')

  const seriesIdx = args.indexOf('--series')
  const series = seriesIdx >= 0 ? args[seriesIdx + 1] : undefined

  // 세력도 — 데이터 모델·출력 경로가 달라 별도 진입점으로 위임 (한국어 세로 전용)
  if (series === 'faction') {
    uploadFaction(episode, type, dry).catch(e => { console.error(e); process.exit(1) })
  } else {
    upload(episode, lang, type, shortsIndex, bookIndex, dry).catch(console.error)
  }
} else if (command === 'patch-meta') {
  const epIdx = args.indexOf('--episode')
  const episode = epIdx >= 0 ? args[epIdx + 1] : null
  if (!episode) { console.error('--episode 필수'); process.exit(1) }

  const langIdx = args.indexOf('--lang')
  const lang = langIdx >= 0 ? args[langIdx + 1] : undefined

  const typeIdx = args.indexOf('--type')
  const type = typeIdx >= 0 ? args[typeIdx + 1] : undefined

  const shortsIdxFlag = args.indexOf('--shorts-index')
  const shortsIndex = shortsIdxFlag >= 0 ? Number(args[shortsIdxFlag + 1]) : undefined

  const dry = args.includes('--dry')
  const withCaption = !args.includes('--no-caption')

  const seriesIdx = args.indexOf('--series')
  const series = seriesIdx >= 0 ? args[seriesIdx + 1] : undefined

  if (series === 'faction') {
    patchFactionMetadata(episode, type, dry).catch(e => { console.error(e); process.exit(1) })
  } else {
    patchMetadata(episode, lang, type, shortsIndex, dry, withCaption).catch(e => { console.error(e); process.exit(1) })
  }
} else {
  console.log(`사용법:
  pnpm youtube:auth                                            KO 채널 인증
  pnpm youtube:auth -- --channel en                            EN 채널 인증
  pnpm youtube:upload -- --episode <name>                      4종 업로드 (KO→KO채널, EN→EN채널)
  pnpm youtube:upload -- --episode <name> --lang ko            한글만 (KO채널)
  pnpm youtube:upload -- --episode <name> --lang en            영문만 (EN채널)
  pnpm youtube:upload -- --episode <name> --type longform      롱폼만
  pnpm youtube:upload -- --episode <name> --dry                드라이런

  pnpm youtube:patch-meta -- --episode <name>                  업로드된 영상의 제목·설명·자막 fresh 재생성하여 갱신
  pnpm youtube:patch-meta -- --episode <name> --type longform  롱폼만 메타 패치
  pnpm youtube:patch-meta -- --episode <name> --no-caption     자막 단계 건너뛰기 (제목·설명만)
  pnpm youtube:patch-meta -- --episode <name> --dry            드라이런`)
}
