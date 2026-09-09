/* ─────────────────────────────────────────────
 * [celeb 상세] sourceWorks — 연관 작품 고름틀
 * - 목차 위치: sourceWorks
 * - 데이터: sources props
 * - 함께 보기: FigureBookFeature.tsx, detail/CelebRecordSections.tsx
 * ───────────────────────────────────────────── */
"use client";

import { useState } from "react";
import { BookOpenText } from "lucide-react";
import { useTranslations } from "next-intl";
import ContentImage from "@/components/ui/ContentImage";
import type { FigureBookContent } from "@/actions/figure-books/getFigureBooks";
import FigureBookFeature from "./FigureBookFeature";

interface FigureBookWorksSectionProps {
  sources: FigureBookContent[];
}

export default function FigureBookWorksSection({
  sources,
}: FigureBookWorksSectionProps) {
  const t = useTranslations("celebPage");
  /* 등장과 연관을 한 섹션에 묶는다. 등장 여부는 판본 본문을 열어야 확정되는데 그럴 수 없어,
     확인하지 못한 것을 등장이라 단정하지 않고 「연관 작품」 하나로 보여 준다.
     창작(authored)은 저작 목록이 따로 있으므로 여기서 뺀다. */
  const appearanceSources = sources.filter((source) => source.relationType !== "authored");
  const [selectedId, setSelectedId] = useState(appearanceSources[0]?.id ?? "");
  const selected = appearanceSources.find((source) => source.id === selectedId) ?? appearanceSources[0];
  if (!selected) return null;

  return (
    <div className="effect-engraved relative isolate overflow-hidden border-4 border-stone-light bg-stone-heavy bg-texture-marble p-2 shadow-2xl md:p-3">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/[0.08] via-transparent to-black/30" />
      <div className="relative overflow-hidden border border-accent-dim/40 bg-bg-card">
        <div className="border-b border-accent-dim/30 bg-bg-secondary/40 px-4 py-2.5 text-center sm:py-3">
          <p className="text-sm text-text-secondary">
            {t("sourceWorksIntro")}
          </p>
        </div>
        {appearanceSources.length > 1 ? (
          <div className="relative border-b border-accent-dim/30 bg-bg-secondary/70 bg-texture-noise px-2 py-2.5 sm:px-3 sm:py-3 md:px-4">
            <div className="flex snap-x snap-proximity gap-2 overflow-x-auto overscroll-x-contain scroll-px-2 pb-1 [scrollbar-width:thin] sm:scroll-px-3">
              {appearanceSources.map((source) => {
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

        <FigureBookFeature
          key={selected.id}
          source={selected}
        />
      </div>
    </div>
  );
}
