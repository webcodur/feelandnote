/* ─────────────────────────────────────────────
 * [celeb 상세] spectrum — 분류별 비교 인물 묶음 카드
 * - 목차 위치: spectrum(분석 구획, service key `spectrum` / sectionId `analysis`)
 * - 데이터: category·subjectName·matches(SpectrumMatch[])·onOpen·bare
 * - 함께 보기: SpectrumEvidence.tsx, SpectrumMatchGroupsModal.tsx, SpectrumSectionMain.tsx
 * ───────────────────────────────────────────── */
"use client";

import { useTranslations } from "next-intl";

import type {
  SpectrumMatch,
  SpectrumMatchCategory,
} from "@/lib/spectrum/utils";
import { cn } from "@/lib/utils";
import CelebPersonPreviewButton from "../CelebPersonPreviewButton";
import styles from "../CelebPageContent.module.css";
import {
  SpectrumEvidenceChip,
  formatMatchEvidenceLabel,
  formatOppositeEvidenceLabel,
} from "./SpectrumEvidence";

/* ── 1. 분류별 제목 키 ── */

export const MATCH_CATEGORY_TITLE_KEYS = {
  overall: "spectrumMatch_overall",
  disposition: "spectrumMatch_disposition",
  virtue: "spectrumMatch_virtue",
  ability: "spectrumMatch_ability",
  opposite: "spectrumMatch_opposite",
} as const;

/* ── 2. 분류별 강조선 ── */

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

/* ── 3. 비교 인물 묶음 ── */

export function SpectrumMatchGroup({
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
            className="h-full border-white/[0.07] bg-white/[0.018] hover:border-accent/45 hover:bg-accent/[0.055]"
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
                      label={formatOppositeEvidenceLabel(
                        tl,
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
                      label={formatOppositeEvidenceLabel(
                        tl,
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
                    label={formatMatchEvidenceLabel(ts, tl, evidence)}
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
