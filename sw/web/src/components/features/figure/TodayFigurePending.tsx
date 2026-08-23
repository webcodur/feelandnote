/*
  파일명: /components/features/figure/TodayFigurePending.tsx
  기능: 오늘의 인물이 채워지기를 기다리는 자리
  책임: TodayFigureSection과 같은 뼈대(가운데 인물 머리 + 2열 콘텐츠 카드)로 자리를 잡아
        내용이 들어올 때 화면이 튀지 않게 한다. 모양이 어긋나면 여기와 본체를 함께 고친다.
*/

import { PendingBlock } from "@/components/ui/pending";

/** 콘텐츠 카드 한 장의 높이 — TodayFigureSection의 heightClass와 같은 값이어야 한다 */
const CARD_H = "h-[280px]";

export default function TodayFigurePending({ label }: { label?: string }) {
  return (
    <div className="w-full space-y-6 md:space-y-10">
      {/* 인물 머리 — 날짜 칩·얼굴·이름·직함이 가운데 서는 자리 */}
      <div className="flex flex-col items-center">
        {/* 날짜 칩 */}
        <div className="h-6 w-36 rounded-full border border-white/[0.06] bg-white/[0.03]" />
        {/* 얼굴 — 본체 Avatar 2xl과 같은 크기 */}
        <div className="mt-8 size-28 rounded-full border border-white/[0.06] bg-white/[0.03] md:size-32" />
        {/* 이름 */}
        <div className="mt-5 h-9 w-40 rounded-xl border border-white/[0.06] bg-white/[0.03] md:h-10" />
        {/* 직함 */}
        <div className="mt-2 h-6 w-24 rounded border border-white/[0.06] bg-white/[0.03]" />
        {/* 소개 두 줄 */}
        <div className="mt-6 h-4 w-full max-w-xl rounded-lg border border-white/[0.06] bg-white/[0.03]" />
        <div className="mt-2 h-4 w-2/3 max-w-md rounded-lg border border-white/[0.06] bg-white/[0.03]" />
      </div>

      {/* 서가 — 본체와 같이 제목과 분류 칩이 한 박스에 들고 카드는 박스 밖에 선다 */}
      <div className="min-h-[200px]">
        <div className="mx-auto mb-6 w-fit rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4 md:px-8 md:py-5">
          {/* 제목 */}
          <div className="mx-auto h-7 w-56 max-w-full rounded-lg border border-white/[0.06] bg-white/[0.03] md:w-72" />
          {/* 분류 칩 */}
          <div className="mt-4 flex justify-center gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-8 w-20 rounded-full border border-white/[0.06] bg-white/[0.03]"
              />
            ))}
          </div>
        </div>

        <PendingBlock
          variant="grid"
          cols="grid-cols-1 md:grid-cols-2"
          aspect={CARD_H}
          count={4}
          label={label}
        />
      </div>
    </div>
  );
}
