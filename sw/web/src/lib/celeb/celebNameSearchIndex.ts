import 'server-only'

/*
  파일명: /lib/celeb/celebNameSearchIndex.ts
  기능: 공개 인물 이름 전부를 읽어 이름 검색에 넘기는 서버 쪽 입구
  책임: 이름 목록을 캐시에서 읽고, 같은 목록이면 만들어 둔 색인을 다시 쓴다.
        판정 규칙은 celebNameSearch.ts가 쥔다.

  ⚠️ unstable_cache 콜백 안에서 부르지 않는다. 중첩된 unstable_cache는 안쪽 캐시를 건너뛰어
     검색할 때마다 이름 전량(1,000행씩 여러 번)을 DB에서 다시 읽는다.
*/ // ------------------------------

import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { selectAllPages } from '@feelandnote/shared/lib/paginate'
import { cachedList } from '@/lib/cache'
import { createStaticClient } from '@/lib/db/static'
import {
  buildCelebNameIndex,
  searchCelebNameIndex,
  type CelebNameEntry,
  type CelebNameHit,
  type CelebNameIndex,
} from './celebNameSearch'

/** 이름 검색어로 받는 최대 길이. 이보다 긴 이름은 없다 */
const MAX_QUERY_CHARS = 60

async function fetchNameRows(): Promise<CelebNameEntry[]> {
  const db = createStaticClient()
  // 1,000행 상한에 걸리므로 나눠 받는다. 고유 키(id)로 정렬해야 페이지 사이에 빠지는 사람이 없다
  return selectAllPages<CelebNameEntry>((from, to) => db
    .from('celebs')
    .select('id, nickname, nickname_en, aliases, view_count')
    .eq('publication_status', 'active')
    .order('id')
    .range(from, to))
}

/** 공개 인물의 이름 목록. 실존 축은 가리지 않는다 — 가상 인물도 검색되어야 하고, 목록 필터는 호출한 쪽이 건다 */
function getNameRows(): Promise<CelebNameEntry[]> {
  // v2: 다른 이름(aliases)을 싣는다
  return cachedList(CACHE_TAGS.CELEBS, ['celeb-name-search-rows-v2'], fetchNameRows)
}

/* 캐시는 부를 때마다 새로 풀어 낸 배열을 준다. 목록 내용이 같으면 색인을 다시 만들지 않는다 */
let built: { fingerprint: string; index: CelebNameIndex } | null = null

function fingerprintOf(rows: readonly CelebNameEntry[]): string {
  // FNV-1a — 내용이 바뀌었는지만 알면 된다. 보안 용도가 아니다
  let hash = 0x811c9dc5
  for (const row of rows) {
    const key = `${row.id}\u0000${row.nickname ?? ''}\u0000${row.nickname_en ?? ''}\u0000${(row.aliases ?? []).join('\u0002')}\u0000${row.view_count ?? 0}\u0001`
    for (let index = 0; index < key.length; index++) {
      hash ^= key.charCodeAt(index)
      hash = Math.imul(hash, 0x01000193)
    }
  }
  return `${rows.length}:${hash >>> 0}`
}

function indexOf(rows: readonly CelebNameEntry[]): CelebNameIndex {
  const fingerprint = fingerprintOf(rows)
  if (built?.fingerprint !== fingerprint) built = { fingerprint, index: buildCelebNameIndex(rows) }
  return built.index
}

/** 검색어에 걸리는 공개 인물을 가까운 순으로 돌려준다. 조회 실패는 던진다 */
export async function findCelebsByName(query: string): Promise<CelebNameHit[]> {
  const trimmed = query.trim().slice(0, MAX_QUERY_CHARS)
  if (!trimmed) return []
  return searchCelebNameIndex(indexOf(await getNameRows()), trimmed)
}
