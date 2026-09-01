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

/** 좁은 화면에서 한 줄에 담는 칸 수 — 넓은 화면은 각각 7칸·5칸을 그대로 쓴다 */
const COMPACT_RANK_COUNT = 3;
const COMPACT_LEADER_COUNT = 2;

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
      /* 얼굴 위에 얹지 않는다 — 아바타 위쪽 제 줄에 세워 인물을 가리지 않게 한다 */
      className="mx-auto mt-1.5 min-h-5 w-fit shrink-0 cursor-pointer rounded-sm border border-accent/25 bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-bold leading-none text-accent hover:border-accent hover:bg-accent hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-60"
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

  /* 좁은 화면은 일곱 칸을 담지 못한다. 현재 인물을 가운데 두고 앞뒤 한 명씩만 남긴다 */
  const compactRankStart = Math.max(
    0,
    Math.min(
      data.neighbors.findIndex((person) => person.id === data.current.id) - 1,
      data.neighbors.length - COMPACT_RANK_COUNT,
    ),
  );

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
        <span className="flex flex-col items-center justify-center gap-0.5 whitespace-nowrap text-[10px] font-semibold leading-tight text-text-secondary md:text-[11px]">
          <span>
            {t("explorer.fieldMetric", {
              field: shortFieldLabel(firstField),
              score: person[firstField],
            })}
          </span>
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
                        setRankDetail({
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
                        void openPerson(person, {
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
                      {cardMetrics(person)}
                    </CelebPersonPreviewButton>
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
            className="mx-auto grid w-full max-w-4xl grid-cols-2 overflow-hidden border border-white/[0.08] bg-white/[0.012] lg:w-[55rem] lg:min-w-[760px] lg:grid-cols-5"
          >
            {activeLeaders.map((person, index) => {
              const isCurrent = person.id === data.current.id;
              const isLoading = loadingId === person.id;
              return (
                <div
                  key={person.id}
                  className={cn(
                    "h-full min-w-0 flex-col",
                    index < COMPACT_LEADER_COUNT ? "flex" : "hidden lg:flex",
                  )}
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
                      setRankDetail({
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
                      "flex-1 gap-1.5 rounded-none border-white/[0.07] bg-white/[0.018] px-2 py-2.5 hover:border-accent/45 hover:bg-accent/[0.055]",
                      isCurrent
                        ? "!bg-accent/[0.07]"
                        : loadingId && !isLoading
                          ? "opacity-55"
                          : "",
                    )}
                  >
                    {cardMetrics(person, activeField)}
                  </CelebPersonPreviewButton>
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
