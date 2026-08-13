import type { Metadata } from 'next'
import PageHeader from '@/components/ui/PageHeader'
import Badge from '@/components/ui/Badge'
import ReadinessReport from './ReadinessReport'

export const metadata: Metadata = {
  title: '데이터 준비도 보고서',
}

export default function DataReadinessPage() {
  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        title="인물 데이터 준비도"
        description="전체 등록 인물의 필수 데이터 보유 상태를 집계한 보고서입니다. 갱신 버튼으로 최신 DB 기준으로 다시 그립니다."
        badge={<Badge variant="success">DB 구조 기준 · 외부 링크 미검사</Badge>}
      />
      <ReadinessReport />
    </div>
  )
}