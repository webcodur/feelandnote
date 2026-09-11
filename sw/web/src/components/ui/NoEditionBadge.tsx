/*
  파일명: /components/ui/NoEditionBadge.tsx
  기능: 확인된 언어판이 없는 제목의 표시
  책임: 두 가지 모양을 쥔다. chip은 목록 행(한 줄이 넓은 곳)용으로 [no-ko]·[no-en] 고정 문구를 번역 없이
        제목 앞에 붙인다. kicker는 표지 카드(폭 170px대, 제목 두 줄 잘림)용으로 제목 위에 「국문본 없음」
        같은 독자 말 한 줄을 세운다 — 제목 앞 칩은 좁은 카드에서 첫 줄의 3분의 1을 먹고 제목을 더 잘랐다
        (26.09.11 목업 비교로 결정). 조작 요소가 아니므로 hover 반응을 두지 않는다.
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
  /** chip: 제목 앞 고정 표기(목록 행) · kicker: 제목 위 독자 말 한 줄(표지 카드) */
  variant?: "chip" | "kicker";
}

export default function NoEditionBadge({ badge, className, variant = "chip" }: NoEditionBadgeProps) {
  if (!badge) return null;
  if (variant === "kicker") return <EditionKicker badge={badge} className={className} />;

  return (
    <span
      aria-label={BADGE_LABELS[badge]}
      className={`me-1 inline-block align-baseline rounded border border-text-secondary/50 px-1 font-mono text-[11px] font-normal leading-snug text-text-secondary ${className || ""}`}
    >
      [{badge}]
    </span>
  );
}

function EditionKicker({ badge, className }: { badge: TitleBadge; className?: string }) {
  const t = useTranslations("content.edition");
  return (
    <p className={`mb-1 text-[10px] font-medium leading-none tracking-wide text-accent/80 ${className || ""}`}>
      {t(badge === "no-ko" ? "noKo" : "noEn")}
    </p>
  );
}
