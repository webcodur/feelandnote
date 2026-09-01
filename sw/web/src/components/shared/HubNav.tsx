/*
  파일명: /components/shared/HubNav.tsx
  기능: 허브 페이지 서브페이지 네비게이터
  책임: 한 줄에 섞인 두 가지 행동을 모양으로 갈라 보여준다.
        - 이 화면 안의 구획으로 굴러가는 목차: 테두리 없는 번호 + 글자, 현재 구획은 밑줄
        - 이 화면을 떠나는 별도 화면: 테두리 있는 단추 + 아이콘 + 나가는 화살표
*/ // ------------------------------

"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { hubSectionId } from "@/components/shared/hubSectionUtils";
import { LinkPending } from "@/components/ui/pending";

/** 이 화면 안의 구획으로 굴러가는 목차 항목 — 아이콘을 두지 않는 것이 계약이다 */
interface HubAnchorItem {
  label: string;
  href: string;
}

/** 이 줄이 유일한 입구인 별도 화면 */
interface HubPageItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
}

interface HubFeatureItem {
  label: string;
  targetId: string;
  icon?: React.ReactNode;
}

interface HubNavProps {
  /** 구획을 config 순서 그대로 넘긴다 — 구획은 실패·0건에도 자리를 지키므로 목차와 어긋나지 않는다 */
  hubItems: HubAnchorItem[];
  /** 별도 화면 (이 줄에서만 접근 가능) */
  standaloneItems?: HubPageItem[];
  /** 일반 구획과 다른 페이지 안 특별 탐색 */
  featureItem?: HubFeatureItem;
  /** 허브 섹션 스크롤 네비게이션용 그룹 ID */
  groupId?: string;
}

export default function HubNav({ hubItems, standaloneItems, featureItem, groupId }: HubNavProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const visibleRef = useRef<Set<number>>(new Set());

  const handleHubClick = (index: number) => {
    if (!groupId) return;
    const el = document.getElementById(hubSectionId(index, groupId));
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // 지금 보고 있는 구획을 목차에 표시한다. 화면 위쪽 띠에 걸친 구획 중 가장 위를 현재로 본다.
  const hubCount = hubItems.length;
  useEffect(() => {
    if (!groupId) return;

    const pairs = Array.from({ length: hubCount }, (_, i) => ({
      i,
      el: document.getElementById(hubSectionId(i, groupId)),
    })).filter((p): p is { i: number; el: HTMLElement } => !!p.el);
    if (pairs.length === 0) return;

    const indexOfEl = new Map(pairs.map((p) => [p.el, p.i]));
    visibleRef.current = new Set();

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const idx = indexOfEl.get(entry.target as HTMLElement);
          if (idx === undefined) return;
          if (entry.isIntersecting) visibleRef.current.add(idx);
          else visibleRef.current.delete(idx);
        });
        const top = Math.min(...visibleRef.current);
        setActiveIndex(Number.isFinite(top) ? top : null);
      },
      { rootMargin: "-15% 0px -70% 0px" },
    );
    pairs.forEach((p) => io.observe(p.el));
    return () => io.disconnect();
  }, [groupId, hubCount]);

  const hasStandalone = !!standaloneItems && standaloneItems.length > 0;
  const scrollToFeature = () => {
    if (!featureItem) return;
    document.getElementById(featureItem.targetId)?.scrollIntoView({ behavior: "instant", block: "start" });
  };

  return (
    <div className="flex items-center gap-2 w-max max-w-full mx-auto px-1 pb-1 overflow-x-auto scrollbar-hide">
      {/* 이 화면 안의 구획 — 목차 */}
      {hubItems.map((item, i) => {
        const isActive = activeIndex === i;
        return (
          <Link
            key={`${i}-${item.href}`}
            href={item.href}
            onClick={(e) => {
              if (groupId) {
                e.preventDefault();
                handleHubClick(i);
              }
            }}
            className={`group shrink-0 flex items-baseline gap-1.5 px-1.5 py-1.5 text-sm font-medium border-b-2 ${
              isActive
                ? "border-accent text-text-primary"
                : "border-transparent text-text-secondary hover:border-stone-light hover:text-text-primary"
            }`}
          >
            <span
              className={`text-sm font-mono tabular-nums ${
                isActive ? "text-accent" : "text-accent-dim group-hover:text-accent"
              }`}
            >
              {i + 1}
            </span>
            <span className="whitespace-nowrap">{item.label}</span>
          </Link>
        );
      })}

      {featureItem && <div className="mx-2 h-4 w-px shrink-0 bg-stone-heavy" />}

      {featureItem && (
        <button
          type="button"
          onClick={scrollToFeature}
          className="group flex shrink-0 items-center gap-1.5 rounded-full border border-accent/50 bg-accent/10 px-3 py-1.5 text-sm font-bold text-accent hover:border-accent hover:bg-accent/20"
        >
          {featureItem.icon}
          <span className="whitespace-nowrap">{featureItem.label}</span>
        </button>
      )}

      {/* 구분선 */}
      {hasStandalone && <div className="mx-2 h-4 w-px shrink-0 bg-stone-heavy" />}

      {/* 이 화면을 떠나는 별도 화면 */}
      {standaloneItems?.map((item, i) => (
        <Link
          key={`${i}-${item.href}`}
          href={item.href}
          className="group flex shrink-0 items-center gap-1.5 rounded-full border border-stone-heavy bg-bg-card py-1.5 pe-2.5 ps-3 text-sm font-medium text-text-secondary hover:border-accent/50 hover:bg-accent/10 hover:text-text-primary"
        >
          {item.icon && (
            <span className="shrink-0 text-text-tertiary group-hover:text-accent">{item.icon}</span>
          )}
          <span className="whitespace-nowrap">{item.label}</span>
          <LinkPending>
            <ArrowUpRight size={12} className="shrink-0 text-text-tertiary group-hover:text-accent" />
          </LinkPending>
        </Link>
      ))}
    </div>
  );
}
