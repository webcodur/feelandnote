/**
 * 셀럽 전 트랙 결손 전수 감사. 읽기 전용.
 *
 * 룰북(`docs/project/celeb/celeb-pipeline.md`) 티어 규칙에 따라 트랙별 필수 여부를 판정한다.
 * 가상독백(virtual_monologue)과 폐기 예정 감상 여정은 결손 판정에서 제외한다.
 * active 전환에는 전 티어 공통으로 avatar_url이 필수다.
 *
 * 실행:
 *   pnpm exec tsx scripts/audit-celeb-track-gaps.ts
 *   pnpm exec tsx scripts/audit-celeb-track-gaps.ts --json
 */

import path from 'node:path'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: path.resolve(process.cwd(), '.env'), quiet: true })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 없음')

const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

const PAGE = 1000
const INFLUENCE_AXES = ['political', 'strategic', 'tech', 'social', 'economic', 'cultural'] as const
const SPECTRUM_SCORES = [
  'temperance', 'diligence', 'reflection', 'courage', 'loyalty', 'benevolence', 'fairness',
  'humility', 'command', 'martial', 'intellect', 'charm',
  'pessimism_optimism', 'conservative_progressive', 'individual_social', 'cautious_bold',
] as const
const DIALOGUE_KEYS = [
  'greeting', 'roll_call', 'deploy', 'battle_win', 'battle_draw', 'battle_lose', 'clash_attack',
] as const

const blank = (v: unknown) => v === null || v === undefined || String(v).trim().length === 0

/**
 * 큰 jsonb 를 담은 테이블은 한 번에 1000행을 읽으면 조회 제한 시간에 걸린다.
 * `celeb_persona.persona`(인물당 16축 + 해설)와 `celeb_dialogues.lines`(대사 21개 × 2언어)가 그렇다.
 * 여러 레인이 동시에 감사를 돌릴 때 특히 잘 터지므로 그 두 테이블만 작은 단위로 나눠 읽는다.
 */
async function allRows<T>(
  table: string,
  select: string,
  orderKey: string,
  filter?: (q: any) => any,
  pageSize: number = PAGE,
): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += pageSize) {
    let q = db.from(table).select(select).order(orderKey, { ascending: true }).range(from, from + pageSize - 1)
    if (filter) q = filter(q)
    const { data, error } = await q
    if (error) throw new Error(`${table} 조회 실패: ${error.message}`)
    const rows = (data ?? []) as T[]
    out.push(...rows)
    if (rows.length < pageSize) break
  }
  return out
}

type Profile = Record<string, any>

async function main() {
  const profiles = await allRows<Profile>(
    'celebs',
    'id, slug, nickname, nickname_en, title, title_en, bio, bio_en, profession, nationality, birth_date, death_date, gender, publication_status, celeb_tier, speech_tone, avatar_url',
    'id',
  )
  const influence = await allRows<Record<string, any>>('celeb_influence', '*', 'celeb_id')
  const spectrum = await allRows<Record<string, any>>(
    'celeb_persona',
    `celeb_id, ${SPECTRUM_SCORES.join(', ')}, spectrum:persona`,
    'celeb_id',
    undefined,
    200,
  )
  const dialogues = await allRows<Record<string, any>>(
    'celeb_dialogues', 'celeb_id, lines, lines_en', 'celeb_id', undefined, 200,
  )

  const infById = new Map(influence.map((r) => [r.celeb_id, r]))
  const perById = new Map(spectrum.map((r) => [r.celeb_id, r]))
  const diaById = new Map(dialogues.map((r) => [r.celeb_id, r]))

  type Gap = { slug: string; nickname: string; tier: string; publicationStatus: string; gaps: string[] }
  const result: Gap[] = []

  for (const p of profiles) {
    const tier = p.celeb_tier ?? 'full'
    const gaps: string[] = []

    // ── basic (전 티어 공통)
    if (blank(p.nickname)) gaps.push('basic:nickname')
    if (blank(p.nickname_en)) gaps.push('basic:nickname_en')
    if (blank(p.slug)) gaps.push('basic:slug')
    if (blank(p.profession)) gaps.push('basic:profession')
    if (blank(p.title)) gaps.push('basic:title')
    if (blank(p.bio)) gaps.push('basic:bio')
    if (blank(p.avatar_url)) gaps.push('basic:avatar_url')
    // 직군·국적·성별은 전 티어 공통 결손이다. fiction 도 원전 근거로 채운다(집단·비인격만 예외).
    if (blank(p.nationality)) gaps.push('basic:nationality')
    if (p.gender === null || p.gender === undefined) gaps.push('basic:gender')
    // 생몰만 fiction 에서 특정 불가가 정상이라 결손으로 세지 않는다
    if (tier !== 'fiction') {
      if (blank(p.birth_date)) gaps.push('basic:birth_date')
    }

    const needsFullTracks = tier === 'full' || tier === 'light'

    if (needsFullTracks) {
      // ── i18n (full·light 필수)
      if (blank(p.title_en)) gaps.push('i18n:title_en')
      if (blank(p.bio_en)) gaps.push('i18n:bio_en')

      // ── speech tone
      if (blank(p.speech_tone)) gaps.push('speech:tone')

      // ── 영향력
      const inf = infById.get(p.id)
      if (!inf) gaps.push('influence:row')
      else {
        for (const a of INFLUENCE_AXES) {
          if (inf[a] === null || inf[a] === undefined) gaps.push(`influence:${a}`)
          if (blank(inf[`${a}_exp`])) gaps.push(`influence:${a}_exp`)
          if (blank(inf[`${a}_exp_en`])) gaps.push(`i18n:${a}_exp_en`)
        }
        if (inf.transhistoricity === null || inf.transhistoricity === undefined) gaps.push('influence:transhistoricity')
        if (blank(inf.transhistoricity_exp)) gaps.push('influence:transhistoricity_exp')
        if (blank(inf.transhistoricity_exp_en)) gaps.push('i18n:transhistoricity_exp_en')
      }

      // ── 스펙트럼
      const per = perById.get(p.id)
      if (!per) gaps.push('spectrum:row')
      else {
        for (const s of SPECTRUM_SCORES) {
          if (per[s] === null || per[s] === undefined) gaps.push(`spectrum:${s}`)
        }
        if (!per.spectrum || Object.keys(per.spectrum).length === 0) gaps.push('spectrum:detail')
        else {
          if (blank(per.spectrum.rationale_ko)) gaps.push('spectrum:rationale_ko')
          if (blank(per.spectrum.rationale_en)) gaps.push('spectrum:rationale_en')
        }
      }

      // ── 대사 21개 + quote
      const dia = diaById.get(p.id)
      if (!dia) gaps.push('speech:dialogue_row')
      else {
        const lines = (dia.lines ?? {}) as Record<string, any>
        const linesEn = (dia.lines_en ?? {}) as Record<string, any>
        if (blank(lines.quote)) gaps.push('speech:quote')
        // 명언은 확인된 실제 발언이 없으면 비워 두는 것이 규격이다. 한국어 원문이 없는데
        // 영문만 결손으로 세면 번역 담당이 채울 수 없는 항목을 영원히 물고 늘어진다.
        if (!blank(lines.quote) && blank(linesEn.quote)) gaps.push('i18n:quote_en')
        let missKo = 0
        let missEn = 0
        for (const k of DIALOGUE_KEYS) {
          const ko = Array.isArray(lines[k]) ? lines[k] : []
          const en = Array.isArray(linesEn[k]) ? linesEn[k] : []
          for (let i = 0; i < 3; i++) {
            if (blank(ko[i])) missKo++
            // 대사도 마찬가지 — 한국어가 있는 자리만 번역 대상이다
            if (!blank(ko[i]) && blank(en[i])) missEn++
          }
        }
        if (missKo > 0) gaps.push(`speech:lines_ko(${missKo})`)
        if (missEn > 0) gaps.push(`i18n:lines_en(${missEn})`)
      }
    }

    if (gaps.length > 0) {
      result.push({
        slug: p.slug ?? '',
        nickname: p.nickname ?? '',
        tier,
        publicationStatus: p.publication_status ?? '',
        gaps,
      })
    }
  }

  const fieldCount = new Map<string, number>()
  for (const r of result) {
    for (const g of r.gaps) {
      const norm = g.replace(/\(\d+\)$/, '')
      fieldCount.set(norm, (fieldCount.get(norm) ?? 0) + 1)
    }
  }
  const trackCount = new Map<string, number>()
  for (const r of result) {
    const tracks = new Set(r.gaps.map((g) => g.split(':')[0]))
    for (const t of tracks) trackCount.set(t, (trackCount.get(t) ?? 0) + 1)
  }
  const bucket = new Map<string, number>()
  for (const r of result) {
    const k = `${r.tier}/${r.publicationStatus}`
    bucket.set(k, (bucket.get(k) ?? 0) + 1)
  }

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({
      totalCelebs: profiles.length,
      withGaps: result.length,
      byTrack: Object.fromEntries([...trackCount].sort((a, b) => b[1] - a[1])),
      byField: Object.fromEntries([...fieldCount].sort((a, b) => b[1] - a[1])),
      byTierStatus: Object.fromEntries([...bucket].sort((a, b) => b[1] - a[1])),
      rows: result,
    }, null, 2))
    return
  }

  console.log(`CELEB 전체: ${profiles.length}명`)
  console.log(`결손 보유: ${result.length}명\n`)
  console.log('트랙별 결손 인물 수')
  for (const [k, c] of [...trackCount].sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(12)} ${c}`)
  console.log('\n필드별 결손 인물 수')
  for (const [k, c] of [...fieldCount].sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(34)} ${c}`)
  console.log('\n티어/상태별')
  for (const [k, c] of [...bucket].sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(20)} ${c}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
