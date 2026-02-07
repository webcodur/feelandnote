export default function Loading() {
  return (
    <div className="space-y-8 sm:space-y-12 animate-pulse">
      {/* Bio 섹션 스켈레톤 */}
      <div className="relative rounded-xl overflow-hidden border border-white/5 bg-bg-card/40 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* 아바타 */}
          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-white/5 shrink-0" />
          {/* 정보 */}
          <div className="flex-1 text-center sm:text-start space-y-3 w-full">
            <div className="h-3 w-16 bg-white/5 rounded mx-auto sm:mx-0" />
            <div className="h-8 w-40 bg-white/5 rounded mx-auto sm:mx-0" />
            <div className="h-4 w-full max-w-md bg-white/5 rounded mx-auto sm:mx-0" />
            <div className="h-4 w-32 bg-white/5 rounded mx-auto sm:mx-0" />
          </div>
        </div>
      </div>

      {/* 감상 철학 섹션 스켈레톤 */}
      <div className="rounded-xl border border-white/5 bg-bg-card/40 p-4 sm:p-6 md:p-8">
        <div className="flex justify-center mb-6 sm:mb-8">
          <div className="h-4 w-20 bg-white/5 rounded" />
        </div>
        <div className="max-w-3xl mx-auto space-y-3">
          <div className="h-4 w-full bg-white/5 rounded" />
          <div className="h-4 w-full bg-white/5 rounded" />
          <div className="h-4 w-5/6 bg-white/5 rounded" />
          <div className="h-4 w-full bg-white/5 rounded" />
          <div className="h-4 w-3/4 bg-white/5 rounded" />
        </div>
      </div>

      {/* 방명록 섹션 스켈레톤 */}
      <div className="rounded-xl border border-white/5 bg-bg-card/40 p-4 sm:p-6 md:p-8">
        <div className="flex justify-center mb-6 sm:mb-8">
          <div className="h-4 w-16 bg-white/5 rounded" />
        </div>
        {/* 입력 영역 */}
        <div className="h-20 w-full bg-white/5 rounded-lg mb-4" />
        {/* 방명록 항목 */}
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3 p-3">
              <div className="w-8 h-8 rounded-full bg-white/5 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-24 bg-white/5 rounded" />
                <div className="h-4 w-full bg-white/5 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
