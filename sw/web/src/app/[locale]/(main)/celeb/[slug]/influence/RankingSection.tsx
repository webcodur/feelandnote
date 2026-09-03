/* ─────────────────────────────────────────────
 * [celeb 상세] influence — 이웃 순위 가로 목록 구획
 * - 목차 위치: influence(분석 구획, i18n 키 profilePage.influence)
 * - 데이터: data(이웃·현재 인물·전체 수), loadingId, 스크롤 ref 2개, onOpenPerson·onOpenRankDetail 콜백
 * - 함께 보기: InfluenceExplorerView.tsx, RankActionButton.tsx, PersonCardMetrics.tsx, CelebPersonPreviewButton.tsx
 * ───────────────────────────────────────────── */

"use client";

import type { RefObject } from "react";
import { useTranslations } from "next-intl";
import { MapPinned } from "lucide-react";

import type {
  InfluenceExplorerData,
  InfluenceExplorerPerson,
} from "@/actions/home/getInfluenceExplorer";
import { cn } from "@/lib/utils";

import CelebPersonPreviewButton from "../CelebPersonPreviewButton";
import type { InfluenceRankDetail } from "../InfluenceRankModal";
import { COMPACT_RANK_COUNT, type ExplorerSelection } from "./influence-helpers";
import PersonCardMetrics from "./PersonCardMetrics";
import RankActionButton from "./RankActionButton";

interface RankingSectionProps {
  data: InfluenceExplorerData;
  loadingId: string | null;
  scrollerRef: RefObject<HTMLDivElement | null>;
  currentRankRef: RefObject<HTMLLIElement | null>;
  onOpenPerson: (
    person: InfluenceExplorerPerson,
    nextSelection: ExplorerSelection,
  ) => void;
  onOpenRankDetail: (detail: InfluenceRankDetail) => void;
}

export default function RankingSection({
  data,
  loadingId,
  scrollerRef,
  currentRankRef,
  onOpenPerson,
  onOpenRankDetail,
}: RankingSectionProps) {
  const t = useTranslations("profilePage.influence");

  /* ── 1. 컴팩트 시작점: 좁은 화면은 현재 인물을 가운데 두고 앞뒤 한 명씩만 남긴다 ── */

  /* 좁은 화면은 일곱 칸을 담지 못한다. 현재 인물을 가운데 두고 앞뒤 한 명씩만 남긴다 */
  const compactRankStart = Math.max(
    0,
    Math.min(
      data.neighbors.findIndex((person) => person.id === data.current.id) - 1,
      data.neighbors.length - COMPACT_RANK_COUNT,
    ),
  );

  return (
    <section className="space-y-3.5" aria-labelledby="influence-ranking-title">
      {/* ── 2. 구획 헤더 ── */}
      <header className="px-1 text-center">
        <div className="flex items-center justify-center gap-2">
          <MapPinned size={16} className="text-accent" aria-hidden />
          <h3
            id="influence-ranking-title"
            className="font-serif text-lg font-extrabold tracking-wide text-text-primary"
          >
            {t("explorer.rankingTitle")}
          </h3>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-text-secondary">
          {t("explorer.rankingDescription")}
        </p>
      </header>

      {/* ── 3. 이웃 순위 목록 ── */}
      <div
        ref={scrollerRef}
        className="overflow-x-auto pb-1 custom-scrollbar"
      >
        <div className="relative mx-auto w-full max-w-5xl border-y border-white/[0.07] bg-white/[0.012] px-2 py-3 lg:w-[60rem] lg:min-w-[840px]">
          <ol className="relative grid grid-cols-3 gap-2 lg:grid-cols-7">
            {data.neighbors.map((person, index) => {
              const isCurrent = person.id === data.current.id;
              const isLoading = loadingId === person.id;
              return (
                <li
                  key={person.id}
                  ref={isCurrent ? currentRankRef : undefined}
                  className={cn(
                    "h-full min-w-0 flex-col",
                    index >= compactRankStart
                      && index < compactRankStart + COMPACT_RANK_COUNT
                      ? "flex"
                      : "hidden lg:flex",
                  )}
                >
                  <RankActionButton
                    label={t("explorer.rankNumber", {
                      ranking: person.ranking,
                    })}
                    ariaLabel={t("explorer.rankDetails", {
                      rank: t("explorer.rankNumber", {
                        ranking: person.ranking,
                      }),
                    })}
                    disabled={Boolean(loadingId)}
                    onClick={() =>
                      onOpenRankDetail({
                        kind: "ranking",
                        person,
                        total: data.total,
                      })
                    }
                  />
                  <CelebPersonPreviewButton
                    name={person.nickname}
                    avatarUrl={person.avatar_url}
                    size="large"
                    fullWidth
                    loading={isLoading}
                    disabled={Boolean(loadingId)}
                    ariaCurrent={isCurrent ? "true" : undefined}
                    onClick={() =>
                      onOpenPerson(person, {
                        kind: "ranking",
                        people: data.neighbors,
                        index,
                      })
                    }
                    className={cn(
                      "flex-1 gap-2 rounded-sm border-white/[0.07] bg-white/[0.018] px-1.5 py-3 hover:border-accent/45 hover:bg-accent/[0.055] md:px-2 md:py-3.5",
                      isCurrent
                        ? "!border-accent/55 !bg-accent/[0.08]"
                        : loadingId && !isLoading
                          ? "opacity-55"
                          : "",
                    )}
                  >
                    <PersonCardMetrics person={person} />
                  </CelebPersonPreviewButton>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
