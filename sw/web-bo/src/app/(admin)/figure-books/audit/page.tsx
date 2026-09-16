import type { Metadata } from 'next'
import PageHeader from '@/components/ui/PageHeader'
import Badge from '@/components/ui/Badge'
import FigureBookAuditReport from './FigureBookAuditReport'

export const metadata: Metadata = {
  title: '인물 도서 감사',
}

export default function FigureBookAuditPage() {
  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        title="인물 도서 감사"
        description="인물과 도서가 얼마나 이어져 있고 그중 무엇이 서비스에 공개되는지 집계합니다. 측정 버튼으로 최신 DB 기준을 다시 셉니다."
        badge={<Badge variant="success">DB 읽기 전용 · 파일로 남기지 않음</Badge>}
      />
      <FigureBookAuditReport />
    </div>
  )
}
