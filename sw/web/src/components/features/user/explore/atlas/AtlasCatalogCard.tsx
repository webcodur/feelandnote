"use client";

import { useState } from "react";
import { ArrowRight, Compass, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import FormattedText from "@/components/ui/FormattedText";
import MythTitleImage from "../myth/MythTitleImage";
import type { AtlasCatalogEntry } from "@/lib/atlas-catalog";

export default function AtlasCatalogCard({ entry }: { entry: AtlasCatalogEntry }) {
  const t = useTranslations("explore.atlasCatalog");
  const [failedCover, setFailedCover] = useState(false);
  return (
    <Link href={entry.href} prefetch={false} data-atlas-catalog-entry={entry.id}
      data-atlas-scenes-complete={entry.scenesComplete || undefined}
      className={`group flex min-w-0 flex-col overflow-hidden rounded-xl border outline-none hover:border-accent focus-visible:ring-2 focus-visible:ring-accent ${entry.scenesComplete ? "border-sky-200/20 bg-sky-200/[0.06]" : "border-line-strong bg-bg-card"}`}>
      <div className="relative aspect-[16/10] overflow-hidden border-b border-line bg-bg-main">
        {entry.cover && !failedCover ? <MythTitleImage src={entry.cover} alt="" priority={false} fit="cover"
          sizes="(min-width: 1024px) 290px, (min-width: 640px) 45vw, 94vw"
          onUnavailable={() => setFailedCover(true)}
          className="transition-transform duration-700 group-hover:scale-[1.04] motion-reduce:transform-none motion-reduce:transition-none" />
          : <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-text-tertiary">
            <Compass size={28} strokeWidth={1} aria-hidden />
            <span className="break-keep text-lg font-medium text-text-secondary">{entry.name}</span>
          </div>}
        {entry.scenesComplete && <span className="absolute start-3 top-3 rounded-control border border-sky-200/20 bg-bg-main px-2 py-1 text-[11px] font-medium text-sky-100">{t("scenesComplete")}</span>}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 break-keep text-lg font-semibold leading-snug text-text-primary group-hover:text-accent">{entry.name}</h3>
          <ArrowRight size={17} className="mt-1 shrink-0 text-text-tertiary group-hover:text-accent" aria-hidden />
        </div>
        {entry.headline && <p className="line-clamp-2 break-keep text-sm leading-relaxed text-text-secondary"><FormattedText text={entry.headline} /></p>}
        <span className="mt-auto inline-flex items-center gap-1.5 pt-1 text-xs tabular-nums text-text-secondary" title={t("members", { count: entry.members })}>
          <span aria-hidden>{entry.members}</span><Users size={13} aria-hidden /><span className="sr-only">{t("members", { count: entry.members })}</span>
        </span>
      </div>
    </Link>
  );
}
