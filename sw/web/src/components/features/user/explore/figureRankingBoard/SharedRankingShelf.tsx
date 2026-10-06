import type { ReactNode } from 'react'
import { getSharedContents } from '@/actions/home/getSharedContents'
import { PendingBlock, RetryBlock } from '@/components/ui/pending'
import Lane from '@/components/ui/pending/Lane'
import RankingShelf from './RankingShelf'

interface Props {
  celebIds: string[]
  type?: string
  locale: string
  title: string
  media?: string
  accent: string
  empty?: ReactNode
}

async function Shelf({ celebIds, type, locale, title, media, accent, empty }: Props) {
  let works: Awaited<ReturnType<typeof getSharedContents>>
  try {
    works = await getSharedContents(celebIds, type, 10, locale)
  } catch {
    return <RetryBlock />
  }
  if (!works.length) return empty ?? null
  return <RankingShelf accent={accent} shelf={{ media, groups: [{
    id: 'shared', title, works: [...works].sort((a, b) => b.celeb_count - a.celeb_count).map(work => ({
      contentId: work.content_id, type: work.content_type,
      title: work.title ?? (locale === 'en' ? 'Untitled' : '제목 미상'),
      creator: work.creator, thumbnail: work.thumbnail_url,
    })),
  }] }} />
}

/** 순위를 먼저 보여 주고 공통 감상작은 독립적으로 채운다. 봇에는 완성 HTML을 유지한다. */
export default function SharedRankingShelf(props: Props) {
  return <Lane fallback={<PendingBlock variant="grid" count={10} />}><Shelf {...props} /></Lane>
}
