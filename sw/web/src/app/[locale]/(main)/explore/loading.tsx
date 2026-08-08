export default function ExploreLoading() {
  return (
    <div className="space-y-12 md:space-y-16 animate-pulse">
      {/* 목차 줄 */}
      <div className="flex items-center gap-2 w-max max-w-full mx-auto px-1 pb-1 overflow-hidden">
        {[1, 2, 3].map((i) => (
          <div key={i} className="shrink-0 flex items-baseline gap-1.5 px-1.5 py-1.5">
            <div className="w-4 h-4 rounded bg-white/10" />
            <div className="w-14 h-4 rounded bg-white/10" />
          </div>
        ))}
        <div className="shrink-0 w-px h-4 bg-white/10 mx-2" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="shrink-0 w-20 h-8 rounded-full bg-white/[0.03] border border-white/10" />
        ))}
      </div>

      {/* 프로필 구획 */}
      <section className="pt-6 md:pt-8">
        <div className="flex flex-col items-center text-center mb-6 md:mb-10 px-1 gap-2 md:gap-3">
          <div className="w-8 h-[2px] bg-white/10 rounded-full" />
          <div className="w-20 h-6 rounded bg-white/10" />
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-xl bg-white/[0.03] border border-white/[0.06]" />
          ))}
        </div>
      </section>

      {/* 성향 분석 구획 */}
      <section className="pt-6 md:pt-8">
        <div className="w-full h-px bg-gradient-to-r from-white/10 via-white/5 to-transparent mb-8 md:mb-12" />
        <div className="flex flex-col items-center text-center mb-6 md:mb-10 px-1 gap-2 md:gap-3">
          <div className="w-8 h-[2px] bg-white/10 rounded-full" />
          <div className="w-24 h-6 rounded bg-white/10" />
        </div>
        <div className="h-40 rounded-xl bg-white/[0.03] border border-white/[0.06]" />
      </section>

      {/* 세력도감 구획 */}
      <section className="pt-6 md:pt-8">
        <div className="w-full h-px bg-gradient-to-r from-white/10 via-white/5 to-transparent mb-8 md:mb-12" />
        <div className="flex flex-col items-center text-center mb-6 md:mb-10 px-1 gap-2 md:gap-3">
          <div className="w-8 h-[2px] bg-white/10 rounded-full" />
          <div className="w-20 h-6 rounded bg-white/10" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-xl bg-white/[0.03] border border-white/[0.06]" />
          ))}
        </div>
      </section>
    </div>
  )
}
