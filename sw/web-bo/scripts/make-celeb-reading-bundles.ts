/**
 * 인물 읽어보기 릴레이 묶음 생성기.
 * data/celeb/reading-relay/all-readings.json에서 원장(ledger.json)에 없는
 * 인물을 slug 순으로 8명씩 묶어 지정 폴더에 bundle-*.json으로 저장한다.
 *
 * 실행:
 *   pnpm exec tsx scripts/make-celeb-reading-bundles.ts --out=<폴더> --count=6 [--size=8]
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const RELAY_DIR = resolve(process.cwd(), '../../data/celeb/reading-relay')

const args = process.argv.slice(2)
const outDir = args.find((a) => a.startsWith('--out='))?.slice(6)
const count = Number(args.find((a) => a.startsWith('--count='))?.slice(8) ?? 6)
const size = Number(args.find((a) => a.startsWith('--size='))?.slice(7) ?? 8)
if (!outDir) throw new Error('--out=<폴더> 가 필요하다.')

const all = JSON.parse(readFileSync(resolve(RELAY_DIR, 'all-readings.json'), 'utf8'))
const ledgerPath = resolve(RELAY_DIR, 'ledger.json')
const done = new Set<string>(
  existsSync(ledgerPath)
    ? JSON.parse(readFileSync(ledgerPath, 'utf8'))
        .filter((e: { result: string }) => e.result === '반영' || e.result.startsWith('보류'))
        .map((e: { slug: string }) => e.slug)
    : [],
)

const remaining = all.filter((r: { celeb: { slug: string } }) => !done.has(r.celeb.slug))
mkdirSync(outDir, { recursive: true })

let made = 0
for (let i = 0; i < count && i * size < remaining.length; i++) {
  const bundle = remaining.slice(i * size, (i + 1) * size).map((r: Record<string, unknown>) => {
    const celeb = r.celeb as Record<string, unknown>
    return {
      slug: celeb.slug,
      name: celeb.nickname,
      name_en: celeb.nickname_en,
      profession: celeb.profession,
      tier: celeb.celeb_tier,
      birth: celeb.birth_date,
      death: celeb.death_date,
      updated_at: r.updated_at,
      plain: r.plain_text,
      title: r.interpretive_title,
      interp: r.interpretive_text,
      plain_en: r.plain_text_en,
      title_en: r.interpretive_title_en,
      interp_en: r.interpretive_text_en,
    }
  })
  writeFileSync(resolve(outDir, `bundle-${String(i + 1).padStart(2, '0')}.json`), JSON.stringify(bundle, null, 1), 'utf8')
  made++
}
console.log(`남은 인물 ${remaining.length}명 중 묶음 ${made}개(${size}명 단위) 생성: ${outDir}`)
