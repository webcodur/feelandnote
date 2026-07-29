/**
 * YouTube Data API v3 클라이언트 (googleapis 미사용, 순수 fetch)
 *
 * remotion/credentials/ 의 OAuth2 토큰을 재활용한다.
 * 토큰 만료 시 자동 갱신.
 */

import { readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { REMOTION_ROOT } from '@feelandnote/shared/bo/remotion-root'

const CREDENTIALS_DIR = path.join(REMOTION_ROOT, 'credentials')
const CLIENT_SECRET_PATH = path.join(CREDENTIALS_DIR, 'client_secret.json')

function tokenPath(channel: 'ko' | 'en') {
  return path.join(CREDENTIALS_DIR, channel === 'en' ? 'youtube_token_en.json' : 'youtube_token.json')
}

type Tokens = {
  access_token: string
  refresh_token: string
  expiry_date: number
  token_type: string
}

type ClientCreds = { client_id: string; client_secret: string }

async function loadClientCreds(): Promise<ClientCreds | null> {
  try {
    const raw = JSON.parse(await readFile(CLIENT_SECRET_PATH, 'utf-8'))
    const creds = raw.installed ?? raw.web
    return { client_id: creds.client_id, client_secret: creds.client_secret }
  } catch {
    return null
  }
}

async function loadTokens(channel: 'ko' | 'en'): Promise<Tokens | null> {
  const tp = tokenPath(channel)
  if (!existsSync(tp)) return null
  try {
    return JSON.parse(await readFile(tp, 'utf-8'))
  } catch {
    return null
  }
}

async function refreshAccessToken(channel: 'ko' | 'en'): Promise<string | null> {
  const creds = await loadClientCreds()
  const tokens = await loadTokens(channel)
  if (!creds || !tokens?.refresh_token) return null

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: creds.client_id,
      client_secret: creds.client_secret,
      refresh_token: tokens.refresh_token,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) return null
  const data = await res.json()

  // 갱신된 토큰 저장
  const updated = {
    ...tokens,
    access_token: data.access_token,
    expiry_date: Date.now() + (data.expires_in ?? 3600) * 1000,
  }
  await writeFile(tokenPath(channel), JSON.stringify(updated, null, 2), 'utf-8')
  return data.access_token
}

/** 유효한 access_token 반환. 만료 시 자동 갱신. */
export async function getAccessToken(channel: 'ko' | 'en'): Promise<string | null> {
  const tokens = await loadTokens(channel)
  if (!tokens) return null

  // 만료 5분 전이면 갱신
  if (tokens.expiry_date && tokens.expiry_date < Date.now() + 5 * 60 * 1000) {
    return refreshAccessToken(channel)
  }
  return tokens.access_token
}

/** YouTube API 호출 실패 — 인증 없음·HTTP 오류. "응답이 비었다"와 구별하기 위한 타입. */
export class YouTubeApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message)
    this.name = 'YouTubeApiError'
  }
}

/**
 * YouTube Data API GET — 실패 시 예외를 던진다.
 *
 * ytGet 은 실패를 null 로 뭉개므로 "영상이 없다"와 "조회에 실패했다"가 구별되지 않는다.
 * 존재 여부로 판정하는 쪽(삭제 감지·기록 정리)은 반드시 이 함수를 써야 한다 —
 * 토큰 만료 한 번에 전 기록이 '삭제됨'으로 뒤집히는 사고를 막는다.
 */
export async function ytGetStrict<T = unknown>(
  channel: 'ko' | 'en',
  endpoint: string,
  params: Record<string, string>,
): Promise<T> {
  const token = await getAccessToken(channel)
  if (!token) throw new YouTubeApiError(`${channel.toUpperCase()} 채널 인증 토큰이 없거나 갱신에 실패했다`)

  const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new YouTubeApiError(
      `${channel.toUpperCase()} ${endpoint} 조회 실패 (HTTP ${res.status})${body ? ` — ${body.slice(0, 200)}` : ''}`,
      res.status,
    )
  }
  return res.json() as Promise<T>
}

/** YouTube Data API GET — 실패 시 null. 기존 호출부 호환용. 존재 판정에는 쓰지 마라(ytGetStrict 사용). */
export async function ytGet<T = unknown>(
  channel: 'ko' | 'en',
  endpoint: string,
  params: Record<string, string>,
): Promise<T | null> {
  try {
    return await ytGetStrict<T>(channel, endpoint, params)
  } catch {
    return null
  }
}

/** YouTube Data API PUT */
export async function ytPut<T = unknown>(
  channel: 'ko' | 'en',
  endpoint: string,
  params: Record<string, string>,
  body: unknown,
): Promise<T | null> {
  const token = await getAccessToken(channel)
  if (!token) return null

  const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)

  const res = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) return null
  return res.json()
}
