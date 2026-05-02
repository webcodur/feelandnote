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
    const tags = (buildTags as any)(celebName, variant.lang, isShorts, shortsIdx)

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
} else {
  console.log(`사용법:
  pnpm youtube:auth                                       KO 채널 인증
  pnpm youtube:auth -- --channel en                       EN 채널 인증
  pnpm youtube:upload -- --episode <name>                 4종 업로드 (KO→KO채널, EN→EN채널)
  pnpm youtube:upload -- --episode <name> --lang ko       한글만 (KO채널)
  pnpm youtube:upload -- --episode <name> --lang en       영문만 (EN채널)
  pnpm youtube:upload -- --episode <name> --type longform 롱폼만
  pnpm youtube:upload -- --episode <name> --dry           드라이런`)
}
