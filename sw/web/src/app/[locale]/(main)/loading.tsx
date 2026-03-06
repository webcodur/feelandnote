export default function Loading() {
  return (
    <div className="pb-20 w-full flex flex-col items-center">
      {/* 1. Logo 히어로 영역 */}
      <div className="flex flex-col items-center pt-24 pb-6 md:pt-40 md:pb-10 w-full">
        <div className="h-12 w-64 bg-white/5 rounded animate-pulse" />
        <div className="h-3 w-40 bg-white/5 rounded animate-pulse mt-4" />

        <div className="mt-10 md:mt-14 flex flex-col items-center gap-3 px-6">
          <div className="h-5 w-56 bg-white/5 rounded animate-pulse" />
          <div className="h-4 w-48 bg-white/5 rounded animate-pulse" />
        </div>

        <div className="mt-20 md:mt-32 flex flex-col items-center gap-6 w-full">
          <div className="w-10 h-10 rounded-full bg-white/5 animate-pulse" />
          <div className="w-[200px] h-[1px] bg-white/10" />
        </div>
      </div>

      {/* 2. 탭 영역 */}
      <div className="w-full max-w-lg mx-auto px-4 mt-14 md:mt-20 mb-8 md:mb-12">
        <div className="flex justify-center gap-8 border-b border-white/10 pb-3">
          <div className="h-7 w-24 bg-white/5 rounded animate-pulse" />
          <div className="h-7 w-24 bg-white/5 rounded animate-pulse" />
        </div>
      </div>

      {/* 3. 오늘의 인물 (figure 탭 기본) */}
      <div className="w-full max-w-5xl mx-auto px-4 py-8">
        {/* TodayFigureSection */}
        <div className="text-center mb-6 md:mb-10">
          <div className="flex justify-center mb-2">
            <div className="h-6 w-36 bg-accent/10 rounded-full animate-pulse" />
          </div>
          <div className="flex justify-center mb-4">
            <div className="h-4 w-56 bg-white/5 rounded animate-pulse" />
          </div>

          {/* 인물 아바타 + 이름 + 직군 */}
          <div className="flex flex-col items-center gap-5 py-6 px-10">
            <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-white/5 animate-pulse" />
            <div className="flex flex-col items-center gap-2">
              <div className="h-9 w-32 md:h-10 md:w-40 bg-white/5 rounded animate-pulse" />
              <div className="h-6 w-16 bg-white/5 rounded animate-pulse" />
            </div>
          </div>

          <div className="flex justify-center mt-2">
            <div className="h-4 w-64 bg-white/5 rounded animate-pulse" />
          </div>
        </div>

        {/* SectionHeader (LEGACY) */}
        <div className="text-center py-6 sm:py-8 mb-6">
          <div className="flex justify-center mb-3">
            <div className="h-[1px] w-12 bg-white/10" />
          </div>
          <div className="flex justify-center mb-2">
            <div className="h-3 w-16 bg-white/5 rounded animate-pulse" />
          </div>
          <div className="flex justify-center mb-2">
            <div className="h-8 w-64 bg-white/5 rounded animate-pulse" />
          </div>
          <div className="flex justify-center mb-3">
            <div className="h-4 w-48 bg-white/5 rounded animate-pulse" />
          </div>
          <div className="flex justify-center">
            <div className="h-[1px] w-12 bg-white/10" />
          </div>
        </div>

        {/* ContentTypeSummary */}
        <div className="flex justify-center gap-3 mb-8">
          {['w-12', 'w-14', 'w-12', 'w-10', 'w-12'].map((w, i) => (
            <div key={i} className={`h-8 ${w} bg-white/5 rounded-full animate-pulse`} />
          ))}
        </div>

        {/* 콘텐츠 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-[280px] bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>

        {/* HomeNavigationLinks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-12">
          <div className="h-32 bg-white/5 rounded-xl animate-pulse" />
          <div className="h-32 bg-white/5 rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  )
}
