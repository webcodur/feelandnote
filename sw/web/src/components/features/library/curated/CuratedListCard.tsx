/*
  파일명: /components/features/library/curated/CuratedListCard.tsx
  기능: 선정 목록 한 건을 나타내는 카드
  책임: 허브·기관 화면에서 같은 모양으로 목록을 진열한다.
*/ // ------------------------------

import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ListOrdered, CalendarClock } from "lucide-react";
import type { CuratedListSummary } from "@/actions/library/types";

export default async function CuratedListCard({ list }: { list: CuratedListSummary }) {
  const t = await getTranslations("library.curated");

  return (
    <Link
      href={`/library/curated/${list.curatorSlug}/${list.slug}`}
      className="group flex flex-col gap-2 rounded-xl border border-white/[0.06] bg-[#161616]/80 p-4 hover:border-accent/40 hover:bg-[#1b1b1b]/80"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-[15px] font-serif font-bold leading-snug text-text-primary group-hover:text-accent">
          {list.title}
        </span>
        <span className="shrink-0 rounded border border-accent/20 bg-accent/[0.06] px-1.5 py-0.5 text-[11px] text-accent">
          {t("itemCount", { count: list.itemCount })}
        </span>
      </div>

      {list.description && (
        <p className="line-clamp-2 text-[13px] leading-relaxed text-text-secondary">{list.description}</p>
      )}

      {list.topics.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {list.topics.map((topic) => (
            <span key={topic} className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-text-secondary">
              {t.has(`topicLabel.${topic}`) ? t(`topicLabel.${topic}`) : topic}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[11px] text-text-tertiary">
        {list.publishedYear && <span>{t("published", { year: list.publishedYear })}</span>}
        {list.edition && <span>{list.edition}</span>}
        {list.isRanked && (
          <span className="inline-flex items-center gap-1">
            <ListOrdered size={11} />
            {t("ranked")}
          </span>
        )}
        {list.isAnnual && (
          <span className="inline-flex items-center gap-1">
            <CalendarClock size={11} />
            {t("annual")}
          </span>
        )}
      </div>
    </Link>
  );
}
