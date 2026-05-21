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
import { createServer, type IncomingMessage, type ServerResponse } from 'http'
import { execSync } from 'child_process'
import { createReadStream, existsSync, statSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { lineup, buildTitle, buildDescription, buildTags, calcChapterTimestamps, buildYouTubeSnippet, type EpisodeMeta } from './youtube-lineup.js'
import { ROOT, findEpisodeDir, parseEpName, resolveEpisodePath, loadEpisode } from '../lib/episode.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CREDENTIALS_DIR = path.join(__dirname, '..', '..', 'credentials')
const CLIENT_SECRET_PATH = path.join(CREDENTIALS_DIR, 'client_secret.json')
const OUT_DIR = path.join(__dirname, '..', '..', 'out')

/** 채널별 토큰 경로: ko → youtube_token.json, en → youtube_token_en.json */
function tokenPath(channel: 'ko' | 'en' = 'ko') {
  return path.join(CREDENTIALS_DIR, channel === 'en' ? 'youtube_token_en.json' : 'youtube_token.json')
}

const SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.force-ssl',
]

// ─── OAuth2 ─────────────────────────────────────────────

async function createOAuth2() {
  const raw = JSON.parse(await readFile(CLIENT_SECRET_PATH, 'utf-8'))
  const creds = raw.installed ?? raw.web
  return new google.auth.OAuth2(creds.client_id, creds.client_secret, 'http://localhost:9876')
}

async function authenticate(channel: 'ko' | 'en' = 'ko') {
  const oauth2 = await createOAuth2()
  const authUrl = oauth2.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  })

  const label = channel === 'en' ? 'EN 채널' : 'KO 채널'
  console.log(`${label} 인증 — 브라우저에서 Google 인증 진행...`)

  const code = await new Promise<string>((resolve, reject) => {
    const server = createServer((req: IncomingMessage, res: ServerResponse) => {
      const url = new URL(req.url!, 'http://localhost:9876')
      const code = url.searchParams.get('code')
      if (code) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end(`<h1>${label} 인증 완료. 이 창을 닫아도 됩니다.</h1>`)
        server.close()
        resolve(code)
      } else {
        res.writeHead(400)
        res.end('code 파라미터 없음')
      }
    })
    server.listen(9876, () => {
      try { execSync(`start "" "${authUrl}"`, { stdio: 'ignore' }) }
      catch { console.log(`브라우저에서 열기:\n${authUrl}`) }
    })
    server.on('error', reject)
  })

  const tp = tokenPath(channel)
  const { tokens } = await oauth2.getToken(code)
  await writeFile(tp, JSON.stringify(tokens, null, 2), 'utf-8')
  console.log(`토큰 저장 완료: ${tp}`)
}

async function getAuthedClient(channel: 'ko' | 'en' = 'ko') {
  const tp = tokenPath(channel)
  const oauth2 = await createOAuth2()
  let tokens: Record<string, unknown>
  try {
    tokens = JSON.parse(await readFile(tp, 'utf-8'))
  } catch {
    console.error(`토큰 없음 (${channel}). pnpm youtube:auth -- --channel ${channel} 먼저 실행.`)
    process.exit(1)
  }
  oauth2.setCredentials(tokens)

  // 토큰 갱신 시 자동 저장
  oauth2.on('tokens', async (newTokens) => {
    const existing = JSON.parse(await readFile(tp, 'utf-8'))
    await writeFile(tp, JSON.stringify({ ...existing, ...newTokens }, null, 2), 'utf-8')
  })
  return oauth2
}

// ─── 파일 탐색 ──────────────────────────────────────────

function toCompLabel(episodeName: string): string {
  return episodeName.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join('')
}

type Variant = { lang: 'ko' | 'en'; type: 'longform' | 'shorts'; shortsIndex?: number }

/**
 * variant → 출력 파일 suffix. 옵션 2: shortsIndex는 1-based 일관.
 * longform=L-VID, shorts={shortsIndex}는 S{shortsIndex}-VID
 */
function variantFileSuffix(v: Variant): string {
  if (v.type === 'longform') return 'L-VID'
  const idx = v.shortsIndex ?? 1
  return `S${idx}-VID`
}

/**
 * variant → uploads 키. 옵션 2: shortsIndex는 1-based 일관.
 * longform={lang}-longform, shorts={lang}-shorts-{shortsIndex}
 */
function variantKey(v: Variant): string {
  if (v.type === 'longform') return `${v.lang}-longform`
  const idx = v.shortsIndex ?? 1
  return `${v.lang}-shorts-${idx}`
}

function findFiles(label: string, lang: 'ko' | 'en', variant: Variant) {
  const langCode = lang.toUpperCase()
  const dir = path.join(OUT_DIR, label, langCode)
  const suffix = variantFileSuffix(variant)
  // 썸네일은 롱폼만 존재 (L-THUMB.png). 쇼츠는 자동 생성.
  const thumbCode = variant.type === 'longform' ? 'L-THUMB' : `${suffix.replace('-VID', '')}-THUMB`

  const video = path.join(dir, `${suffix}.mp4`)
  const thumb = path.join(dir, `${thumbCode}.png`)
  const srt = path.join(dir, `${suffix}.srt`)

  return {
    video: existsSync(video) ? video : null,
    srt: existsSync(srt) ? srt : null,
    thumb: existsSync(thumb) ? thumb : null,
  }
}

// ─── 업로드 ─────────────────────────────────────────────

async function uploadVideo(
  yt: ReturnType<typeof google.youtube>,
  filePath: string,
  title: string,
  description: string,
  tags: string[],
  lang: 'ko' | 'en',
  privacyStatus: string,
) {
  const fileSize = statSync(filePath).size
  const snippet = buildYouTubeSnippet({ title, description, tags, lang })

  console.log(`  업로드 중: ${path.basename(filePath)} (${(fileSize / 1024 / 1024).toFixed(0)}MB)`)

  const res = await yt.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet,
      status: {
        privacyStatus,
        selfDeclaredMadeForKids: false,
      },
    },
    media: {
      body: createReadStream(filePath),
    },
  })

  const videoId = res.data.id!
  console.log(`  완료: https://youtu.be/${videoId}`)
  return videoId
}

async function uploadCaption(
  yt: ReturnType<typeof google.youtube>,
  videoId: string,
  srtPath: string,
  lang: 'ko' | 'en',
) {
  console.log(`  자막 업로드: ${path.basename(srtPath)}`)
  await yt.captions.insert({
    part: ['snippet'],
    requestBody: {
      snippet: {
        videoId,
        language: lang === 'ko' ? 'ko' : 'en',
        name: lang === 'ko' ? '한국어' : 'English',
      },
    },
    media: {
      mimeType: 'application/x-subrip',
      body: createReadStream(srtPath),
    },
  })
  console.log('  자막 완료')
}

/**
 * 동일 언어 캡션이 이미 있으면 update, 없으면 insert.
 * 업로드 시 자막이 누락됐거나 자막만 다시 올릴 때 사용.
 */
async function upsertCaption(
  yt: ReturnType<typeof google.youtube>,
  videoId: string,
  srtPath: string,
  lang: 'ko' | 'en',
) {
  const targetLang = lang === 'ko' ? 'ko' : 'en'
  const list = await yt.captions.list({ videoId, part: ['snippet'] })
  // YouTube 가 만든 asr 트랙은 외부 API 로 update 불가 — trackKind === 'standard' 만 후보로 삼는다.
  const existing = (list.data.items ?? []).find(it =>
    it.snippet?.language === targetLang && it.snippet?.trackKind === 'standard'
  )
  if (existing?.id) {
    console.log(`  자막 갱신(update): ${path.basename(srtPath)} → caption=${existing.id}`)
    await yt.captions.update({
      part: ['snippet'],
      requestBody: { id: existing.id },
      media: { mimeType: 'application/x-subrip', body: createReadStream(srtPath) },
    })
    console.log('  자막 갱신 완료')
    return
  }
  await uploadCaption(yt, videoId, srtPath, lang)
}

async function setThumbnail(
  yt: ReturnType<typeof google.youtube>,
  videoId: string,
  thumbPath: string,
) {
  console.log(`  썸네일 설정: ${path.basename(thumbPath)}`)
  try {
    await yt.thumbnails.set({
      videoId,
      media: {
        mimeType: 'image/png',
        body: createReadStream(thumbPath),
      },
    })
    console.log('  썸네일 완료')
  } catch (e: any) {
    console.warn(`  썸네일 실패 (채널 인증 필요할 수 있음): ${e.message}`)
  }
}

// ─── lineup.json 업로드 기록 ─────────────────────────────

const LINEUP_PATH = path.join(__dirname, 'youtube-lineup.json')

async function saveUploadRecord(episodeName: string, variantKey: string, videoId: string) {
  const all = JSON.parse(await readFile(LINEUP_PATH, 'utf-8'))
  if (!all[episodeName]) all[episodeName] = {}
  if (!all[episodeName].uploads) all[episodeName].uploads = {}
  all[episodeName].uploads[variantKey] = { videoId, uploadedAt: new Date().toISOString() }
  await writeFile(LINEUP_PATH, JSON.stringify(all, null, 2) + '\n', 'utf-8')
  console.log(`  lineup.json 기록: ${variantKey} → ${videoId}`)
}

// ─── 메인 ───────────────────────────────────────────────

async function upload(episodeName: string, filterLang?: string, filterType?: string, filterShortsIndex?: number, dry = false) {
  const meta: EpisodeMeta | undefined = lineup[episodeName]
  if (!meta) console.log(`편성표에 '${episodeName}' 없음 — 에피소드 데이터 기반으로 진행`)

  const label = toCompLabel(episodeName)

  // 에피소드 데이터 로드 (content + timing + shorts 외부 파일까지 머지)
  // parseEpName은 locale 접미사를 강제한다 — `${name}-ko` / `${name}-en` 으로 호출.
  const koData = await loadEpisode(`${episodeName}-ko`).catch(() => null) as any
  const enData = await loadEpisode(`${episodeName}-en`).catch(() => null) as any

  const koShortsCount = Array.isArray(koData?.shorts) ? koData.shorts.length : 0
  const enShortsCount = Array.isArray(enData?.shorts) ? enData.shorts.length : 0

  // 옵션 2: shortsIndex는 1-based 일관. 배열 길이에 따라 variant 동적 확장
  const variants: Variant[] = []
  if (koData) variants.push({ lang: 'ko', type: 'longform' })
  for (let i = 0; i < koShortsCount; i++) variants.push({ lang: 'ko', type: 'shorts', shortsIndex: i + 1 })
  if (enData) variants.push({ lang: 'en', type: 'longform' })
  for (let i = 0; i < enShortsCount; i++) variants.push({ lang: 'en', type: 'shorts', shortsIndex: i + 1 })

  // 필터
  const filtered = variants.filter(v => {
    if (filterLang && v.lang !== filterLang) return false
    if (filterType && v.type !== filterType) return false
    if (typeof filterShortsIndex === 'number' && v.type === 'shorts' && v.shortsIndex !== filterShortsIndex) return false
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
    const shortsIdx = variant.shortsIndex ?? 1 // 1-based

    const vKey = variantKey(variant)
    const chapters = !isShorts ? calcChapterTimestamps(data, variant.lang) : undefined
    // shorts 배열에서 해당 인덱스의 featuredBookIndex 사용 (없으면 0). 배열 접근은 shortsIdx - 1
    const targetShortsCfg = isShorts && Array.isArray(data.shorts)
      ? data.shorts[shortsIdx - 1]
      : undefined
    const shortsBookTitle = isShorts
      ? books[targetShortsCfg?.featuredBookIndex ?? 0]?.title
      : undefined
    // 롱폼 신규 포맷 — 다부 에피소드면 totalBooks + part, 단일 부면 books.length
    const epSeries = (data as any).series as { part: number; totalParts: number; totalBooks: number } | undefined
    const isMultipart = (epSeries?.totalParts ?? 1) > 1
    const longformBookCount = isMultipart ? (epSeries?.totalBooks ?? books.length) : books.length
    const longformPart = isMultipart ? epSeries?.part : undefined
    // meta가 없어도 롱폼 신규 포맷은 항상 계산 가능 — 빈 meta 폴백.
    const titleMeta = meta ?? {}
    const fallbackTitle = buildTitle(titleMeta, celebName, variant.lang, isShorts, shortsIdx, shortsBookTitle, longformBookCount, longformPart)
    const title = ytMeta[vKey]?.title || fallbackTitle
    const links = (ytMeta[vKey] as any)?.links as { label: string; url: string }[] | undefined
    const featuredBookIndex = isShorts ? (targetShortsCfg?.featuredBookIndex ?? 0) : undefined
    const description = ytMeta[vKey]?.description
      || (buildDescription as any)(celebName, books, variant.lang, isShorts, chapters, links, episodeName, shortsIdx, featuredBookIndex)
    const tags = (buildTags as any)(celebName, variant.lang, isShorts, shortsIdx, episodeName)

    const files = findFiles(label, variant.lang, variant)

    console.log(`── ${variant.lang.toUpperCase()} ${variant.type}${isShorts ? `#${shortsIdx}` : ''} (${variant.lang === 'en' ? 'EN채널' : 'KO채널'}) ──`)
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
      continue
    }

    const yt = await getYt(variant.lang)
    if (!yt) continue
    const videoId = await uploadVideo(yt, files.video, title, description, tags, variant.lang, 'private')
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
    await saveUploadRecord(episodeName, vKey, videoId)
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
    const targetShortsCfg = isShorts && Array.isArray(data.shorts)
      ? data.shorts[shortsIdx - 1]
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

  const dry = args.includes('--dry')

  upload(episode, lang, type, shortsIndex, dry).catch(console.error)
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

  patchMetadata(episode, lang, type, shortsIndex, dry, withCaption).catch(e => { console.error(e); process.exit(1) })
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
