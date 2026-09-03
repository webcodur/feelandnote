/* ─────────────────────────────────────────────
 * [celeb 상세] influence — 순위 숫자 단추 (순위 상세 모달 진입점)
 * - 목차 위치: influence(분석 구획, i18n 키 profilePage.influence)
 * - 데이터: label·ariaLabel·disabled·onClick props만 받음
 * - 함께 보기: RankingSection.tsx, LeadersSection.tsx
 * ───────────────────────────────────────────── */

"use client";

interface RankActionButtonProps {
  label: string;
  ariaLabel: string;
  disabled: boolean;
  onClick: () => void;
}

/* ── 1. 순위 숫자 단추 ── */

export default function RankActionButton({
  label,
  ariaLabel,
  disabled,
  onClick,
}: RankActionButtonProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      /* 얼굴 위에 얹지 않는다 — 아바타 위쪽 제 줄에 세워 인물을 가리지 않게 한다 */
      className="mx-auto mt-1.5 min-h-5 w-fit shrink-0 cursor-pointer rounded-sm border border-accent/25 bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-bold leading-none text-accent hover:border-accent hover:bg-accent hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-60"
    >
      {label}
    </button>
  );
}
