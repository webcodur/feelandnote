/**
 * 인물 읽어보기(celeb_explanations) 품질 검사기.
 * 규칙 SSoT: docs/project/celeb/person-reading.md
 *
 * 등급을 DB에 저장하지 않는다. 실행 시점마다 전량을 다시 판정해
 * 위반자 큐를 산출한다. 기준이 진화하면 이 파일만 고친다.
 *
 * 실행 예:
 *   pnpm exec tsx scripts/audit-celeb-reading-quality.ts            # 집계만
 *   pnpm exec tsx scripts/audit-celeb-reading-quality.ts --queue=out.json  # 위반자 큐 저장
 *   pnpm exec tsx scripts/audit-celeb-reading-quality.ts --samples=8       # 위반 유형별 예시 출력
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

function loadEnv() {
  const file = resolve(process.cwd(), '.env')
  if (!existsSync(file)) return
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '')
    }
  }
}
loadEnv()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

type Row = {
  profile_id: string
  plain_text: string
  interpretive_title: string
  interpretive_text: string
  review_status: string | null
  published_at: string | null
}

type CelebRow = {
  id: string
  slug: string
  nickname: string
  publication_status: string
}

async function fetchAll<T>(table: string, select: string): Promise<T[]> {
  const rows: T[] = []
  const pageSize = 1000
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .order(select.split(',')[0])
      .range(from, from + pageSize - 1)
    if (error) throw error
    rows.push(...((data ?? []) as T[]))
    if (!data || data.length < pageSize) break
  }
  return rows
}

// ---------- 텍스트 유틸 ----------

function sentences(text: string): string[] {
  return text
    .replace(/\n+/g, ' ')
    .trim()
    .split(/(?<=다\.)\s+/)
    .filter(Boolean)
}

const PARTICLE = /(은|는|이|가|을|를|의|에|에서|으로|로|와|과|도|만|이다|다)$/

function contentTokens(text: string): Set<string> {
  const out = new Set<string>()
  for (const raw of text.match(/[가-힣A-Za-z0-9·]{2,}/g) ?? []) {
    const t = raw.replace(PARTICLE, '')
    if (t.length >= 2) out.add(t)
  }
  return out
}

// ---------- 위반 규칙 ----------
// V1 안내 마지막 문장이 공허한 평판·영향력 마무리
const VAGUE_ENDING =
  /(영향을 (주었다|미쳤다|끼쳤다)|자리 잡았다|알려져 있다|널리 알려졌다|이름을 (알렸다|남겼다)|평가받는다|평가된다|평가를 받(는다|았다)|기여했다|손꼽힌다|꼽힌다|사랑받(았다|는다)|주목받(았다|는다)|인정받(았다|는다)|기틀을 놓았다|바탕이 되었다|토대가 되었다)\.?$/

// V2 탐구 상투 어법(어디에 있든): 해석을 자처하는 빈 술어
const TRITE_INTERP = /(보여 ?준다|볼 수 있다|확인할 수 있다|인 셈이다|맞닿아 있다|놓여 있(다|었다))/

// V3 탐구 첫 문장이 안내 재요약: 첫 문장 내용어의 안내 중복률
const ECHO_FIRST_THRESHOLD = 0.6
// V4 탐구 전체의 새 정보 부족: 안내에 없는 내용어 비율
const NEW_INFO_THRESHOLD = 0.45

type Verdict = {
  slug: string
  nickname: string
  status: string
  published: boolean
  review: string | null
  violations: string[]
  tier: 'A_조사재작성' | 'B_문장교정' | null
  newInfoRatio: number
  echoFirstRatio: number
}

function judge(row: Row, celeb: CelebRow): Verdict {
  const violations: string[] = []
  const plain = row.plain_text ?? ''
  const interp = row.interpretive_text ?? ''

  const plainSents = sentences(plain)
  const interpSents = sentences(interp)
  const lastPlain = (plainSents.at(-1) ?? '').trim()

  if (VAGUE_ENDING.test(lastPlain)) violations.push('V1_안내_공허마무리')
  if (TRITE_INTERP.test(interp)) violations.push('V2_탐구_상투어법')

  const plainTok = contentTokens(plain)
  const firstInterpTok = contentTokens(interpSents[0] ?? '')
  let firstDup = 0
  for (const t of firstInterpTok) if (plainTok.has(t)) firstDup++
  const echoFirstRatio = firstInterpTok.size ? firstDup / firstInterpTok.size : 0
  if (firstInterpTok.size >= 4 && echoFirstRatio >= ECHO_FIRST_THRESHOLD) {
    violations.push('V3_탐구첫문장_안내재요약')
  }

  const interpTok = contentTokens(interp)
  let fresh = 0
  for (const t of interpTok) if (!plainTok.has(t)) fresh++
  const newInfoRatio = interpTok.size ? fresh / interpTok.size : 0
  if (interpTok.size >= 10 && newInfoRatio < NEW_INFO_THRESHOLD) {
    violations.push('V4_탐구_새정보부족')
  }

  // 처방 분류:
  //  A 조사 재작성 — 탐구가 안내를 재탕한다. 문장을 고쳐도 내용이 비어 있어 조사부터 다시 한다.
  //  B 문장 교정 — 내용은 새 사실을 담고 있고 상투 마무리·빈 술어만 문제다. 조사 없이 고친다.
  let tier: Verdict['tier'] = null
  if (violations.length > 0) {
    const echoey = violations.includes('V3_탐구첫문장_안내재요약') || violations.includes('V4_탐구_새정보부족')
    tier = echoey || newInfoRatio < 0.55 ? 'A_조사재작성' : 'B_문장교정'
  }

  return {
    slug: celeb.slug,
    nickname: celeb.nickname,
    status: celeb.publication_status,
    published: row.published_at != null,
    review: row.review_status,
    violations,
    tier,
    newInfoRatio: Math.round(newInfoRatio * 100) / 100,
    echoFirstRatio: Math.round(echoFirstRatio * 100) / 100,
  }
}

// ---------- 실행 ----------

async function main() {
  const args = process.argv.slice(2)
  const queuePath = args.find((a) => a.startsWith('--queue='))?.slice(8)
  const sampleCount = Number(args.find((a) => a.startsWith('--samples='))?.slice(10) ?? 0)

  const [celebs, readings] = await Promise.all([
    fetchAll<CelebRow>('celebs', 'id,slug,nickname,publication_status'),
    fetchAll<Row>(
      'celeb_explanations',
      'profile_id,plain_text,interpretive_title,interpretive_text,review_status,published_at',
    ),
  ])
  const celebById = new Map(celebs.map((c) => [c.id, c]))

  const verdicts: Verdict[] = []
  for (const row of readings) {
    const celeb = celebById.get(row.profile_id)
    if (!celeb) continue
    verdicts.push(judge(row, celeb))
  }

  const failed = verdicts.filter((v) => v.violations.length > 0)
  const byViolation: Record<string, number> = {}
  for (const v of failed) for (const code of v.violations) byViolation[code] = (byViolation[code] ?? 0) + 1

  const bucket = (list: Verdict[]) => ({
    total: list.length,
    failed: list.filter((v) => v.violations.length > 0).length,
  })

  const tierCount = (t: Verdict['tier'], pub?: boolean) =>
    failed.filter((v) => v.tier === t && (pub === undefined || v.published === pub)).length

  console.log(JSON.stringify({
    total: verdicts.length,
    failed: failed.length,
    tiers: {
      A_조사재작성: { total: tierCount('A_조사재작성'), published: tierCount('A_조사재작성', true) },
      B_문장교정: { total: tierCount('B_문장교정'), published: tierCount('B_문장교정', true) },
    },
    byViolation,
    published: bucket(verdicts.filter((v) => v.published)),
    activeUnpublished: bucket(verdicts.filter((v) => !v.published && v.status === 'active')),
    inactive: bucket(verdicts.filter((v) => v.status === 'inactive')),
    aiReviewedButFailed: failed.filter((v) => v.review === 'ai_reviewed').length,
  }, null, 2))

  if (sampleCount > 0) {
    for (const code of Object.keys(byViolation)) {
      console.log(`\n--- ${code} 예시 ---`)
      for (const v of failed.filter((x) => x.violations.includes(code)).slice(0, sampleCount)) {
        console.log(`  ${v.nickname} (${v.slug}) pub=${v.published ? 'Y' : 'N'} new=${v.newInfoRatio} echo=${v.echoFirstRatio}`)
      }
    }
  }

  if (queuePath) {
    // 공개 중인 인물 먼저, 그다음 활성 미게시 순으로 재작성 큐를 만든다.
    const rank = (v: Verdict) => (v.published ? 0 : v.status === 'active' ? 1 : 2)
    const queue = [...failed].sort((a, b) => rank(a) - rank(b) || a.slug.localeCompare(b.slug))
    writeFileSync(queuePath, JSON.stringify(queue, null, 2), 'utf8')
    console.log(`\n큐 저장: ${queuePath} (${queue.length}명)`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
