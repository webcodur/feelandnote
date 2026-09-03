/* ─────────────────────────────────────────────
 * [celeb 상세] reading — 읽어보기(인물 안내)
 * - 목차 위치: reading (person-guide)
 * - 데이터: profile.reading prop
 * - 함께 보기: detail/CelebRecordSections.tsx
 * ───────────────────────────────────────────── */
"use client";

import type { CelebBySlugProfile } from "@/actions/user/getCelebBySlug";

// 인물 탐구 닫음(2026-08-22). 안내만 보여준다.
// 생성 품질이 기준에 못 미쳐 화면에서 내렸다. DB의 interpretive_* 필드는 남아 있다.
// 되살릴 때는 celebServiceItems.ts의 person-explore 항목도 함께 푼다.

interface Props {
  reading: CelebBySlugProfile["reading"];
}

function Paragraphs({ text }: { text: string }) {
  return (
    // 위아래 여백도 구획 상자가 쥔다. 여기서 겹쳐 주면 글 위아래가 제각각 벌어진다
    <div className="mx-auto max-w-3xl space-y-4 font-serif text-[15px] leading-loose text-text-secondary break-keep md:text-base">
      {text.split(/\n\n+/).map((paragraph, index) => (
        <p key={index}>{paragraph}</p>
      ))}
    </div>
  );
}

export default function FigureReadingTabs({ reading }: Props) {
  if (!reading) return null;

  return (
    <div>
      <Paragraphs text={reading.guide} />
    </div>
  );
}
