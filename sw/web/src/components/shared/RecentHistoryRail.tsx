"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { BookOpen, History, Users, UserRound } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useMouseDragScroll } from "@/hooks/useMouseDragScroll";
import { recentHistoryKey, type RecentHistoryItem } from "@/lib/recent-history";
import MythTitleImage from "@/components/features/user/explore/myth/MythTitleImage";

function RecentCover({ item }: { item: RecentHistoryItem }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const Icon = item.kind === "profile" ? UserRound : item.kind === "faction" ? Users : item.kind === "content" ? BookOpen : History;
  return (
    <span aria-hidden className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-card border border-line bg-bg-card text-text-tertiary group-hover:border-line-strong group-active:border-accent group-focus-visible:border-accent group-focus-visible:ring-2 group-focus-visible:ring-inset group-focus-visible:ring-accent">
      <Icon size={24} />
      {item.thumbnail && failedSource !== item.thumbnail && <MythTitleImage src={item.thumbnail} alt="" priority={false} sizes="80px"
        fit="cover" className={item.kind === "faction" ? "object-left" : "object-center"}
        onUnavailable={() => setFailedSource(item.thumbnail)} />}
    </span>
  );
}

/** 본문 번호·목차와 독립된 상단 도구. 해당 페이지 종류의 기록만 받는다. */
export default function RecentHistoryRail({ items, onSelect, className = "" }: {
  items: RecentHistoryItem[];
  onSelect?: (item: RecentHistoryItem) => boolean;
  className?: string;
}) {
  const { ref, cursorClassName, dragProps } = useMouseDragScroll<HTMLElement>();
  const locale = useLocale();
  const t = useTranslations("shared");
  if (items.length === 0) return null;

  return (
    <div className={`min-w-0 w-full pb-6 md:pb-8 ${className}`} data-recent-history-controls>
      <div className="mb-3 text-center text-xs font-medium text-text-secondary">{t("recentHistory")}</div>
      <nav ref={ref} {...dragProps} aria-label={t("recentHistory")} data-recent-history
        className={`scrollbar-hide flex justify-center-safe gap-3 overflow-x-auto overscroll-x-contain select-none pointer-coarse:snap-x ${cursorClassName}`}>
          {items.map(item => {
            const title = item.titles?.[locale] || item.title;
            const subtitle = item.subtitles?.[locale] || item.subtitle;
            return (
              <Link key={recentHistoryKey(item)} href={item.href} draggable={false} title={[title, subtitle].filter(Boolean).join(" · ")}
                onClick={event => {
                  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                  if (onSelect?.(item)) event.preventDefault();
                }}
                className="group flex w-[68px] shrink-0 snap-start flex-col items-center gap-1.5 text-text-primary outline-none hover:text-accent active:text-accent md:w-20">
                <RecentCover item={item} />
                <span className="block w-full truncate text-center text-xs font-medium leading-4">{title}</span>
              </Link>
            );
          })}
      </nav>
      <div aria-hidden className="mt-6 h-px w-full bg-line md:mt-8" />
    </div>
  );
}
