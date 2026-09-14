"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowUpRight, BookOpen } from "lucide-react";
import { useTranslations } from "next-intl";
import type { BestsellerItem } from "@/actions/library/types";

function BookChartCover({ item }: { item: BestsellerItem }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="relative flex aspect-[2/3] items-center justify-center overflow-hidden rounded-sm border border-border/70 bg-bg-secondary group-hover:border-accent/60 group-focus-visible:border-accent">
      <BookOpen aria-hidden="true" size={32} className="text-text-tertiary" />
      {item.thumbnail_url && !failed && (
        <Image
          src={item.thumbnail_url}
          alt=""
          fill
          unoptimized
          sizes="(max-width: 639px) 45vw, (max-width: 1023px) 28vw, 180px"
          className="object-contain"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

export default function BookChartGrid({ items }: { items: BestsellerItem[] }) {
  const t = useTranslations("library.popular");

  return (
    <ol className="mx-auto grid max-w-6xl grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-6 md:gap-x-5">
      {items.map((item) => {
        const href = item.source_url?.startsWith("https://") ? item.source_url : undefined;
        const content = (
          <>
            <span className="mb-2 block text-2xl leading-none tabular-nums text-accent">
              <span className="sr-only">{t("rank", { rank: item.rank })}</span>
              <span aria-hidden="true">{item.rank}</span>
            </span>
            <BookChartCover item={item} />
            <div className="mt-3 space-y-1">
              <h3 className="line-clamp-2 break-words text-sm font-medium leading-snug text-text-primary group-hover:text-accent group-focus-visible:text-accent">{item.title}</h3>
              <p className="line-clamp-2 break-words text-sm leading-relaxed text-text-secondary">{item.creator}</p>
              {href && (
                <span className="flex items-center gap-1 pt-1 text-sm text-text-secondary group-hover:text-accent group-focus-visible:text-accent">
                  {t("viewAtStore")}<ArrowUpRight size={13} aria-hidden="true" />
                  <span className="sr-only">{t("newTab")}</span>
                </span>
              )}
            </div>
          </>
        );

        return (
          <li key={item.id} className="min-w-0">
            {href ? (
              <a href={href} target="_blank" rel="noopener noreferrer" className="group block rounded-sm outline-none">
                {content}
              </a>
            ) : <article>{content}</article>}
          </li>
        );
      })}
    </ol>
  );
}
