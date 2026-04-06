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

type Variant = { lang: 'ko' | 'en'; type: 'longform' | 'shorts' }

function findFiles(label: string, lang: 'ko' | 'en', type: 'longform' | 'shorts') {
  const langCode = lang.toUpperCase()
  const dir = path.join(OUT_DIR, label, langCode)
  const typeCode = type === 'longform' ? 'L' : 'S'

  const video = path.join(dir, `${typeCode}-VID.mp4`)
  const thumb = path.join(dir, `${typeCode}-THUMB.png`)
  const srt = path.join(dir, `${typeCode}-VID.srt`)

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
  if (!all[episodeName]) all[episodeName] = { hook: { ko: '', en: '' } }
  if (!all[episodeName].uploads) all[episodeName].uploads = {}
  all[episodeName].uploads[variantKey] = { videoId, uploadedAt: new Date().toISOString() }
  await writeFile(LINEUP_PATH, JSON.stringify(all, null, 2) + '\n', 'utf-8')
  console.log(`  lineup.json 기록: ${variantKey} → ${videoId}`)
}

// ─── 메인 ───────────────────────────────────────────────

async function upload(episodeName: string, filterLang?: string, filterType?: string, dry = false) {
  const meta: EpisodeMeta | undefined = lineup[episodeName]
  if (!meta) console.log(`편성표에 '${episodeName}' 없음 — 에피소드 데이터 기반으로 진행`)

  const label = toCompLabel(episodeName)
  const variants: Variant[] = [
    { lang: 'ko', type: 'longform' },
    { lang: 'ko', type: 'shorts' },
    { lang: 'en', type: 'longform' },
    { lang: 'en', type: 'shorts' },
  ]

  // 필터
  const filtered = variants.filter(v => {
    if (filterLang && v.lang !== filterLang) return false
    if (filterType && v.type !== filterType) return false
    return true
  })

  // 에피소드 데이터 로드 (content + timing 머지)
  const koData = await loadEpisode(episodeName)
  const enData = await loadEpisode(`${episodeName}-en`)

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
  console.log(`대상: ${filtered.map(v => `${v.lang}-${v.type}`).join(', ')}\n`)

  for (const variant of filtered) {
    const data = variant.lang === 'ko' ? koData : enData
    const celebName = data.host.nickname as string
    const books = data.books as any[]
    const isShorts = variant.type === 'shorts'

    const variantKey = `${variant.lang}-${variant.type}`
    const chapters = !isShorts ? calcChapterTimestamps(data, variant.lang) : undefined
    const fallbackTitle = meta
      ? buildTitle(meta, celebName, variant.lang, isShorts)
      : `${variant.lang === 'ko' ? '[서재탐방]' : '[Library Tour]'} ${celebName}`
    const title = ytMeta[variantKey]?.title || fallbackTitle
    const links = (ytMeta[variantKey] as any)?.links as { label: string; url: string }[] | undefined
    const description = ytMeta[variantKey]?.description || buildDescription(celebName, books, variant.lang, isShorts, chapters, links, episodeName)
    const tags = buildTags(celebName, variant.lang, isShorts)

    const files = findFiles(label, variant.lang, variant.type)

    console.log(`── ${variant.lang.toUpperCase()} ${variant.type} (${variant.lang === 'en' ? 'EN채널' : 'KO채널'}) ──`)
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
    await saveUploadRecord(episodeName, variantKey, videoId)
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

  const dry = args.includes('--dry')

  upload(episode, lang, type, dry).catch(console.error)
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
