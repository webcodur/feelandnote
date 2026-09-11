/*
  파일명: /components/ui/NoEditionBadge.tsx
  기능: 확인된 언어판이 없는 제목 앞에 붙는 표시
  책임: [no-ko]·[no-en] 고정 문구를 번역 없이 그린다. 조작 요소가 아니므로 hover 반응을 두지 않는다.
*/
import type { TitleBadge } from "@/lib/utils/content-locale";

// #region 상수
const BADGE_LABELS: Record<TitleBadge, string> = {
  "no-ko": "Korean edition not confirmed",
  "no-en": "English edition not confirmed",
};
// #endregion

interface NoEditionBadgeProps {
  badge?: TitleBadge | null;
  className?: string;
}

export default function NoEditionBadge({ badge, className }: NoEditionBadgeProps) {
  if (!badge) return null;

  return (
    <span
      aria-label={BADGE_LABELS[badge]}
      className={`me-1 inline-block align-baseline rounded border border-text-secondary/50 px-1 font-mono text-[11px] font-normal leading-snug text-text-secondary ${className || ""}`}
    >
      [{badge}]
    </span>
  );
}
