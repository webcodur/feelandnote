export default function CelebPageLoading() {
  return (
    <div className="space-y-10 md:space-y-16 animate-pulse">
      {/* 프로필 섹션 스켈레톤 */}
      <section className="max-w-3xl mx-auto space-y-4">
        {/* 라벨 */}
        <div className="h-4 w-20 bg-white/5 rounded mx-auto" />

        {/* 모바일 레이아웃 */}
        <div className="md:hidden">
          <hr className="border-accent-dim/30 mb-5" />
          <div className="flex flex-col items-center gap-4">
            <div className="w-28 h-28 rounded-full bg-white/5" />
            <div className="space-y-2 w-full flex flex-col items-center">
              <div className="h-6 w-32 bg-white/5 rounded" />
              <div className="h-4 w-24 bg-white/5 rounded" />
              <div className="h-3 w-20 bg-white/5 rounded" />
            </div>
          </div>
        </div>

        {/* PC 레이아웃 */}
        <div className="hidden md:block">
          <div className="flex gap-8 items-start">
            <div className="w-40 h-40 rounded-full bg-white/5 flex-shrink-0" />
            <div className="flex-1 space-y-3 pt-4">
              <div className="h-7 w-40 bg-white/5 rounded" />
              <div className="h-4 w-28 bg-white/5 rounded" />
              <div className="h-3 w-20 bg-white/5 rounded" />
              <div className="h-16 w-full bg-white/5 rounded mt-4" />
            </div>
          </div>
        </div>
      </section>

      {/* 서재 탭 스켈레톤 */}
      <section className="max-w-5xl mx-auto space-y-4">
        <div className="h-4 w-16 bg-white/5 rounded mx-auto" />
        <div className="flex gap-2 justify-center">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 w-16 bg-white/5 rounded" />
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="aspect-[2/3] bg-white/5 rounded-lg" />
          ))}
        </div>
      </section>
    </div>
  );
}
