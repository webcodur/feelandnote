import { notFound } from 'next/navigation'
import { isDeveloperMode } from '@/lib/developer-mode'
import { getCelebFeed } from '@/actions/home/getCelebFeed'
import MediaObjectsPreview from '@/components/lab/MediaObjectsPreview'

export const metadata = { title: '매체별 작품 카드 | Lab' }

export default async function Page() {
  if (!isDeveloperMode()) notFound()
  const feeds = await Promise.all(['BOOK', 'MUSIC', 'GAME', 'VIDEO'].map(contentType => getCelebFeed({ contentType, limit: 40 })))
  const samples = feeds.map(feed => {
    const withCovers = feed.reviews.filter(review => review.content.thumbnail_url)
    return [...new Map((withCovers.length ? withCovers : feed.reviews).map(review => [review.content.id, review])).values()].slice(0, 2)
  })
  const reviews = [0, 1].flatMap(index => samples.flatMap(group => group[index] ? [group[index]] : []))
  return <MediaObjectsPreview reviews={reviews} />
}
