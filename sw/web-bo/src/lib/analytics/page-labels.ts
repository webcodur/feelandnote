import 'server-only'
import { createClient } from '@/lib/db/server'

const staticLabels: Record<string, string> = {
  '/': '홈', '/explore': '인물 탐색', '/explore/works': '작품 탐색',
  '/explore/works/curated': '기관 선정 작품', '/explore/timeline': '인물 연표',
  '/explore/ranking': '인물 순위', '/rest': '쉼터', '/about': '서비스 소개',
}

export async function loadPageLabels(paths: string[]): Promise<Record<string, string>> {
  const labels: Record<string, string> = {}
  const celebs = new Set<string>()
  const contents = new Set<string>()
  const identities = new Map<string, { kind: string; id: string }>()
  for (const path of paths) {
    const koreanPath = path === '/en' ? '/' : path.replace(/^\/en\//, '/')
    const suffix = path === '/en' || path.startsWith('/en/') ? ' · 영문' : ''
    if (staticLabels[koreanPath]) labels[path] = staticLabels[koreanPath] + suffix
    const match = koreanPath.match(/^\/(celeb|content)\/([^/]+)$/)
    if (!match) continue
    let id: string
    try { id = decodeURIComponent(match[2]) } catch { continue }
    identities.set(path, { kind: match[1], id })
    if (match[1] === 'celeb') celebs.add(id)
    else if (/^[0-9a-f-]{36}$/i.test(id)) contents.add(id)
  }
  if (!celebs.size && !contents.size) return labels
  try {
    const db = await createClient()
    const [celebRows, contentRows] = await Promise.all([
      celebs.size ? db.from('celebs').select('slug,nickname').in('slug', [...celebs]) : null,
      contents.size ? db.from('content_locales').select('content_id,title').eq('locale', 'ko').in('content_id', [...contents]) : null,
    ])
    const people = new Map(celebRows?.data?.map(row => [row.slug, row.nickname]))
    const works = new Map(contentRows?.data?.map(row => [row.content_id, row.title]))
    for (const [path, identity] of identities) {
      const name = identity.kind === 'celeb' ? people.get(identity.id) : works.get(identity.id)
      if (name) labels[path] = `${name}${path.startsWith('/en/') ? ' · 영문' : ''}`
    }
  } catch { /* 이름 조회 실패 시 GA 경로 자체로 보고서를 계속 제공한다. */ }
  return labels
}
