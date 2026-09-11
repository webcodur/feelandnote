/*
  파일명: /components/ui/NoEditionBadge.tsx
  기능: 확인된 언어판이 없는 제목의 표시
  책임: 두 가지 모양을 쥔다. chip은 목록 행(한 줄이 넓은 곳)용으로 [no-ko]·[no-en] 고정 문구를 번역 없이
        제목 앞에 붙인다. cover는 표지 카드용으로 표지 한가운데를 가로지르는 「국문본 없음」 띠다 —
        표지가 있든 없든 같은 자리에 경고선처럼 놓여 한눈에 잡히게 한다(26.09.11 사용자 결정). 배지가
        붙는 책은 국문판이 없어 보이는 표지가 외국판이므로 표지 위가 뜻에도 맞고, 하단 제목 상자는 폭
        170px대에 두 줄 잘림이라 칩이 제목을 더 잘랐다. 조작 요소가 아니므로 hover 반응을 두지 않는다.
*/
import { useTranslations } from "next-intl";
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
  /** chip: 제목 앞 고정 표기(목록 행) · cover: 표지 한가운데 가로 띠(표지 카드) */
  variant?: "chip" | "cover";
}

export default function NoEditionBadge({ badge, className, variant = "chip" }: NoEditionBadgeProps) {
  if (!badge) return null;
  if (variant === "cover") return <EditionCoverBand badge={badge} className={className} />;

  return (
    <span
      aria-label={BADGE_LABELS[badge]}
      className={`me-1 inline-block align-baseline rounded border border-text-secondary/50 px-1 font-mono text-[11px] font-normal leading-snug text-text-secondary ${className || ""}`}
    >
      [{badge}]
    </span>
  );
}

/** 표지 한가운데 가로 띠. 표지 그림 위에서도 읽히도록 어두운 바탕과 위아래 금색 선을 둔다. */
function EditionCoverBand({ badge, className }: { badge: TitleBadge; className?: string }) {
  const t = useTranslations("content.edition");
  return (
    <span
      className={`pointer-events-none absolute inset-x-0 top-1/2 z-10 -translate-y-1/2 border-y border-accent/60 bg-black/75 px-1 py-1 text-center text-[11px] font-medium leading-tight tracking-wide text-accent ${className || ""}`}
    >
      {t(badge === "no-ko" ? "noKo" : "noEn")}
    </span>
  );
}
