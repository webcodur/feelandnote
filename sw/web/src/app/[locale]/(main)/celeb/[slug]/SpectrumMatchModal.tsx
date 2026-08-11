"use client";

import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Avatar } from "@/components/ui";
import { Z_INDEX } from "@/constants/zIndex";
import type {
  SpectrumMatch,
  SpectrumMatchCategory,
} from "@/lib/spectrum/utils";
import { cn } from "@/lib/utils";
import SpectrumComparisonGraphic from "./spectrum-comparison";
import {
  CANDIDATE_COLOR,
  SUBJECT_COLOR,
} from "./spectrum-comparison/shared";

const CATEGORY_STYLES: Record<
  SpectrumMatchCategory,
  { label: string; border: string; surface: string }
> = {
  overall: {
    label: "text-accent",
    border: "border-accent/30",
    surface: "bg-accent/[0.06]",
  },
  disposition: {
    label: "text-blue-200",
    border: "border-blue-300/25",
    surface: "bg-blue-400/[0.05]",
  },
  virtue: {
    label: "text-amber-200",
    border: "border-amber-300/25",
    surface: "bg-amber-400/[0.05]",
  },
  ability: {
    label: "text-emerald-200",
    border: "border-emerald-300/25",
    surface: "bg-emerald-400/[0.05]",
  },
  opposite: {
    label: "text-rose-200",
    border: "border-rose-300/25",
    surface: "bg-rose-400/[0.05]",
  },
};

const CATEGORY_TITLE_KEYS = {
  overall: "spectrumMatch_overall",
  disposition: "spectrumMatch_disposition",
  virtue: "spectrumMatch_virtue",
  ability: "spectrumMatch_ability",
  opposite: "spectrumMatch_opposite",
} as const;

interface SpectrumMatchModalProps {
  category: SpectrumMatchCategory;
  match: SpectrumMatch;
  subjectName: string;
  subjectAvatarUrl: string | null;
  loading: boolean;
  onClose: () => void;
  onViewPerson: () => void;
}

export default function SpectrumMatchModal({
  category,
  match,
  subjectName,
  subjectAvatarUrl,
  loading,
  onClose,
  onViewPerson,
}: SpectrumMatchModalProps) {
  const t = useTranslations("celebPage");
  const titleId = useId();
  const style = CATEGORY_STYLES[category];

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [loading, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm animate-fade-in md:p-6"
      style={{ zIndex: Z_INDEX.modal }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "relative flex max-h-[90vh] w-full flex-col overflow-hidden border border-white/10 bg-bg-main shadow-[0_24px_80px_rgba(0,0,0,0.55)] animate-modal-content",
          category === "overall" ? "max-w-[920px]" : "max-w-[680px]",
        )}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          aria-label={t("spectrumMatchModalClose")}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/25 text-text-secondary hover:border-white/25 hover:bg-white/[0.06] hover:text-text-primary disabled:cursor-wait disabled:opacity-40"
        >
          <X size={16} />
        </button>

        <header className="border-b border-white/[0.07] px-12 py-4 text-center md:px-14">
          <div className="flex flex-wrap items-baseline justify-center gap-x-4 gap-y-1">
            <p
              className={cn(
                "text-[13px] font-bold tracking-[0.12em]",
                style.label,
              )}
            >
              {t(CATEGORY_TITLE_KEYS[category])}
            </p>
            <h2
              id={titleId}
              className="font-serif text-2xl font-bold text-text-primary md:text-[28px]"
            >
              {t(
                category === "opposite"
                  ? "spectrumMatchModalOppositeTitle"
                  : "spectrumMatchModalTitle",
              )}
            </h2>
          </div>
          <p className="mt-1.5 text-balance break-keep text-sm font-medium leading-5 text-text-primary/80 md:text-[15px]">
            {t(
              category === "virtue"
                ? "spectrumMatchModalVirtueIntro"
                : "spectrumMatchModalIntro",
              {
                subject: subjectName,
                candidate: match.nickname,
              },
            )}
          </p>
        </header>

        <div className="overflow-y-auto px-4 py-4 custom-scrollbar md:px-6">
          <div className="relative grid grid-cols-[1fr_88px_1fr] items-start gap-2 md:grid-cols-[1fr_96px_1fr]">
            <div className="pointer-events-none absolute left-[20%] right-[20%] top-[42px] border-t border-dashed border-white/15" />

            <div className="relative z-[1] min-w-0 text-center">
              <div
                className="mx-auto inline-flex rounded-full border-[3px] bg-bg-main p-[3px] shadow-[0_0_20px_rgba(216,186,104,0.16)]"
                style={{ borderColor: SUBJECT_COLOR }}
              >
                <Avatar
                  url={subjectAvatarUrl}
                  name={subjectName}
                  size="xl"
                  className="ring-0 md:h-20 md:w-20"
                />
              </div>
              <p className="mt-2 text-balance break-keep text-base font-bold text-text-primary md:text-lg">
                {subjectName}
              </p>
              <p className="mt-0.5 text-[13px] font-medium text-text-primary/65">
                {t("spectrumMatchModalSubject")}
              </p>
            </div>

            <div
              className={cn(
                "relative z-[1] mt-5 border bg-bg-main px-2 py-2.5 text-center md:mt-6 md:py-3",
                style.border,
                style.surface,
              )}
            >
              <strong
                className={cn(
                  "block font-mono text-2xl font-bold md:text-[28px]",
                  style.label,
                )}
              >
                {match.matchPercent}%
              </strong>
              <span className="mt-0.5 block text-[13px] font-semibold text-text-primary/80">
                {category === "opposite"
                  ? t("spectrumMatchModalClash")
                  : t("spectrumMatchModalMatch")}
              </span>
            </div>

            <div className="relative z-[1] min-w-0 text-center">
              <div
                className="mx-auto inline-flex rounded-full border-[3px] bg-bg-main p-[3px] shadow-[0_0_20px_rgba(131,201,220,0.14)]"
                style={{ borderColor: CANDIDATE_COLOR }}
              >
                <Avatar
                  url={match.avatar_url}
                  name={match.nickname}
                  size="xl"
                  className="ring-0 md:h-20 md:w-20"
                />
              </div>
              <p className="mt-2 text-balance break-keep text-base font-bold text-text-primary md:text-lg">
                {match.nickname}
              </p>
              <p className="mt-0.5 text-[13px] font-medium text-text-primary/65">
                {t("spectrumMatchModalCandidate")}
              </p>
            </div>
          </div>

          <SpectrumComparisonGraphic
            category={category}
            match={match}
            subjectName={subjectName}
          />
        </div>

        <footer className="flex gap-2 border-t border-white/[0.07] bg-black/10 px-4 py-3 md:px-6">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 border border-white/10 px-3 py-2.5 text-sm font-semibold text-text-secondary hover:border-white/25 hover:bg-white/[0.04] hover:text-text-primary disabled:cursor-wait disabled:opacity-40"
          >
            {t("spectrumMatchModalClose")}
          </button>
          <button
            type="button"
            onClick={onViewPerson}
            disabled={loading}
            className="flex flex-[1.4] items-center justify-center gap-1.5 border border-accent bg-accent px-3 py-2.5 text-sm font-bold text-bg-main hover:bg-accent-hover disabled:cursor-wait disabled:opacity-50"
          >
            {loading
              ? t("spectrumMatchModalLoading")
              : t("spectrumMatchModalViewPerson")}
            <ArrowRight size={14} />
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
