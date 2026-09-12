/* ─────────────────────────────────────────────
 * [celeb 상세] 공통 — 전환·생성 대기 화면
 * - 목차 위치: 공통 (page.tsx의 Suspense fallback)
 * - 함께 보기: page.tsx, layout.tsx, CelebPageContent.tsx
 *
 * 캐시가 빈 인물 한 장은 서버가 자료 스무 건 남짓을 모을 때까지 아무것도 내보내지 않았다.
 * 그동안 검색 결과에서 누른 사람의 화면은 이전 페이지에 멈춰 있었고, 조회가 하나라도
 * 미끄러지면 그대로 에러 화면을 만났다. 여기서 뼈대를 먼저 내보내 「들어와진 다음에
 * 기다리는」 화면으로 바꾼다. 캐시가 있는 방문(크롤러 포함)은 완성본을 그대로 받으므로
 * 이 화면을 거치지 않는다.
 * ───────────────────────────────────────────── */

/** 대기 화면에서 자리만 잡아 두는 칸. */
function Block({ className }: { className: string }) {
  return <div className={`rounded bg-white/5 ${className}`} />;
}

export default function Loading() {
  return (
    <div className="animate-pulse space-y-8 sm:space-y-12" aria-busy="true">
      {/* 프로필 — 배너·얼굴·이름·한 줄 정의 */}
      <section className="overflow-hidden rounded-xl border border-white/5 bg-bg-card/40">
        <div className="flex h-10 items-center justify-center border-b border-white/5">
          <Block className="h-3 w-20" />
        </div>

        {/* 배너 */}
        <Block className="h-40 w-full rounded-none sm:h-56" />

        <div className="flex flex-col items-center gap-6 p-6 sm:flex-row sm:items-start sm:p-8">
          {/* 얼굴 */}
          <Block className="h-28 w-28 shrink-0 rounded-full sm:h-36 sm:w-36" />

          <div className="w-full flex-1 space-y-4 text-center sm:text-start">
            <Block className="mx-auto h-3 w-24 sm:mx-0" />
            <Block className="mx-auto h-9 w-52 sm:mx-0" />
            <Block className="mx-auto h-4 w-64 sm:mx-0" />

            {/* 활동 시기·국적 배지 */}
            <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
              <Block className="h-6 w-20" />
              <Block className="h-6 w-28" />
              <Block className="h-6 w-24" />
            </div>

            {/* 소개 */}
            <div className="space-y-2 pt-2">
              <Block className="h-4 w-full" />
              <Block className="h-4 w-11/12" />
              <Block className="h-4 w-2/3" />
            </div>
          </div>
        </div>
      </section>

      {/* 이어지는 구획 — 읽어보기·기록 */}
      {Array.from({ length: 2 }).map((_, index) => (
        <section
          key={index}
          className="rounded-xl border border-white/5 bg-bg-card/40 p-6 sm:p-8"
        >
          <div className="mb-6 flex justify-center">
            <Block className="h-4 w-24" />
          </div>
          <div className="space-y-3">
            <Block className="h-4 w-full" />
            <Block className="h-4 w-10/12" />
            <Block className="h-4 w-9/12" />
          </div>
        </section>
      ))}
    </div>
  );
}
