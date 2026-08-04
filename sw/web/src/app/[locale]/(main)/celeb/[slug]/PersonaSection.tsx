"use client";

import {
  useState,
  useRef,
  useEffect,
  useId,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight, Info, X } from "lucide-react";

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
import { Z_INDEX } from "@/constants/zIndex";
import type {
  PersonaMatch,
  PersonaMatchCategory,
  PersonaMatchEvidence,
  PersonaMatchGroups,
} from "@/lib/persona/utils";
import { cn } from "@/lib/utils";
import styles from "./CelebPageContent.module.css";

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

function MetricPanel({
  title,
  tone,
  children,
}: {
  title: string;
  tone: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "h-full overflow-hidden rounded-[2px] border border-white/[0.08] border-t bg-white/[0.018] px-3 py-4 md:px-5 md:py-5",
        tone,
      )}
    >
      <header className="min-h-20 border-b border-white/[0.06] pb-3 text-center">
        <h3 className="font-serif text-base font-bold text-text-primary">
          {title}
        </h3>
      </header>
      <div className="mt-4">{children}</div>
    </section>
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
        <div className="grid grid-cols-[2rem_minmax(0,1fr)_2rem] items-center gap-2 sm:block">
          <button
            type="button"
            onClick={onPrevious}
            disabled={activeIndex === 0}
            className="flex h-8 w-8 items-center justify-center rounded-sm border border-white/10 text-text-secondary hover:border-accent/40 hover:bg-accent/[0.08] hover:text-accent active:bg-accent/[0.15] disabled:pointer-events-none disabled:border-white/[0.04] disabled:text-white/15 sm:hidden"
            aria-label={t("personaMatchPrevious")}
          >
            <ArrowLeft size={18} strokeWidth={1.8} />
          </button>

          <div className="min-w-0">
            <div className="relative inline-block">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-accent md:text-sm font-cinzel">
                {t("personaMatches")}
              </p>
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="absolute start-[calc(100%+6px)] top-1/2 -translate-y-1/2 text-text-secondary hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                aria-label={t("showSimilarityFormula")}
                aria-expanded={open}
              >
                <Info size={14} />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={onNext}
            disabled={activeIndex === total - 1}
            className="flex h-8 w-8 items-center justify-center rounded-sm border border-white/10 text-text-secondary hover:border-accent/40 hover:bg-accent/[0.08] hover:text-accent active:bg-accent/[0.15] disabled:pointer-events-none disabled:border-white/[0.04] disabled:text-white/15 sm:hidden"
            aria-label={t("personaMatchNext")}
          >
            <ArrowRight size={18} strokeWidth={1.8} />
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
    border: "border-t-red-300/35",
    index: "text-red-200/70",
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
  borderClassName,
  borderStyle,
}: {
  axis: PersonaMatchEvidence["axis"];
  value: number;
  label: string;
  className?: string;
  borderClassName?: string;
  borderStyle?: CSSProperties;
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
        borderClassName,
        className,
      )}
      style={borderStyle}
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
        category === "opposite" && "!border-t-red-300/35",
        className,
      )}
    >
      <header className="relative min-h-20 border-b border-white/[0.06] pb-3 text-center">
        <h3 className="font-serif text-base font-bold text-text-primary">
          {copy.title}
        </h3>
        <p className="mt-1 text-balance break-keep text-xs leading-relaxed text-text-secondary">
          {copy.description}
        </p>
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
            avatarFrameClassName={
              category === "opposite" ? "ring-1 ring-red-300/55" : undefined
            }
            avatarFrameStyle={
              category === "opposite"
                ? { border: "2px solid #ef4444" }
                : undefined
            }
            className={cn(
              "w-full gap-2 md:w-full",
            )}
          >
            <span className={`${styles.comparisonMetric} font-mono`}>
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
                      borderClassName="border-red-300/55"
                      borderStyle={{ border: "1px solid #ef4444" }}
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

    </article>
  );
}

// ─── 덕목 바 (영향력 탭과 공유하는 공통 눈금) ───────

function MobileMatchButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 flex w-full items-center justify-between rounded-md border border-accent-dim/25 bg-accent/[0.025] px-3 py-2 text-xs font-bold text-accent-dim hover:border-accent/60 hover:bg-accent/[0.07] hover:text-accent active:bg-accent/[0.1] md:hidden"
    >
      <span>{label}</span>
      <ArrowRight size={15} aria-hidden />
    </button>
  );
}

function PersonaMatchGroupsModal({
  categories,
  subjectName,
  matchesByCategory,
  isEn,
  onClose,
  onOpenMatch,
}: {
  categories: PersonaMatchCategory[];
  subjectName: string;
  matchesByCategory: PersonaMatchGroups;
  isEn: boolean;
  onClose: () => void;
  onOpenMatch: (category: PersonaMatchCategory, match: PersonaMatch) => void;
}) {
  const t = useTranslations("celebPage");
  const titleId = useId();
  const [activeIndex, setActiveIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const scrollToCategory = (nextIndex: number) => {
    const boundedIndex = Math.max(0, Math.min(categories.length - 1, nextIndex));
    const target = carouselRef.current?.children[boundedIndex] as
      | HTMLElement
      | undefined;
    if (!target || !carouselRef.current) return;
    const container = carouselRef.current;
    const targetLeft =
      target.getBoundingClientRect().left -
      container.getBoundingClientRect().left +
      container.scrollLeft;
    container.scrollTo({ left: targetLeft, behavior: "smooth" });
    setActiveIndex(boundedIndex);
  };

  const syncIndex = () => {
    const container = carouselRef.current;
    if (!container) return;
    const cards = Array.from(container.children) as HTMLElement[];
    const containerLeft = container.getBoundingClientRect().left;
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;
    cards.forEach((card, index) => {
      const distance = Math.abs(
        card.getBoundingClientRect().left - containerLeft,
      );
      if (distance < closestDistance) {
        closestIndex = index;
        closestDistance = distance;
      }
    });
    setActiveIndex(closestIndex);
  };

  const title =
    categories.length > 1
      ? t("personaMatches")
      : categories[0] === "ability"
        ? t("personaMatch_ability")
        : categories[0] === "virtue"
          ? t("personaMatch_virtue")
          : t("personaMatch_disposition");

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm animate-fade-in sm:p-4"
      style={{ zIndex: Z_INDEX.modal }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[88dvh] w-full max-w-xl flex-col overflow-hidden rounded-lg border border-white/10 bg-bg-main shadow-[0_24px_80px_rgba(0,0,0,0.6)]"
      >
        <header className="relative border-b border-white/[0.07] px-12 py-4 text-center">
          <h2 id={titleId} className="font-serif text-base font-bold text-text-primary">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={isEn ? "Close comparison" : "비교 닫기"}
            className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md border border-white/10 text-text-secondary hover:border-white/25 hover:bg-white/[0.06] hover:text-text-primary"
          >
            <X size={16} aria-hidden />
          </button>
        </header>

        {categories.length > 1 ? (
          <div className="flex items-center justify-center gap-2 border-b border-white/[0.06] py-2">
            <button
              type="button"
              onClick={() => scrollToCategory(activeIndex - 1)}
              disabled={activeIndex === 0}
              aria-label={isEn ? "Previous comparison" : "이전 비교"}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-accent-dim/25 text-accent-dim hover:border-accent/60 hover:bg-accent/[0.06] hover:text-accent disabled:opacity-20"
            >
              <ArrowLeft size={16} aria-hidden />
            </button>
            <span className="min-w-12 text-center font-mono text-xs text-text-secondary">
              {activeIndex + 1} / {categories.length}
            </span>
            <button
              type="button"
              onClick={() => scrollToCategory(activeIndex + 1)}
              disabled={activeIndex === categories.length - 1}
              aria-label={isEn ? "Next comparison" : "다음 비교"}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-accent-dim/25 text-accent-dim hover:border-accent/60 hover:bg-accent/[0.06] hover:text-accent disabled:opacity-20"
            >
              <ArrowRight size={16} aria-hidden />
            </button>
          </div>
        ) : null}

        <div className="overflow-y-auto overscroll-contain p-3 [overflow-anchor:none] custom-scrollbar">
          <div
            ref={carouselRef}
            onScroll={syncIndex}
            className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth scrollbar-hide"
          >
            {categories.map((category) => (
              <PersonaMatchGroup
                key={category}
                category={category}
                subjectName={subjectName}
                matches={matchesByCategory[category]}
                onOpen={(match) => onOpenMatch(category, match)}
                className="w-full shrink-0 snap-start"
              />
            ))}
          </div>
        </div>
      </section>
    </div>,
    document.body,
  );
}

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

interface VirtueSummaryItem {
  key: StatKey;
  label: string;
  value: number;
  reason?: string;
}

function VirtueSummaryGroup({
  title,
  items,
  showReason,
}: {
  title: string;
  items: VirtueSummaryItem[];
  showReason: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="border-b border-white/[0.07] bg-white/[0.018] px-3 py-1.5">
        <p className="text-center text-xs font-bold tracking-[0.12em] text-accent/75">
          {title}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-px bg-white/[0.07]">
        {items.map((item) => (
          <div
            key={item.key}
            className="flex min-w-0 items-center justify-between gap-2 bg-[color:var(--material-panel,var(--color-bg-card))] px-2 py-1.5"
          >
            <span className="min-w-0 truncate text-xs text-text-secondary">
              {item.label}
            </span>
            <span className="relative flex h-6 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[2px] border border-white/10 bg-black/20">
              <span
                aria-hidden
                className={cn(
                  "absolute inset-y-0 start-0 border-e transition-[width] duration-700 ease-out",
                  item.value >= 80
                    ? "border-accent/30 bg-accent/20"
                    : item.value >= 60
                      ? "border-accent/20 bg-accent/[0.12]"
                      : "border-white/10 bg-white/[0.055]",
                )}
                style={{ width: `${item.value}%` }}
              />
              <strong
                className={cn(
                  "relative z-10 font-serif text-xs tabular-nums",
                  item.value >= 80
                    ? "text-accent"
                    : item.value >= 60
                      ? "text-text-primary"
                      : "text-text-secondary",
                )}
              >
                {item.value}
              </strong>
            </span>
          </div>
        ))}
      </div>

      {showReason ? (
        <div className="grid gap-x-5 gap-y-2 border-t border-white/[0.07] px-3 py-3 sm:grid-cols-2">
          {items.map((item) =>
            item.reason ? (
              <p
                key={item.key}
                className="text-xs leading-relaxed text-text-secondary"
              >
                <span className="me-1.5 font-bold text-text-primary/80">
                  {item.label}
                </span>
                {item.reason}
              </p>
            ) : null,
          )}
        </div>
      ) : null}
    </div>
  );
}

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
  const [dispositionCompareIndex, setDispositionCompareIndex] = useState(0);
  const dispositionCompareRef = useRef<HTMLDivElement>(null);
  const [mobileMatchCategories, setMobileMatchCategories] = useState<
    PersonaMatchCategory[] | null
  >(null);
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
  const dispositionCompareCategories = (
    ["disposition", "opposite"] as PersonaMatchCategory[]
  ).filter((category) => matchesByCategory[category].length > 0);

  const scrollToDispositionComparison = (nextIndex: number) => {
    const boundedIndex = Math.max(
      0,
      Math.min(dispositionCompareCategories.length - 1, nextIndex),
    );
    const container = dispositionCompareRef.current;
    const target = container?.children[boundedIndex] as HTMLElement | undefined;

    if (container && target) {
      const targetLeft =
        target.getBoundingClientRect().left -
        container.getBoundingClientRect().left +
        container.scrollLeft;
      container.scrollTo({ left: targetLeft, behavior: "smooth" });
      setDispositionCompareIndex(boundedIndex);
    }
  };

  const syncDispositionCompareIndex = () => {
    const container = dispositionCompareRef.current;
    if (!container) return;

    const cards = Array.from(container.children) as HTMLElement[];
    const containerLeft = container.getBoundingClientRect().left;
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    cards.forEach((card, index) => {
      const distance = Math.abs(
        card.getBoundingClientRect().left - containerLeft,
      );
      if (distance < closestDistance) {
        closestIndex = index;
        closestDistance = distance;
      }
    });

    setDispositionCompareIndex((current) =>
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
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:items-stretch">
          <MetricPanel title={t("ability")} tone="border-t-emerald-300/35">
            <div className="space-y-2">
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
              {matchesByCategory.ability.length > 0 ? (
                <MobileMatchButton
                  label={t("personaMatch_ability")}
                  onClick={() => setMobileMatchCategories(["ability"])}
                />
              ) : null}
            </div>
          </MetricPanel>
          {matchesByCategory.ability.length > 0 ? (
            <div className="hidden min-w-0 md:block">
              <PersonaMatchGroup
                category="ability"
                subjectName={persona.nickname}
                matches={matchesByCategory.ability}
                onOpen={(match) =>
                  setSelectedMatch({ category: "ability", match })
                }
                className="h-full"
              />
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:items-stretch md:border-t md:border-white/5 md:pt-6">
          <MetricPanel title={t("coreDisposition")} tone="border-t-blue-400/35">
            <div className="space-y-2">
              {TENDENCY_KEYS.map((key) => (
                <TendencyBar
                  key={key}
                  neg={tendencyLabels[key][0]}
                  pos={tendencyLabels[key][1]}
                  value={persona[key]}
                  reason={localizePersonaText(
                    getReasonFromJsonb(
                      personaJsonb,
                      "dispositions",
                      key,
                      locale,
                    ),
                    locale,
                  )}
                  isEn={isEn}
                  showReason={showDetail}
                />
              ))}
              {dispositionCompareCategories.length > 0 ? (
                <MobileMatchButton
                  label={t("personaMatches")}
                  onClick={() =>
                    setMobileMatchCategories(dispositionCompareCategories)
                  }
                />
              ) : null}
            </div>
          </MetricPanel>
          {dispositionCompareCategories.length > 0 ? (
            <div className="relative hidden min-w-0 md:block">
              <div className="absolute end-3 top-3 z-20 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    scrollToDispositionComparison(dispositionCompareIndex - 1)
                  }
                  disabled={dispositionCompareIndex === 0}
                  aria-label={
                    isEn
                      ? "Previous disposition comparison"
                      : "이전 성향 비교"
                  }
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-accent-dim/30 bg-bg-main/70 text-accent-dim hover:border-accent/70 hover:bg-accent/[0.1] hover:text-accent disabled:cursor-default disabled:opacity-20"
                >
                  <ArrowLeft size={16} aria-hidden />
                </button>
                <span className="min-w-8 text-center font-mono text-[10px] text-text-secondary">
                  {dispositionCompareIndex + 1} / {dispositionCompareCategories.length}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    scrollToDispositionComparison(dispositionCompareIndex + 1)
                  }
                  disabled={
                    dispositionCompareIndex ===
                    dispositionCompareCategories.length - 1
                  }
                  aria-label={
                    isEn ? "Next disposition comparison" : "다음 성향 비교"
                  }
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-accent-dim/30 bg-bg-main/70 text-accent-dim hover:border-accent/70 hover:bg-accent/[0.1] hover:text-accent disabled:cursor-default disabled:opacity-20"
                >
                  <ArrowRight size={16} aria-hidden />
                </button>
              </div>
              <div
                ref={dispositionCompareRef}
                onScroll={syncDispositionCompareIndex}
                className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth scrollbar-hide"
              >
                {dispositionCompareCategories.map((category) => (
                  <PersonaMatchGroup
                    key={category}
                    category={category}
                    subjectName={persona.nickname}
                    matches={matchesByCategory[category]}
                    onOpen={(match) => setSelectedMatch({ category, match })}
                    className="w-full shrink-0 snap-start"
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>

      {/* 내면·외적 덕목 */}
        <div className="grid grid-cols-1 gap-6 border-t border-white/5 pt-6 md:grid-cols-2 md:items-stretch">
          <MetricPanel title={t("virtue")} tone="border-t-amber-300/35">
            <div className="grid grid-cols-2 overflow-hidden rounded-sm border border-white/[0.08] bg-white/[0.012]">
          <VirtueSummaryGroup
            title={t("innerVirtue")}
            showReason={showDetail}
            items={INNER_VIRTUE_KEYS.map((key) => ({
              key,
              label: ts(key),
              value: persona[key],
              reason: localizePersonaText(
                getReasonFromJsonb(
                  personaJsonb,
                  "inner_virtues",
                  key,
                  locale,
                ),
                locale,
              ),
            }))}
          />
          <div className="border-s border-white/[0.08]">
            <VirtueSummaryGroup
              title={t("outerVirtue")}
              showReason={showDetail}
              items={OUTER_VIRTUE_KEYS.map((key) => ({
                key,
                label: ts(key),
                value: persona[key],
                reason: localizePersonaText(
                  getReasonFromJsonb(
                    personaJsonb,
                    "outer_virtues",
                    key,
                    locale,
                  ),
                  locale,
                ),
              }))}
            />
          </div>
            </div>
            {matchesByCategory.virtue.length > 0 ? (
              <MobileMatchButton
                label={t("personaMatch_virtue")}
                onClick={() => setMobileMatchCategories(["virtue"])}
              />
            ) : null}
          </MetricPanel>
          {matchesByCategory.virtue.length > 0 ? (
            <div className="hidden min-w-0 md:block">
              <PersonaMatchGroup
                category="virtue"
                subjectName={persona.nickname}
                matches={matchesByCategory.virtue}
                onOpen={(match) =>
                  setSelectedMatch({ category: "virtue", match })
                }
                className="h-full"
              />
            </div>
          ) : null}
        </div>
      </div>

      {/* 지표별 비교 인물 */}
      {matchesByCategory.overall.length > 0 ? (
        <div className="border-t border-white/5 pt-7">
          <PersonaMatchGroup
            category="overall"
            subjectName={persona.nickname}
            matches={matchesByCategory.overall}
            onOpen={(match) =>
              setSelectedMatch({ category: "overall", match })
            }
          />
        </div>
      ) : null}

      {mobileMatchCategories ? (
        <PersonaMatchGroupsModal
          categories={mobileMatchCategories}
          subjectName={persona.nickname}
          matchesByCategory={matchesByCategory}
          isEn={isEn}
          onClose={() => setMobileMatchCategories(null)}
          onOpenMatch={(category, match) => {
            setMobileMatchCategories(null);
            setSelectedMatch({ category, match });
          }}
        />
      ) : null}

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
