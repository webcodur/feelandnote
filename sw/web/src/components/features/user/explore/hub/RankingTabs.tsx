/*
  파일명: /components/features/user/explore/hub/RankingTabs.tsx
  기능: 허브 프로필 섹션 탭 묶음
  책임: 인기 · 기록왕 · 랜덤을 한 칸 안 탭으로 전환. 전체 인물 목록 링크 제공.
        비어 있는 탭은 애초에 만들지 않는다 — 눌러도 빈 화면이 나오는 탭을 남기지 않기 위함.
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
  trending: CelebProfile[];
  topByType: TopByTypeEntry[];
  /** 랜덤 — 매일 새로 뽑는 인물들 */
  dailyPicks: CelebProfile[];
}

export default function RankingTabs({ trending, topByType, dailyPicks }: RankingTabsProps) {
  const t = useTranslations("explore.hub");
  const [tab, setTab] = useState(0);

  const tabs: { key: string; body: React.ReactNode }[] = [];
  if (trending.length > 0) {
    tabs.push({ key: "trending", body: <HubCelebGrid celebs={trending} /> });
  }
  if (topByType.length > 0) {
    tabs.push({ key: "topByType", body: <TopByTypeGrid entries={topByType} /> });
  }
  if (dailyPicks.length > 0) {
    tabs.push({ key: "allCelebs", body: <HubCelebGrid celebs={dailyPicks} /> });
  }

  if (tabs.length === 0) return null;

  const current = tabs[Math.min(tab, tabs.length - 1)];

  return (
    <div className="space-y-6">
      {/* 탭 — 색 강조는 지연 없이 즉시(즉각 반응 원칙), 배경만 부드럽게 */}
      <div className="flex flex-wrap justify-center gap-2">
        {tabs.map((tb, i) => {
          const active = tb.key === current.key;
          return (
            <button
              key={tb.key}
              type="button"
              onClick={() => setTab(i)}
              className={
                "px-5 py-2.5 rounded-full text-sm font-semibold border " +
                (active
                  ? "bg-accent/15 text-accent border-accent/40"
                  : "bg-bg-card/40 text-text-secondary border-border/40 hover:text-text-primary hover:bg-bg-card hover:border-border")
              }
            >
              {t(tb.key)}
            </button>
          );
        })}
      </div>

      {/* 고른 탭이 무엇을 기준으로 뽑은 목록인지 — 이름만으로는 기준이 안 보인다 */}
      <p className="-mt-3 text-center text-xs md:text-sm text-text-secondary leading-relaxed break-keep max-w-xl mx-auto">
        {t(`${current.key}Sub`)}
      </p>

      {/* 콘텐츠 */}
      {current.body}

      {/* 전체 프로필 — 기업가 + 종합점수로 최초 진입 */}
      <div className="flex justify-center">
        <Link
          href="/explore/figures?profession=entrepreneur&sortBy=composite&tier=full"
          className="flex items-center gap-1.5 rounded-full border border-white/5 bg-white/5 px-4 py-2 text-xs font-medium text-white/50 hover:border-white/10 hover:bg-white/10 hover:text-[#d4af37]"
        >
          {t("viewAllProfiles")}
          <ArrowRight size={14} className="text-[#d4af37]/70" />
        </Link>
      </div>
    </div>
  );
}
