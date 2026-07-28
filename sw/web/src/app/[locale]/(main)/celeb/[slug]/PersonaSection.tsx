"use client";

import { useState, useRef, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Info, ChevronDown, ChevronUp } from "lucide-react";

import CelebDetailModal from "@/components/features/celeb/modals/CelebDetailModal";
import type { SimilarByCelebResult } from "@/actions/persona/getSimilarByCelebId";
import {
  ABILITY_KEYS,
  INNER_VIRTUE_KEYS,
  OUTER_VIRTUE_KEYS,
  TENDENCY_KEYS,
} from "@/lib/persona/constants";
import { localizePersonaText } from "@/lib/persona/localizeText";
import type { PersonaJsonb, PersonaField } from "@/lib/persona/types";
import { distanceToMatchPercent, type SimilarCeleb } from "@/lib/persona/utils";
import { cn } from "@/lib/utils";

import CelebPersonPreviewButton from "./CelebPersonPreviewButton";
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

function SimilarFiguresHeader() {
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
    <div className="flex justify-center text-center w-full mb-4">
      <div ref={ref} className="relative inline-flex items-center gap-1.5">
        <p className="text-xs md:text-sm text-accent font-cinzel tracking-[0.3em] uppercase font-bold">
          {t("similarFigures")}
        </p>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-text-tertiary hover:text-accent transition-colors"
          aria-label={t("showSimilarityFormula")}
        >
          <Info size={14} />
        </button>
        {open && (
          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 w-72 px-4 py-3 rounded-lg bg-bg-secondary border border-white/10 shadow-xl animate-fade-in">
            <p className="text-xs text-text-primary leading-relaxed break-keep text-left">
              {t("similarFormula")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 덕목 바 ────────────────────────────────────────

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
  const pct = Math.min(100, Math.max(0, value));

  return (
    <div className="py-1.5">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "text-sm font-bold tracking-tight shrink-0 text-left text-text-primary",
            isEn ? "w-[5.5rem]" : "w-10",
          )}
        >
          {label}
        </span>

        <div className="relative flex-1 h-1.5 bg-white/[0.03] rounded-full ring-1 ring-white/5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-accent/60 via-accent to-accent-dim transition-all duration-1000 ease-out relative shadow-[0_0_15px_rgba(212,175,55,0.15)]"
            style={{ width: `${pct}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent opacity-30" />
          </div>
        </div>

        <span className="w-8 text-right text-xs text-accent font-serif tabular-nums font-bold shrink-0">
          {value}
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
              : "text-text-tertiary",
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
              : "text-text-tertiary",
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
  similarCelebs: SimilarCeleb[];
}

export default function PersonaSection({
  persona,
  personaJsonb,
  similarCelebs,
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

      {/* 상세 분석 토글 */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => setShowDetail((v) => !v)}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs text-text-secondary hover:text-accent border border-white/10 hover:border-accent/30 rounded-full transition-colors"
        >
          {showDetail ? t("hideDetail") : t("showDetail")}
          {showDetail ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

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

      {/* 유사한 인물 */}
      {similarCelebs.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-white/5">
          <SimilarFiguresHeader />
          <div className="flex justify-center gap-3 md:gap-8 flex-wrap">
            {similarCelebs.map((celeb) => (
              <CelebPersonPreviewButton
                key={celeb.celeb_id}
                name={celeb.nickname}
                avatarUrl={celeb.avatar_url}
                loading={loadingId === celeb.celeb_id}
                onClick={() => void openCelebPreview(celeb.celeb_id)}
                size="large"
                className="gap-2"
              >
                <span className="block font-mono text-xs tracking-wider text-accent/60">
                  {distanceToMatchPercent(celeb.distance)}%
                </span>
              </CelebPersonPreviewButton>
            ))}
          </div>
        </div>
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
