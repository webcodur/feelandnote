export default function Loading() {
  return (
    <div className="animate-pulse">
      {/* SectionHeader 스켈레톤 */}
      <div className="text-center py-6 sm:py-8 mb-6">
        <div className="flex items-center justify-center gap-4 mb-3 opacity-60">
          <div className="h-[1px] w-8 sm:w-12 bg-gradient-to-r from-transparent to-accent/30" />
          <div className="w-1.5 h-1.5 rotate-45 border border-accent/30" />
          <div className="h-[1px] w-8 sm:w-12 bg-gradient-to-l from-transparent to-accent/30" />
        </div>
        <div className="h-3 w-20 bg-white/5 rounded mx-auto mb-2" />
        <div className="h-8 w-40 bg-white/5 rounded mx-auto mb-3" />
        <div className="flex flex-col items-center gap-1.5">
          <div className="h-4 w-64 bg-white/5 rounded" />
          <div className="h-3 w-48 bg-white/5 rounded" />
        </div>
        <div className="mt-6 w-24 h-[1px] mx-auto bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      {/* 게임 영역 */}
      <div className="h-[400px] rounded-xl bg-bg-card/40 border border-white/5" />
    </div>
  );
}
