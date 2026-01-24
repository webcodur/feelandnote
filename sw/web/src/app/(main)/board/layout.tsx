import BoardHeader from '@/components/features/board/shared/BoardHeader'
import SectionHeader from '@/components/ui/SectionHeader'

export default function BoardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container mx-auto px-4 py-8">
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
    </div>
  )
}
