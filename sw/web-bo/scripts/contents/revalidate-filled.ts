/**
 * `content_locales.sources.description` 출처가 있는 작품 소개의 web 캐시를 복구한다.
 *
 * 평상시에는 contents.id와 external_id의 작품 태그만 비운다. 작품 소개는 인물 서고의
 * 초기 HTML에 포함되지 않으므로 인물 태그를 비우지 않는다. 전체 릴리스에서는
 * `--all-details`로 Next 상세 캐시 전량 만료와 Cloudflare 전체 퍼지를 한 번에 실행한다.
 */

import path from 'node:path'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import {
  MAX_TARGETED_TAGS,
  USAGE,
  buildDescriptionContentTags,
  makeRevalidationPlan,
  parseCliOptions,
  selectAllVerifiedPages,
  sendRevalidationTags,
  type ContentTargetRow,
} from './revalidate-filled-lib'

config({ path: path.resolve(process.cwd(), '.env'), quiet: true })

async function main() {
  const argv = process.argv.slice(2)
  if (argv.includes('--help')) {
    console.log(USAGE)
    return
  }

  const options = parseCliOptions(argv)

  if (options.mode === 'all-details') {
    const plan = makeRevalidationPlan(options)
    console.log('전체 릴리스 모드 · contents:__all__ 1개')
    console.log('주의 · 모든 작품 상세과 작품 데이터에 의존하는 인물 상세도 함께 만료됩니다.')
    console.log('주의 · 실실행하면 Cloudflare 전체 캐시도 즉시 한 번 퍼지합니다.')

    const result = await sendRevalidationTags({
      tags: plan.tags,
      dry: options.dry,
      webUrl: options.webUrl,
      secret: process.env.CRON_SECRET,
      expectedCloudflareMode: plan.cloudflareMode,
    })
    if (options.dry) {
      console.log(`dry-run 완료 · 예정 요청 ${result.plannedRequests} · 재검증 HTTP 0`)
      return
    }

    console.log(
      `전체 상세 캐시 처리 완료 · 요청 ${result.completedRequests}/${result.plannedRequests} · ` +
      `태그 ${result.confirmedTags}/${plan.tags.length} · Cloudflare 전체 퍼지 확인`,
    )
    return
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY가 필요합니다.')
  }

  const db = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const targetPages = await selectAllVerifiedPages<ContentTargetRow>(async (from, to) => {
    const { data, error, count } = await db
      .from('content_locales')
      .select('content_id, contents!inner(type, external_id)', { count: 'exact' })
      .eq('contents.type', options.type)
      .eq('locale', options.locale)
      .not('description', 'is', null)
      .not('sources->>description', 'is', null)
      // locale가 하나로 고정되므로 content_id는 이 조회의 고유·안정 정렬 키다.
      .order('content_id', { ascending: true })
      .range(from, to)

    return {
      data: data as ContentTargetRow[] | null,
      error,
      count,
    }
  })
  const targetSet = buildDescriptionContentTags(targetPages.rows)
  const plan = makeRevalidationPlan(options, targetSet.tags)

  console.log(
    `${options.type}/${options.locale} 대상 조회 완료 · DB 행 ` +
    `${targetPages.rows.length}/${targetPages.expectedCount} · 페이지 ${targetPages.pageCount}`,
  )
  console.log(
    `고유 작품 ${targetSet.contentIds.length} · external_id ${targetSet.externalIds.length} · ` +
    `태그 ${plan.tags.length} · 예상 Cloudflare URL 최대 ${plan.estimatedCloudflareUrls}`,
  )
  if (options.dry && plan.tags.length > MAX_TARGETED_TAGS && !options.allowLargeTargeted) {
    console.log(
      '주의 · 실실행은 대량 항목 퍼지를 차단합니다. 전체 릴리스에서는 ' +
      '--all-details --confirm-global-purge를 사용하세요.',
    )
  }

  const result = await sendRevalidationTags({
    tags: plan.tags,
    dry: options.dry,
    webUrl: options.webUrl,
    secret: process.env.CRON_SECRET,
    expectedCloudflareMode: plan.cloudflareMode,
  })

  if (options.dry) {
    console.log(`dry-run 완료 · 예정 요청 ${result.plannedRequests} · 재검증 HTTP 0`)
    return
  }
  console.log(
    `완료 · 요청 ${result.completedRequests}/${result.plannedRequests} · ` +
    `확인 태그 ${result.confirmedTags}/${plan.tags.length}`,
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
