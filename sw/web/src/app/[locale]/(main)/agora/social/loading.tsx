export default function Loading() {
  return (
    <div className="space-y-8 animate-pulse">
      {Array.from({ length: 4 }).map((_, si) => (
        <section key={si}>
          {/* SectionHeader: icon + title + count */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-4 h-4 bg-accent/20 rounded" />
            <div className="h-4 w-20 bg-white/5 rounded" />
            <div className="h-3 w-6 bg-white/5 rounded" />
          </div>
          {/* 유저 카드 그리드 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-white/5 bg-bg-card/40">
                <div className="w-10 h-10 rounded-full bg-white/5 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-3/4 bg-white/5 rounded" />
                  <div className="h-3 w-1/2 bg-white/5 rounded" />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
