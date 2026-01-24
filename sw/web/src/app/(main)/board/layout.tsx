import BoardHeader from '@/components/features/board/shared/BoardHeader'

export default function BoardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <BoardHeader />
      {children}
    </div>
  )
}
