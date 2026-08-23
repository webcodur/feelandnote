/*
  파일명: /lib/cloudflarePurge.ts
  기능: Cloudflare 앞단 캐시 퍼지 (URL 단위 · 상세 경로 prefix · 비상 전체)
  책임: 캐시 태그(도메인:식별자)를 실제 공개 URL로 바꿔 Cloudflare에서 지운다.
        환경변수(CLOUDFLARE_ZONE_ID·CLOUDFLARE_API_TOKEN)가 없거나 API 호출이 실패하면
        호출자가 캐시 무효화 미완료를 감지할 수 있는 실패 결과를 돌려준다.
        실패는 반드시 로그로 남긴다. 조용히 실패하면 옛 화면이 보관 기간 내내 나간다.
*/ // ------------------------------

import {
  cacheTagToCloudflarePaths,
  cloudflarePurgeExpectationForTags,
  type CloudflarePurgeResult,
} from '@feelandnote/shared/constants/cache-tags'
export type { CloudflarePurgeResult } from '@feelandnote/shared/constants/cache-tags'

const PURGE_FILE_BATCH = 100 // Cloudflare Free: purge-by-URL request limit

type PurgeCallResult =
  | { ok: true }
  | { ok: false; status: 'not_configured' | 'failed' }

function credentials() {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID
  const token = process.env.CLOUDFLARE_API_TOKEN
  if (!zoneId || !token) return null
  return { zoneId, token }
}

/** 태그 하나를 그 항목이 사는 공개 URL들로 바꾼다. 캐시하지 않는 화면(허브·회원 등)은 빈 배열. */
export function tagToUrls(tag: string): string[] {
  return cacheTagToCloudflarePaths(tag)
}

export function tagsToUrls(tags: readonly string[]): string[] {
  return cloudflarePurgeExpectationForTags(tags).urls
}

/** bulk 태그를 Cloudflare가 요구하는 scheme 없는 상세 경로 prefix로 바꾼다. */
export function tagsToPrefixes(tags: readonly string[]): string[] {
  return cloudflarePurgeExpectationForTags(tags).prefixes
}

// SEO 이미지는 실제 avatar/thumbnail URL 해시를 `v` 캐시 키에 넣는다.
// 소스가 바뀌면 새 URL을 참조하므로 일반 태그 퍼지에서 저속한 prefix purge를 실행하지 않는다.

async function callPurge(body: Record<string, unknown>): Promise<PurgeCallResult> {
  const cred = credentials()
  if (!cred) {
    console.error('[cloudflare purge] CLOUDFLARE_ZONE_ID 또는 CLOUDFLARE_API_TOKEN이 없습니다.')
    return { ok: false, status: 'not_configured' }
  }
  try {
    const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${cred.zoneId}/purge_cache`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cred.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8_000),
    })
    const responseText = await res.text()
    if (!res.ok) {
      console.error('[cloudflare purge] 실패', res.status, responseText.slice(0, 300))
      return { ok: false, status: 'failed' }
    }

    try {
      const result = JSON.parse(responseText) as { success?: boolean }
      if (result.success !== true) {
        console.error('[cloudflare purge] 실패 응답', responseText.slice(0, 300))
        return { ok: false, status: 'failed' }
      }
    } catch {
      console.error('[cloudflare purge] 응답 해석 실패', responseText.slice(0, 300))
      return { ok: false, status: 'failed' }
    }

    return { ok: true }
  } catch (error) {
    console.error('[cloudflare purge] 호출 오류', error)
    return { ok: false, status: 'failed' }
  }
}

/**
 * 항목 태그는 exact URL로, `:__all__`은 의존 상세 경로 prefix로 지운다.
 * 데이터 태그는 어떤 경우에도 zone 전체 퍼지로 승격하지 않는다.
 */
export async function purgeCloudflareByTags(tags: readonly string[]): Promise<CloudflarePurgeResult> {
  const expectation = cloudflarePurgeExpectationForTags(tags)
  const { prefixes, urls } = expectation
  if (expectation.mode === 'none') {
    return { urls, ok: true, status: 'not_needed', mode: 'none' }
  }
  if (!credentials()) {
    console.error('[cloudflare purge] CLOUDFLARE_ZONE_ID 또는 CLOUDFLARE_API_TOKEN이 없습니다.')
    if (expectation.mode === 'prefix') {
      return { urls, prefixes, ok: false, status: 'not_configured', mode: 'prefix' }
    }
    return { urls, ok: false, status: 'not_configured', mode: 'targeted' }
  }

  let failedBatches = 0
  if (expectation.mode === 'prefix') {
    const result = await callPurge({ prefixes })
    if (!result.ok) failedBatches += 1
  }
  for (let i = 0; i < urls.length; i += PURGE_FILE_BATCH) {
    const result = await callPurge({ files: urls.slice(i, i + PURGE_FILE_BATCH) })
    if (!result.ok) failedBatches += 1
  }
  if (failedBatches > 0) {
    if (expectation.mode === 'prefix') {
      return { urls, prefixes, ok: false, status: 'failed', mode: 'prefix', failedBatches }
    }
    return { urls, ok: false, status: 'failed', mode: 'targeted', failedBatches }
  }
  if (expectation.mode === 'prefix') {
    return { urls, prefixes, ok: true, status: 'purged', mode: 'prefix' }
  }
  return { urls, ok: true, status: 'purged', mode: 'targeted' }
}

/** 비상용 zone 전체 퍼지. 데이터 태그 경로에서는 호출하지 않는다. */
export async function purgeCloudflareEverything(): Promise<boolean> {
  return (await callPurge({ purge_everything: true })).ok
}
