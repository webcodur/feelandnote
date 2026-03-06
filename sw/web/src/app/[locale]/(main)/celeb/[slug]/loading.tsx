export default function Loading() {
  return (
    <div className="space-y-16 animate-pulse">

      {/* 1. 인물 프로필 */}
      <section className="max-w-3xl mx-auto space-y-4">
        {/* DecorativeLabel 스켈레톤 */}
        <div className="flex items-center justify-center gap-3">
          <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-white/10" />
          <div className="h-3 w-12 bg-white/5 rounded" />
          <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-white/10" />
        </div>
        {/* ClassicalBox: grid 2col */}
        <div className="rounded-lg border border-white/[0.06] bg-[#0e0e0e] px-5 py-5">
          <div className="grid grid-cols-[auto_1fr] gap-6">
            {/* 아바타 */}
            <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-white/5" />
            {/* 텍스트 */}
            <div className="space-y-2 min-w-0">
              <div className="h-7 w-32 bg-white/5 rounded" />
              <div className="flex gap-2">
                <div className="h-4 w-16 bg-accent/10 rounded" />
                <div className="h-4 w-12 bg-white/5 rounded" />
                <div className="h-4 w-24 bg-white/5 rounded" />
              </div>
              <div className="h-3 w-full bg-white/5 rounded" />
              <div className="h-3 w-4/5 bg-white/5 rounded" />
              <div className="h-3 w-3/4 bg-white/5 rounded pt-1" />
            </div>
          </div>
        </div>
      </section>

      {/* 2. 감상 철학 */}
      <section className="max-w-3xl mx-auto space-y-3">
        {/* DecorativeLabel */}
        <div className="flex items-center justify-center gap-3">
          <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-white/10" />
          <div className="h-3 w-16 bg-white/5 rounded" />
          <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-white/10" />
        </div>
        {/* ClassicalBox: 텍스트 블록 */}
        <div className="rounded-lg border border-white/[0.06] bg-[#0e0e0e] px-5 py-4">
          <div className="space-y-3">
            <div className="h-4 w-full bg-white/5 rounded" />
            <div className="h-4 w-full bg-white/5 rounded" />
            <div className="h-4 w-5/6 bg-white/5 rounded" />
            <div className="h-4 w-full bg-white/5 rounded" />
            <div className="h-4 w-3/4 bg-white/5 rounded" />
            <div className="h-4 w-full bg-white/5 rounded" />
            <div className="h-4 w-2/3 bg-white/5 rounded" />
          </div>
        </div>
      </section>

      {/* 3. 콘텐츠 라이브러리 */}
      <section className="max-w-3xl mx-auto space-y-4">
        {/* DecorativeLabel */}
        <div className="flex items-center justify-center gap-3">
          <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-white/10" />
          <div className="h-3 w-16 bg-white/5 rounded" />
          <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-white/10" />
        </div>
        {/* ClassicalBox: ContentLibrary 스켈레톤 */}
        <div className="rounded-lg border border-white/[0.06] bg-[#0e0e0e] p-6">
          {/* 컨트롤 */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 h-9 bg-white/5 rounded-md" />
            <div className="h-9 w-9 bg-white/5 rounded-md" />
          </div>
          {/* 리스트 아이템 */}
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <div className="w-10 h-14 bg-white/5 rounded shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-3/4 bg-white/5 rounded" />
                  <div className="h-3 w-1/2 bg-white/5 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. 인물 분석 */}
      <section className="max-w-3xl mx-auto space-y-4">
        {/* DecorativeLabel */}
        <div className="flex items-center justify-center gap-3">
          <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-white/10" />
          <div className="h-3 w-12 bg-white/5 rounded" />
          <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-white/10" />
        </div>
        {/* ClassicalBox: Persona 바들 */}
        <div className="rounded-lg border border-white/[0.06] bg-[#0e0e0e] p-6">
          {/* 능력 4개 */}
          <div className="space-y-2 mb-6">
            <div className="h-3 w-20 bg-accent/10 rounded mx-auto mb-3" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-3 bg-white/5 rounded shrink-0" />
                <div className="flex-1 h-1.5 bg-white/[0.03] rounded-full" />
                <div className="w-8 h-3 bg-white/5 rounded shrink-0" />
              </div>
            ))}
          </div>
          {/* 덕목 2열 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6 pt-6 border-t border-white/5">
            {[4, 4].map((count, gi) => (
              <div key={gi} className="space-y-2">
                <div className="h-3 w-20 bg-accent/10 rounded mx-auto mb-3" />
                {Array.from({ length: count }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-10 h-3 bg-white/5 rounded shrink-0" />
                    <div className="flex-1 h-1.5 bg-white/[0.03] rounded-full" />
                    <div className="w-8 h-3 bg-white/5 rounded shrink-0" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. 방명록 */}
      <section className="max-w-3xl mx-auto space-y-4">
        {/* DecorativeLabel */}
        <div className="flex items-center justify-center gap-3">
          <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-white/10" />
          <div className="h-3 w-12 bg-white/5 rounded" />
          <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-white/10" />
        </div>
        {/* ClassicalBox: 입력 + 목록 */}
        <div className="rounded-lg border border-white/[0.06] bg-[#0e0e0e] p-6">
          <div className="h-20 w-full bg-white/5 rounded-lg mb-4" />
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
      </section>
    </div>
  );
}
