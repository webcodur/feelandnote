"use client";

import { useTranslations } from "next-intl";
import type { BookIntroductionAttribution } from "@/lib/utils/book-description";
import { cn } from "@/lib/utils";

const PROVIDER_NAMES = {
  yes24: "YES24",
  kakao: "Kakao",
  daum: "Daum",
  openlibrary: "OL",
  feelandnote: "F&N",
} as const;

/** 작품 소개 칸 우하단 출처 칩(BookIntroductionPanel)의 안쪽 알약에 들어가는 공급처 이름.
 *  other·unknown처럼 판별이 안 된 출처는 이름 없이 「원문」만 보인다(표에 없음). */
export const INTRO_PROVIDER_HEADING_NAME: Partial<
  Record<BookIntroductionAttribution["provider"], { ko: string; en: string }>
> = {
  daum: { ko: "다음", en: "Daum" },
  kakao: { ko: "카카오", en: "Kakao" },
  yes24: { ko: "YES24", en: "YES24" },
  openlibrary: { ko: "Open Library", en: "Open Library" },
  feelandnote: { ko: "F&N", en: "F&N" },
};

export default function BookIntroductionSource({ attribution, className }: {
  attribution?: BookIntroductionAttribution | null;
  className?: string;
}) {
  const t = useTranslations("content.introductionSource");
  const provider = attribution?.provider ?? "unknown";
  const name = provider === "unknown" ? t("unknown")
    : provider === "other" ? t("external") : PROVIDER_NAMES[provider];
  const label = name;
  const description = provider === "unknown" ? t("unknownDescription")
    : provider === "feelandnote" ? t("originalDescription")
    : t("sourceDescription", { source: provider === "openlibrary" ? "Open Library" : name });
  const styles = cn(
    "inline-flex max-w-full shrink-0 items-center rounded border border-border/70 bg-bg-secondary px-1.5 py-0.5 text-xs font-medium leading-5 text-text-secondary",
    className,
  );

  if (!attribution?.url) {
    return <span className={styles} title={description} aria-label={description}>{label}</span>;
  }

  return (
    <a
      href={attribution.url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      onClick={(event) => event.stopPropagation()}
      title={`${description} ${t("openSource")}`}
      aria-label={`${label}: ${t("openSource")}`}
      className={cn(styles, "hover:border-accent/60 hover:bg-accent/10 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent")}
    >
      {label}
    </a>
  );
}
