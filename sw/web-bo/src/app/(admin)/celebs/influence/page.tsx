import type { Metadata } from 'next'
import { getInfluenceList } from '@/actions/admin/influence'
import CelebSearchBar from '@/components/celeb/CelebSearchBar'
import InfluenceDashboard from './InfluenceDashboard'

export const metadata: Metadata = {
  title: '영향력 평가',
}

export default async function InfluencePage() {
  const list = await getInfluenceList()

  return (
    <div className="space-y-6">
      <CelebSearchBar
        className="max-w-xl"
        detailPathTemplate="/celebs/influence/[slug]"
      />

      <div>
        <h1 className="text-xl md:text-2xl font-bold text-text-primary">영향력 평가</h1>
        <p className="text-sm text-text-secondary mt-1">
          6개 영역 + 통시성 기준 영향력 분석 · {list.length}명 등록
        </p>
      </div>
      <InfluenceDashboard data={list} />
    </div>
  )
}
