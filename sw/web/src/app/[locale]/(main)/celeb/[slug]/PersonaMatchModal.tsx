"use client";

import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Avatar } from "@/components/ui";
import { Z_INDEX } from "@/constants/zIndex";
import type {
  PersonaMatch,
  PersonaMatchCategory,
} from "@/lib/persona/utils";
import { cn } from "@/lib/utils";
import PersonaComparisonGraphic from "./persona-comparison";

const CATEGORY_STYLES: Record<
  PersonaMatchCategory,
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
  overall: "personaMatch_overall",
  disposition: "personaMatch_disposition",
  virtue: "personaMatch_virtue",
  ability: "personaMatch_ability",
  opposite: "personaMatch_opposite",
} as const;

interface PersonaMatchModalProps {
  category: PersonaMatchCategory;
  match: PersonaMatch;
  subjectName: string;
  subjectAvatarUrl: string | null;
  loading: boolean;
  onClose: () => void;
  onViewPerson: () => void;
}

export default function PersonaMatchModal({
  category,
  match,
  subjectName,
  subjectAvatarUrl,
  loading,
  onClose,
  onViewPerson,
}: PersonaMatchModalProps) {
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
          category === "overall" ? "max-w-[760px]" : "max-w-[570px]",
        )}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          aria-label={t("personaMatchModalClose")}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/25 text-text-secondary hover:border-white/25 hover:bg-white/[0.06] hover:text-text-primary disabled:cursor-wait disabled:opacity-40"
        >
          <X size={16} />
        </button>

        <header className="border-b border-white/[0.07] px-5 pb-5 pt-6 text-center md:px-7">
          <p className={cn("text-[10px] font-bold tracking-[0.2em]", style.label)}>
            {t(CATEGORY_TITLE_KEYS[category])}
          </p>
          <h2
            id={titleId}
            className="mt-1.5 font-serif text-xl font-bold text-text-primary"
          >
            {t(
              category === "opposite"
                ? "personaMatchModalOppositeTitle"
                : "personaMatchModalTitle",
            )}
          </h2>
          <p className="mt-1 text-balance break-keep text-xs text-text-secondary">
            {t("personaMatchModalIntro", {
              subject: subjectName,
              candidate: match.nickname,
            })}
          </p>
        </header>

        <div className="overflow-y-auto px-5 py-5 custom-scrollbar md:px-7">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="min-w-0 text-center">
              <Avatar
                url={subjectAvatarUrl}
                name={subjectName}
                size="xl"
                className="mx-auto ring-white/15"
              />
              <p className="mt-2 text-balance break-keep text-xs font-bold text-text-primary">
                {subjectName}
              </p>
              <p className="mt-0.5 text-[9px] text-text-secondary/60">
                {t("personaMatchModalSubject")}
              </p>
            </div>

            <div
              className={cn(
                "min-w-[72px] border px-2 py-2 text-center",
                style.border,
                style.surface,
              )}
            >
              <strong className={cn("block font-mono text-lg", style.label)}>
                {match.matchPercent}%
              </strong>
              <span className="text-[9px] text-text-secondary">
                {category === "opposite"
                  ? t("personaMatchModalClash")
                  : t("personaMatchModalMatch")}
              </span>
            </div>

            <div className="min-w-0 text-center">
              <Avatar
                url={match.avatar_url}
                name={match.nickname}
                size="xl"
                className="mx-auto ring-white/15"
              />
              <p className="mt-2 text-balance break-keep text-xs font-bold text-text-primary">
                {match.nickname}
              </p>
              <p className="mt-0.5 text-[9px] text-text-secondary/60">
                {t("personaMatchModalCandidate")}
              </p>
            </div>
          </div>

          <PersonaComparisonGraphic
            category={category}
            match={match}
            subjectName={subjectName}
          />
        </div>

        <footer className="flex gap-2 border-t border-white/[0.07] bg-black/10 px-5 py-4 md:px-7">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 border border-white/10 px-3 py-2.5 text-xs font-semibold text-text-secondary hover:border-white/25 hover:bg-white/[0.04] hover:text-text-primary disabled:cursor-wait disabled:opacity-40"
          >
            {t("personaMatchModalClose")}
          </button>
          <button
            type="button"
            onClick={onViewPerson}
            disabled={loading}
            className="flex flex-[1.4] items-center justify-center gap-1.5 border border-accent bg-accent px-3 py-2.5 text-xs font-bold text-bg-main hover:bg-accent-hover disabled:cursor-wait disabled:opacity-50"
          >
            {loading
              ? t("personaMatchModalLoading")
              : t("personaMatchModalViewPerson")}
            <ArrowRight size={14} />
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
