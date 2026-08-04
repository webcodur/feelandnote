"use client";

import { useState, useRef, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";

import CelebDetailModal from "@/components/features/celeb/modals/CelebDetailModal";
import { DetailToggle, ScoreBar } from "@/components/ui";
import type { SimilarByCelebResult } from "@/actions/persona/getSimilarByCelebId";
import {
  ABILITY_KEYS,
  INNER_VIRTUE_KEYS,
  OUTER_VIRTUE_KEYS,
  TENDENCY_KEYS,
  type StatKey,
  type TendencyKey,
} from "@/lib/persona/constants";
import { localizePersonaText } from "@/lib/persona/localizeText";
import type { PersonaJsonb, PersonaField } from "@/lib/persona/types";
import type {
  PersonaMatch,
  PersonaMatchCategory,
  PersonaMatchEvidence,
  PersonaMatchGroups,
} from "@/lib/persona/utils";
import { cn } from "@/lib/utils";

import CelebPersonPreviewButton from "./CelebPersonPreviewButton";
import PersonaMatchModal from "./PersonaMatchModal";
import { useCelebPreview } from "./useCelebPreview";

// ─── 유틸 ───────────────────────────────────────────

function getReasonFromJsonb(
  jsonb: PersonaJsonb | null,
  group: "abilities" | "inner_virtues" | "outer_virtues" | "dispositions",
  key: string,
  locale: string,
): string | undefined {
  if (!jsonb) return undefined;
  const field = (jsonb[group] as Record<string, PersonaField>)?.[key];
  if (!field) return undefined;
  return locale === "en" && field.reason_en ? field.reason_en : field.reason_ko;
}

function getRationale(
  jsonb: PersonaJsonb | null,
  locale: string,
): string | undefined {
  if (!jsonb) return undefined;
  return locale === "en" && jsonb.rationale_en
    ? jsonb.rationale_en
    : jsonb.rationale_ko;
}

// ─── 섹션 헤더 ──────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex justify-center text-center w-full mb-4">
      <p className="text-xs md:text-sm text-accent font-cinzel tracking-[0.3em] uppercase font-bold">
        {title}
      </p>
    </div>
  );
}

function SimilarFiguresHeader({
  activeIndex,
  total,
  onPrevious,
  onNext,
}: {
  activeIndex: number;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const t = useTranslations("celebPage");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="flex w-full justify-center text-center">
      <div ref={ref} className="relative w-full max-w-xl">
        <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-start gap-2 sm:block">
          <button
            type="button"
            onClick={onPrevious}
            disabled={activeIndex === 0}
            className="flex h-10 w-10 items-center justify-center rounded-sm border border-white/10 text-text-secondary hover:border-accent/40 hover:bg-accent/[0.08] hover:text-accent active:bg-accent/[0.15] disabled:pointer-events-none disabled:border-white/[0.04] disabled:text-white/15 sm:hidden"
            aria-label={t("personaMatchPrevious")}
          >
            <ChevronLeft size={18} strokeWidth={1.8} />
          </button>

          <div>
            <div className="inline-flex items-center gap-1.5">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-accent md:text-sm font-cinzel">
                {t("personaMatches")}
              </p>
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="text-text-secondary hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                aria-label={t("showSimilarityFormula")}
                aria-expanded={open}
              >
                <Info size={14} />
              </button>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary break-keep">
              {t("personaMatchesIntro")}
            </p>
          </div>

          <button
            type="button"
            onClick={onNext}
            disabled={activeIndex === total - 1}
            className="flex h-10 w-10 items-center justify-center rounded-sm border border-white/10 text-text-secondary hover:border-accent/40 hover:bg-accent/[0.08] hover:text-accent active:bg-accent/[0.15] disabled:pointer-events-none disabled:border-white/[0.04] disabled:text-white/15 sm:hidden"
            aria-label={t("personaMatchNext")}
          >
            <ChevronRight size={18} strokeWidth={1.8} />
          </button>
        </div>

        <div className="mt-3 flex items-center justify-center gap-1.5 sm:hidden" aria-hidden>
          {Array.from({ length: total }, (_, index) => (
            <span
              key={index}
              className={cn(
                "h-0.5 w-5 rounded-full",
                index === activeIndex ? "bg-accent" : "bg-white/10",
              )}
            />
          ))}
        </div>

        {open && (
          <div
            role="tooltip"
            className="absolute left-1/2 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-lg border border-white/10 bg-bg-secondary px-4 py-3 shadow-xl animate-fade-in"
          >
            <p className="text-xs text-text-primary leading-relaxed break-keep text-left">
              {t("similarFormula")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

const MATCH_CATEGORY_ORDER: PersonaMatchCategory[] = [
  "overall",
  "disposition",
  "virtue",
  "ability",
  "opposite",
];

const MATCH_CATEGORY_STYLES: Record<
  PersonaMatchCategory,
  { border: string; index: string }
> = {
  overall: {
    border: "border-t-accent/55",
    index: "text-accent/80",
  },
  disposition: {
    border: "border-t-blue-400/35",
    index: "text-blue-300/70",
  },
  virtue: {
    border: "border-t-amber-300/35",
    index: "text-amber-200/70",
  },
  ability: {
    border: "border-t-emerald-300/35",
    index: "text-emerald-200/70",
  },
  opposite: {
    border: "border-t-rose-300/35",
    index: "text-rose-200/70",
  },
};

type TendencyLabelKey =
  | "pessimism"
  | "optimism"
  | "conservative"
  | "progressive"
  | "individual"
  | "social"
  | "cautious"
  | "bold";

const TENDENCY_EVIDENCE_LABELS: Record<
  TendencyKey,
  readonly [TendencyLabelKey, TendencyLabelKey]
> = {
  pessimism_optimism: ["pessimism", "optimism"],
  conservative_progressive: ["conservative", "progressive"],
  individual_social: ["individual", "social"],
  cautious_bold: ["cautious", "bold"],
};

const STAT_EVIDENCE_CHIP_STYLES: Record<StatKey, string> = {
  command: "border-emerald-300/20 bg-emerald-400/[0.07] text-emerald-200",
  martial: "border-red-300/20 bg-red-400/[0.07] text-red-200",
  intellect: "border-sky-300/20 bg-sky-400/[0.07] text-sky-200",
  charm: "border-fuchsia-300/20 bg-fuchsia-400/[0.07] text-fuchsia-200",
  temperance: "border-indigo-300/20 bg-indigo-400/[0.07] text-indigo-200",
  diligence: "border-amber-300/20 bg-amber-400/[0.07] text-amber-200",
  reflection: "border-violet-300/20 bg-violet-400/[0.07] text-violet-200",
  courage: "border-orange-300/20 bg-orange-400/[0.07] text-orange-200",
  loyalty: "border-yellow-300/20 bg-yellow-400/[0.07] text-yellow-200",
  benevolence: "border-teal-300/20 bg-teal-400/[0.07] text-teal-200",
  fairness: "border-cyan-300/20 bg-cyan-400/[0.07] text-cyan-200",
  humility: "border-stone-300/20 bg-stone-400/[0.07] text-stone-200",
};

const TENDENCY_EVIDENCE_CHIP_STYLES: Record<
  TendencyKey,
  { negative: string; positive: string }
> = {
  pessimism_optimism: {
    negative: "border-blue-300/20 bg-blue-400/[0.07] text-blue-200",
    positive: "border-yellow-300/20 bg-yellow-400/[0.07] text-yellow-200",
  },
  conservative_progressive: {
    negative: "border-slate-300/20 bg-slate-400/[0.07] text-slate-200",
    positive: "border-green-300/20 bg-green-400/[0.07] text-green-200",
  },
  individual_social: {
    negative: "border-purple-300/20 bg-purple-400/[0.07] text-purple-200",
    positive: "border-teal-300/20 bg-teal-400/[0.07] text-teal-200",
  },
  cautious_bold: {
    negative: "border-cyan-300/20 bg-cyan-400/[0.07] text-cyan-200",
    positive: "border-rose-300/20 bg-rose-400/[0.07] text-rose-200",
  },
};

function PersonaEvidenceChip({
  axis,
  value,
  label,
  className,
}: {
  axis: PersonaMatchEvidence["axis"];
  value: number;
  label: string;
  className?: string;
}) {
  const tendencyStyle =
    TENDENCY_EVIDENCE_CHIP_STYLES[axis as TendencyKey];
  const color = tendencyStyle
    ? tendencyStyle[value < 0 ? "negative" : "positive"]
    : STAT_EVIDENCE_CHIP_STYLES[axis as StatKey];

  return (
    <span
      title={label}
      className={cn(
        "inline-flex min-h-5 max-w-full items-center justify-center overflow-hidden whitespace-nowrap rounded-[4px] border px-1.5 py-1 font-sans text-[10px] font-medium leading-none tracking-[-0.01em] shadow-[0_1px_5px_rgba(0,0,0,0.12)] md:text-[11px]",
        color,
        className,
      )}
    >
      <span className="truncate">{label}</span>
    </span>
  );
}

function PersonaMatchGroup({
  category,
  subjectName,
  matches,
  onOpen,
  className,
}: {
  category: PersonaMatchCategory;
  subjectName: string;
  matches: PersonaMatch[];
  onOpen: (match: PersonaMatch) => void;
  className?: string;
}) {
  const t = useTranslations("celebPage");
  const ts = useTranslations("shared.persona.stat");
  const tl = useTranslations("shared.persona.tendency_label");
  const style = MATCH_CATEGORY_STYLES[category];
  const ordinal = String(MATCH_CATEGORY_ORDER.indexOf(category) + 1).padStart(
    2,
    "0",
  );
  const copy = (() => {
    switch (category) {
      case "overall":
        return {
          title: t("personaMatch_overall"),
          description: t("personaMatch_overallDesc"),
          insight: t("personaMatch_overallInsight"),
        };
      case "disposition":
        return {
          title: t("personaMatch_disposition"),
          description: t("personaMatch_dispositionDesc"),
          insight: t("personaMatch_dispositionInsight"),
        };
      case "virtue":
        return {
          title: t("personaMatch_virtue"),
          description: t("personaMatch_virtueDesc"),
          insight: t("personaMatch_virtueInsight"),
        };
      case "ability":
        return {
          title: t("personaMatch_ability"),
          description: t("personaMatch_abilityDesc"),
          insight: t("personaMatch_abilityInsight", { name: subjectName }),
        };
      case "opposite":
        return {
          title: t("personaMatch_opposite"),
          description: t("personaMatch_oppositeDesc"),
          insight: t("personaMatch_oppositeInsight"),
        };
    }
  })();

  const formatEvidence = (evidence: PersonaMatchEvidence): string => {
    const tendencyLabels =
      TENDENCY_EVIDENCE_LABELS[evidence.axis as TendencyKey];

    if (tendencyLabels) {
      const [negativeKey, positiveKey] = tendencyLabels;
      return tl(evidence.targetValue < 0 ? negativeKey : positiveKey);
    }

    return ts(evidence.axis as StatKey);
  };

  const formatOppositeValue = (
    evidence: PersonaMatchEvidence,
    value: number,
  ): string => {
    const [negativeKey, positiveKey] =
      TENDENCY_EVIDENCE_LABELS[evidence.axis as TendencyKey];
    return tl(value < 0 ? negativeKey : positiveKey);
  };

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-[2px] border border-white/[0.08] border-t bg-white/[0.018] px-3 py-4 md:px-5 md:py-5",
        style.border,
        category === "overall" &&
          "bg-[linear-gradient(105deg,rgba(255,255,255,0.025),transparent_65%)]",
        className,
      )}
    >
      <div className="pointer-events-none absolute -right-2 -top-5 font-cinzel text-7xl text-white/[0.025]">
        {ordinal}
      </div>
      <header className="relative min-h-20 border-b border-white/[0.06] pb-3 text-center">
        <div className="flex items-baseline justify-center gap-2">
          <span
            className={cn(
              "font-mono text-[10px] font-bold tracking-[0.22em]",
              style.index,
            )}
          >
            {ordinal}
          </span>
          <h3 className="font-serif text-base font-bold text-text-primary">
            {copy.title}
          </h3>
        </div>
        <p className="mt-1 text-balance break-keep text-xs leading-relaxed text-text-secondary">
          {copy.description}
        </p>
        {category === "opposite" && (
          <p className="mt-1.5 text-[9px] leading-none text-rose-200/45">
            {t("personaClashLegend")}
          </p>
        )}
      </header>

      <div
        className={cn(
          "relative mt-4 grid grid-cols-3 justify-items-center gap-1 md:gap-2",
          category === "overall" && "mx-auto max-w-md",
        )}
      >
        {matches.map((celeb) => (
          <CelebPersonPreviewButton
            key={celeb.celeb_id}
            name={celeb.nickname}
            avatarUrl={celeb.avatar_url}
            onClick={() => onOpen(celeb)}
            size="compact"
            className="w-full gap-2 md:w-full"
          >
            <span className="block font-mono text-[10px] tracking-wider text-accent/65">
              {t(
                category === "opposite"
                  ? "personaClashPercent"
                  : "personaMatchPercent",
                { percent: celeb.matchPercent },
              )}
            </span>
            {category === "opposite" ? (
              <span className="mt-1.5 block min-h-9 w-full space-y-1.5">
                {celeb.evidence.map((evidence) => (
                  <span
                    key={evidence.axis}
                    className="grid grid-cols-[minmax(0,1fr)_18px_minmax(0,1fr)] items-center gap-x-1"
                  >
                    <PersonaEvidenceChip
                      axis={evidence.axis}
                      value={evidence.targetValue}
                      label={formatOppositeValue(
                        evidence,
                        evidence.targetValue,
                      )}
                      className="justify-self-end"
                    />
                    <span
                      aria-hidden
                      className="relative z-10 block w-full text-center text-[10px] text-rose-200/45"
                    >
                      ↔
                    </span>
                    <PersonaEvidenceChip
                      axis={evidence.axis}
                      value={evidence.candidateValue}
                      label={formatOppositeValue(
                        evidence,
                        evidence.candidateValue,
                      )}
                      className="justify-self-start"
                    />
                  </span>
                ))}
              </span>
            ) : (
              <span className="mt-1.5 flex min-h-9 w-full flex-wrap content-start justify-center gap-1.5">
                {celeb.evidence.map((evidence) => (
                  <PersonaEvidenceChip
                    key={evidence.axis}
                    axis={evidence.axis}
                    value={evidence.targetValue}
                    label={formatEvidence(evidence)}
                  />
                ))}
              </span>
            )}
          </CelebPersonPreviewButton>
        ))}
      </div>

      <p className="relative mt-4 border-t border-white/[0.06] pt-3 text-balance break-keep text-center text-xs leading-relaxed text-text-primary/80">
        {copy.insight}
      </p>
    </article>
  );
}

// ─── 덕목 바 (영향력 탭과 공유하는 공통 눈금) ───────

function VirtueBar({
  label,
  value,
  reason,
  isEn,
  showReason,
}: {
  label: string;
  value: number;
  reason?: string;
  isEn?: boolean;
  showReason?: boolean;
}) {
  return (
    <ScoreBar
      label={label}
      value={value}
      labelClassName={isEn ? "w-[5.5rem]" : "w-10"}
      description={
        showReason && reason ? (
          <span className="block animate-fade-in">{reason}</span>
        ) : null
      }
    />
  );
}

// ─── 성향 바 ────────────────────────────────────────

function TendencyBar({
  neg,
  pos,
  value,
  reason,
  isEn,
  showReason,
}: {
  neg: string;
  pos: string;
  value: number;
  reason?: string;
  isEn?: boolean;
  showReason?: boolean;
}) {
  const position = ((value + 50) / 100) * 100;
  const activeLabel =
    Math.abs(value) > 10 ? (value < 0 ? "neg" : "pos") : null;

  const labelW = isEn ? "w-[5.5rem]" : "w-10";

  return (
    <div className="py-1.5">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "text-center text-xs tracking-tight shrink-0",
            labelW,
            activeLabel === "neg"
              ? "text-blue-400 font-bold"
              : "",
          )}
        >
          {neg}
        </span>
        <div className="relative flex-1 h-1.5 bg-white/10 overflow-hidden rounded-full ring-1 ring-white/5">
          <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-white/20 z-20" />
          <div
            className={cn(
              "absolute top-0 bottom-0 transition-all duration-1000 ease-out",
              value < 0 ? "bg-blue-500/30" : "bg-orange-500/30",
            )}
            style={
              value < 0
                ? { left: `${position}%`, right: "50%" }
                : { left: "50%", width: `${position - 50}%` }
            }
          />
          <div
            className="absolute top-1/2 w-2 h-2 -translate-y-1/2 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)] z-30 transition-all duration-1000 ease-out"
            style={{ left: `${position}%` }}
          />
        </div>
        <span
          className={cn(
            "text-center text-xs tracking-tight shrink-0",
            labelW,
            activeLabel === "pos"
              ? "text-orange-400 font-bold"
              : "",
          )}
        >
          {pos}
        </span>
      </div>
      {showReason && reason && (
        <p className="mt-1 text-sm text-text-secondary leading-relaxed break-keep animate-fade-in">
          {reason}
        </p>
      )}
    </div>
  );
}

// ─── 메인 컴포넌트 ──────────────────────────────────

interface PersonaSectionProps {
  persona: NonNullable<SimilarByCelebResult["targetPersona"]>;
  personaJsonb: PersonaJsonb | null;
  matchesByCategory: PersonaMatchGroups;
}

export default function PersonaSection({
  persona,
  personaJsonb,
  matchesByCategory,
}: PersonaSectionProps) {
  const t = useTranslations("celebPage");
  const ts = useTranslations("shared.persona.stat");
  const tl = useTranslations("shared.persona.tendency_label");
  const locale = useLocale();
  const {
    celeb: previewCeleb,
    loadingId,
    openCelebPreview,
    closeCelebPreview,
  } = useCelebPreview("persona");
  const [showDetail, setShowDetail] = useState(false);
  const [matchCategoryIndex, setMatchCategoryIndex] = useState(0);
  const matchCarouselRef = useRef<HTMLDivElement>(null);
  const [selectedMatch, setSelectedMatch] = useState<{
    category: PersonaMatchCategory;
    match: PersonaMatch;
  } | null>(null);

  const openSelectedMatchPerson = async () => {
    if (!selectedMatch) return;
    const nextCeleb = await openCelebPreview(selectedMatch.match.celeb_id);
    if (nextCeleb) setSelectedMatch(null);
  };

  const tendencyLabels: Record<string, [string, string]> = {
    pessimism_optimism: [tl("pessimism"), tl("optimism")],
    conservative_progressive: [tl("conservative"), tl("progressive")],
    individual_social: [tl("individual"), tl("social")],
    cautious_bold: [tl("cautious"), tl("bold")],
  };

  const isEn = locale === "en";
  const rationale = localizePersonaText(
    getRationale(personaJsonb, locale),
    locale,
  );
  const hasCategoryMatches = MATCH_CATEGORY_ORDER.some(
    (category) => matchesByCategory[category].length > 0,
  );

  const scrollToMatchCategory = (nextIndex: number) => {
    const boundedIndex = Math.max(
      0,
      Math.min(MATCH_CATEGORY_ORDER.length - 1, nextIndex),
    );
    const container = matchCarouselRef.current;
    const target = container?.children[boundedIndex] as HTMLElement | undefined;

    if (container && target) {
      container.scrollTo({ left: target.offsetLeft, behavior: "smooth" });
    }
  };

  const syncMatchCategoryIndex = () => {
    const container = matchCarouselRef.current;
    if (!container) return;

    const cards = Array.from(container.children) as HTMLElement[];
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    cards.forEach((card, index) => {
      const distance = Math.abs(card.offsetLeft - container.scrollLeft);
      if (distance < closestDistance) {
        closestIndex = index;
        closestDistance = distance;
      }
    });

    setMatchCategoryIndex((current) =>
      current === closestIndex ? current : closestIndex,
    );
  };

  return (
    <div className="space-y-6">
      {/* 종합 해설 (rationale) */}
      {rationale && (
        <div className="space-y-3">
          <SectionHeader title={t("rationale")} />
          <p className="text-sm text-text-secondary leading-relaxed break-keep text-center px-4">
            {rationale}
          </p>
        </div>
      )}

      {/* 상세 분석 토글 (영향력 탭과 같은 단추) */}
      <DetailToggle open={showDetail} onToggle={() => setShowDetail((v) => !v)} />

      {/* 핵심 능력 | 핵심 성향 — 덕목 두 묶음과 같은 두 칸 세로 배치 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
        <div className="space-y-2">
          <SectionHeader title={t("ability")} />
          {ABILITY_KEYS.map((key) => (
            <VirtueBar
              key={key}
              label={ts(key)}
              value={persona[key]}
              reason={localizePersonaText(
                getReasonFromJsonb(personaJsonb, "abilities", key, locale),
                locale,
              )}
              isEn={isEn}
              showReason={showDetail}
            />
          ))}
        </div>
        <div className="space-y-2">
          <SectionHeader title={t("coreDisposition")} />
          {TENDENCY_KEYS.map((key) => (
            <TendencyBar
              key={key}
              neg={tendencyLabels[key][0]}
              pos={tendencyLabels[key][1]}
              value={persona[key]}
              reason={localizePersonaText(
                getReasonFromJsonb(personaJsonb, "dispositions", key, locale),
                locale,
              )}
              isEn={isEn}
              showReason={showDetail}
            />
          ))}
        </div>
      </div>

      {/* 내면·외적 덕목 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6 pt-6 border-t border-white/5">
        <div className="space-y-2">
          <SectionHeader title={t("innerVirtue")} />
          {INNER_VIRTUE_KEYS.map((key) => (
            <VirtueBar
              key={key}
              label={ts(key)}
              value={persona[key]}
              reason={localizePersonaText(
                getReasonFromJsonb(
                  personaJsonb,
                  "inner_virtues",
                  key,
                  locale,
                ),
                locale,
              )}
              isEn={isEn}
              showReason={showDetail}
            />
          ))}
        </div>
        <div className="space-y-2">
          <SectionHeader title={t("outerVirtue")} />
          {OUTER_VIRTUE_KEYS.map((key) => (
            <VirtueBar
              key={key}
              label={ts(key)}
              value={persona[key]}
              reason={localizePersonaText(
                getReasonFromJsonb(
                  personaJsonb,
                  "outer_virtues",
                  key,
                  locale,
                ),
                locale,
              )}
              isEn={isEn}
              showReason={showDetail}
            />
          ))}
        </div>
      </div>

      {/* 지표별 비교 인물 */}
      {hasCategoryMatches && (
        <div className="space-y-5 border-t border-white/5 pt-7">
          <SimilarFiguresHeader
            activeIndex={matchCategoryIndex}
            total={MATCH_CATEGORY_ORDER.length}
            onPrevious={() => scrollToMatchCategory(matchCategoryIndex - 1)}
            onNext={() => scrollToMatchCategory(matchCategoryIndex + 1)}
          />
          <div
            ref={matchCarouselRef}
            onScroll={syncMatchCategoryIndex}
            className="relative flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain scroll-smooth scrollbar-hide touch-pan-x sm:grid sm:grid-cols-2 sm:overflow-visible sm:snap-none"
          >
            {MATCH_CATEGORY_ORDER.map((category) => (
              <PersonaMatchGroup
                key={category}
                category={category}
                subjectName={persona.nickname}
                matches={matchesByCategory[category]}
                onOpen={(match) => setSelectedMatch({ category, match })}
                className={cn(
                  "w-full shrink-0 snap-start sm:w-auto sm:shrink",
                  category === "overall" && "sm:col-span-2",
                )}
              />
            ))}
          </div>
        </div>
      )}

      {selectedMatch && (
        <PersonaMatchModal
          category={selectedMatch.category}
          match={selectedMatch.match}
          subjectName={persona.nickname}
          subjectAvatarUrl={persona.avatar_url}
          loading={loadingId === selectedMatch.match.celeb_id}
          onClose={() => setSelectedMatch(null)}
          onViewPerson={() => void openSelectedMatchPerson()}
        />
      )}

      {previewCeleb && (
        <CelebDetailModal
          celeb={previewCeleb}
          isOpen
          onClose={closeCelebPreview}
        />
      )}
    </div>
  );
}
