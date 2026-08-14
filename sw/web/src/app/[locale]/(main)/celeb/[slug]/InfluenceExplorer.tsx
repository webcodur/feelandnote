"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Crown, MapPinned } from "lucide-react";
import {
  INFLUENCE_CATEGORY_FIELDS,
  INFLUENCE_FIELDS,
  INFLUENCE_MAX_SCORES,
  type InfluenceField,
} from "@feelandnote/influence-constants";

import type {
  InfluenceExplorerData,
  InfluenceExplorerPerson,
} from "@/actions/home/getInfluenceExplorer";
import { cn } from "@/lib/utils";

import CelebPersonPreviewButton from "./CelebPersonPreviewButton";
import type { InfluenceRankDetail } from "./InfluenceRankModal";
import { useCelebPreview } from "./useCelebPreview";

const CelebDetailModal = dynamic(
  () => import("@/components/features/celeb/modals/CelebDetailModal"),
);

const InfluenceRankModal = dynamic(() => import("./InfluenceRankModal"));

interface Props {
  data: InfluenceExplorerData;
}

type SelectionKind = "ranking" | "field";

interface ExplorerSelection {
  kind: SelectionKind;
  people: InfluenceExplorerPerson[];
  index: number;
  field?: InfluenceField;
}

interface RankActionButtonProps {
  label: string;
  ariaLabel: string;
  disabled: boolean;
  onClick: () => void;
}

function RankActionButton({
  label,
  ariaLabel,
  disabled,
  onClick,
}: RankActionButtonProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className="absolute left-2 top-2 z-20 min-h-6 cursor-pointer rounded-sm border border-accent/25 bg-black/75 px-2 py-1 text-[10px] font-bold leading-none text-accent shadow-sm hover:border-accent hover:bg-accent hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-60"
    >
      {label}
    </button>
  );
}

function getStrongestDomain(person: InfluenceExplorerPerson): InfluenceField {
  return INFLUENCE_CATEGORY_FIELDS.reduce((strongest, field) =>
    person[field] > person[strongest] ? field : strongest,
  );
}

function getTopInfluenceFields(
  person: InfluenceExplorerPerson,
  preferredField?: InfluenceField,
): InfluenceField[] {
  return [...INFLUENCE_FIELDS]
    .sort((first, second) => {
      const ratioDifference =
        person[second] / INFLUENCE_MAX_SCORES[second]
        - person[first] / INFLUENCE_MAX_SCORES[first];
      if (ratioDifference !== 0) return ratioDifference;

      if (preferredField) {
        if (first === preferredField) return -1;
        if (second === preferredField) return 1;
      }

      const scoreDifference = person[second] - person[first];
      if (scoreDifference !== 0) return scoreDifference;
      return INFLUENCE_FIELDS.indexOf(first) - INFLUENCE_FIELDS.indexOf(second);
    })
    .slice(0, 2);
}

export default function InfluenceExplorer({ data }: Props) {
  const t = useTranslations("profilePage.influence");
  const [activeField, setActiveField] = useState<InfluenceField>(() =>
    getStrongestDomain(data.current),
  );
  const [selection, setSelection] = useState<ExplorerSelection | null>(null);
  const [rankDetail, setRankDetail] = useState<InfluenceRankDetail | null>(null);
  const {
    celeb: previewCeleb,
    loadingId,
    openCelebPreview,
    closeCelebPreview,
  } = useCelebPreview("influence");
  const rankingScrollerRef = useRef<HTMLDivElement>(null);
  const currentRankRef = useRef<HTMLLIElement>(null);

  const activeLeaders = data.leaders[activeField];

  useEffect(() => {
    const scroller = rankingScrollerRef.current;
    const current = currentRankRef.current;
    if (!scroller || !current) return;
    scroller.scrollLeft =
      current.offsetLeft - (scroller.clientWidth - current.offsetWidth) / 2;
  }, []);

  const shortFieldLabel = (field: InfluenceField) =>
    t(`explorer.shortFields.${field}`);

  const cardMetrics = (
    person: InfluenceExplorerPerson,
    preferredField?: InfluenceField,
  ) => {
    const [firstField, secondField] = getTopInfluenceFields(
      person,
      preferredField,
    );
    return (
      <>
        <span className="flex items-center justify-center gap-1 whitespace-nowrap text-[10px] font-semibold leading-tight text-text-secondary md:text-[11px]">
          <span>
            {t("explorer.fieldMetric", {
              field: shortFieldLabel(firstField),
              score: person[firstField],
            })}
          </span>
          <span aria-hidden className="text-white/25">|</span>
          <span>
            {t("explorer.fieldMetric", {
              field: shortFieldLabel(secondField),
              score: person[secondField],
            })}
          </span>
        </span>
        <span className="block font-mono text-[10px] font-bold leading-tight tabular-nums text-accent/90 md:text-[11px]">
          {t("explorer.totalScore", { score: person.total_score })}
        </span>
      </>
    );
  };

  const openPerson = async (
    person: InfluenceExplorerPerson,
    nextSelection: ExplorerSelection,
  ) => {
    setSelection(nextSelection);
    const nextCeleb = await openCelebPreview(person.id);
    if (!nextCeleb) setSelection(null);
  };

  const navigatePreview = async (direction: "prev" | "next") => {
    if (!selection || loadingId) return;
    const nextIndex = selection.index + (direction === "prev" ? -1 : 1);
    const nextPerson = selection.people[nextIndex];
    if (!nextPerson) return;
    const nextCeleb = await openCelebPreview(nextPerson.id);
    if (nextCeleb) setSelection({ ...selection, index: nextIndex });
  };

  const closePreview = () => {
    closeCelebPreview();
    setSelection(null);
  };

  return (
    <div className="space-y-7 border-t border-white/[0.08] pt-6">
      <section className="space-y-3.5" aria-labelledby="influence-ranking-title">
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

        <div
          ref={rankingScrollerRef}
          className="overflow-x-auto pb-1 custom-scrollbar"
        >
          <div className="relative mx-auto w-[60rem] min-w-[840px] max-w-5xl border-y border-white/[0.07] bg-white/[0.012] px-2 py-3">
            <ol className="relative grid grid-cols-7 gap-2">
              {data.neighbors.map((person, index) => {
                const isCurrent = person.id === data.current.id;
                const isLoading = loadingId === person.id;
                return (
                  <li
                    key={person.id}
                    ref={isCurrent ? currentRankRef : undefined}
                    className="relative min-w-0"
                  >
                    <CelebPersonPreviewButton
                      name={person.nickname}
                      avatarUrl={person.avatar_url}
                      size="large"
                      fullWidth
                      loading={isLoading}
                      disabled={Boolean(loadingId)}
                      ariaCurrent={isCurrent ? "true" : undefined}
                      onClick={() =>
                        void openPerson(person, {
                          kind: "ranking",
                          people: data.neighbors,
                          index,
                        })
                      }
                      className={cn(
                        "h-full gap-2 rounded-sm border-white/[0.07] bg-white/[0.018] px-1.5 py-3 hover:border-accent/45 hover:bg-accent/[0.055] md:px-2 md:py-3.5",
                        isCurrent
                          ? "!border-accent/55 !bg-accent/[0.08]"
                          : loadingId && !isLoading
                            ? "opacity-55"
                            : "",
                      )}
                    >
                      {cardMetrics(person)}
                    </CelebPersonPreviewButton>
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
                        setRankDetail({
                          kind: "ranking",
                          person,
                          total: data.total,
                        })
                      }
                    />
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </section>

      <section
        className="space-y-3.5 border-t border-white/[0.08] pt-6"
        aria-labelledby="influence-leaders-title"
      >
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

        <div className="overflow-x-auto px-1 py-0.5 custom-scrollbar">
          <div
            role="tablist"
            aria-label={t("explorer.fieldTabs")}
            className="mx-auto flex w-max min-w-full justify-center gap-0.5"
          >
            {INFLUENCE_FIELDS.map((field) => {
              const isActive = field === activeField;
              return (
                <button
                  key={field}
                  type="button"
                  role="tab"
                  id={`influence-field-tab-${field}`}
                  aria-controls="influence-field-leaders-panel"
                  aria-selected={isActive}
                  onClick={() => setActiveField(field)}
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

        <div className="overflow-x-auto pb-1 custom-scrollbar">
          <div
            id="influence-field-leaders-panel"
            role="tabpanel"
            aria-labelledby={`influence-field-tab-${activeField}`}
            className="mx-auto grid w-[55rem] min-w-[760px] max-w-4xl grid-cols-5 overflow-hidden border border-white/[0.08] bg-white/[0.012]"
          >
            {activeLeaders.map((person, index) => {
              const isCurrent = person.id === data.current.id;
              const isLoading = loadingId === person.id;
              return (
                <div key={person.id} className="relative h-full min-w-0">
                  <CelebPersonPreviewButton
                    name={person.nickname}
                    avatarUrl={person.avatar_url}
                    size="featured"
                    fullWidth
                    loading={isLoading}
                    disabled={Boolean(loadingId)}
                    ariaCurrent={isCurrent ? "true" : undefined}
                    onClick={() =>
                      void openPerson(person, {
                        kind: "field",
                        people: activeLeaders,
                        index,
                        field: activeField,
                      })
                    }
                    className={cn(
                      "h-full gap-1.5 rounded-none border-white/[0.07] bg-white/[0.018] px-2 py-2.5 hover:border-accent/45 hover:bg-accent/[0.055]",
                      index > 0 && "border-s border-white/[0.07]",
                      isCurrent
                        ? "!bg-accent/[0.07]"
                        : loadingId && !isLoading
                          ? "opacity-55"
                          : "",
                    )}
                  >
                    {cardMetrics(person, activeField)}
                  </CelebPersonPreviewButton>
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
                      setRankDetail({
                        kind: "field",
                        person,
                        field: activeField,
                      })
                    }
                  />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {previewCeleb && selection ? (
        <CelebDetailModal
          celeb={previewCeleb}
          isOpen
          onClose={closePreview}
          onNavigate={(direction) => void navigatePreview(direction)}
          hasPrev={selection.index > 0}
          hasNext={selection.index < selection.people.length - 1}
        />
      ) : null}

      <InfluenceRankModal
        detail={rankDetail}
        onClose={() => setRankDetail(null)}
      />
    </div>
  );
}
