"use client";

/** 도서의 번역본 없음·절판 표기. 가번역·절판의 짧은 제목 표기는 클릭 안내를 제공한다. */
import { useTranslations } from "next-intl";
import { getBookTitleBadge, getEditionAvailabilityBadge, isTranslatedTitleBadge, type TitleBadge } from "@/lib/utils/content-locale";
import { OutOfPrintBadge, TitleNoticeBadges } from "./ProvisionalTitleBadge";

interface NoEditionBadgeProps {
  contentType: string | null | undefined;
  badge?: TitleBadge | null;
  className?: string;
  /** chip: 제목 앞 고정 표기(목록 행) · cover: 표지 한가운데 가로 띠(표지 카드) */
  variant?: "chip" | "cover";
}

export default function NoEditionBadge({ contentType, badge, className, variant = "chip" }: NoEditionBadgeProps) {
  const bookBadge = getBookTitleBadge(contentType, badge);
  if (!bookBadge) return null;
  const availability = getEditionAvailabilityBadge(bookBadge);
  if (variant === "cover") return <EditionCoverBand badge={availability} className={className} />;
  if (isTranslatedTitleBadge(bookBadge) || availability === "out-of-print") return <TitleNoticeBadges badge={bookBadge} className={className} />;
  return <EditionChip badge={availability} className={className} />;
}

/** 목록 행의 제목 앞 칩. 표지 띠와 같은 독자 말 문구를 쓴다(「번역본 없음 / Untranslated」). */
function EditionChip({ badge, className }: { badge: TitleBadge; className?: string }) {
  const t = useTranslations("content.edition");
  return (
    <span
      className={`me-1 inline-block align-baseline rounded border border-accent/50 px-1 text-[11px] font-normal leading-snug text-accent/90 ${className || ""}`}
    >
      {t(badge === "no-ko" ? "noKo" : badge === "out-of-print" ? "outOfPrint" : "noEn")}
    </span>
  );
}

/** 표지 한가운데 가로 띠. 표지 그림 위에서도 읽히도록 어두운 바탕과 위아래 금색 선을 둔다. */
function EditionCoverBand({ badge, className }: { badge: ReturnType<typeof getEditionAvailabilityBadge>; className?: string }) {
  const t = useTranslations("content.edition");
  if (badge === "out-of-print") return <OutOfPrintBadge badge={badge}
    className={`absolute! inset-x-0 top-1/2 -translate-y-1/2 border-y border-accent/60 bg-black/75 text-center ${className || ""}`} />;
  return (
    <span
      className={`pointer-events-none absolute inset-x-0 top-1/2 z-10 -translate-y-1/2 border-y border-accent/60 bg-black/75 px-1 py-1 text-center text-[11px] font-medium leading-tight tracking-wide text-accent ${className || ""}`}
    >
      {t(badge === "no-ko" ? "noKo" : "noEn")}
    </span>
  );
}
