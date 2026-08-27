"use client";

import {
  useState,
  useEffect,
  useId,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, X } from "lucide-react";

import CelebDetailModal from "@/components/features/celeb/modals/CelebDetailModal";
import { Carousel } from "@/components/ui";
import AbilityStatList from "./AbilityStatList";
import DispositionStatList from "./DispositionStatList";
import VirtueStatList from "./VirtueStatList";
import type { SimilarByCelebResult } from "@/actions/spectrum/getSimilarByCelebId";
import {
  ABILITY_KEYS,
  INNER_VIRTUE_KEYS,
  OUTER_VIRTUE_KEYS,
  TENDENCY_KEYS,
  type StatKey,
  type TendencyKey,
} from "@/lib/spectrum/constants";
import { localizeSpectrumText } from "@/lib/spectrum/localizeText";
import type { SpectrumJsonb, SpectrumField } from "@/lib/spectrum/types";
import { Z_INDEX } from "@/constants/zIndex";
import type {
  SpectrumMatch,
  SpectrumMatchCategory,
  SpectrumMatchEvidence,
  SpectrumMatchGroups,
} from "@/lib/spectrum/utils";
import { cn } from "@/lib/utils";
import styles from "./CelebPageContent.module.css";

import CelebPersonPreviewButton from "./CelebPersonPreviewButton";
import SpectrumMatchModal from "./SpectrumMatchModal";
import { useCelebPreview } from "./useCelebPreview";

// ─── 유틸 ───────────────────────────────────────────

function getReasonFromJsonb(
  jsonb: SpectrumJsonb | null,
  group: "abilities" | "inner_virtues" | "outer_virtues" | "dispositions",
  key: string,
  locale: string,
): string | undefined {
  if (!jsonb) return undefined;
  const field = (jsonb[group] as Record<string, SpectrumField>)?.[key];
  if (!field) return undefined;
  return locale === "en" && field.reason_en ? field.reason_en : field.reason_ko;
}

function getRationale(
  jsonb: SpectrumJsonb | null,
  locale: string,
): string | undefined {
  if (!jsonb) return undefined;
  return locale === "en" && jsonb.rationale_en
    ? jsonb.rationale_en
    : jsonb.rationale_ko;
}

// ─── 섹션 헤더 ──────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  const locale = useLocale();
  return (
    <div className="flex justify-center text-center w-full mb-4">
      {/* 영문 대문자에는 넓은 자간이 어울리지만 한글은 같은 값에서 글자가 하나씩 떨어져 보인다 */}
      <p
        className={cn(
          "text-xs md:text-sm text-accent font-cinzel uppercase font-bold",
          locale === "en" ? "tracking-[0.3em]" : "tracking-[0.06em]", /* i18n-audit-ignore — 로케일별 자간 보정 */
        )}
      >
        {title}
      </p>
    </div>
  );
}

function MetricPanel({
  title,
  description,
  tone,
  children,
}: {
  title: string;
  description: string;
  tone: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-[2px] border border-white/[0.08] border-t bg-white/[0.018] px-3 py-4 md:px-5 md:py-5",
        tone,
      )}
    >
      {/* 좁은 화면에서는 제목이 넘김 단추 줄에 이미 있어 설명만 남긴다 */}
      <header className="border-b border-white/[0.06] pb-3 text-center md:min-h-20">
        <h3 className="hidden font-serif text-base font-bold text-text-primary md:block">
          {title}
        </h3>
        <p className="text-balance break-keep text-sm leading-relaxed text-text-secondary md:mt-1">
          {description}
        </p>
      </header>
      {/* 넘길 때 아래 단추가 들썩이지 않도록 남는 높이를 본문이 먹는다 */}
      <div className="mt-4 flex flex-1 flex-col">{children}</div>
    </section>
  );
}

const MATCH_CATEGORY_TITLE_KEYS = {
  overall: "spectrumMatch_overall",
  disposition: "spectrumMatch_disposition",
  virtue: "spectrumMatch_virtue",
  ability: "spectrumMatch_ability",
  opposite: "spectrumMatch_opposite",
} as const;

const MATCH_CATEGORY_STYLES: Record<
  SpectrumMatchCategory,
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

function SpectrumEvidenceChip({
  axis,
  value,
  label,
  direction,
  className,
  borderClassName,
  borderStyle,
}: {
  axis: SpectrumMatchEvidence["axis"];
  value: number;
  label: string;
  /** 능력·덕목 근거 — 함께 높아서(high) 닮았는지 함께 낮아서(low) 닮았는지 */
  direction?: SpectrumMatchEvidence["direction"];
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
        "inline-flex min-h-6 max-w-full items-center justify-center gap-0.5 overflow-hidden whitespace-nowrap rounded-[4px] border px-2 py-1 font-sans text-xs font-semibold leading-none tracking-[-0.01em] shadow-[0_1px_5px_rgba(0,0,0,0.12)] md:text-[13px]",
        color,
        borderClassName,
        className,
      )}
      style={borderStyle}
    >
      <span className="truncate">{label}</span>
      {direction ? (
        <span aria-hidden className="shrink-0 opacity-80">
          {direction === "high" ? "↑" : "↓"}
        </span>
      ) : null}
    </span>
  );
}

function SpectrumMatchGroup({
  category,
  subjectName,
  matches,
  onOpen,
  bare = false,
  className,
}: {
  category: SpectrumMatchCategory;
  subjectName: string;
  matches: SpectrumMatch[];
  onOpen: (match: SpectrumMatch) => void;
  /** 겹창 안에 놓일 때 — 상자와 제목은 겹창이 이미 쥐고 있다 */
  bare?: boolean;
  className?: string;
}) {
  const t = useTranslations("celebPage");
  const ts = useTranslations("shared.spectrum.stat");
  const tl = useTranslations("shared.spectrum.tendency_label");
  const style = MATCH_CATEGORY_STYLES[category];
  const copy = (() => {
    switch (category) {
      case "overall":
        return {
          title: t("spectrumMatch_overall"),
          description: t("spectrumMatch_overallDesc"),
          insight: t("spectrumMatch_overallInsight"),
        };
      case "disposition":
        return {
          title: t("spectrumMatch_disposition"),
          description: t("spectrumMatch_dispositionDesc"),
          insight: t("spectrumMatch_dispositionInsight"),
        };
      case "virtue":
        return {
          title: t("spectrumMatch_virtue"),
          description: t("spectrumMatch_virtueDesc"),
          insight: t("spectrumMatch_virtueInsight"),
        };
      case "ability":
        return {
          title: t("spectrumMatch_ability"),
          description: t("spectrumMatch_abilityDesc"),
          insight: t("spectrumMatch_abilityInsight", { name: subjectName }),
        };
      case "opposite":
        return {
          title: t("spectrumMatch_opposite"),
          description: t("spectrumMatch_oppositeDesc"),
          insight: t("spectrumMatch_oppositeInsight"),
        };
    }
  })();

  const formatEvidence = (evidence: SpectrumMatchEvidence): string => {
    const tendencyLabels =
      TENDENCY_EVIDENCE_LABELS[evidence.axis as TendencyKey];

    if (tendencyLabels) {
      const [negativeKey, positiveKey] = tendencyLabels;
      return tl(evidence.targetValue < 0 ? negativeKey : positiveKey);
    }

    return ts(evidence.axis as StatKey);
  };

  const formatOppositeValue = (
    evidence: SpectrumMatchEvidence,
    value: number,
  ): string => {
    const [negativeKey, positiveKey] =
      TENDENCY_EVIDENCE_LABELS[evidence.axis as TendencyKey];
    return tl(value < 0 ? negativeKey : positiveKey);
  };

  return (
    <article
      className={cn(
        "relative overflow-hidden",
        bare
          ? "px-0"
          : [
              "rounded-[2px] border border-white/[0.08] border-t bg-white/[0.018] px-3 py-4 md:px-5 md:py-5",
              style.border,
              category === "overall" &&
                "bg-[linear-gradient(105deg,rgba(255,255,255,0.025),transparent_65%)]",
              category === "opposite" && "!border-t-red-300/35",
            ],
        className,
      )}
    >
      <header
        className={cn(
          "relative text-center",
          bare
            ? "pb-1"
            : "min-h-20 border-b border-white/[0.06] pb-3",
        )}
      >
        {bare ? null : (
          <h3 className="font-serif text-base font-bold text-text-primary">
            {copy.title}
          </h3>
        )}
        <p
          className={cn(
            "text-balance break-keep text-[13px] font-medium leading-relaxed text-text-primary/65 md:text-sm",
            !bare && "mt-1",
          )}
        >
          {copy.description}
        </p>
      </header>

      <div
        className={cn(
          "relative mt-3 grid grid-cols-3 items-stretch gap-2 md:gap-3",
          category === "overall" && "mx-auto max-w-md",
        )}
      >
        {matches.map((celeb) => (
          <CelebPersonPreviewButton
            key={celeb.celeb_id}
            name={celeb.nickname}
            avatarUrl={celeb.avatar_url}
            onClick={() => onOpen(celeb)}
            size="featured"
            fullWidth
            avatarFrameClassName={
              category === "opposite" ? "ring-1 ring-red-300/55" : undefined
            }
            avatarFrameStyle={
              category === "opposite"
                ? { border: "2px solid #ef4444" }
                : undefined
            }
            className="h-full gap-2 border-white/[0.07] bg-white/[0.018] px-1.5 py-3 hover:border-accent/45 hover:bg-accent/[0.055] md:px-2 md:py-3.5"
          >
            <span className={`${styles.comparisonMetric} font-mono`}>
              {t(
                category === "opposite"
                  ? "spectrumClashPercent"
                  : "spectrumMatchPercent",
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
                    <SpectrumEvidenceChip
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
                      className="relative z-10 block w-full text-center text-[11px] text-rose-200/45"
                    >
                      ↔
                    </span>
                    <SpectrumEvidenceChip
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
              <span className="mt-1 flex min-h-9 w-full flex-wrap content-start justify-center gap-1.5">
                {celeb.evidence.map((evidence) => (
                  <SpectrumEvidenceChip
                    key={evidence.axis}
                    axis={evidence.axis}
                    value={evidence.targetValue}
                    label={formatEvidence(evidence)}
                    direction={evidence.direction}
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
  className,
}: {
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "mt-3 flex w-full items-center justify-center gap-1.5 rounded-md border border-accent/45 bg-accent/[0.1] px-3 py-2.5 text-center text-sm font-bold text-accent hover:border-accent hover:bg-accent/[0.18] active:bg-accent/[0.24] md:hidden",
        className,
      )}
    >
      <span className="min-w-0 truncate">{label}</span>
      <ArrowRight size={14} aria-hidden className="shrink-0 opacity-70" />
    </button>
  );
}

function SpectrumMatchGroupsModal({
  categories,
  subjectName,
  matchesByCategory,
  suspended,
  onClose,
  onOpenMatch,
}: {
  categories: SpectrumMatchCategory[];
  subjectName: string;
  matchesByCategory: SpectrumMatchGroups;
  /** 비교 상세 모달이 위에 떠 있는 동안에는 닫기 조작을 받지 않는다 */
  suspended: boolean;
  onClose: () => void;
  onOpenMatch: (category: SpectrumMatchCategory, match: SpectrumMatch) => void;
}) {
  const t = useTranslations("celebPage");
  const titleId = useId();

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (suspended) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, suspended]);

  const title =
    categories.length > 1
      ? t("spectrumMatches")
      : t(MATCH_CATEGORY_TITLE_KEYS[categories[0]]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm animate-fade-in sm:p-4"
      style={{ zIndex: Z_INDEX.modal }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !suspended) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[88dvh] w-full max-w-[540px] flex-col overflow-hidden rounded-lg border border-white/10 bg-bg-main shadow-[0_24px_80px_rgba(0,0,0,0.6)]"
      >
        <header className="relative border-b border-white/[0.07] px-12 py-3.5 text-center">
          <h2 id={titleId} className="font-serif text-lg font-bold text-text-primary">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("spectrumMatchModalClose")}
            className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md border border-white/10 text-text-secondary hover:border-white/25 hover:bg-white/[0.06] hover:text-text-primary"
          >
            <X size={16} aria-hidden />
          </button>
        </header>

        <div className="overflow-y-auto overscroll-contain p-2.5 [overflow-anchor:none] custom-scrollbar md:p-3">
          <Carousel
            labels={{
              previous: t("carouselComparePrev"),
              next: t("carouselCompareNext"),
              dot: (index, count) => t("carouselDot", { index, count }),
            }}
            tabLabels={
              categories.length > 1
                ? categories.map((category) =>
                    t(MATCH_CATEGORY_TITLE_KEYS[category]),
                  )
                : undefined
            }
          >
            {categories.map((category) => (
              <SpectrumMatchGroup
                key={category}
                category={category}
                subjectName={subjectName}
                matches={matchesByCategory[category]}
                onOpen={(match) => onOpenMatch(category, match)}
                bare
              />
            ))}
          </Carousel>
        </div>
      </section>
    </div>,
    document.body,
  );
}

// ─── 메인 컴포넌트 ──────────────────────────────────

interface SpectrumSectionProps {
  spectrum: NonNullable<SimilarByCelebResult["targetSpectrum"]>;
  spectrumJsonb: SpectrumJsonb | null;
  matchesByCategory: SpectrumMatchGroups;
  highlights: SimilarByCelebResult["highlights"];
  population: number;
}

export default function SpectrumSection({
  spectrum,
  spectrumJsonb,
  matchesByCategory,
  highlights,
  population,
}: SpectrumSectionProps) {
  const t = useTranslations("celebPage");
  const ts = useTranslations("shared.spectrum.stat");
  const tl = useTranslations("shared.spectrum.tendency_label");
  const locale = useLocale();
  const {
    celeb: previewCeleb,
    loadingId,
    openCelebPreview,
    closeCelebPreview,
  } = useCelebPreview("spectrum");
  const [mobileMatchCategories, setMobileMatchCategories] = useState<
    SpectrumMatchCategory[] | null
  >(null);
  const [selectedMatch, setSelectedMatch] = useState<{
    category: SpectrumMatchCategory;
    match: SpectrumMatch;
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
  const rationale = localizeSpectrumText(
    getRationale(spectrumJsonb, locale),
    locale,
  );
  const dispositionCompareCategories = (
    ["disposition", "opposite"] as SpectrumMatchCategory[]
  ).filter((category) => matchesByCategory[category].length > 0);

  const abilityPanel = (
    <MetricPanel
      title={t("ability")}
      description={t("abilityDesc")}
      tone="border-t-emerald-300/35"
    >
      <div className="flex flex-1 flex-col gap-2">
        <AbilityStatList
          isEn={isEn}
          items={ABILITY_KEYS.map((key) => ({
            key,
            label: ts(key),
            value: spectrum[key],
            reason: localizeSpectrumText(
              getReasonFromJsonb(spectrumJsonb, "abilities", key, locale),
              locale,
            ),
          }))}
        />
        {matchesByCategory.ability.length > 0 ? (
          <div className="mt-auto">
            <MobileMatchButton
              label={t("spectrumMatchButton_ability")}
              onClick={() => setMobileMatchCategories(["ability"])}
            />
          </div>
        ) : null}
      </div>
    </MetricPanel>
  );

  const dispositionPanel = (
    <MetricPanel
      title={t("coreDisposition")}
      description={t("coreDispositionDesc")}
      tone="border-t-blue-400/35"
    >
      <div className="flex flex-1 flex-col gap-2">
        <DispositionStatList
          isEn={isEn}
          items={TENDENCY_KEYS.map((key) => ({
            key,
            neg: tendencyLabels[key][0],
            pos: tendencyLabels[key][1],
            value: spectrum[key],
            reason: localizeSpectrumText(
              getReasonFromJsonb(spectrumJsonb, "dispositions", key, locale),
              locale,
            ),
          }))}
        />
        {dispositionCompareCategories.length > 0 ? (
          <div className="mt-auto">
            <MobileMatchButton
              label={t("spectrumMatchButton_disposition")}
              onClick={() =>
                setMobileMatchCategories(dispositionCompareCategories)
              }
            />
          </div>
        ) : null}
      </div>
    </MetricPanel>
  );

  const virtuePanel = (
    <MetricPanel
      title={t("virtue")}
      description={t("virtueDesc")}
      tone="border-t-amber-300/35"
    >
      <VirtueStatList
        innerTitle={t("innerVirtue")}
        outerTitle={t("outerVirtue")}
        innerItems={INNER_VIRTUE_KEYS.map((key) => ({
          key,
          label: ts(key),
          value: spectrum[key],
          reason: localizeSpectrumText(
            getReasonFromJsonb(spectrumJsonb, "inner_virtues", key, locale),
            locale,
          ),
        }))}
        outerItems={OUTER_VIRTUE_KEYS.map((key) => ({
          key,
          label: ts(key),
          value: spectrum[key],
          reason: localizeSpectrumText(
            getReasonFromJsonb(spectrumJsonb, "outer_virtues", key, locale),
            locale,
          ),
        }))}
      />
      {matchesByCategory.virtue.length > 0 ? (
        <div className="mt-auto">
          <MobileMatchButton
            label={t("spectrumMatchButton_virtue")}
            onClick={() => setMobileMatchCategories(["virtue"])}
          />
        </div>
      ) : null}
    </MetricPanel>
  );

  const metricPanels = [
    { key: "ability", label: t("ability"), node: abilityPanel },
    { key: "disposition", label: t("coreDisposition"), node: dispositionPanel },
    { key: "virtue", label: t("virtue"), node: virtuePanel },
  ];

  /** 지문 항목 문구 — 능력·덕목은 상·하위, 성향은 치우친 쪽 라벨의 극단 백분위 */
  const formatHighlight = (
    highlight: SimilarByCelebResult["highlights"][number],
  ): string => {
    const tendencyLabelKeys =
      TENDENCY_EVIDENCE_LABELS[highlight.axis as TendencyKey];
    if (tendencyLabelKeys) {
      const [negativeKey, positiveKey] = tendencyLabelKeys;
      return t("spectrumHighlight_high", {
        axis: tl(highlight.direction === "high" ? positiveKey : negativeKey),
        percent: highlight.percentile,
      });
    }
    return t(
      highlight.direction === "high"
        ? "spectrumHighlight_high"
        : "spectrumHighlight_low",
      { axis: ts(highlight.axis as StatKey), percent: highlight.percentile },
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

      {/* 인물 지문 — 전체 인물 중 이 사람이 유별난 지점 */}
      {highlights.length > 0 && population > 0 ? (
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 px-4">
          <span className="text-xs text-text-secondary">
            {t("spectrumHighlightAmong", { count: population })}
          </span>
          {highlights.map((highlight) => (
            <SpectrumEvidenceChip
              key={highlight.axis}
              axis={highlight.axis}
              value={highlight.value}
              label={formatHighlight(highlight)}
            />
          ))}
        </div>
      ) : null}

      {/* 능력·성향·덕목 근거는 각 항목을 눌러 연다 */}
      {/* 좁은 화면 — 능력·성향·덕목을 옆으로 넘겨본다 */}
      <div className="md:hidden">
        <Carousel
          isolateInactiveSlides
          labels={{
            previous: t("carouselMetricPrev"),
            next: t("carouselMetricNext"),
            dot: (index, count) => t("carouselDot", { index, count }),
          }}
          tabLabels={metricPanels.map((panel) => panel.label)}
        >
          {metricPanels.map((panel) => (
            <div key={panel.key}>{panel.node}</div>
          ))}
        </Carousel>

        {/* 어느 지표를 보고 있든 함께 뜬다 */}
        {matchesByCategory.overall.length > 0 ? (
          <div className="px-3">
            <MobileMatchButton
              label={t("spectrumMatchButton_overall")}
              onClick={() => setMobileMatchCategories(["overall"])}
            />
          </div>
        ) : null}
      </div>

      {/* 넓은 화면 — 지표와 비교 인물을 나란히 */}
      <div className="hidden space-y-6 md:block">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:items-stretch">
          {abilityPanel}
          {matchesByCategory.ability.length > 0 ? (
            <div className="hidden min-w-0 md:block">
              <SpectrumMatchGroup
                category="ability"
                subjectName={spectrum.nickname}
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
          {dispositionPanel}
          {dispositionCompareCategories.length > 0 ? (
            <div className="hidden min-w-0 md:block">
              <Carousel
                labels={{
                  previous: t("carouselDispositionPrev"),
                  next: t("carouselDispositionNext"),
                  dot: (index, count) => t("carouselDot", { index, count }),
                }}
                arrowsAlign="top"
                showDots={false}
              >
                {dispositionCompareCategories.map((category) => (
                  <SpectrumMatchGroup
                    key={category}
                    category={category}
                    subjectName={spectrum.nickname}
                    matches={matchesByCategory[category]}
                    onOpen={(match) => setSelectedMatch({ category, match })}
                    className="h-full"
                  />
                ))}
              </Carousel>
            </div>
          ) : null}
        </div>

        {/* 내면·외적 덕목 */}
        <div className="grid grid-cols-1 gap-6 border-t border-white/5 pt-6 md:grid-cols-2 md:items-stretch">
          {virtuePanel}
          {matchesByCategory.virtue.length > 0 ? (
            <div className="hidden min-w-0 md:block">
              <SpectrumMatchGroup
                category="virtue"
                subjectName={spectrum.nickname}
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

      {/* 전체 스펙트럼 유사 인물 — 좁은 화면에서는 위 단추로 대신한다 */}
      {matchesByCategory.overall.length > 0 ? (
        <div className="hidden border-t border-white/5 pt-7 md:block">
          <SpectrumMatchGroup
            category="overall"
            subjectName={spectrum.nickname}
            matches={matchesByCategory.overall}
            onOpen={(match) => setSelectedMatch({ category: "overall", match })}
          />
        </div>
      ) : null}

      {mobileMatchCategories ? (
        <SpectrumMatchGroupsModal
          categories={mobileMatchCategories}
          subjectName={spectrum.nickname}
          matchesByCategory={matchesByCategory}
          suspended={selectedMatch !== null || previewCeleb !== null}
          onClose={() => setMobileMatchCategories(null)}
          onOpenMatch={(category, match) =>
            setSelectedMatch({ category, match })
          }
        />
      ) : null}

      {selectedMatch && (
        <SpectrumMatchModal
          key={selectedMatch.match.celeb_id}
          category={selectedMatch.category}
          match={selectedMatch.match}
          subjectName={spectrum.nickname}
          subjectAvatarUrl={spectrum.avatar_url}
          subjectSpectrumJsonb={spectrumJsonb}
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
