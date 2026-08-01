/*
  파일명: /components/features/library/curated/CuratedListView.tsx
  기능: 선정 목록 상세 — 목록에 담긴 작품 진열
  책임: 원문 순서·순위를 그대로 보이고, 우리가 가진 작품은 상세로 잇는다.
        아직 등록되지 않은 작품도 목록에서 빼지 않는다 — 100선은 100편이어야 한다.
*/ // ------------------------------

import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { ArrowLeft, ExternalLink, BookOpen, Film } from "lucide-react";
import GenerativeBookCover from "@/components/ui/cards/ContentCard/sections/GenerativeBookCover";
import NationalityText from "@/components/ui/NationalityText";
import type { CuratedListDetail, CuratedListItem } from "@/actions/library/types";

function ItemCard({
  item,
  showRank,
  rankLabel,
  notRegisteredLabel,
  isVideo,
}: {
  item: CuratedListItem;
  showRank: boolean;
  /** 「3위」처럼 단위가 붙은 표기. 오른쪽 연도 배지와 헷갈리지 않게 한다 */
  rankLabel: string | null;
  notRegisteredLabel: string;
  isVideo: boolean;
}) {
  const inner = (
    <>
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-neutral-900">
        {item.thumbnailUrl ? (
          <Image
            src={item.thumbnailUrl}
            alt={item.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 150px"
          />
        ) : (
          // 표지가 없어도 빈칸으로 두지 않는다. 서비스가 쓰는 제목 기반 생성 표지를 그대로 쓴다
          <GenerativeBookCover
            title={item.rawTitle}
            ContentIcon={isVideo ? Film : BookOpen}
            iconSize={22}
            label={item.contentId ? undefined : notRegisteredLabel}
          />
        )}

        {showRank && item.rank != null && (
          <span className="absolute left-1.5 top-1.5 rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-bold text-white">
            {rankLabel}
          </span>
        )}
        {item.year != null && (
          <span className="absolute right-1.5 top-1.5 rounded bg-black/75 px-1.5 py-0.5 text-[11px] text-white">
            {item.year}
          </span>
        )}
      </div>

      <div className="mt-1.5 space-y-0.5">
        {/* 손을 올린 즉시 바뀌는 축은 글자색이다 — 표지 확대는 곁들이는 연출이라 여기에 transition을 얹지 않는다 */}
        <p className="line-clamp-2 text-[12px] font-medium leading-snug text-text-primary group-hover:text-accent">
          {item.title}
        </p>
        {item.creator && <p className="line-clamp-1 text-[11px] text-text-tertiary">{item.creator}</p>}
      </div>
    </>
  );

  if (!item.contentId) {
    // 아직 우리에게 없는 작품 — 누를 곳이 없으므로 링크로 감싸지 않는다.
    // 표지에 이미 안내 문구가 얹히므로 글자까지 흐리게 하지 않는다(제목·저자는 읽을 수 있어야 한다)
    return <div>{inner}</div>;
  }

  return (
    <Link href={`/content/${item.contentId}`} className="group block">
      {inner}
    </Link>
  );
}

export default async function CuratedListView({ list }: { list: CuratedListDetail }) {
  const t = await getTranslations("library.curated");

  return (
    <div className="space-y-7">
      <Link
        href={`/library/curated/${list.curator.slug}`}
        className="inline-flex items-center gap-1.5 text-[13px] text-text-tertiary hover:text-accent"
      >
        <ArrowLeft size={14} />
        {list.curator.name}
      </Link>

      <header className="space-y-3">
        <h1 className="text-[22px] font-serif font-bold leading-tight text-text-primary">{list.title}</h1>

        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-text-tertiary">
          <span className="rounded border border-accent/20 bg-accent/[0.06] px-1.5 py-0.5 text-accent">
            {t(`kind.${list.curator.kind}`)}
          </span>
          {list.curator.country && <NationalityText code={list.curator.country} />}
          {list.publishedYear && <span>{t("published", { year: list.publishedYear })}</span>}
          {list.edition && <span>{list.edition}</span>}
          <span>{t("itemCount", { count: list.itemCount })}</span>
          {list.topics.map((topic) => (
            <span key={topic} className="rounded bg-white/[0.06] px-1.5 py-0.5 text-text-secondary">
              {t.has(`topicLabel.${topic}`) ? t(`topicLabel.${topic}`) : topic}
            </span>
          ))}
        </div>

        {list.description && (
          <p className="max-w-3xl text-[14px] leading-relaxed text-text-secondary">{list.description}</p>
        )}

        {list.method && (
          <p className="max-w-3xl text-[13px] leading-relaxed text-text-tertiary">
            <span className="text-text-secondary">{t("method")}</span> — {list.method}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-4">
          <a
            href={list.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[12px] text-text-tertiary hover:text-accent"
          >
            <ExternalLink size={12} />
            {t("source")}
          </a>
          <span className="text-[12px] text-text-tertiary">
            {t("linkedSummary", { linked: list.linkedCount, total: list.itemCount })}
          </span>
        </div>
      </header>

      {/* 같은 계열의 다른 해 — 대학 100선 개정판처럼 해마다 갈리는 목록에서 뜬다 */}
      {list.siblings.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] text-text-tertiary">{t("otherEditions")}</span>
          {list.siblings.map((s) => (
            <Link
              key={s.slug}
              href={`/library/curated/${list.curator.slug}/${s.slug}`}
              aria-current={s.isCurrent ? "page" : undefined}
              className={
                s.isCurrent
                  ? "rounded border border-accent/40 bg-accent/10 px-2 py-0.5 text-[12px] text-accent"
                  : "rounded border border-white/[0.08] px-2 py-0.5 text-[12px] text-text-secondary hover:border-accent/40 hover:text-accent"
              }
            >
              {s.edition ?? s.publishedYear ?? s.title}
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        {list.items.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            showRank={list.isRanked}
            rankLabel={item.rank != null ? t("rankLabel", { rank: item.rank }) : null}
            notRegisteredLabel={t("notRegistered")}
            isVideo={list.contentType === "VIDEO"}
          />
        ))}
      </div>

      {/* 큰 목록은 처음에 일부만 보낸다 — 전량을 한 번에 실으면 폭 좁은 기기에서 화면이 늦게 뜬다 */}
      {list.remainingCount > 0 && (
        <div className="pt-2 text-center">
          <Link
            href={`/library/curated/${list.curator.slug}/${list.slug}?all=1`}
            className="inline-block rounded-lg border border-white/[0.08] px-4 py-2 text-[13px] text-text-secondary hover:border-accent/40 hover:text-accent"
          >
            {t("showRemaining", { count: list.remainingCount })}
          </Link>
        </div>
      )}
    </div>
  );
}
