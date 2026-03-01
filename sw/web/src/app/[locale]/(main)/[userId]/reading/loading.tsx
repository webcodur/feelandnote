export default function Loading() {
  return (
    <div className="animate-pulse">
      {/* 컨트롤 패널 스켈레톤 */}
      <div className="mb-6">
        {/* PC: 중앙 정렬 제어판 */}
        <div className="hidden md:flex justify-center my-4">
          <div className="inline-grid w-full max-w-2xl border border-white/10 bg-black/40 rounded-lg overflow-hidden">
            <div className="flex items-center justify-center gap-3 px-6 py-2 bg-white/5 border-b border-white/5">
              <div className="h-[1px] w-12 bg-white/5" />
              <div className="h-5 w-20 bg-white/5 rounded" />
              <div className="h-[1px] w-12 bg-white/5" />
            </div>
            <div className="flex items-center gap-2 px-6 py-3">
              <div className="flex-1 h-9 bg-white/5 rounded-md" />
              <div className="h-9 w-9 bg-white/5 rounded-md" />
              <div className="h-9 w-16 bg-white/5 rounded-md" />
            </div>
          </div>
        </div>
        {/* 모바일: 검색+필터 */}
        <div className="md:hidden space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-10 bg-white/5 rounded-md" />
            <div className="h-10 w-10 bg-white/5 rounded-md" />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 w-16 bg-white/5 rounded-lg shrink-0" />
            ))}
          </div>
        </div>
      </div>

      {/* 콘텐츠 카드 그리드 스켈레톤 */}
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="aspect-[2/3] bg-bg-card rounded-xl" />
        ))}
      </div>
    </div>
  );
}
