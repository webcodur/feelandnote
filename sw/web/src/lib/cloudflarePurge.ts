/*
  파일명: /lib/cloudflarePurge.ts
  기능: Cloudflare 앞단 캐시 퍼지 (URL 단위 · 전체)
  책임: 캐시 태그(도메인:식별자)를 실제 공개 URL로 바꿔 Cloudflare에서 지운다.
        환경변수(CLOUDFLARE_ZONE_ID·CLOUDFLARE_API_TOKEN)가 없으면 아무 일도 하지 않는다 —
        Cloudflare 앞단이 없는 환경(로컬·프리뷰·도입 전)에서 조용히 건너뛰기 위함이다.
        실패는 반드시 로그로 남긴다. 조용히 실패하면 옛 화면이 보관 기간 내내 나간다.
*/ // ------------------------------

const SITE_ORIGIN = 'https://feelandnote.com'
const PURGE_BATCH = 30 // Cloudflare purge_cache files 한도
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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
    return [`/celeb/${id}`, `/en/celeb/${id}`, `/seo-image/celeb/${id}`]
  }
  if (domain === 'contents') {
    // 작품 URL은 uuid·external_id 둘 다 허용된다 — 받은 식별자 그대로 만든다
    return [`/content/${id}`, `/en/content/${id}`, `/seo-image/content/${id}`]
  }
  return []
}

export function tagsToUrls(tags: readonly string[]): string[] {
  const urls = new Set<string>()
  for (const tag of tags) for (const path of tagToUrls(tag)) urls.add(`${SITE_ORIGIN}${path}`)
  return [...urls]
}

async function callPurge(body: Record<string, unknown>): Promise<boolean> {
  const cred = credentials()
  if (!cred) return true
  try {
    const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${cred.zoneId}/purge_cache`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cred.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8_000),
    })
    if (!res.ok) {
      console.error('[cloudflare purge] 실패', res.status, (await res.text()).slice(0, 300))
      return false
    }
    return true
  } catch (error) {
    console.error('[cloudflare purge] 호출 오류', error)
    return false
  }
}

/** 태그에 해당하는 URL만 지운다. 지울 URL이 없거나 설정이 없으면 true. */
export async function purgeCloudflareByTags(tags: readonly string[]): Promise<{ urls: string[]; ok: boolean }> {
  const urls = tagsToUrls(tags)
  if (urls.length === 0 || !credentials()) return { urls, ok: true }
  let ok = true
  for (let i = 0; i < urls.length; i += PURGE_BATCH) {
    ok = (await callPurge({ files: urls.slice(i, i + PURGE_BATCH) })) && ok
  }
  return { urls, ok }
}

/** 전체 퍼지. 상세 화면 모양을 바꾼 배포 뒤에만 쓴다(배포 후 워크플로). */
export async function purgeCloudflareEverything(): Promise<boolean> {
  return callPurge({ purge_everything: true })
}
