export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* 요약 카드 4개 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-white/5 bg-bg-card p-4 text-center">
            <div className="w-5 h-5 bg-white/5 rounded mx-auto mb-2" />
            <div className="h-8 w-12 bg-white/5 rounded mx-auto mb-1" />
            <div className="h-3 w-16 bg-white/5 rounded mx-auto" />
          </div>
        ))}
      </div>

      {/* 카테고리별 현황 */}
      <div className="rounded-lg border border-white/5 bg-bg-card p-6">
        <div className="h-4 w-28 bg-white/5 rounded mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <div className="flex justify-between mb-1">
                <div className="h-4 w-12 bg-white/5 rounded" />
                <div className="h-3 w-20 bg-white/5 rounded" />
              </div>
              <div className="h-2 w-full bg-white/5 rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* 월별 추이 + 평점 분포 2열 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 월별 추이 */}
        <div className="rounded-lg border border-white/5 bg-bg-card p-6">
          <div className="h-4 w-28 bg-white/5 rounded mb-4" />
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-3 w-8 bg-white/5 rounded" />
                <div className="flex-1 h-5 bg-white/5 rounded" />
                <div className="h-3 w-6 bg-white/5 rounded" />
              </div>
            ))}
          </div>
        </div>
        {/* 평점 분포 */}
        <div className="rounded-lg border border-white/5 bg-bg-card p-6">
          <div className="h-4 w-20 bg-white/5 rounded mb-4" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-20 h-3 bg-white/5 rounded" />
                <div className="flex-1 h-4 bg-white/5 rounded" />
                <div className="w-6 h-3 bg-white/5 rounded" />
              </div>
            ))}
          </div>
          <div className="h-3 w-24 bg-white/5 rounded mx-auto mt-3" />
        </div>
      </div>
    </div>
  );
}
