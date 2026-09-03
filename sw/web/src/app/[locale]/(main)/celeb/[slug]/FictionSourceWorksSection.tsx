/* ─────────────────────────────────────────────
 * [celeb 상세] sourceWorks — 등장·연관 작품 고름틀
 * - 목차 위치: sourceWorks
 * - 데이터: sources/nickname props
 * - 함께 보기: FictionSourceFeature.tsx, detail/CelebRecordSections.tsx
 * ───────────────────────────────────────────── */
"use client";

import { useState } from "react";
import { BookOpenText } from "lucide-react";
import { useTranslations } from "next-intl";
import ContentImage from "@/components/ui/ContentImage";
import type { FictionSourceContent } from "@/actions/fiction/getFictionSources";
import FictionSourceFeature from "./FictionSourceFeature";

interface FictionSourceWorksSectionProps {
  sources: FictionSourceContent[];
  nickname: string;
}

export default function FictionSourceWorksSection({
  sources,
  nickname,
}: FictionSourceWorksSectionProps) {
  const t = useTranslations("celebPage");
  const [selectedId, setSelectedId] = useState(sources[0]?.id ?? "");

  const selected = sources.find((source) => source.id === selectedId) ?? sources[0];
  if (!selected) return null;
  const appearanceSources = sources.filter((source) => source.relationType === "appearance");
  const relatedSources = sources.filter((source) => source.relationType === "related");
  const groups = [
    { relationType: "appearance" as const, sources: appearanceSources },
    { relationType: "related" as const, sources: relatedSources },
  ].filter((group) => group.sources.length > 0);
  const visibleSources = selected.relationType === "related"
    ? relatedSources
    : appearanceSources;

  return (
    <div className="effect-engraved relative isolate overflow-hidden border-4 border-stone-light bg-stone-heavy bg-texture-marble p-2 shadow-2xl md:p-3">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/[0.08] via-transparent to-black/30" />
      <div className="relative overflow-hidden border border-accent-dim/40 bg-bg-card">

        <div className="engraved-plate relative border-b border-accent-dim/30 px-4 py-4 text-center md:px-6 md:py-5">
          <div className="mx-auto max-w-3xl">
            <p className="text-sm leading-6 text-text-secondary">
              {t("sourceWorksIntro")}
            </p>
            <span className="mx-auto mt-3 flex items-center justify-center gap-2" aria-hidden>
              <span className="h-px w-12 bg-accent-dim" />
              <span className="size-1.5 rotate-45 border border-accent" />
              <span className="h-px w-12 bg-accent-dim" />
            </span>
          </div>
        </div>

        <div className="relative flex flex-wrap items-center justify-center gap-2 border-b border-accent-dim/30 bg-bg-secondary/70 px-3 py-3">
          {groups.map((group) => {
            const active = selected.relationType === group.relationType;
            return (
              <button
                key={group.relationType}
                type="button"
                aria-pressed={active}
                onClick={() => setSelectedId(group.sources[0]?.id ?? "")}
                className={`min-h-10 border px-4 text-sm font-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  active
                    ? "border-accent bg-accent text-bg-primary"
                    : "border-stone-light bg-stone-heavy text-text-secondary hover:border-accent hover:bg-accent/10 hover:text-accent"
                }`}
              >
                {t(`sourceRelation.${group.relationType}`)}
                <span className={`ms-2 font-mono text-xs ${active ? "text-bg-primary/70" : "text-text-tertiary"}`}>
                  {group.sources.length}
                </span>
              </button>
            );
          })}
        </div>

        {visibleSources.length > 1 ? (
          <div className="relative border-b border-accent-dim/30 bg-bg-secondary/70 bg-texture-noise px-2 py-2.5 sm:px-3 sm:py-3 md:px-4">
            <div className="flex snap-x snap-proximity gap-2 overflow-x-auto overscroll-x-contain scroll-px-2 pb-1 [scrollbar-width:thin] sm:scroll-px-3">
              {visibleSources.map((source) => {
                const active = source.id === selected.id;
                return (
                  <button
                    key={source.id}
                    type="button"
                    aria-pressed={active}
                    aria-label={t("sourceWorkSelect", { title: source.title })}
                    onClick={(event) => {
                      setSelectedId(source.id);
                      event.currentTarget.scrollIntoView({ block: "nearest", inline: "center" });
                    }}
                    className={`group relative grid min-w-[178px] snap-center grid-cols-[40px_minmax(0,1fr)] gap-2 overflow-hidden border p-2 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:min-w-[190px] sm:grid-cols-[42px_minmax(0,1fr)] sm:gap-2.5 ${
                      active
                        ? "border-accent bg-accent/10 shadow-glow"
                        : "effect-engraved border-stone-light bg-stone-heavy hover:border-accent hover:bg-accent/[0.06]"
                    }`}
                  >
                    <span className="effect-bevel relative h-[56px] overflow-hidden border border-accent-dim/30 bg-bg-secondary sm:h-[58px]">
                      {source.thumbnailUrl ? (
                        <ContentImage
                          src={source.thumbnailUrl}
                          alt=""
                          sizes="(max-width: 639px) 40px, 42px"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <span className="flex h-full items-center justify-center text-accent">
                          <BookOpenText size={18} aria-hidden />
                        </span>
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className={`line-clamp-2 text-[15px] font-black leading-[1.25] tracking-[-0.01em] ${
                        active ? "text-3d-gold" : "text-text-primary group-hover:text-accent"
                      }`}>
                        {source.title}
                      </span>
                      {source.creator && (
                        <span className={`mt-1 block truncate text-sm font-medium leading-5 tracking-[0.05em] ${
                          active
                            ? "text-text-secondary"
                            : "text-text-tertiary group-hover:text-text-secondary"
                        }`}>
                          {source.creator}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <FictionSourceFeature
          key={selected.id}
          source={selected}
          nickname={nickname}
        />
      </div>
    </div>
  );
}
