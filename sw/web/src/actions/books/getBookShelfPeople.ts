'use server'

import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { selectAllPages, selectInChunks } from '@feelandnote/shared/lib/paginate'
import { cachedDetail } from '@/lib/cache'
import { createStaticClient } from '@/lib/db/static'
import { getFigureBookAssignmentsByContent } from '@/actions/figure-books/figureBookAssignments'

export interface BookShelfPerson {
  id: string
  slug: string
  name: string
  review?: string | null
  sourceUrl?: string | null
}

export interface BookShelfPeople {
  appeared: BookShelfPerson[]
  authored: BookShelfPerson[]
  read: BookShelfPerson[]
}

/** 작품 관계와 공개 감상 기록을 따로 읽는다. 구성원이라는 사실만으로 등장을 추정하지 않는다. */
export async function getBookShelfPeople(contentId: string, locale: string): Promise<BookShelfPeople> {
  return cachedDetail(CACHE_TAGS.CONTENTS, contentId, ['book-shelf-people-v1', contentId, locale], async () => {
    const db = createStaticClient()
    type RecordRow = { celeb_id: string; review: string | null; review_en?: string | null; source_url: string | null }
    const [assignments, records] = await Promise.all([
      getFigureBookAssignmentsByContent(contentId),
      selectAllPages<RecordRow>((from, to) => db.from('celeb_contents')
        .select(`celeb_id,review,${locale === 'en' ? 'review_en,' : ''}source_url`)
        .eq('content_id', contentId).eq('visibility', 'public').order('id').range(from, to)
        .overrideTypes<RecordRow[], { merge: false }>()),
    ])
    const ids = [...new Set([...assignments.map((row) => row.celeb_id), ...records.map((row) => row.celeb_id)])]
    type Profile = { id: string; slug: string | null; nickname: string | null; nickname_en: string | null }
    const profiles = await selectInChunks<Profile>(ids, (chunk) => db.from('celebs')
      .select('id,slug,nickname,nickname_en').in('id', chunk).eq('publication_status', 'active')
      .overrideTypes<Profile[], { merge: false }>())
    const byId = new Map(profiles.map((profile) => [profile.id, profile]))
    const person = (id: string): BookShelfPerson | null => {
      const profile = byId.get(id)
      if (!profile) return null
      return { id, slug: profile.slug || id, name: (locale === 'en' ? profile.nickname_en || profile.nickname : profile.nickname) || profile.slug || id }
    }
    const people: BookShelfPeople = { appeared: [], authored: [], read: [] }
    for (const row of assignments) {
      const target = person(row.celeb_id)
      if (target) people[row.relation_type === 'authored' ? 'authored' : 'appeared'].push(target)
    }
    for (const row of records) {
      const target = person(row.celeb_id)
      if (target) people.read.push({ ...target,
        review: locale === 'en' ? row.review_en || null : row.review,
        sourceUrl: row.source_url,
      })
    }
    return people
  }, { extraTags: [CACHE_TAGS.FIGURE_BOOKS, CACHE_TAGS.CELEBS] })
}
