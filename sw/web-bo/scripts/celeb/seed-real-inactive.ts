/**
 * new-figures 원장의 실존 인물을 inactive/light로 일괄 등록한다.
 *
 * faction/seed-inactive.ts(허구 인물 선등록)와 같은 직접 insert 경로를 쓰되
 * 실존 인물용으로 celeb_reality를 레코드 값(REAL/BOTH)에서 가져온다.
 * slug는 nickname_en 기반 generated slug + slug_suffix 충돌 해소로
 * createCeleb와 같은 규칙을 따른다.
 *
 * 기본은 dry-run이다. --apply를 붙여야 DB를 바꾼다.
 * --apply 성공 뒤 원장 레코드에 status='registered'·celeb_id·slug를 기록한다.
 *
 * 등록 전 검사는 celeb:dup-check와 같은 규칙(@feelandnote/shared/lib/celeb-identity)이다.
 * 이름·다른 이름·qid·생몰일로 기존 인물(과 같은 실행의 앞 레코드)과 겹치면 conflict로 남기고,
 * 다른 사람으로 확인했으면 레코드의 distinct_from에 그 slug를 적는다. 이름·수식어 규칙 오류도 conflict다.
 * 레코드의 aliases·wikidata_qid는 함께 저장한다.
 *
 * 실행:
 *   pnpm --dir sw/web-bo tsx scripts/celeb/seed-real-inactive.ts --dir ../../data/celeb/new-figures
 *   pnpm --dir sw/web-bo tsx scripts/celeb/seed-real-inactive.ts --dir ../../data/celeb/new-figures --apply
 */

import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { config } from 'dotenv'
import { createClient, type SupabaseClient as DatabaseClient } from '@supabase/supabase-js'
import {
  celebNameIssues,
  celebTitleIssues,
  cleanCelebAliases,
  findCelebDuplicates,
  type CelebIdentityRow,
} from '@feelandnote/shared/lib/celeb-identity'
import { assertRouteSafeCelebSlug, previewGeneratedCelebSlug } from '../../src/lib/celeb-slug'
import { reserveGeneratedSlug } from '../faction/seed-inactive-contract'

config({ path: resolve(process.cwd(), '.env'), quiet: true })

type LedgerRecord = {
  nickname: string
  nickname_en?: string | null
  /** 다른 이름(검색 전용). 기준은 celeb-01-01-profile-facts.md 「다른 이름」 */
  aliases?: string[] | null
  wikidata_qid?: string | null
  /** 이름·생몰이 겹치지만 다른 사람으로 확인한 기존 slug. 여기 적은 프로필과의 일치는 막지 않는다 */
  distinct_from?: string[] | null
  profession?: string | null
  nationality?: string | null
  gender?: boolean | null
  birth_date?: string | null
  death_date?: string | null
  bio?: string | null
  bio_en?: string | null
  title?: string | null
  title_en?: string | null
  headline?: string | null
  headline_en?: string | null
  celeb_reality?: 'REAL' | 'BOTH' | 'FICTION'
  status?: string
  celeb_id?: string
  slug?: string
}

type ExistingProfile = CelebIdentityRow & {
  id: string
  slug: string | null
  nickname: string | null
  nickname_en: string | null
  publication_status: string | null
}

type PlannedSeed = {
  kind: 'create' | 'conflict' | 'already'
  file: string
  record: LedgerRecord
  celebId: string | null
  slug: string | null
  slugSuffix: string | null
  reason: string
}

const argValue = (name: string): string | null => {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] ?? null : null
}

const emptyToNull = (value: string | null | undefined) => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

async function allRows<T>(
  client: DatabaseClient,
  table: string,
  select: string,
): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client
      .from(table)
      .select(select)
      .order('id')
      .range(from, from + 999)
    if (error) throw error
    rows.push(...((data ?? []) as unknown as T[]))
    if (!data || data.length < 1000) return rows
  }
}

async function main() {
  const dir = argValue('--dir')
  if (!dir) throw new Error('--dir <원장 디렉터리>가 필요합니다.')
  const apply = process.argv.includes('--apply')

  const url = process.env.NEXT_PUBLIC_DB_API_URL
  const key = process.env.DB_SECRET_KEY
  if (!url || !key) throw new Error('DB 접속 env(NEXT_PUBLIC_DB_API_URL/DB_SECRET_KEY)가 필요합니다.')
  const client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

  const dirPath = resolve(process.cwd(), dir)
  const files = readdirSync(dirPath).filter((name) => name.endsWith('.json'))
  const ledgerByFile = new Map<string, LedgerRecord[]>()
  const records: { file: string; record: LedgerRecord }[] = []
  for (const file of files) {
    const parsed = JSON.parse(readFileSync(resolve(dirPath, file), 'utf8')) as unknown
    if (!Array.isArray(parsed)) continue
    const arr = parsed as LedgerRecord[]
    ledgerByFile.set(file, arr)
    for (const record of arr) records.push({ file, record })
  }
  if (records.length === 0) throw new Error('등록 대상 레코드가 없습니다.')

  const profiles = await allRows<ExistingProfile>(
    client,
    'celebs',
    'id,slug,nickname,nickname_en,aliases,wikidata_qid,birth_date,death_date,publication_status',
  )
  // 이번 실행에서 만들 인물도 뒤따르는 레코드의 중복 대상에 넣는다(원장 안의 같은 사람)
  const pool: ExistingProfile[] = profiles.filter((row) => row.publication_status !== 'deleted')
  const occupiedSlugs = new Set(profiles.flatMap((row) => (row.slug ? [row.slug] : [])))

  const plans: PlannedSeed[] = records.map(({ file, record }) => {
    if (record.status === 'registered') {
      return { kind: 'already', file, record, celebId: record.celeb_id ?? null, slug: record.slug ?? null, slugSuffix: null, reason: '원장에 registered로 표시됨' }
    }
    const nickname = record.nickname?.trim()
    const nicknameEn = record.nickname_en?.trim()
    if (!nickname || !nicknameEn) {
      return { kind: 'conflict', file, record, celebId: null, slug: null, slugSuffix: null, reason: 'nickname/nickname_en 누락' }
    }
    const ruleErrors = [...celebNameIssues(record), ...celebTitleIssues(record)].filter((issue) => issue.level === 'error')
    if (ruleErrors.length) {
      return { kind: 'conflict', file, record, celebId: null, slug: null, slugSuffix: null, reason: ruleErrors.map((issue) => issue.message).join('; ') }
    }
    // 이름·다른 이름·qid·생몰일로 같은 사람을 찾는다. 다른 사람으로 확인한 slug는 distinct_from에 적어 넘긴다
    const distinct = new Set(record.distinct_from ?? [])
    const matches = findCelebDuplicates(record, pool).filter((match) => !(match.row.slug && distinct.has(match.row.slug)))
    if (matches.length) {
      const [dup] = matches
      return {
        kind: 'conflict', file, record, celebId: dup.row.id, slug: dup.row.slug, slugSuffix: null,
        reason: `기존 인물과 ${matches.map((match) => `${match.reasons.join('+')} 일치 (${match.row.slug ?? match.row.id})`).join(', ')} — 다른 사람이면 distinct_from에 slug를 적는다`,
      }
    }
    let baseSlug = ''
    try {
      baseSlug = assertRouteSafeCelebSlug(previewGeneratedCelebSlug(nicknameEn))
    } catch {
      return { kind: 'conflict', file, record, celebId: null, slug: null, slugSuffix: null, reason: 'slug 생성 불가' }
    }
    const reserved = reserveGeneratedSlug(baseSlug, occupiedSlugs)
    const celebId = crypto.randomUUID()
    pool.push({ ...record, id: celebId, slug: reserved.slug, nickname, nickname_en: nicknameEn, publication_status: 'inactive' })
    return {
      kind: 'create', file, record,
      celebId, slug: reserved.slug, slugSuffix: reserved.slugSuffix,
      reason: '신규 등록',
    }
  })

  const creates = plans.filter((plan) => plan.kind === 'create')
  for (const plan of plans) {
    if (plan.kind !== 'create') console.log(`[${plan.kind.toUpperCase()}] ${plan.record.nickname} — ${plan.reason}`)
  }
  const reconcile = process.argv.includes('--reconcile')
  console.log(JSON.stringify({
    mode: reconcile ? 'RECONCILE' : apply ? 'APPLY' : 'DRY-RUN',
    totals: {
      create: creates.length,
      conflict: plans.filter((plan) => plan.kind === 'conflict').length,
      already: plans.filter((plan) => plan.kind === 'already').length,
    },
  }, null, 2))

  // --reconcile: --apply가 insert 뒤 검증에서 죽은 경우 등, 이름으로 이미 들어간 행을
  // 찾아 검증하고 원장 status/celeb_id/slug만 기록한다. insert는 하지 않는다.
  if (reconcile) {
    const matched = plans.filter((plan) => plan.kind === 'conflict' && plan.celebId)
    const matchedIds = matched.map((plan) => plan.celebId!)
    const found: { id: string; slug: string | null; publication_status: string | null }[] = []
    for (let i = 0; i < matchedIds.length; i += 100) {
      const { data, error } = await client
        .from('celebs')
        .select('id,slug,publication_status')
        .in('id', matchedIds.slice(i, i + 100))
      if (error) throw error
      found.push(...((data ?? []) as typeof found))
    }
    const byId = new Map(found.map((row) => [row.id, row]))
    for (const plan of matched) {
      const row = byId.get(plan.celebId!)
      if (!row) throw new Error(`${plan.record.nickname}: 매칭된 행을 찾지 못했습니다.`)
      plan.slug = row.slug
      plan.record.status = 'registered'
      plan.record.celeb_id = plan.celebId!
      plan.record.slug = row.slug!
    }
    for (const [file, arr] of ledgerByFile) {
      writeFileSync(resolve(dirPath, file), JSON.stringify(arr, null, 1) + '\n')
    }
    console.log(`RECONCILE OK: ${matched.length}명 원장 기록`)
    return
  }
  if (!apply) return

  // createCeleb와 같은 규칙으로 삽입 — slug는 generated column(nickname_en+slug_suffix).
  const CHUNK = 50
  for (let i = 0; i < creates.length; i += CHUNK) {
    const chunk = creates.slice(i, i + CHUNK)
    const { data, error } = await client
      .from('celebs')
      .insert(chunk.map((plan) => ({
        id: plan.celebId,
        nickname: plan.record.nickname!.trim(),
        nickname_en: plan.record.nickname_en!.trim(),
        slug_suffix: plan.slugSuffix,
        aliases: cleanCelebAliases(plan.record.aliases, plan.record),
        wikidata_qid: emptyToNull(plan.record.wikidata_qid),
        profession: emptyToNull(plan.record.profession),
        title: emptyToNull(plan.record.title),
        title_en: emptyToNull(plan.record.title_en),
        headline: emptyToNull(plan.record.headline),
        headline_en: emptyToNull(plan.record.headline_en),
        nationality: emptyToNull(plan.record.nationality),
        gender: plan.record.gender ?? null,
        birth_date: emptyToNull(plan.record.birth_date),
        death_date: emptyToNull(plan.record.death_date),
        bio: emptyToNull(plan.record.bio),
        bio_en: emptyToNull(plan.record.bio_en),
        is_verified: false,
        publication_status: 'inactive',
        celeb_tier: 'light',
        celeb_reality: plan.record.celeb_reality ?? 'REAL',
      })))
      .select('id,slug')
    if (error) throw error
    const returnedSlugs = new Map((data ?? []).map((row) => [row.id, row.slug]))
    for (const plan of chunk) {
      if (returnedSlugs.get(plan.celebId!) !== plan.slug) {
        throw new Error(`${plan.record.nickname}: 생성 slug ${returnedSlugs.get(plan.celebId!)}가 계획 ${plan.slug}와 다릅니다.`)
      }
    }
    // celeb_metrics 초기화 — createCeleb와 동일(트리거가 이미 만들었어도 upsert는 무해).
    const { error: metricsError } = await client.from('celeb_metrics').upsert(
      chunk.map((plan) => ({ celeb_id: plan.celebId, follower_count: 0, content_count: 0 })),
    )
    if (metricsError) throw metricsError
    console.log(`inserted ${Math.min(i + CHUNK, creates.length)}/${creates.length}`)
  }

  // readback 검증 — .in()은 헤더 한도 때문에 청크로 나눈다.
  const ids = creates.map((plan) => plan.celebId!)
  const back: { id: string; slug: string | null; publication_status: string | null; celeb_tier: string | null }[] = []
  for (let i = 0; i < ids.length; i += 100) {
    const { data, error } = await client
      .from('celebs')
      .select('id,slug,publication_status,celeb_tier,celeb_reality')
      .in('id', ids.slice(i, i + 100))
    if (error) throw error
    back.push(...((data ?? []) as typeof back))
  }
  const byId = new Map((back ?? []).map((row) => [row.id, row]))
  const bad = creates.filter((plan) => {
    const row = byId.get(plan.celebId!)
    return !row || row.slug !== plan.slug || row.publication_status !== 'inactive' || row.celeb_tier !== 'light'
  })
  if (bad.length > 0) throw new Error(`readback 불일치: ${bad.map((plan) => plan.record.nickname).join(', ')}`)
  console.log(`READBACK OK: ${creates.length}명`)

  // 원장에 status/celeb_id/slug를 기록한다.
  const byFile = new Map<string, PlannedSeed[]>()
  for (const plan of creates) {
    if (!byFile.has(plan.file)) byFile.set(plan.file, [])
    byFile.get(plan.file)!.push(plan)
  }
  for (const [file, filePlans] of byFile) {
    const arr = ledgerByFile.get(file)!
    const planByName = new Map(filePlans.map((plan) => [plan.record.nickname, plan]))
    for (const record of arr) {
      const plan = planByName.get(record.nickname)
      if (!plan) continue
      record.status = 'registered'
      record.celeb_id = plan.celebId!
      record.slug = plan.slug!
    }
    writeFileSync(resolve(dirPath, file), JSON.stringify(arr, null, 1) + '\n')
  }
  console.log(`ledger updated: ${byFile.size} files`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
