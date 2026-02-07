export default function Loading() {
  return (
    <div className="w-full max-w-[1600px] mx-auto pb-20 animate-pulse">
      {/* 헤더 */}
      <div className="flex flex-col items-center justify-center py-12 mb-8">
        <div className="h-4 w-32 bg-white/5 rounded" />
        <div className="mt-2 h-3 w-20 bg-white/5 rounded" />
      </div>

      {/* 카드 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-4 md:px-0">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="aspect-[4/3] rounded-xl border border-white/5 bg-bg-card overflow-hidden">
            <div className="h-2/3 bg-white/5" />
            <div className="p-4 space-y-2">
              <div className="h-5 w-3/4 bg-white/5 rounded" />
              <div className="h-3 w-1/2 bg-white/5 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
