import BoardHeader from '@/components/features/board/shared/BoardHeader'

export default function BoardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BoardHeader />
      <div className="max-w-3xl mx-auto">
        {children}
      </div>
    </>
  )
}
