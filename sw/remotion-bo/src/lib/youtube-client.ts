/**
 * YouTube Data API v3 클라이언트 (googleapis 미사용, 순수 fetch)
 *
 * remotion/credentials/ 의 OAuth2 토큰을 재활용한다.
 * 토큰 만료 시 자동 갱신.
 */

import { readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const REMOTION_ROOT = path.join(process.cwd(), '..', 'remotion')
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

/** YouTube Data API GET */
export async function ytGet<T = unknown>(
  channel: 'ko' | 'en',
  endpoint: string,
  params: Record<string, string>,
): Promise<T | null> {
  const token = await getAccessToken(channel)
  if (!token) return null

  const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) return null
  return res.json()
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
