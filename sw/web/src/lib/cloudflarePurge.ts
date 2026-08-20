/*
  파일명: /lib/cloudflarePurge.ts
  기능: Cloudflare 앞단 캐시 퍼지 (URL 단위 · 전체)
  책임: 캐시 태그(도메인:식별자)를 실제 공개 URL로 바꿔 Cloudflare에서 지운다.
        환경변수(CLOUDFLARE_ZONE_ID·CLOUDFLARE_API_TOKEN)가 없거나 API 호출이 실패하면
        호출자가 캐시 무효화 미완료를 감지할 수 있는 실패 결과를 돌려준다.
        실패는 반드시 로그로 남긴다. 조용히 실패하면 옛 화면이 보관 기간 내내 나간다.
*/ // ------------------------------

import type { CloudflarePurgeResult } from '@feelandnote/shared/constants/cache-tags'
export type { CloudflarePurgeResult } from '@feelandnote/shared/constants/cache-tags'

const SITE_ORIGIN = 'https://feelandnote.com'
const PURGE_FILE_BATCH = 100 // Cloudflare Free: purge-by-URL request limit
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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
  const [domain, ...rest] = tag.split(':')
  const id = rest.join(':')

  // 목록 구성 변경 — 정적으로 캐시하는 목록 화면만
  if (!id) {
    if (domain === 'celebs') {
      return ['/explore/directory', '/en/explore/directory', '/explore/timeline', '/en/explore/timeline']
    }
    return []
  }
  if (id === '__all__') return []

  if (domain === 'celebs') {
    // uuid는 URL이 아니다. slug 태그(트리거가 함께 보낸다)만 URL이 된다
    if (UUID_RE.test(id)) return []
    return [`/celeb/${id}`, `/en/celeb/${id}`]
  }
  if (domain === 'contents') {
    // 작품 URL은 uuid·external_id 둘 다 허용된다 — 받은 식별자 그대로 만든다
    return [`/content/${id}`, `/en/content/${id}`]
  }
  return []
}

export function tagsToUrls(tags: readonly string[]): string[] {
  const urls = new Set<string>()
  for (const tag of tags) {
    for (const path of tagToUrls(tag)) urls.add(new URL(path, SITE_ORIGIN).toString())
  }
  return [...urls]
}

// SEO 이미지는 실제 avatar/thumbnail URL 해시를 `v` 캐시 키에 넣는다.
// 소스가 바뀌면 새 URL을 참조하므로 일반 태그 퍼지에서 저속한 prefix purge를 실행하지 않는다.

function requiresGlobalPurge(tags: readonly string[]): boolean {
  return tags.some((tag) => tag.split(':').slice(1).join(':') === '__all__')
}

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

/** `:__all__`이 있으면 전체를 한 번 지우고, 그 외에는 태그에 해당하는 URL만 지운다. */
export async function purgeCloudflareByTags(tags: readonly string[]): Promise<CloudflarePurgeResult> {
  if (requiresGlobalPurge(tags)) {
    const result = await callPurge({ purge_everything: true })
    if (!result.ok) return { urls: [], ok: false, status: result.status, mode: 'everything' }
    return { urls: [], ok: true, status: 'purged', mode: 'everything' }
  }

  const urls = tagsToUrls(tags)
  if (urls.length === 0) return { urls, ok: true, status: 'not_needed', mode: 'none' }
  if (!credentials()) {
    console.error('[cloudflare purge] CLOUDFLARE_ZONE_ID 또는 CLOUDFLARE_API_TOKEN이 없습니다.')
    return { urls, ok: false, status: 'not_configured', mode: 'targeted' }
  }

  let failedBatches = 0
  for (let i = 0; i < urls.length; i += PURGE_FILE_BATCH) {
    const result = await callPurge({ files: urls.slice(i, i + PURGE_FILE_BATCH) })
    if (!result.ok) failedBatches += 1
  }
  if (failedBatches > 0) {
    return { urls, ok: false, status: 'failed', mode: 'targeted', failedBatches }
  }
  return { urls, ok: true, status: 'purged', mode: 'targeted' }
}

/** 전체 퍼지. 상세 화면 모양을 바꾼 배포 뒤에만 쓴다(배포 후 워크플로). */
export async function purgeCloudflareEverything(): Promise<boolean> {
  return (await callPurge({ purge_everything: true })).ok
}
