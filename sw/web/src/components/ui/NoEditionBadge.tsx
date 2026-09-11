/*
  파일명: /components/ui/NoEditionBadge.tsx
  기능: 확인된 언어판이 없는 제목의 표시
  책임: 세 가지 모양을 쥔다. chip은 목록 행(한 줄이 넓은 곳)용으로 [no-ko]·[no-en] 고정 문구를 번역 없이
        제목 앞에 붙인다. cover는 표지 카드용으로 표지 왼쪽 위에 「국문본 없음」 띠를 얹는다 — 배지가 붙는
        책은 국문판이 없어 보이는 표지가 외국판이므로 표지 위가 뜻에 맞고, 하단 제목 상자는 폭 170px대에
        두 줄 잘림이라 칩이 제목을 더 잘랐다(26.09.11 목업 비교). 표지 왼쪽 위는 어느 화면도 쓰지 않는
        모서리다(오른쪽 위는 기관 선정 연도, 아래 두 모서리는 인원 수·소개). kicker는 표지가 작은 감상평형
        카드용으로 제목 위에 같은 문구 한 줄을 세운다. 조작 요소가 아니므로 hover 반응을 두지 않는다.
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
  /** chip: 제목 앞 고정 표기(목록 행) · cover: 표지 왼쪽 위 띠(표지 카드) · kicker: 제목 위 한 줄(감상평형 카드) */
  variant?: "chip" | "cover" | "kicker";
}

export default function NoEditionBadge({ badge, className, variant = "chip" }: NoEditionBadgeProps) {
  if (!badge) return null;
  if (variant === "kicker") return <EditionKicker badge={badge} className={className} />;
  if (variant === "cover") return <EditionCoverRibbon badge={badge} className={className} />;

  return (
    <span
      aria-label={BADGE_LABELS[badge]}
      className={`me-1 inline-block align-baseline rounded border border-text-secondary/50 px-1 font-mono text-[11px] font-normal leading-snug text-text-secondary ${className || ""}`}
    >
      [{badge}]
    </span>
  );
}

function EditionCoverRibbon({ badge, className }: { badge: TitleBadge; className?: string }) {
  const t = useTranslations("content.edition");
  return (
    <span
      className={`pointer-events-none absolute left-0 top-2 z-10 rounded-r border border-l-0 border-accent/50 bg-black/75 px-1.5 py-0.5 text-[10px] font-medium leading-none tracking-wide text-accent ${className || ""}`}
    >
      {t(badge === "no-ko" ? "noKo" : "noEn")}
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
