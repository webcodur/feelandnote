/*
  파일명: /components/features/content/CuratedEntriesSection.tsx
  기능: 작품 상세의 「선정 이력」
  책임: 이 작품을 뽑은 기관과 목록을 훈장처럼 보이고, 그 목록으로 안내한다.
*/ // ------------------------------

"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Award } from "lucide-react";
import type { ContentCuratedEntry } from "@/actions/library/types";

export default function CuratedEntriesSection({ entries }: { entries: ContentCuratedEntry[] }) {
  const t = useTranslations("library.curated");

  return (
    <div className="space-y-3 pt-4">
      <div className="flex items-start gap-2.5 rounded-lg border border-accent/20 bg-accent/[0.05] px-3 py-2.5">
        <Award size={16} className="mt-0.5 shrink-0 text-accent" />
        <p className="text-xs leading-relaxed text-text-secondary">{t("onContent.subtitle")}</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {entries.map((e) => (
          <Link
            key={`${e.curatorSlug}/${e.listSlug}`}
            href={`/library/curated/${e.curatorSlug}/${e.listSlug}`}
            className="group flex items-start gap-2.5 rounded-lg border border-white/[0.06] bg-[#161616]/60 px-3 py-2.5 hover:border-accent/40 hover:bg-[#1b1b1b]/70"
          >
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-1.5 text-[11px] text-text-tertiary">
                <span className="rounded border border-accent/20 bg-accent/[0.06] px-1.5 py-0.5 text-accent">
                  {t(`kind.${e.curatorKind}`)}
                </span>
                <span className="truncate">{e.curatorName}</span>
              </p>
              <p className="mt-1 text-[13px] font-medium leading-snug text-text-primary group-hover:text-accent">
                {e.listTitle}
              </p>
            </div>

            {(e.rank != null || e.year != null) && (
              <span className="shrink-0 self-center rounded border border-white/[0.08] px-1.5 py-0.5 text-[11px] font-bold text-text-secondary">
                {e.rank != null ? t("rankLabel", { rank: e.rank }) : t("yearLabel", { year: e.year! })}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
