export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* 진열대 (ShowcaseSection) 스켈레톤 */}
      <div className="relative rounded-xl overflow-hidden mb-8 border border-accent/10 bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a]">
        <div className="p-6 sm:p-10 flex flex-col items-center">
          <div className="mb-10">
            <div className="h-4 w-24 bg-white/5 rounded" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-4xl px-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-lg bg-white/5 border border-white/10" />
            ))}
          </div>
        </div>
      </div>

      {/* 업적 보관소 (CatalogSection) 스켈레톤 */}
      <div className="rounded-xl border border-white/5 bg-bg-card/40 p-4 sm:p-6">
        {/* 점수 */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className="h-6 w-20 bg-white/5 rounded" />
          <div className="h-8 w-16 bg-white/5 rounded" />
        </div>

        {/* 카테고리 탭 */}
        <div className="flex justify-center gap-2 mb-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 w-16 bg-white/5 rounded-lg" />
          ))}
        </div>

        {/* 칭호 목록 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-white/5 border border-white/5" />
          ))}
        </div>
      </div>
    </div>
  );
}
