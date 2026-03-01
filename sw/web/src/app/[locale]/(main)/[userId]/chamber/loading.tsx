export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* 설정 카드 3장 */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-white/5 bg-bg-card/40 p-6 md:p-8">
          <div className="flex justify-center mb-6">
            <div className="h-4 w-24 bg-white/5 rounded" />
          </div>
          <div className="space-y-3">
            <div className="h-10 w-full bg-white/5 rounded-sm" />
            <div className="h-10 w-full bg-white/5 rounded-sm" />
          </div>
        </div>
      ))}
    </div>
  );
}
