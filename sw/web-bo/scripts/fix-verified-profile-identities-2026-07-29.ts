/**
 * 대사 결손 조사 중 원출처로 확인된 프로필 신원 오류 2건을 안전하게 교정한다.
 *
 * 기본은 dry-run이며 --apply에서만 쓴다.
 * 실행:
 *   pnpm exec tsx scripts/fix-verified-profile-identities-2026-07-29.ts
 *   pnpm exec tsx scripts/fix-verified-profile-identities-2026-07-29.ts --apply
 */

import path from 'node:path'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { revalidateWebCache } from '../src/lib/revalidate-web'

config({ path: path.resolve(process.cwd(), '.env'), quiet: true })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 없음')

const db = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const corrections = [
  {
    id: '42396e8b-c074-4d48-a264-259f1a9f9635',
    slug: 'dalai-lama',
    field: 'wikidata_qid',
    before: 'Q25252',
    after: 'Q17293',
    source: 'https://www.wikidata.org/wiki/Q17293',
  },
  {
    id: '2c5a27ba-04e7-4e70-be0e-4bd01492ea09',
    slug: 'daniel-kahneman',
    field: 'death_date',
    before: null,
    after: '2024-03-27',
    source: 'https://www.princeton.edu/news/2024/03/28/daniel-kahneman-pioneering-behavioral-psychologist-nobel-laureate-and-giant-field',
  },
  {
    id: '57a10935-9bc6-46f6-8d81-567586c88887',
    slug: 'kang-full',
    field: 'wikidata_qid',
    before: null,
    after: 'Q626859',
    source: 'https://www.wikidata.org/wiki/Q626859',
  },
  {
    id: '4886d0ac-e220-4f48-9ee3-6c1bbf8d84da',
    slug: 'bong-jin-kim',
    field: 'wikidata_qid',
    before: null,
    after: 'Q108043679',
    source: 'https://www.wikidata.org/wiki/Q108043679',
  },
  {
    id: '860f68f6-c379-44b6-b01d-ae8a65220dcd',
    slug: 'magic-johnson',
    field: 'wikidata_qid',
    before: 'Q170498',
    after: 'Q134183',
    source: 'https://www.wikidata.org/wiki/Q134183',
  },
] as const

async function main() {
  const apply = process.argv.includes('--apply')

  for (const correction of corrections) {
    const { data: current, error: readError } = await db
      .from('celebs')
      .select('id,slug,wikidata_qid,death_date')
      .eq('id', correction.id)
      .single()

    if (readError || !current) {
      throw new Error(`${correction.slug}: 프로필 조회 실패: ${readError?.message ?? '행 없음'}`)
    }
    if (current.slug !== correction.slug) {
      throw new Error(`${correction.slug}: ID가 다른 slug를 가리킴 (${current.slug})`)
    }

    const value = current[correction.field]
    if (value === correction.after) {
      console.log(`SKIP ${correction.slug}.${correction.field}: 이미 ${correction.after}`)
      continue
    }
    if (value !== correction.before) {
      throw new Error(
        `${correction.slug}.${correction.field}: 기대한 기존값 ${String(correction.before)}와 다름 (${String(value)})`,
      )
    }

    console.log(
      `${apply ? 'APPLY' : 'DRY-RUN'} ${correction.slug}.${correction.field}: ${String(correction.before)} -> ${correction.after}`,
    )
    console.log(`  source: ${correction.source}`)

    if (!apply) continue

    let update = db
      .from('celebs')
      .update({ [correction.field]: correction.after })
      .eq('id', correction.id)
      .eq('slug', correction.slug)

    update = correction.before === null
      ? update.is(correction.field, null)
      : update.eq(correction.field, correction.before)

    const { data: updated, error: updateError } = await update
      .select('id,slug,wikidata_qid,death_date')
      .single()

    if (updateError || !updated || updated[correction.field] !== correction.after) {
      throw new Error(`${correction.slug}: 조건부 갱신 실패: ${updateError?.message ?? '검증값 불일치'}`)
    }
  }

  if (apply) {
    await revalidateWebCache(CACHE_TAGS.CELEBS)
    console.log(`CACHE invalidated: ${CACHE_TAGS.CELEBS}`)
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
