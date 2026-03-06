export default function Loading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* ProfileStatsSection */}
      <section className="space-y-6">
        {/* 요약 카드 4개 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-xl border border-white/5 bg-bg-card/40 p-4 flex flex-col items-center justify-center gap-2"
            >
              <div className="w-5 h-5 bg-white/5 rounded" />
              <div className="h-6 w-10 bg-white/5 rounded" />
              <div className="h-3 w-14 bg-white/5 rounded" />
            </div>
          ))}
        </div>

        {/* 카테고리별 현황 */}
        <div className="rounded-xl border border-white/5 bg-bg-card/40 p-6">
          <div className="h-3 w-24 bg-white/5 rounded mb-4" />
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between">
                  <div className="h-3 w-16 bg-white/5 rounded" />
                  <div className="h-3 w-8 bg-white/5 rounded" />
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {/* 월별 추이 + 평점 분포 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="rounded-xl border border-white/5 bg-bg-card/40 p-6">
              <div className="h-3 w-24 bg-white/5 rounded mb-4" />
              <div className="flex items-end gap-2 h-32">
                {[...Array(6)].map((_, j) => (
                  <div
                    key={j}
                    className="flex-1 bg-white/5 rounded-t"
                    style={{ height: `${30 + Math.random() * 60}%` }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ProfileSettingsSection */}
      <section className="space-y-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="rounded-xl border border-white/5 bg-bg-card/40 p-6">
            <div className="h-4 w-24 bg-white/5 rounded mb-4" />
            <div className="space-y-3">
              <div className="h-10 w-full bg-white/5 rounded" />
              <div className="h-10 w-full bg-white/5 rounded" />
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}
