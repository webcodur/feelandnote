/**
 * 배경이 안 지워진 아바타를 한 명씩 찾아낸다.
 *
 * 전수 검사를 하지 않는다. 정해진 순서(slug 오름차순)로 훑다가 첫 번째 대상을 만나면
 * 멈추고, 어디까지 봤는지를 커서 파일에 남긴다. 처리한 뒤 다시 실행하면 그 다음부터 잇는다.
 *
 *   pnpm tsx scripts/find-unnobg-avatar.ts              # 다음 대상 한 명 찾기
 *   pnpm tsx scripts/find-unnobg-avatar.ts --limit 300  # 한 번에 볼 최대 인원(기본 200)
 *   pnpm tsx scripts/find-unnobg-avatar.ts --skip       # 직전에 걸린 인물을 정상으로 보고 건너뛴다
 *   pnpm tsx scripts/find-unnobg-avatar.ts --reset      # 처음부터 다시 본다
 *   pnpm tsx scripts/find-unnobg-avatar.ts --status     # 진행 상황만 본다
 *
 * 판정
 *   - 알파 채널이 없다            → 배경 있음 (확정)
 *   - 가장자리가 불투명하다        → 배경 있음 (확정에 가까움)
 *   위 두 가지로만 잡는다. 인물이 화면을 꽉 채워 지울 배경이 거의 없는 경우(예: 큰 가발)를
 *   오검출하지 않도록, 전체 투명 비율이 아니라 테두리를 본다.
 *
 * 읽기 전용이다. DB와 R2를 수정하지 않는다.
 */
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { boPath, scriptsPath } from '../lib/paths'

const CURSOR_PATH = scriptsPath('avatar', 'nobg-cursor.json')

const argv = process.argv.slice(2)
const flag = (n: string) => argv.includes(n)
const value = (n: string) => {
  const i = argv.indexOf(n)
  return i >= 0 ? argv[i + 1] : undefined
}
const LIMIT = Number(value('--limit') ?? 200)

interface Cursor {
  /** 여기까지는 확인을 마쳤다(이 slug 포함) */
  lastChecked: string | null
  checkedCount: number
  /** 배경이 없는 게 정상이라 건너뛴 인물 */
  skipped: string[]
  updatedAt: string | null
}

function loadCursor(): Cursor {
  if (!existsSync(CURSOR_PATH)) {
    return { lastChecked: null, checkedCount: 0, skipped: [], updatedAt: null }
  }
  return JSON.parse(readFileSync(CURSOR_PATH, 'utf8')) as Cursor
}

function saveCursor(c: Cursor) {
  c.updatedAt = new Date().toISOString()
  writeFileSync(CURSOR_PATH, JSON.stringify(c, null, 2), 'utf8')
}

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {}
  for (const f of ['.env.local', '.env']) {
    const p = boPath(f)
    if (!existsSync(p)) continue
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m && !env[m[1]]) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
  return { ...env, ...(process.env as Record<string, string>) }
}

/** 테두리가 불투명하면 배경이 남아 있다고 본다 */
async function hasBackground(buf: Buffer): Promise<{ verdict: boolean; detail: string }> {
  const meta = await sharp(buf).metadata()
  if (!meta.hasAlpha) return { verdict: true, detail: '알파 채널 없음' }

  const N = 64
  const { data } = await sharp(buf)
    .ensureAlpha()
    .resize(N, N, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true })

  const alphaAt = (x: number, y: number) => data[(y * N + x) * 4 + 3]
  let edge = 0
  let edgeOpaque = 0
  for (let i = 0; i < N; i++) {
    for (const [x, y] of [
      [i, 0],
      [i, N - 1],
      [0, i],
      [N - 1, i],
    ] as const) {
      edge++
      if (alphaAt(x, y) > 200) edgeOpaque++
    }
  }
  const ratio = edgeOpaque / edge
  return {
    verdict: ratio > 0.5,
    detail: `테두리 불투명 ${(ratio * 100).toFixed(0)}%`,
  }
}

async function download(url: string): Promise<Buffer> {
  for (let a = 0; a < 5; a++) {
    const res = await fetch(url)
    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, 1200 * (a + 1)))
      continue
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return Buffer.from(await res.arrayBuffer())
  }
  throw new Error('429 반복')
}

async function main() {
  const cursor = loadCursor()

  if (flag('--reset')) {
    saveCursor({ lastChecked: null, checkedCount: 0, skipped: cursor.skipped, updatedAt: null })
    console.log('커서를 처음으로 되돌렸다. 건너뛴 인물 목록은 유지한다.')
    return
  }

  const env = loadEnv()
  const db = createClient(env.NEXT_PUBLIC_DB_API_URL, env.DB_SECRET_KEY)

  // 전체 대상 목록 (slug 오름차순 고정 — 순서가 흔들리면 커서가 무의미하다)
  const all: Array<{ id: string; slug: string; nickname: string | null; avatar_url: string }> = []
  for (let from = 0; ; from += 500) {
    const { data, error } = await db
      .from('celebs')
      .select('id, slug, nickname, avatar_url')
      .not('avatar_url', 'is', null)
      .order('slug', { ascending: true })
      .range(from, from + 499)
    if (error) throw new Error(error.message)
    if (!data?.length) break
    all.push(...(data as typeof all))
    if (data.length < 500) break
  }
  const targets = all.filter((t) => t.avatar_url?.trim())

  if (flag('--status')) {
    const idx = cursor.lastChecked ? targets.findIndex((t) => t.slug === cursor.lastChecked) : -1
    console.log(`전체 ${targets.length}명`)
    console.log(`확인 완료 ${idx + 1}명 (마지막: ${cursor.lastChecked ?? '없음'})`)
    console.log(`남은 인원 ${targets.length - (idx + 1)}명`)
    console.log(`정상으로 건너뛴 인물 ${cursor.skipped.length}명`)
    if (cursor.updatedAt) console.log(`마지막 확인 ${cursor.updatedAt}`)
    return
  }

  const startIdx = cursor.lastChecked
    ? targets.findIndex((t) => t.slug === cursor.lastChecked) + 1
    : 0

  if (flag('--skip')) {
    // 직전에 걸려 멈춘 인물 = 커서 다음 인물. 정상으로 판정하고 넘긴다.
    const stuck = targets[startIdx]
    if (!stuck) {
      console.log('건너뛸 대상이 없다.')
      return
    }
    cursor.skipped.push(stuck.slug)
    cursor.lastChecked = stuck.slug
    cursor.checkedCount++
    saveCursor(cursor)
    console.log(`${stuck.nickname ?? stuck.slug} 를 정상으로 보고 건너뛰었다.`)
    return
  }

  console.log(`전체 ${targets.length}명 · ${startIdx + 1}번째부터 확인 (최대 ${LIMIT}명)`)

  const skipped = new Set(cursor.skipped)
  let seen = 0
  for (let i = startIdx; i < targets.length && seen < LIMIT; i++, seen++) {
    const t = targets[i]
    if (skipped.has(t.slug)) {
      cursor.lastChecked = t.slug
      continue
    }
    let buf: Buffer
    try {
      buf = await download(t.avatar_url)
    } catch (e) {
      console.log(`  [건너뜀] ${t.slug}: ${(e as Error).message}`)
      cursor.lastChecked = t.slug
      cursor.checkedCount++
      continue
    }
    const { verdict, detail } = await hasBackground(buf)
    if (verdict) {
      saveCursor(cursor) // 걸린 인물 직전까지 저장 — 처리 후 재실행하면 이 인물부터 다시 본다
      console.log('')
      console.log(`배경이 남아 있다 — ${t.nickname ?? ''} (${t.slug})`)
      console.log(`  근거: ${detail}`)
      console.log(`  이미지: ${t.avatar_url}`)
      console.log(`  진행: ${i}/${targets.length} 확인 완료`)
      console.log('')
      console.log('  처리 후 다시 실행하면 이 인물부터 다시 본다.')
      console.log('  배경이 없는 게 정상이면 --skip 으로 넘긴다.')
      return
    }
    cursor.lastChecked = t.slug
    cursor.checkedCount++
  }

  saveCursor(cursor)
  const idx = targets.findIndex((t) => t.slug === cursor.lastChecked)
  if (idx + 1 >= targets.length) {
    console.log(`전원 확인 완료. 배경이 남은 인물은 없다.`)
  } else {
    console.log(`${seen}명 확인했고 걸린 인물은 없다. (${idx + 1}/${targets.length})`)
    console.log(`이어서 보려면 다시 실행한다.`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
