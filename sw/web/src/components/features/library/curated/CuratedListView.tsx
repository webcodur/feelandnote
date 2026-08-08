/*
  파일명: /components/features/library/curated/CuratedListView.tsx
  기능: 선정 목록 상세 — 목록에 담긴 작품 진열
  책임: 원문 순서·순위를 그대로 보이고, 우리가 가진 작품은 상세로 잇는다.
        아직 등록되지 않은 작품도 목록에서 빼지 않는다 — 100선은 100편이어야 한다.
*/ // ------------------------------

import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, ExternalLink, BookOpen, Film } from "lucide-react";
import ContentCard from "@/components/ui/cards/ContentCard";
import GenerativeBookCover from "@/components/ui/cards/ContentCard/sections/GenerativeBookCover";
import NationalityText from "@/components/ui/NationalityText";
import { getCategoryByDbType } from "@/constants/categories";
import type { ContentType } from "@/types/database";
import { getCuratedHub } from "@/actions/library";
import type { CuratedListDetail, CuratedListItem } from "@/actions/library/types";
import CuratedListBrowseLinks from "./CuratedListBrowseLinks";

/** 순위·발표 연도 표시. 표지 위 양쪽 위 모서리에 얹는다 */
function CornerBadge({ children, bold }: { children: React.ReactNode; bold?: boolean }) {
  return (
    <span
      className={`rounded bg-black/75 px-1.5 py-0.5 text-[11px] text-white ${bold ? "font-bold" : ""}`}
    >
      {children}
    </span>
  );
}

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
  const rankBadge = showRank && item.rank != null ? <CornerBadge bold>{rankLabel}</CornerBadge> : undefined;
  const yearBadge = item.year != null ? <CornerBadge>{item.year}</CornerBadge> : undefined;

  // 아직 우리에게 없는 작품 — 누를 곳도 없고 이어 붙일 자료도 없어 공통 작품 카드를 쓸 수 없다.
  // 대신 그 카드와 같은 테두리·모서리를 따라 그려 격자에서 줄이 어긋나지 않게 한다
  if (!item.contentId) {
    return (
      <div className="relative flex flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-bg-card">
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-bg-secondary">
          <GenerativeBookCover
            title={item.rawTitle}
            ContentIcon={isVideo ? Film : BookOpen}
            iconSize={28}
            label={notRegisteredLabel}
          />
          {rankBadge && <div className="absolute left-1.5 top-1.5 z-10">{rankBadge}</div>}
          {yearBadge && <div className="absolute right-1.5 top-1.5 z-10">{yearBadge}</div>}
        </div>
        <div className="border-t border-white/[0.04] bg-black/20 p-2 md:p-2.5">
          <h3 className="line-clamp-2 min-h-[30px] text-xs font-semibold leading-tight text-text-primary md:min-h-[35px] md:text-sm">
            {item.rawTitle}
          </h3>
          <p className="mt-0.5 line-clamp-1 text-[10px] text-text-secondary md:mt-1 md:text-xs">
            {item.rawCreator ?? " "}
          </p>
        </div>
      </div>
    );
  }

  // 우리가 가진 작품은 서비스 공통 작품 카드로 그린다.
  // 한국어판·영문판 전환, 감상한 사람 수, 별점 같은 서비스 표준 표시가 여기서 함께 따라온다
  return (
    <ContentCard
      contentId={item.contentId}
      contentType={(item.contentType ?? undefined) as ContentType | undefined}
      title={item.title}
      creator={item.creator}
      thumbnail={item.thumbnailUrl}
      href={`/content/${item.contentId}?category=${getCategoryByDbType(item.contentType ?? "BOOK")?.id || "book"}`}
      titleKo={item.titleKo}
      titleEn={item.titleEn}
      creatorEn={item.creatorEn}
      thumbnailEn={item.thumbnailEn}
      hasEnEdition={item.hasEnEdition}
      overlayTopLeft={rankBadge}
      overlayTopRight={yearBadge}
    />
  );
}

export default async function CuratedListView({ list }: { list: CuratedListDetail }) {
  const t = await getTranslations("library.curated");
  // 탭은 화면 안 구성을 바꾸지 않고 허브 조합으로 이동만 한다 — 링크 전용
  const hub = await getCuratedHub();

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

      {/* 허브와 같은 조작대 — 여기서는 다른 갈래로의 이동 길을 잇는다 */}
      <CuratedListBrowseLinks hub={hub} list={list} />

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
