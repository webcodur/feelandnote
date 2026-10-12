"use client";

import { useState, useSyncExternalStore } from "react";
import { useLocale, useTranslations } from "next-intl";
import { BookOpen, History, Users, UserRound, X } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { useMouseDragScroll } from "@/hooks/useMouseDragScroll";
import { isCurrentRecentHistory, recentHistoryKey, type RecentHistoryItem, type RecentHistoryKind } from "@/lib/recent-history";
import { removeRecentHistory, useRecentHistory } from "@/hooks/useRecentHistory";
import MythTitleImage from "@/components/features/user/explore/myth/MythTitleImage";
import styles from "./HubSection.module.css";
import railStyles from "./RecentHistoryRail.module.css";

const subscribeHydration = () => () => {};
const hydratedSnapshot = () => true;
const serverSnapshot = () => false;

function RecentCover({ item }: { item: RecentHistoryItem }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const [readySource, setReadySource] = useState<string | null>(null);
  const Icon = item.kind === "profile" ? UserRound : item.kind === "faction" ? Users : item.kind === "content" ? BookOpen : History;
  return (
    <span aria-hidden className={railStyles.cover}>
      {(!item.thumbnail || failedSource === item.thumbnail || readySource !== item.thumbnail) && <Icon size={24} />}
      {item.thumbnail && failedSource !== item.thumbnail && <MythTitleImage src={item.thumbnail} alt="" priority={false} sizes="80px"
        fit={item.kind === "content" ? "contain" : "cover"}
        className={item.kind === "faction" ? "object-left" : item.kind === "content" ? "object-center p-1" : "object-center"}
        onReady={() => setReadySource(item.thumbnail)}
        onUnavailable={() => setFailedSource(item.thumbnail)} />}
    </span>
  );
}

/** 본문 번호·목차와 독립된 상단 도구. 해당 페이지 종류의 기록만 받는다. */
export default function RecentHistoryRail({ items, onSelect, reserveSpace = true, preserveScroll = false, currentId, pending = false }: {
  items: RecentHistoryItem[];
  onSelect?: (item: RecentHistoryItem) => boolean;
  reserveSpace?: boolean;
  preserveScroll?: boolean;
  currentId?: string;
  pending?: boolean;
}) {
  const { ref, cursorClassName, dragProps } = useMouseDragScroll<HTMLElement>();
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations("shared");
  if (items.length === 0 && !reserveSpace) return null;

  return (
    <div className={`min-w-0 w-full ${styles.recent}`} data-recent-history-controls>
      <div className={railStyles.heading}>{t("recentHistory")}</div>
      <nav ref={ref} {...dragProps} aria-label={t("recentHistory")} data-recent-history tabIndex={-1}
        aria-busy={pending || undefined}
        className={`${railStyles.rail} scrollbar-hide pointer-coarse:snap-x ${cursorClassName}`}>
          {items.length === 0 && pending && Array.from({ length: 4 }, (_, index) => <div key={index} aria-hidden className={`${railStyles.item} ${railStyles.link}`}>
            <span className={railStyles.cover} />
            <span className={railStyles.placeholder} />
          </div>)}
          {items.length === 0 && !pending && <p className={railStyles.empty}>{t("recentHistoryEmpty")}</p>}
          {items.map((item, index) => {
            const title = item.titles?.[locale] || item.title;
            const subtitle = item.subtitles?.[locale] || item.subtitle;
            const current = isCurrentRecentHistory(item, pathname, currentId)
              || (!currentId && index === 0 && pathname === `/explore/${item.kind}`);
            return (
              <div key={recentHistoryKey(item)} className={`${railStyles.item} snap-start`}>
                <Link href={item.href} scroll={preserveScroll ? false : undefined} draggable={false} title={[title, subtitle].filter(Boolean).join(" · ")}
                  aria-current={current ? "page" : undefined}
                  onClick={event => {
                    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                    if (onSelect?.(item)) event.preventDefault();
                  }}
                  className={railStyles.link}>
                  <RecentCover item={item} />
                  <span className={railStyles.label}>{title}</span>
                </Link>
                <button type="button" data-no-drag className={railStyles.remove}
                  aria-label={t("removeRecentHistory", { title })} title={t("removeRecentHistory", { title })}
                  onClick={event => {
                    if (event.detail === 0) {
                      const card = event.currentTarget.parentElement;
                      const next = card?.nextElementSibling ?? card?.previousElementSibling;
                      (next?.querySelector<HTMLButtonElement>("button") ?? ref.current)?.focus({ preventScroll: true });
                    }
                    removeRecentHistory(item);
                  }}>
                  <X size={12} aria-hidden />
                </button>
              </div>
            );
          })}
      </nav>
      <div aria-hidden className={`h-px w-full bg-line ${styles.recentDivider}`} />
    </div>
  );
}

/** 실제 본문과 초기 로딩 틀이 같은 목록·높이를 사용한다. */
export function RecentHistorySection({ kind, currentId, preserveScroll = false }: {
  kind: RecentHistoryKind;
  currentId?: string;
  preserveScroll?: boolean;
}) {
  const items = useRecentHistory(null, kind);
  const hydrated = useSyncExternalStore(subscribeHydration, hydratedSnapshot, serverSnapshot);
  return <RecentHistoryRail items={items} currentId={currentId} preserveScroll={preserveScroll} pending={!hydrated} />;
}
