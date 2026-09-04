"use client";

import Image from "next/image";
import { ArrowUpRight, BookOpen, BookOpenText, ShoppingBag } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { MythWork } from "@/actions/home/mythAtlasTypes";

interface Props { works: MythWork[]; selectedPersonId: string }

export default function MythWorkShelf({ works, selectedPersonId }: Props) {
  const t = useTranslations("explore.hub.myth");
  const locale = useLocale();
  const selectedWorks = works.filter((work) => work.personIds.includes(selectedPersonId));
  const selectedIds = new Set(selectedWorks.map((work) => work.id));

  /* 살 수 있는 판본을 앞에 세운다. 연결 인물이 가장 많은 원전이 정작 구매 링크가 없어
     선반 맨 앞을 차지하던 자리다(아폴로도로스 『그리스 신화』). 링크 없는 책도 뒤에 그대로
     남아 등장 작품 정보는 잃지 않는다. 구매 링크를 쓰지 않는 영문 화면은 원래 순서를 지킨다. */
  const buyableFirst = (list: MythWork[]) =>
    locale === "ko" ? [...list.filter((work) => work.coupangUrl), ...list.filter((work) => !work.coupangUrl)] : list;

  const visible = [
    ...buyableFirst(selectedWorks),
    ...buyableFirst(works.filter((work) => !selectedIds.has(work.id))),
  ].slice(0, 10);

  if (visible.length === 0) return null;

  return (
    <section aria-labelledby="myth-works-title" className="pt-1">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h3 id="myth-works-title" className="flex items-center gap-2 text-lg font-black text-text-primary"><BookOpen size={18} className="text-accent" />{t("works")}</h3>
          <p className="mt-1 text-sm text-text-secondary">{t("worksLead")}</p>
        </div>
        <span className="text-sm text-text-tertiary">{selectedWorks.length > 0 ? t("selectedWorks", { count: selectedWorks.length }) : t("traditionWorks", { count: works.length })}</span>
      </div>

      <div className="scrollbar-hide -mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2 md:gap-4">
        {visible.map((work) => {
          const selected = selectedIds.has(work.id);
          const purchaseUrl = locale === "ko" ? work.coupangUrl : null;
          const workHref = `/content/${work.id}?category=${work.category}`;
          const cardBody = (
            <>
              <div className="relative aspect-[3/4] shrink-0 overflow-hidden bg-bg-secondary">
                {work.thumbnailUrl ? (
                  <Image src={work.thumbnailUrl} alt="" fill unoptimized sizes="176px" className="object-cover transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none" />
                ) : (
                  <div className="flex h-full items-center justify-center p-4 text-center text-lg font-black text-accent/50">{work.title}</div>
                )}
                {selected && <span className="absolute start-2 top-2 rounded-full bg-accent px-2 py-1 text-xs font-black text-bg-secondary">{t("appearsHere")}</span>}
                <span className={`absolute end-2 top-2 grid size-8 place-items-center rounded-full bg-black/85 ${purchaseUrl ? "text-[#ff776a]" : "text-text-tertiary"}`} aria-hidden>
                  {purchaseUrl ? <ShoppingBag size={15} /> : <ArrowUpRight size={15} />}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-3">
                <div className="flex gap-2">
                  <h4 className={`line-clamp-2 flex-1 text-sm font-bold leading-5 ${purchaseUrl ? "text-white group-hover:text-[#ff9a8f]" : "text-text-primary group-hover:text-accent"}`}>{work.title}</h4>
                  <ArrowUpRight size={14} className={`mt-0.5 shrink-0 ${purchaseUrl ? "text-[#ff776a]" : "text-text-tertiary group-hover:text-accent"}`} />
                </div>
                <p className="mt-1 truncate text-sm text-text-secondary">{work.creator ?? " "}</p>
                {purchaseUrl ? (
                  <p className="mt-auto pt-2 text-sm font-bold text-[#ff776a]">{t("buyOnCoupang")}</p>
                ) : (
                  <p className="mt-auto pt-2 text-sm font-semibold text-accent">{t("castCount", { count: work.personIds.length })}</p>
                )}
              </div>
            </>
          );

          return (
            <div key={work.id} className="flex w-36 shrink-0 snap-start flex-col md:w-44">
              {purchaseUrl ? (
                <a
                  href={purchaseUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow sponsored"
                  className={`group flex flex-1 flex-col overflow-hidden rounded-2xl border bg-bg-card hover:border-[#E44232]/70 ${selected ? "border-[#E44232]/60" : "border-[#E44232]/35"}`}
                  title={`${work.title} · ${t("buyOnCoupang")}`}
                >
                  {cardBody}
                </a>
              ) : (
                <Link href={workHref} className={`group flex flex-1 flex-col overflow-hidden rounded-2xl border bg-bg-card hover:border-accent/70 ${selected ? "border-accent/60" : "border-stone-heavy"}`}>
                  {cardBody}
                </Link>
              )}
              {purchaseUrl && (
                <Link href={workHref} className="mt-2 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-2 text-xs font-bold text-text-secondary hover:border-accent/50 hover:bg-accent/10 hover:text-accent">
                  <BookOpenText size={13} aria-hidden />
                  {t("openWork")}
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
