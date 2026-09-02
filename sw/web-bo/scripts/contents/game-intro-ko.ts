/**
 * 게임 작품의 한국어 소개를 채운다.
 *
 * IGDB는 영문 요약만 준다. 화면은 그 영문을 국문 화면에도 그대로 실어 왔다.
 * 스팀에 올라온 게임은 퍼블리셔가 쓴 한국어 소개가 있으므로 그것을 먼저 받고,
 * 스팀에 없는 게임(콘솔 전용·국산 온라인·고전 아케이드)만 IGDB 영문을 옮긴다.
 *
 * 조달 순서
 *   1) 스팀 한국어 상점 소개 — 퍼블리셔가 직접 쓴 한국어라 그대로 쓴다
 *   2) IGDB 영문 요약 → agy(제미니)로 한국어 재작성
 *   둘 다 없으면 건너뛴다.
 *
 * 실행:
 *   pnpm contents:game-ko --limit 20 --dry
 *   pnpm contents:game-ko --limit 300
 */

import path from 'node:path'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { toKorean } from './lib/agy-korean'

config({ path: path.resolve(process.cwd(), '.env'), quiet: true })

const url = process.env.NEXT_PUBLIC_DB_API_URL
const key = process.env.DB_SECRET_KEY
const clientId = process.env.TWITCH_CLIENT_ID
const clientSecret = process.env.TWITCH_CLIENT_SECRET
if (!url || !key) throw new Error('NEXT_PUBLIC_DB_API_URL / DB_SECRET_KEY 없음')
if (!clientId || !clientSecret) throw new Error('TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET 없음')

const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

interface Target {
  contentId: string
  igdbId: number
  koTitle: string
  enTitle: string
  sources: Record<string, unknown>
}

async function igdbToken(): Promise<string> {
  const res = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
    { method: 'POST' },
  )
  if (!res.ok) throw new Error(`Twitch 토큰 발급 실패 ${res.status}`)
  return (await res.json()).access_token
}

async function igdbQuery<T>(token: string, endpoint: string, body: string): Promise<T[]> {
  const res = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
    method: 'POST',
    headers: { 'Client-ID': clientId!, Authorization: `Bearer ${token}` },
    body,
  })
  if (!res.ok) throw new Error(`IGDB ${endpoint} 실패 ${res.status} ${await res.text()}`)
  return res.json()
}

/**
 * IGDB id → 스팀 appid.
 *
 * 옛 `category` 필드는 사라지고 `external_game_source`가 그 자리를 잡았다(26.08.19 실측).
 * 소스 1에는 맥판처럼 상점 주소가 없는 항목도 섞여 있어 store 주소를 가진 것만 고른다.
 */
async function steamAppIds(token: string, igdbIds: number[]): Promise<Map<number, string>> {
  const out = new Map<number, string>()
  for (let i = 0; i < igdbIds.length; i += 200) {
    const chunk = igdbIds.slice(i, i + 200)
    const rows = await igdbQuery<{ game: number; uid: string; url?: string }>(
      token,
      'external_games',
      `fields game,uid,url; where game = (${chunk.join(',')}) & external_game_source = 1; limit 500;`,
    )
    for (const row of rows) {
      if (!row.url?.includes('store.steampowered.com')) continue
      if (!out.has(row.game)) out.set(row.game, row.uid)
    }
  }
  return out
}

async function igdbSummaries(token: string, igdbIds: number[]): Promise<Map<number, string>> {
  const out = new Map<number, string>()
  for (let i = 0; i < igdbIds.length; i += 200) {
    const chunk = igdbIds.slice(i, i + 200)
    const rows = await igdbQuery<{ id: number; summary?: string; storyline?: string }>(
      token,
      'games',
      `fields id,summary,storyline; where id = (${chunk.join(',')}); limit 500;`,
    )
    for (const row of rows) {
      const text = (row.summary || row.storyline || '').trim()
      if (text) out.set(row.id, text)
    }
  }
  return out
}

/** 스팀 상점의 한국어 소개. 짧은 소개가 없으면 상세 소개에서 태그를 걷어내 쓴다. */
async function steamKoIntro(appId: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://store.steampowered.com/api/appdetails?appids=${appId}&l=korean&cc=kr`,
      { headers: { 'Accept-Language': 'ko' } },
    )
    if (!res.ok) return null
    const entry = (await res.json())?.[appId]
    if (!entry?.success) return null

    const short = (entry.data?.short_description ?? '').trim()
    if (short) return short

    const about = (entry.data?.about_the_game ?? '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
    return about ? about.slice(0, 1200) : null
  } catch {
    return null
  }
}

async function loadTargets(limit: number): Promise<Target[]> {
  const { data, error } = await db
    .from('contents')
    .select('id, external_id, content_locales(locale, title, description, sources)')
    .eq('type', 'GAME')
  if (error) throw error

  const out: Target[] = []
  for (const row of data ?? []) {
    const locales = (row.content_locales ?? []) as {
      locale: string
      title: string | null
      description: string | null
      sources: Record<string, unknown> | null
    }[]
    const ko = locales.find((l) => l.locale === 'ko')
    const en = locales.find((l) => l.locale === 'en')
    if (!ko || ko.description?.trim()) continue

    const igdbId = Number(String(row.external_id ?? '').replace('igdb-', ''))
    if (!Number.isFinite(igdbId)) continue

    out.push({
      contentId: row.id as string,
      igdbId,
      koTitle: ko.title ?? '',
      enTitle: en?.title ?? '',
      sources: ko.sources ?? {},
    })
    if (out.length >= limit) break
  }
  return out
}

async function save(target: Target, text: string, sourceUrl: string) {
  const sources = { ...target.sources, description: sourceUrl }
  const { error } = await db
    .from('content_locales')
    .update({ description: text, sources })
    .eq('content_id', target.contentId)
    .eq('locale', 'ko')
  if (error) throw error
}

async function main() {
  const args = process.argv.slice(2)
  const limit = Number(args[args.indexOf('--limit') + 1]) || 20
  const dry = args.includes('--dry')

  const targets = await loadTargets(limit)
  console.log(`대상 ${targets.length}건 (dry=${dry})\n`)
  if (!targets.length) return

  const token = await igdbToken()
  const igdbIds = targets.map((t) => t.igdbId)
  const appIds = await steamAppIds(token, igdbIds)
  const summaries = await igdbSummaries(token, igdbIds)

  const stat = { steam: 0, translated: 0, none: 0, failed: 0 }

  for (const [index, target] of targets.entries()) {
    const label = `${index + 1}/${targets.length} ${target.koTitle || target.enTitle}`

    const appId = appIds.get(target.igdbId)
    if (appId) {
      const korean = await steamKoIntro(appId)
      if (korean) {
        console.log(`✔ ${label} | 스팀 | ${korean.slice(0, 55)}`)
        if (!dry) await save(target, korean, `https://store.steampowered.com/app/${appId}`)
        stat.steam += 1
        await new Promise((r) => setTimeout(r, 350))
        continue
      }
      await new Promise((r) => setTimeout(r, 350))
    }

    const summary = summaries.get(target.igdbId)
    if (!summary) {
      stat.none += 1
      console.log(`- ${label} | 원문 없음`)
      continue
    }

    const text = await toKorean('게임', target.koTitle || target.enTitle, summary, console.log)
    if (!text) {
      stat.failed += 1
      console.log(`✕ ${label} | 번역 반려`)
      continue
    }
    console.log(`✔ ${label} | IGDB→번역 | ${text.slice(0, 55)}`)
    if (!dry) await save(target, text, `https://www.igdb.com/games/${target.igdbId}`)
    stat.translated += 1
  }

  console.log(
    `\n완료 · 스팀 ${stat.steam} · IGDB→번역 ${stat.translated} · 원문없음 ${stat.none} · 반려 ${stat.failed}`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
