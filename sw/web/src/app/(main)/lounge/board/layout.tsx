import BoardHeader from '@/components/features/board/shared/BoardHeader'
import { PageHeroSection } from '@/components/ui'
import PageContainer from '@/components/layout/PageContainer'

export default function BoardLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageContainer>
      <PageHeroSection
        englishTitle="Community"
        title="게시판"
        description="공지사항을 확인하고 피드백을 남겨주세요"
      />

      <BoardHeader />

      <div className="max-w-3xl mx-auto">
        {children}
      </div>
    </PageContainer>
  )
}
