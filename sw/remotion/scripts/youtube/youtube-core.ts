/**
 * youtube-core.ts — YouTube 업로드 공통 인프라
 *
 * 서재 탐방(youtube-upload.ts)·세력도(youtube-faction.ts) 양쪽이 공유한다.
 * OAuth 인증, 영상/자막/썸네일 업로드 등 시리즈 무관 로직만 둔다.
 * 시리즈별 메타 생성·variant 구성은 각 진입점 파일에서 처리한다.
 */

import { google } from 'googleapis'
import { readFile, writeFile } from 'fs/promises'
import { createServer, type IncomingMessage, type ServerResponse } from 'http'
import { execSync } from 'child_process'
import { createReadStream, statSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const CREDENTIALS_DIR = path.join(__dirname, '..', '..', 'credentials')
export const CLIENT_SECRET_PATH = path.join(CREDENTIALS_DIR, 'client_secret.json')
export const OUT_DIR = path.join(__dirname, '..', '..', 'out')

/** YouTube 영상 snippet — 서재 탐방·세력도 공통 구조 */
export type YouTubeSnippetLike = {
  title: string
  description: string
  tags: string[]
  categoryId: string
  defaultLanguage: string
  defaultAudioLanguage: string
}

export type Yt = ReturnType<typeof google.youtube>

const SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.force-ssl',
]

/** 채널별 토큰 경로: ko → youtube_token.json, en → youtube_token_en.json */
export function tokenPath(channel: 'ko' | 'en' = 'ko') {
  return path.join(CREDENTIALS_DIR, channel === 'en' ? 'youtube_token_en.json' : 'youtube_token.json')
}

// ─── OAuth2 ─────────────────────────────────────────────

export async function createOAuth2() {
  const raw = JSON.parse(await readFile(CLIENT_SECRET_PATH, 'utf-8'))
  const creds = raw.installed ?? raw.web
  return new google.auth.OAuth2(creds.client_id, creds.client_secret, 'http://localhost:9876')
}

export async function authenticate(channel: 'ko' | 'en' = 'ko') {
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

export async function getAuthedClient(channel: 'ko' | 'en' = 'ko') {
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

// ─── 업로드 ─────────────────────────────────────────────

/** snippet 을 그대로 받아 영상을 업로드한다(메타 생성은 호출부 책임). */
export async function uploadVideoWithSnippet(
  yt: Yt,
  filePath: string,
  snippet: YouTubeSnippetLike,
  privacyStatus: string,
) {
  const fileSize = statSync(filePath).size
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

export async function uploadCaption(yt: Yt, videoId: string, srtPath: string, lang: 'ko' | 'en') {
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
export async function upsertCaption(yt: Yt, videoId: string, srtPath: string, lang: 'ko' | 'en') {
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

export async function setThumbnail(yt: Yt, videoId: string, thumbPath: string) {
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
