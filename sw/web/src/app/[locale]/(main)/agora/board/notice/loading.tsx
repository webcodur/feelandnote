export default function Loading() {
  return (
    <div className="animate-pulse">
      {/* 쓰기 버튼 영역 */}
      <div className="flex justify-end mb-6">
        <div className="h-9 w-24 bg-white/5 rounded-lg" />
      </div>

      {/* 게시글 리스트 */}
      <div className="space-y-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 rounded-lg border border-white/5 bg-bg-card/40">
            <div className="flex-1 space-y-2">
              <div className="h-5 w-3/4 bg-white/5 rounded" />
              <div className="flex items-center gap-3">
                <div className="h-3 w-16 bg-white/5 rounded" />
                <div className="h-3 w-20 bg-white/5 rounded" />
              </div>
            </div>
            <div className="h-4 w-8 bg-white/5 rounded shrink-0" />
          </div>
        ))}
      </div>

      {/* 페이지네이션 */}
      <div className="flex justify-center gap-2 mt-8">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="w-8 h-8 bg-white/5 rounded" />
        ))}
      </div>
    </div>
  );
}
