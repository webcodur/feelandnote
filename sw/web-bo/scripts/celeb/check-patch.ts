/**
 * 스펙트럼 재채점 패치 자가 검사(읽기 전용).
 *
 *   pnpm celeb:spectrum:check --file .tmp-spectrum-audit/patch-<slug>.json
 *   pnpm celeb:spectrum:check --file a.json --file b.json
 *
 * 조사자가 패치를 제출하기 전에 직접 돌린다. 판정 규칙은 `scripts/lib/spectrum-reason-check.ts`가 쥔다.
 * ERROR가 하나라도 있으면 exit 1이다. 반영 도구(`celeb:fill`)가 같은 규칙으로 다시 막으므로,
 * 여기서 통과시키지 못한 패치는 반영되지 않는다.
 *
 * `.env`가 있으면 DB에서 직군·사망 여부를 읽어 사적 신상 규칙을 반영 게이트와 같은 범위(생존 연예
 * 직군)에만 건다. 26.09.13까지는 이 정보 없이 전원에게 걸어, 갈릴레오의 「종교재판」·조이스의
 * 「교회 권위와 결별」처럼 사망한 역사 인물의 공적 기록이 ERROR로 잡혔다. DB를 못 읽으면 예전처럼
 * 전원에게 건다 — 느슨해지는 쪽이 아니라 엄격해지는 쪽으로 물러선다.
 *
 * 여기서 잡지 못하는 것은 사람이 본다 — 인물·작품 혼동, 동명이인, 정치 성향 과잉 추정,
 * 그룹·회사 명의 행위를 개인 근거로 쓴 것.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { config } from 'dotenv'
import { findContentIssues, personaToRows, type ReasonRow } from '../lib/spectrum-reason-check'

function argsOf(name: string): string[] {
  const out: string[] = []
  for (let i = 0; i < process.argv.length; i++) if (process.argv[i] === `--${name}`) out.push(process.argv[i + 1])
  return out.filter(Boolean)
}

type Meta = { profession: string | null; deceased: boolean }

/** DB가 닿으면 slug별 직군·사망 여부를, 아니면 빈 Map을 돌려준다. */
async function loadMeta(slugs: string[]): Promise<Map<string, Meta>> {
  const meta = new Map<string, Meta>()
  config({ path: path.resolve(process.cwd(), '.env'), quiet: true })
  const url = process.env.NEXT_PUBLIC_DB_API_URL
  const key = process.env.DB_SECRET_KEY
  if (!url || !key || !slugs.length) return meta
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
    for (let i = 0; i < slugs.length; i += 200) {
      const { data, error } = await db.from('celebs').select('slug,profession,death_date').in('slug', slugs.slice(i, i + 200))
      if (error) throw new Error(error.message)
      for (const c of data ?? []) meta.set(c.slug, { profession: c.profession ?? null, deceased: Boolean(c.death_date) })
    }
  } catch (e) {
    console.error(`직군·사망 여부를 DB에서 읽지 못해 사적 신상 규칙을 전원에게 건다: ${(e as Error).message}`)
  }
  return meta
}

async function main() {
  const files = argsOf('file')
  if (!files.length) {
    console.error('사용법: pnpm celeb:spectrum:check --file <패치.json> [--file <패치.json> ...]')
    process.exit(2)
  }

  // 먼저 모든 파일의 slug를 모아 한 번에 조회한다.
  const parsedFiles: Array<{ file: string; list: Array<Record<string, unknown>> | null; err?: string }> = []
  for (const file of files) {
    try {
      const parsed = JSON.parse(readFileSync(file, 'utf8'))
      parsedFiles.push({ file, list: Array.isArray(parsed) ? parsed : [parsed] })
    } catch (e) {
      parsedFiles.push({ file, list: null, err: (e as Error).message })
    }
  }
  const allSlugs = [...new Set(parsedFiles.flatMap((p) => (p.list ?? []).map((x) => String(x?.slug ?? '')).filter(Boolean)))]
  const meta = await loadMeta(allSlugs)
  if (meta.size) console.log(`직군·사망 여부 ${meta.size}/${allSlugs.length}명 DB 대조 — 사적 신상 규칙은 생존 연예 직군에만 건다`)

  let errors = 0
  let warns = 0
  for (const { file, list, err } of parsedFiles) {
    if (!list) { console.error(`${file} — 읽기 실패: ${err}`); errors++; continue }
    const rows: ReasonRow[] = []
    try {
      for (const p of list) {
        const slug = String(p?.slug ?? '')
        if (!slug) throw new Error('slug 없음')
        const spectrum = (p?.spectrum ?? p?.persona) as Record<string, unknown> | undefined
        if (!spectrum) throw new Error('spectrum 없음')
        // 성별은 무력 보정에만 쓰이고 내용 검수와 무관하다.
        rows.push(...personaToRows(slug, null, spectrum, meta.get(slug) ?? {}))
      }
    } catch (e) {
      console.error(`${file} — 읽기 실패: ${(e as Error).message}`)
      errors++
      continue
    }

    const issues = findContentIssues(rows, { yearWarning: true, strictFloor: true })
    const e = issues.filter((i) => i.level === 'ERROR')
    const w = issues.filter((i) => i.level === 'WARN')
    errors += e.length
    warns += w.length
    console.log(`\n${file} — 축 ${rows.length}개 · ERROR ${e.length} · WARN ${w.length}`)
    for (const i of [...e, ...w]) console.log(`  ${i.level} ${i.detail}${i.reason_ko ? ` — 「${i.reason_ko}」` : ''}`)
  }

  console.log(`\n합계 ERROR ${errors} · WARN ${warns}`)
  if (errors) {
    console.log('ERROR를 모두 고쳐야 반영된다. WARN(연도 없음)은 행적으로 다시 쓸 수 있는지 확인한다.')
    process.exit(1)
  }
}
main()
