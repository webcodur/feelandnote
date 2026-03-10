"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Info } from "lucide-react";

import { getCelebForModal } from "@/actions/celebs/getCelebForModal";
import CelebDetailModal from "@/components/features/home/celeb-card-drafts/CelebDetailModal";
import type { CelebProfile } from "@/types/home";
import type { SimilarByCelebResult } from "@/actions/persona/getSimilarByCelebId";
import {
  ABILITY_KEYS,
  INNER_VIRTUE_KEYS,
  OUTER_VIRTUE_KEYS,
  TENDENCY_KEYS,
} from "@/lib/persona/constants";
import type { PersonaJsonb, PersonaField } from "@/lib/persona/types";
import { distanceToMatchPercent, type SimilarCeleb } from "@/lib/persona/utils";
import { cn } from "@/lib/utils";

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
          aria-label="Show similarity formula"
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
}: {
  label: string;
  value: number;
  reason?: string;
}) {
  const pct = Math.min(100, Math.max(0, value));
  const [open, setOpen] = useState(false);

  return (
    <div className="py-1">
      <div className="group flex items-center gap-3">
        <button
          type="button"
          onClick={() => reason && setOpen((v) => !v)}
          className={cn(
            "w-10 text-xs font-medium tracking-tight shrink-0 text-left transition-colors",
            reason ? "cursor-pointer hover:text-accent" : "cursor-default",
            open
              ? "text-accent"
              : "text-text-secondary group-hover:text-accent",
          )}
        >
          {label}
        </button>

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
      {reason && open && (
        <p className="ml-[52px] mr-10 mt-0.5 text-xs text-text-tertiary leading-relaxed break-keep animate-fade-in">
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
}: {
  neg: string;
  pos: string;
  value: number;
  reason?: string;
}) {
  const position = ((value + 50) / 100) * 100;
  const [open, setOpen] = useState(false);
  const hasReason = !!reason;
  const activeLabel =
    Math.abs(value) > 10 ? (value < 0 ? "neg" : "pos") : null;

  return (
    <div className="py-1">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => hasReason && setOpen((v) => !v)}
          className={cn(
            "w-10 text-right text-xs tracking-tight shrink-0 transition-colors",
            hasReason ? "cursor-pointer" : "cursor-default",
            activeLabel === "neg"
              ? "text-blue-400 font-bold"
              : "text-text-tertiary",
            open && activeLabel === "neg" && "underline",
            hasReason && "hover:text-text-primary",
          )}
        >
          {neg}
        </button>
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
        <button
          type="button"
          onClick={() => hasReason && setOpen((v) => !v)}
          className={cn(
            "w-10 text-left text-xs tracking-tight shrink-0 transition-colors",
            hasReason ? "cursor-pointer" : "cursor-default",
            activeLabel === "pos"
              ? "text-orange-400 font-bold"
              : "text-text-tertiary",
            open && activeLabel === "pos" && "underline",
            hasReason && "hover:text-text-primary",
          )}
        >
          {pos}
        </button>
      </div>
      {reason && open && (
        <p className="ml-[52px] mr-[52px] mt-0.5 text-xs text-text-tertiary leading-relaxed break-keep animate-fade-in">
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
  const [modalCeleb, setModalCeleb] = useState<CelebProfile | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const tendencyLabels: Record<string, [string, string]> = {
    pessimism_optimism: [tl("pessimism"), tl("optimism")],
    conservative_progressive: [tl("conservative"), tl("progressive")],
    individual_social: [tl("individual"), tl("social")],
    cautious_bold: [tl("cautious"), tl("bold")],
  };

  const handleCelebClick = useCallback(async (celebId: string) => {
    setLoadingId(celebId);
    const data = await getCelebForModal(celebId);
    setLoadingId(null);
    if (data) setModalCeleb(data);
  }, []);

  return (
    <div className="space-y-6">
      {/* 핵심 능력 */}
      <div className="space-y-2">
        <SectionHeader title={t("ability")} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10">
          {ABILITY_KEYS.map((key) => (
            <VirtueBar
              key={key}
              label={ts(key)}
              value={persona[key]}
              reason={getReasonFromJsonb(personaJsonb, "abilities", key, locale)}
            />
          ))}
        </div>
      </div>

      {/* 내면·외면 덕목 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6 pt-6 border-t border-white/5">
        <div className="space-y-2">
          <SectionHeader title={t("innerVirtue")} />
          {INNER_VIRTUE_KEYS.map((key) => (
            <VirtueBar
              key={key}
              label={ts(key)}
              value={persona[key]}
              reason={getReasonFromJsonb(
                personaJsonb,
                "inner_virtues",
                key,
                locale,
              )}
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
              reason={getReasonFromJsonb(
                personaJsonb,
                "outer_virtues",
                key,
                locale,
              )}
            />
          ))}
        </div>
      </div>

      {/* 성향 스펙트럼 */}
      <div className="space-y-4 pt-6 border-t border-white/5">
        <SectionHeader title={t("coreDisposition")} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-2">
          {TENDENCY_KEYS.map((key) => (
            <TendencyBar
              key={key}
              neg={tendencyLabels[key][0]}
              pos={tendencyLabels[key][1]}
              value={persona[key]}
              reason={getReasonFromJsonb(
                personaJsonb,
                "dispositions",
                key,
                locale,
              )}
            />
          ))}
        </div>
      </div>

      {/* 유사한 인물 */}
      {similarCelebs.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-white/5">
          <SimilarFiguresHeader />
          <div className="flex justify-center gap-5 md:gap-8 flex-wrap">
            {similarCelebs.map((celeb) => (
              <button
                key={celeb.celeb_id}
                type="button"
                onClick={() => handleCelebClick(celeb.celeb_id)}
                disabled={loadingId === celeb.celeb_id}
                className="group flex flex-col items-center gap-2 w-20 md:w-24 cursor-pointer"
              >
                <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden p-[2px] bg-gradient-to-b from-accent/20 to-transparent group-hover:from-accent/60 group-hover:to-accent/30 transition-all duration-500 shadow-lg">
                  <div className="w-full h-full rounded-full overflow-hidden bg-bg-secondary relative border border-white/10">
                    {loadingId === celeb.celeb_id ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : celeb.avatar_url ? (
                      <Image
                        src={celeb.avatar_url}
                        alt={celeb.nickname}
                        width={80}
                        height={80}
                        className="object-cover w-full h-full transition-all duration-700 group-hover:scale-110"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg text-text-tertiary font-serif">
                        {celeb.nickname.charAt(0)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-center space-y-0.5">
                  <span className="block text-xs text-text-primary group-hover:text-accent transition-colors font-serif font-bold">
                    {celeb.nickname}
                  </span>
                  <span className="block text-xs font-mono text-accent/60 tracking-wider">
                    {distanceToMatchPercent(celeb.distance)}%
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {modalCeleb && (
        <CelebDetailModal
          celeb={modalCeleb}
          isOpen
          onClose={() => setModalCeleb(null)}
        />
      )}
    </div>
  );
}
