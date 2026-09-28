/**
 * 생성된 수식어(title·title_en)를 celebs에 반영한다.
 *
 * 입력: <dir>/<slug>.json — { slug, title, title_en }
 * 기본은 dry-run이며 --apply 때만 갱신한다. 저장 전 전체 title과의 중복을 표시한다.
 *
 * 사용 예:
 *   pnpm exec tsx scripts/celeb/i18n-title-apply.ts --in ../../data/celeb/gap-fill/titles/out
 *   pnpm exec tsx scripts/celeb/i18n-title-apply.ts --in <생성물폴더> --apply
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

function loadEnv() {
  for (const filename of ['.env.local', '.env']) {
    const file = resolve(process.cwd(), filename)
    if (!existsSync(file)) continue
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].replace(/^["']|["']$/g, '')
      }
    }
  }
}
loadEnv()

const arg = (flag: string, fallback = '') => {
  const i = process.argv.indexOf(flag)
  return i >= 0 ? (process.argv[i + 1] ?? fallback) : fallback
}
const APPLY = process.argv.includes('--apply')
const IN_DIR = arg('--in')
if (!IN_DIR) throw new Error('--in <생성물 폴더> 필요')

const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL!, process.env.DB_SECRET_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
})

type Item = { slug: string; title: string; title_en: string }

async function main() {
  const files = readdirSync(IN_DIR).filter((f) => f.endsWith('.json'))
  const items: Item[] = []
  for (const f of files) {
    const j = JSON.parse(readFileSync(join(IN_DIR, f), 'utf8'))
    if (j.slug && j.title && j.title_en) items.push(j)
  }
  console.log(`생성물 ${items.length}건`)

  // 대상 확인: slug 존재 + 기존 title이 비어 있는지(덮어쓰기 방지)
  const slugs = items.map((i) => i.slug)
  const existing = new Map<string, { title: string | null }>()
  for (let i = 0; i < slugs.length; i += 100) {
    const { data, error } = await db.from('celebs').select('slug,title').in('slug', slugs.slice(i, i + 100))
    if (error) throw new Error(error.message)
    for (const r of data ?? []) existing.set(r.slug, { title: r.title })
  }
  const missing = items.filter((i) => !existing.has(i.slug))
  const occupied = items.filter((i) => existing.get(i.slug)?.title)
  if (missing.length) console.log('슬러그 없음:', missing.map((i) => i.slug).join(','))
  if (occupied.length) {
    console.log(`기존 title 있음(건너뜀): ${occupied.length}건`)
    occupied.forEach((i) => console.log(`  ${i.slug}: ${existing.get(i.slug)?.title}`))
  }

  const todo = items.filter((i) => existing.has(i.slug) && !existing.get(i.slug)!.title)

  // 전체 title 중복 점검 (같은 소속 공유는 허용 — 표시만)
  const { data: all } = await db.from('celebs').select('slug,title').not('title', 'is', null).range(0, 9999)
  const titleCount = new Map<string, number>()
  for (const r of all ?? []) titleCount.set(r.title!, (titleCount.get(r.title!) ?? 0) + 1)
  const dupes = todo.filter((i) => titleCount.has(i.title))
  if (dupes.length) {
    console.log(`기존과 중복되는 title ${dupes.length}건(표시만):`)
    dupes.slice(0, 20).forEach((i) => console.log(`  ${i.slug}: ${i.title} (기존 ${titleCount.get(i.title)}건)`))
  }

  console.log(`적용 대상 ${todo.length}건 ${APPLY ? '(실반영)' : '(dry-run)'}`)
  if (!APPLY) return

  let ok = 0
  for (const it of todo) {
    const { error } = await db.from('celebs').update({ title: it.title, title_en: it.title_en }).eq('slug', it.slug)
    if (error) console.log(`ERR ${it.slug}: ${error.message}`)
    else ok++
  }
  console.log(`반영 ${ok}/${todo.length}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
