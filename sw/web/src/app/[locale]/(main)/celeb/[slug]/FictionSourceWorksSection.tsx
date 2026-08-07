"use client";

import ContentImage from "@/components/ui/ContentImage";
import { ArrowUpRight, BookOpenText } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { FictionSourceContent } from "@/actions/fiction/getFictionSources";

interface FictionSourceWorksSectionProps {
  sources: FictionSourceContent[];
}

export default function FictionSourceWorksSection({
  sources,
}: FictionSourceWorksSectionProps) {
  const t = useTranslations("celebPage");

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5 border-b border-accent-dim/30 pb-4">
        <BookOpenText size={17} className="mt-0.5 shrink-0 text-accent" />
        <p className="text-sm leading-relaxed text-text-secondary">
          {t("sourceWorksIntro")}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {sources.map((source) => (
          <Link
            key={source.id}
            href={`/content/${source.id}?category=${source.category}`}
            className="group grid grid-cols-[76px_minmax(0,1fr)] gap-3 rounded-lg border border-white/10 bg-white/[0.025] p-3 hover:border-accent/60 hover:bg-accent/[0.06] active:scale-[0.995]"
          >
            <span className="relative h-28 w-[76px] overflow-hidden rounded-md border border-white/10 bg-bg-secondary shadow-lg">
              {source.thumbnailUrl ? (
                <ContentImage
                  src={source.thumbnailUrl}
                  alt=""
                  sizes="76px"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-accent/35">
                  <BookOpenText size={24} />
                </span>
              )}
            </span>

            <span className="flex min-w-0 flex-col">
              <span className="mb-2 w-fit rounded border border-accent/25 bg-accent/[0.07] px-1.5 py-0.5 text-[9px] font-semibold text-accent/80">
                {t(`sourceRelation.${source.relationType}`)}
              </span>
              <span className="line-clamp-2 font-serif text-base font-semibold leading-snug text-text-primary group-hover:text-accent">
                {source.title}
              </span>
              {source.creator && (
                <span className="mt-1 truncate text-xs text-text-secondary">
                  {source.creator}
                </span>
              )}
              <span className="mt-auto inline-flex items-center gap-1 pt-3 text-[11px] font-medium text-accent/80 group-hover:text-accent">
                {t("sourceWorkOpen")}
                <ArrowUpRight size={12} />
              </span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
