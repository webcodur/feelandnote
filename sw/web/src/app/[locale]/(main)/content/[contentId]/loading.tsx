export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto animate-pulse">
      {/* 뒤로가기 버튼 */}
      <div className="flex items-center gap-2 mb-4">
        <div className="h-4 w-4 bg-white/5 rounded" />
        <div className="h-4 w-12 bg-white/5 rounded" />
      </div>

      <div className="space-y-4">
        {/* 1. 콘텐츠 정보 아코디언 (defaultOpen) */}
        <div className="rounded-xl border border-white/5 bg-bg-card/40 overflow-hidden">
          {/* 아코디언 헤더 */}
          <div className="flex items-center justify-between p-4 border-b border-white/5">
            <div className="h-5 w-24 bg-white/5 rounded" />
            <div className="h-4 w-4 bg-white/5 rounded" />
          </div>
          {/* 콘텐츠 정보: 썸네일 + 텍스트 */}
          <div className="p-4 md:p-6">
            <div className="flex gap-6">
              <div className="w-[120px] md:w-[140px] aspect-[2/3] bg-white/5 rounded-lg shrink-0" />
              <div className="flex-1 space-y-3">
                <div className="h-6 w-3/4 bg-white/5 rounded" />
                <div className="h-4 w-1/2 bg-white/5 rounded" />
                <div className="h-4 w-full bg-white/5 rounded mt-4" />
                <div className="h-4 w-full bg-white/5 rounded" />
                <div className="h-4 w-2/3 bg-white/5 rounded" />
                {/* 상태 버튼 */}
                <div className="flex gap-2 mt-4">
                  <div className="h-9 w-24 bg-white/5 rounded-lg" />
                  <div className="h-9 w-24 bg-white/5 rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. 내 리뷰 아코디언 (defaultOpen) */}
        <div className="rounded-xl border border-white/5 bg-bg-card/40 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-white/5">
            <div className="h-5 w-20 bg-white/5 rounded" />
            <div className="h-4 w-4 bg-white/5 rounded" />
          </div>
          <div className="p-4 md:p-6">
            <div className="h-8 w-full bg-white/5 rounded mb-3" />
            <div className="h-24 w-full bg-white/5 rounded" />
          </div>
        </div>

        {/* 3. 모든 리뷰 */}
        <div className="bg-bg-card border border-border rounded-xl p-4">
          {/* DecorativeLabel */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-white/10" />
            <div className="h-3 w-20 bg-white/5 rounded" />
            <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-white/10" />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3 py-3 border-b border-white/5 last:border-0">
                <div className="w-8 h-8 rounded-full bg-white/5 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-20 bg-white/5 rounded" />
                    <div className="h-3 w-12 bg-white/5 rounded" />
                  </div>
                  <div className="h-4 w-full bg-white/5 rounded" />
                  <div className="h-4 w-3/4 bg-white/5 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
