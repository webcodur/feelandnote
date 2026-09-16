/*
  파일명: /components/features/library/curated/CuratedListView.tsx
  기능: 선정 목록 상세 — 목록 소개와 작품 진열
  책임: 목록의 개요·선정 방식·출처를 머리에 세우고, 작품은 폭에 따라 두 가지로 보인다.
        데스크톱(md 이상)은 감싸는 상자에 공통 작품 카드와 쿠팡 모듈을 쌓은 격자(CuratedListGrid),
        모바일은 2열 구간 격자와 한 편씩 보는 펼쳐보기를 고르는 조작 줄(CuratedListMobile)이다.
        원문 순서·순위를 그대로 따르고 아직 등록되지 않은 작품도 빼지 않는다 — 100선은 100편이어야 한다.
*/ // ------------------------------

import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import NationalityText from "@/components/ui/NationalityText";
import BookPurchaseInfo from "@/components/shared/BookPurchaseInfo";
import { getCuratedHub } from "@/actions/library";
import type { CuratedListDetail } from "@/actions/library/types";
import CuratedListBrowseLinks from "./CuratedListBrowseLinks";
import CuratedListGrid from "./CuratedListGrid";
import CuratedListMobile from "./CuratedListMobile";

export default async function CuratedListView({ list }: { list: CuratedListDetail }) {
  const t = await getTranslations("library.curated");
  const locale = await getLocale();
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
          <h2 className="font-serif text-2xl font-bold leading-tight text-text-primary md:text-3xl">
            {list.title}
            {/* 수수료 안내 — 판매 단추 안에 묻지 않고 목록 제목 옆에 둔다 */}
            {locale === "ko" && list.contentType === "BOOK" && (
              <BookPurchaseInfo className="ms-2 inline-flex size-7 items-center justify-center self-center rounded-full border border-white/10 align-middle" />
            )}
          </h2>

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

      {/* 데스크톱 — 감싸는 상자 + 공통 카드 + 쿠팡 모듈 격자. 제목 전량이 HTML에 남아 검색에도 잡힌다 */}
      <div className="hidden md:block">
        <CuratedListGrid list={list} />
      </div>
      {/* 모바일 — 2열 구간 격자(기본)와 한 편씩 보는 펼쳐보기를 조작 줄에서 고른다 */}
      <div className="md:hidden">
        <CuratedListMobile list={list} />
      </div>
    </div>
  );
}
