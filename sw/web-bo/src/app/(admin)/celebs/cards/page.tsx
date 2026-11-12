import type { Metadata } from 'next'
import CelebsPageView, { type CelebsSearchParams } from '../components/CelebsPageView'
import CelebCardGrid from '../components/CelebCardGrid'

export const metadata: Metadata = {
  title: '셀럽 카드',
}

export default function CelebCardsPage({
  searchParams,
}: {
  searchParams: Promise<CelebsSearchParams>
}) {
  return <CelebsPageView searchParams={searchParams} view="cards" renderResults={({ celebs, resultSetKey, cardImage }) => (
    <CelebCardGrid key={resultSetKey} celebs={celebs} imageMode={cardImage} />
  )} />
}
