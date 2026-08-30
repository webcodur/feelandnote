/*
  파일명: /components/features/user/explore/hub/RankingTabs.tsx
  기능: 허브 프로필 섹션 탭 묶음
  책임: 인기 · 기록왕 · 랜덤을 한 칸 안 탭으로 전환. 전체 인물 목록 링크 제공.
        조회에 실패한 탭은 칩을 남기고 본문만 "다시 시도"로 바꾼다 — 칩까지 사라지면
        무엇이 빠졌는지 알 수 없다. 정말 0건인 탭만 뺀다.
*/ // ------------------------------

"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
// 모음(index)이 아니라 파일에서 바로 가져온다 — 모음에는 서버 전용 Lane이 함께 들어 있어
// 클라이언트 번들에 next/headers가 딸려 들어간다
import { PendingBlock, RetryBlock, LinkPending } from "@/components/ui/pending";
import HubCelebGrid from "./HubCelebGrid";
import TopByTypeGrid from "./TopByTypeGrid";
import type { CelebProfile } from "@/types/home";
import { getTopByContentType, type TopByTypeEntry } from "@/actions/home/getTopByContentType";
import { getCelebs } from "@/actions/home/getCelebs";

interface RankingTabsProps {
  /** null이면 조회 실패, 빈 배열이면 정말 0건 */
  trending: CelebProfile[] | null;
  topByType?: TopByTypeEntry[] | null;
  /** 랜덤 — 매일 새로 뽑는 인물들 */
  dailyPicks?: CelebProfile[] | null;
}

/** 탭 본문. null을 돌려주면 그 탭은 만들지 않는다(0건) */
function tabBody<T>(
  items: T[] | null | undefined,
  render: (values: T[]) => ReactNode,
  onRetry: (() => void) | undefined,
  loading: string,
): ReactNode {
  if (items === undefined) {
    return (
      <PendingBlock
        variant="grid"
        cols="grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6"
        count={12}
        label={loading}
      />
    );
  }
  if (items === null) return <RetryBlock onRetry={onRetry} />;
  if (items.length === 0) return null;
  return render(items);
}

export default function RankingTabs({ trending, topByType, dailyPicks }: RankingTabsProps) {
  const t = useTranslations("explore.hub");
  const tPending = useTranslations("pending");
  const [tab, setTab] = useState(0);
  const [loadedTopByType, setLoadedTopByType] = useState(topByType);
  const [loadedDailyPicks, setLoadedDailyPicks] = useState(dailyPicks);
  const topByTypeRequest = useRef<Promise<void> | null>(null);
  const dailyPicksRequest = useRef<Promise<void> | null>(null);

  const loadTopByType = useCallback(() => {
    if (topByTypeRequest.current) return topByTypeRequest.current;
    const request = (async () => {
      try {
        setLoadedTopByType(await getTopByContentType());
      } catch (error) {
        console.error("[RankingTabs] 분야별 기록왕 조회 실패:", error);
        setLoadedTopByType(null);
      } finally {
        topByTypeRequest.current = null;
      }
    })();
    topByTypeRequest.current = request;
    return request;
  }, []);

  const loadDailyPicks = useCallback(() => {
    if (dailyPicksRequest.current) return dailyPicksRequest.current;
    const request = (async () => {
      try {
        const result = await getCelebs({
          sortBy: "daily_recommend",
          limit: 12,
          tiers: ["full"],
          includeTotal: false,
          includeViewerState: false,
        });
        setLoadedDailyPicks(result.celebs);
      } catch (error) {
        console.error("[RankingTabs] 랜덤 인물 조회 실패:", error);
        setLoadedDailyPicks(null);
      } finally {
        dailyPicksRequest.current = null;
      }
    })();
    dailyPicksRequest.current = request;
    return request;
  }, []);

  const retryTopByType = useCallback(() => {
    setLoadedTopByType(undefined);
    void loadTopByType();
  }, [loadTopByType]);

  const retryDailyPicks = useCallback(() => {
    setLoadedDailyPicks(undefined);
    void loadDailyPicks();
  }, [loadDailyPicks]);

  const ensureTabData = useCallback((key: string) => {
    if (key === "topByType" && loadedTopByType === undefined) void loadTopByType();
    if (key === "allCelebs" && loadedDailyPicks === undefined) void loadDailyPicks();
  }, [loadDailyPicks, loadTopByType, loadedDailyPicks, loadedTopByType]);

  // 셋 다 실패했으면 탭 자체가 의미 없다 — 구획 본문을 통째로 다시 시도 자리로 둔다
  if (trending === null && loadedTopByType === null && loadedDailyPicks === null) return <RetryBlock />;

  const tabs = [
    {
      key: "trending",
      body: tabBody(trending, (v) => <HubCelebGrid celebs={v} />, undefined, tPending("loading")),
    },
    {
      key: "topByType",
      body: tabBody(loadedTopByType, (v) => <TopByTypeGrid entries={v} />, retryTopByType, tPending("loading")),
    },
    {
      key: "allCelebs",
      body: tabBody(loadedDailyPicks, (v) => <HubCelebGrid celebs={v} />, retryDailyPicks, tPending("loading")),
    },
  ].filter((entry) => entry.body !== null);

  if (tabs.length === 0) {
    return <p className="text-sm text-text-secondary text-center py-8">{tPending("empty")}</p>;
  }

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
              onMouseEnter={() => ensureTabData(tb.key)}
              onFocus={() => ensureTabData(tb.key)}
              onClick={() => {
                setTab(i);
                ensureTabData(tb.key);
              }}
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
          <LinkPending>
            <ArrowRight size={14} className="text-[#d4af37]/70" />
          </LinkPending>
        </Link>
      </div>
    </div>
  );
}
