import BoardHeader from '@/components/features/board/shared/BoardHeader'
import SectionHeader from '@/components/ui/SectionHeader'
import PageContainer from '@/components/layout/PageContainer'

export default function BoardLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageContainer>
      <SectionHeader
        variant="hero"
        englishTitle="Community"
        title="커뮤니티"
        description="공지사항을 확인하고 피드백을 남겨주세요"
      />

      <BoardHeader />

      <div className="max-w-3xl mx-auto">
        {children}
      </div>
    </PageContainer>
  )
}
