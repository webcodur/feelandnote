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
  notRegisteredLabel,
  isVideo,
}: {
  item: CuratedListItem;
  notRegisteredLabel: string;
  isVideo: boolean;
}) {
  const yearBadge = item.year != null ? <CornerBadge>{item.year}</CornerBadge> : undefined;

  // 아직 우리에게 없는 작품 — 상세로 이을 곳이 없어 누르지 못한다.
  // 대신 등록 카드(DefaultLayout)와 같은 헤더·포스터 비율·푸터로 그려 격자에서 줄이 어긋나지 않게 한다.
  // "없음" 표기는 포스터 안(GenerativeBookCover label)에만 둔다.
  // 좌상단 넘버링(순위) 기능 폐기 — overlayTopLeft 미사용
  if (!item.contentId) {
    const ContentIcon = isVideo ? Film : BookOpen;
    return (
      <div
        aria-disabled="true"
        className="relative flex flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-bg-card"
      >
        {/* 등록 카드와 같은 높이의 헤더 바 — 토글·액션 없이 자리만 맞춘다 */}
        <div className="flex items-center justify-between border-b border-white/[0.04] bg-[#141414] px-1.5 py-1">
          <div className="flex h-6 w-6 items-center justify-center">
            <ContentIcon size={13} className="text-accent/80" strokeWidth={1.8} />
          </div>
          <div className="flex-1" />
          <div className="h-6 w-6" />
        </div>
        <div className="relative aspect-[2/3] w-full overflow-hidden bg-bg-secondary">
          <GenerativeBookCover
            title={item.rawTitle}
            ContentIcon={ContentIcon}
            iconSize={28}
            label={notRegisteredLabel}
          />
          {yearBadge && <div className="absolute right-1.5 top-1.5 z-10">{yearBadge}</div>}
        </div>
        <div className="border-t border-white/[0.04] bg-black/20 text-center">
          <div className="flex min-h-[36px] items-center justify-center p-2 pb-1.5 md:min-h-[42px] md:p-2.5">
            <h3 className="line-clamp-2 text-center text-xs font-semibold leading-tight text-text-primary md:text-sm">
              {item.rawTitle}
            </h3>
          </div>
          <div className="h-px bg-white/10" />
          <div className="p-1.5 pt-1.5 md:p-2">
            <p className="line-clamp-1 text-center text-[10px] text-text-secondary md:text-xs">
              {item.rawCreator ?? " "}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 우리가 가진 작품은 서비스 공통 작품 카드로 그린다.
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
        className="inline-flex items-center gap-1.5 text-xs text-text-tertiary hover:text-accent"
      >
        <ArrowLeft size={14} />
        {list.curator.name}
      </Link>

      <header className="mx-auto max-w-3xl space-y-4">
        <div className="space-y-3 text-center">
          {/* 상위(기관 상세) 제목 text-2xl보다 한 단 크게 — 깊이 들어갈수록 제목이 작아지는 역전을 막는다 */}
          <h2 className="font-serif text-2xl font-bold leading-tight text-text-primary md:text-3xl">{list.title}</h2>

          {/* 기관 구분만 강조색, 나머지는 같은 회색 칩으로 통일한다 */}
          <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-[12px]">
            <span className="rounded border border-accent/20 bg-accent/[0.06] px-1.5 py-0.5 text-accent">
              {t(`kind.${list.curator.kind}`)}
            </span>
            {list.curator.country && (
              <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-text-secondary">
                <NationalityText code={list.curator.country} />
              </span>
            )}
            {list.publishedYear && (
              <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-text-secondary">
                {t("published", { year: list.publishedYear })}
              </span>
            )}
            {list.edition && (
              <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-text-secondary">
                {list.edition}
              </span>
            )}
            <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-text-secondary">
              {t("itemCount", { count: list.itemCount })}
            </span>
            {list.topics.map((topic) => (
              <span key={topic} className="rounded bg-white/[0.06] px-1.5 py-0.5 text-text-secondary">
                {t.has(`topicLabel.${topic}`) ? t(`topicLabel.${topic}`) : topic}
              </span>
            ))}
          </div>
        </div>

        {(list.description || list.method) && (
          <div className="mx-auto w-full max-w-2xl space-y-3 text-left">
            {list.description && (
              <p className="break-keep text-[15px] font-medium leading-[1.9] text-text-primary">
                <strong className="mr-2 font-bold text-accent">{t("overview")}</strong>
                {list.description}
              </p>
            )}

            {list.method && (
              <p className="break-keep border-t border-white/[0.06] pt-3 text-[13.5px] leading-[1.8] text-text-secondary md:text-[14px]">
                <strong className="mr-2 font-bold text-accent">{t("method")}</strong>
                {list.method}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-4">
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
        <div className="flex flex-wrap items-center justify-center gap-2">
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

      {/* 작품 진열판 — 카드 전량을 하나의 윤곽 안에 모아 배경과 구분한다 */}
      <section className="rounded-2xl border border-white/[0.07] bg-white/[0.015] p-3 md:p-5">
        <div className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {list.items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              notRegisteredLabel={t("notRegistered")}
              isVideo={list.contentType === "VIDEO"}
            />
          ))}
        </div>

        {/* 큰 목록은 처음에 일부만 보낸다 — 전량을 한 번에 실으면 폭 좁은 기기에서 화면이 늦게 뜬다 */}
        {list.remainingCount > 0 && (
          <div className="pt-4 text-center">
            <Link
              href={`/library/curated/${list.curator.slug}/${list.slug}?all=1`}
              className="inline-block rounded-lg border border-white/[0.08] px-4 py-2 text-[13px] text-text-secondary hover:border-accent/40 hover:text-accent"
            >
              {t("showRemaining", { count: list.remainingCount })}
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
