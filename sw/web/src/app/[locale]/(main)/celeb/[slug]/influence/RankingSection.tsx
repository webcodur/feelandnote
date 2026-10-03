/* ─────────────────────────────────────────────
 * [celeb 상세] influence — 이웃 순위 가로 목록 구획
 * - 목차 위치: influence(분석 구획, i18n 키 profilePage.influence)
 * - 데이터: data(이웃·현재 인물·전체 수), loadingId, onOpenPerson·onOpenRankDetail 콜백
 * - 함께 보기: InfluenceExplorerView.tsx, RankActionButton.tsx, PersonCardMetrics.tsx, CelebPersonPreviewButton.tsx
 * ───────────────────────────────────────────── */

"use client";

import { useTranslations } from "next-intl";

import type {
  InfluenceExplorerData,
  InfluenceExplorerPerson,
} from "@/actions/home/getInfluenceExplorer";
import { cn } from "@/lib/utils";
import { getInfluenceRankingHref } from "@/constants/influenceRanking";

import CelebPersonPreviewButton from "../CelebPersonPreviewButton";
import type { InfluenceRankDetail } from "../InfluenceRankModal";
import type { ExplorerSelection } from "./influence-helpers";
import InfluencePeopleRail from "./InfluencePeopleRail";
import PersonCardMetrics from "./PersonCardMetrics";
import RankActionButton from "./RankActionButton";

interface RankingSectionProps {
  data: InfluenceExplorerData;
  loadingId: string | null;
  onOpenPerson: (
    person: InfluenceExplorerPerson,
    nextSelection: ExplorerSelection,
  ) => void;
  onOpenRankDetail: (detail: InfluenceRankDetail) => void;
}

export default function RankingSection({
  data,
  loadingId,
  onOpenPerson,
  onOpenRankDetail,
}: RankingSectionProps) {
  const t = useTranslations("profilePage.influence");

  const currentIndex = data.neighbors.findIndex((person) => person.id === data.current.id);

  return (
    <section className="space-y-3.5" aria-labelledby="influence-ranking-title">
      {/* ── 2. 구획 헤더 ── */}
      <header className="px-1 text-center">
        <h3 id="influence-ranking-title" className="sr-only">{t("explorer.rankingTitle")}</h3>
        <p className="text-xs leading-relaxed text-text-secondary">
          {t("explorer.rankingDescription")}
        </p>
      </header>

      {/* ── 3. 이웃 순위 목록 ── */}
      <InfluencePeopleRail initialIndex={currentIndex} moreHref={getInfluenceRankingHref("total_score")} moreLabel={t("explorer.moreRanking")}>
            {data.neighbors.map((person, index) => {
              const isCurrent = person.id === data.current.id;
              const isLoading = loadingId === person.id;
              return (
                <li
                  key={person.id}
                  className="flex w-32 shrink-0 snap-start flex-col sm:w-40"
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
                    singleLineName
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
                      "flex-1 rounded-sm border-white/[0.07] bg-white/[0.018] hover:border-accent/45 hover:bg-accent/[0.055]",
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
      </InfluencePeopleRail>
    </section>
  );
}
