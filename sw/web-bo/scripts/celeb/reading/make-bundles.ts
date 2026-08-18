/**
 * 인물 읽어보기 릴레이 묶음 생성기.
 * data/celeb/reading-relay/all-readings.json에서 원장(ledger.json)에 없는
 * 인물을 slug 순으로 8명씩 묶어 지정 폴더에 bundle-*.json으로 저장한다.
 *
 * 실행:
 *   pnpm exec tsx scripts/celeb/reading/make-bundles.ts --out=<폴더> --count=6 [--size=8]
 *   pnpm exec tsx scripts/celeb/reading/make-bundles.ts --out=<폴더> --slugs=<큐.json> --count=4
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const RELAY_DIR = resolve(process.cwd(), '../../data/celeb/reading-relay')

const args = process.argv.slice(2)
const outDir = args.find((a) => a.startsWith('--out='))?.slice(6)
// 다른 레인이 이미 붙잡고 있는 묶음이다. 그 안의 인물은 새 묶음에 넣지 않는다.
const busyDir = args.find((a) => a.startsWith('--busy='))?.slice(7)
// 품질 검사기가 뽑은 재작업 큐처럼 특정 인물만 다시 돌릴 때 쓴다. 원장 완료 여부를 무시한다.
const slugsFile = args.find((a) => a.startsWith('--slugs='))?.slice(8)
const startIndex = Number(args.find((a) => a.startsWith('--start='))?.slice(8) ?? 1)
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

// 처리 중인 묶음의 인물을 완료자와 같이 제외한다. 두 레인이 같은 사람을 붙들면 반영이 충돌한다.
if (busyDir && existsSync(busyDir)) {
  for (const f of readdirSync(busyDir).filter((n) => n.endsWith('.json'))) {
    for (const item of JSON.parse(readFileSync(resolve(busyDir, f), 'utf8'))) {
      done.add(item.slug)
    }
  }
}

const picked = slugsFile
  ? new Set<string>(
      JSON.parse(readFileSync(slugsFile, 'utf8')).map((e: string | { slug: string }) =>
        typeof e === 'string' ? e : e.slug,
      ),
    )
  : null

const remaining = picked
  ? all.filter((r: { celeb: { slug: string } }) => picked.has(r.celeb.slug))
  : all.filter((r: { celeb: { slug: string } }) => !done.has(r.celeb.slug))
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
  writeFileSync(resolve(outDir, `bundle-${String(startIndex + i).padStart(2, '0')}.json`), JSON.stringify(bundle, null, 1), 'utf8')
  made++
}
console.log(`남은 인물 ${remaining.length}명 중 묶음 ${made}개(${size}명 단위) 생성: ${outDir}`)
