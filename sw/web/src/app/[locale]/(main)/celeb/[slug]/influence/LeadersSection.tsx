/* ─────────────────────────────────────────────
 * [celeb 상세] influence — 분야별 1위 탭·패널 구획
 * - 목차 위치: influence(분석 구획, i18n 키 profilePage.influence)
 * - 데이터: activeField·leaders(분야별 1위)·currentId·loadingId, onActiveFieldChange·onOpenPerson·onOpenRankDetail 콜백
 * - 함께 보기: InfluenceExplorerView.tsx, RankActionButton.tsx, PersonCardMetrics.tsx, CelebPersonPreviewButton.tsx
 * ───────────────────────────────────────────── */

"use client";

import { useTranslations } from "next-intl";
import { ChevronDown, Crown } from "lucide-react";
import { INFLUENCE_FIELDS } from "@feelandnote/influence-constants";
import type { InfluenceField } from "@feelandnote/influence-constants";

import type {
  InfluenceFieldLeader,
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

interface LeadersSectionProps {
  activeField: InfluenceField;
  leaders: InfluenceFieldLeader[];
  currentId: string;
  loadingId: string | null;
  onActiveFieldChange: (field: InfluenceField) => void;
  onChooseField: () => void;
  onOpenPerson: (
    person: InfluenceExplorerPerson,
    nextSelection: ExplorerSelection,
  ) => void;
  onOpenRankDetail: (detail: InfluenceRankDetail) => void;
}

export default function LeadersSection({
  activeField,
  leaders,
  currentId,
  loadingId,
  onActiveFieldChange,
  onChooseField,
  onOpenPerson,
  onOpenRankDetail,
}: LeadersSectionProps) {
  const t = useTranslations("profilePage.influence");

  const shortFieldLabel = (field: InfluenceField) =>
    t(`explorer.shortFields.${field}`);

  return (
    <section
      className="space-y-3.5"
      aria-labelledby="influence-leaders-title"
    >
      {/* ── 1. 구획 헤더 ── */}
      <header className="px-1 text-center">
        <div className="flex items-center justify-center gap-2">
          <Crown size={16} className="text-accent" aria-hidden />
          <h3
            id="influence-leaders-title"
            className="font-serif text-lg font-extrabold tracking-wide text-text-primary"
          >
            {t("explorer.leadersTitle")}
          </h3>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-text-secondary">
          {t("explorer.leadersDescription")}
        </p>
      </header>

      {/* ── 2. 분야 탭 ── */}
      <div className="flex justify-center md:hidden">
        <button type="button" aria-haspopup="dialog" aria-label={`${t("explorer.fieldTabs")}: ${shortFieldLabel(activeField)}`} onClick={onChooseField} className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line px-4 text-sm text-accent hover:border-line-strong hover:bg-bg-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          {shortFieldLabel(activeField)}<ChevronDown size={15} aria-hidden />
        </button>
      </div>
      <div className="hidden px-1 py-0.5 md:block">
        <div
          role="group"
          aria-label={t("explorer.fieldTabs")}
          className="flex justify-center gap-0.5"
        >
          {INFLUENCE_FIELDS.map((field) => {
            const isActive = field === activeField;
            return (
              <button
                key={field}
                type="button"
                aria-pressed={isActive}
                onClick={() => onActiveFieldChange(field)}
                className={cn(
                  "shrink-0 border-b-2 px-2.5 py-1.5 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  isActive
                    ? "border-accent bg-accent/[0.08] text-accent"
                    : "border-transparent text-text-secondary hover:border-accent/35 hover:bg-white/[0.03] hover:text-text-primary",
                )}
              >
                {shortFieldLabel(field)}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 3. 분야별 1위 패널 ── */}
      <div>
        <div
          aria-label={shortFieldLabel(activeField)}
        >
          <InfluencePeopleRail key={activeField} moreHref={getInfluenceRankingHref(activeField)} moreLabel={t("explorer.moreLeaders")}>
          {leaders.map((person, index) => {
            const isCurrent = person.id === currentId;
            const isLoading = loadingId === person.id;
            return (
              <li
                key={person.id}
                className="flex w-32 shrink-0 snap-start flex-col sm:w-40"
              >
                <RankActionButton
                  label={t("explorer.rankNumber", {
                    ranking: person.fieldRank,
                  })}
                  ariaLabel={t("explorer.rankDetails", {
                    rank: t("explorer.rankNumber", {
                      ranking: person.fieldRank,
                    }),
                  })}
                  disabled={Boolean(loadingId)}
                  onClick={() =>
                    onOpenRankDetail({
                      kind: "field",
                      person,
                      field: activeField,
                    })
                  }
                />
                <CelebPersonPreviewButton
                  name={person.nickname}
                  avatarUrl={person.avatar_url}
                  size="featured"
                  fullWidth
                  singleLineName
                  loading={isLoading}
                  disabled={Boolean(loadingId)}
                  ariaCurrent={isCurrent ? "true" : undefined}
                  onClick={() =>
                    onOpenPerson(person, {
                      kind: "field",
                      people: leaders,
                      index,
                      field: activeField,
                    })
                  }
                  className={cn(
                    "flex-1 rounded-sm border-white/[0.07] bg-white/[0.018] hover:border-accent/45 hover:bg-accent/[0.055]",
                    isCurrent
                      ? "!bg-accent/[0.07]"
                      : loadingId && !isLoading
                        ? "opacity-55"
                        : "",
                  )}
                >
                  <PersonCardMetrics person={person} preferredField={activeField} />
                </CelebPersonPreviewButton>
              </li>
            );
          })}
          </InfluencePeopleRail>
        </div>
      </div>
    </section>
  );
}
