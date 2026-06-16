/*
  파일명: /components/features/user/explore/hub/RankingTabs.tsx
  기능: 허브 랭킹 섹션 탭 묶음
  책임: 왕성한 탐구자 · 분야별 최고를 한 칸 안 탭으로 전환. 탭별 더보기 링크.
*/ // ------------------------------

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import HubCelebGrid from "./HubCelebGrid";
import TopByTypeGrid from "./TopByTypeGrid";
import type { CelebProfile } from "@/types/home";
import type { TopByTypeEntry } from "@/actions/home/getTopByContentType";

interface RankingTabsProps {
  deepReaders: CelebProfile[];
  topByType: TopByTypeEntry[];
}

const TABS = [
  { key: "deepReaders", moreHref: "/explore/figures?sortBy=content_count" },
  { key: "topByType", moreHref: "/explore/ranking" },
] as const;

export default function RankingTabs({ deepReaders, topByType }: RankingTabsProps) {
  const t = useTranslations("explore.hub");
  const [tab, setTab] = useState(0);

  return (
    <div className="space-y-6">
      {/* 탭 */}
      <div className="flex flex-wrap justify-center gap-2">
        {TABS.map((tb, i) => {
          const active = i === tab;
          return (
            <button
              key={tb.key}
              type="button"
              onClick={() => setTab(i)}
              className={
                "px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 " +
                (active
                  ? "bg-accent/15 text-accent border border-accent/40"
                  : "bg-bg-card/40 text-text-secondary hover:text-text-primary hover:bg-bg-card border border-border/40 hover:border-border")
              }
            >
              {t(tb.key)}
            </button>
          );
        })}
      </div>

      {/* 콘텐츠 */}
      {tab === 0 ? <HubCelebGrid celebs={deepReaders} /> : <TopByTypeGrid entries={topByType} />}

      {/* 탭별 더보기 */}
      <div className="flex justify-center">
        <Link
          href={TABS[tab].moreHref}
          className="flex items-center gap-1.5 rounded-full border border-white/5 bg-white/5 px-4 py-2 text-xs font-medium text-white/50 transition-colors hover:border-white/10 hover:bg-white/10 hover:text-[#d4af37]"
        >
          {t("viewAll")}
          <ArrowRight size={14} className="text-[#d4af37]/70" />
        </Link>
      </div>
    </div>
  );
}
