/*
  파일명: /components/features/library/curated/CuratedHubView.tsx
  기능: 기관 선정 허브
  책임: 고른 갈래(카테고리·기관·주제)에 따라 선정 주체를 진열한다.
        데이터는 서버가 한 번에 실어 보내므로 탭 전환은 서버를 다시 다녀오지 않는다.
        필터 상태·조작대는 `useCuratedBrowse`·`CuratedBrowseTabs` 공용 부품이 맡고,
        이 화면은 그에 따라 카드를 그리는 일만 한다.
*/ // ------------------------------

"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import NationalityText from "@/components/ui/NationalityText";
import BlurDissolve from "@/components/ui/BlurDissolve";
import type { CuratedHub } from "@/actions/library/types";
import CuratedListCard from "./CuratedListCard";
import CuratedBrowseTabs from "./CuratedBrowseTabs";
import { useCuratedBrowse, type CuratedBrowseInitial } from "./useCuratedBrowse";

/** 한 기관 카드에서 펼치는 목록 수. 나머지는 기관 화면에서 본다 */
const LISTS_PER_CURATOR = 2;

type Curator = CuratedHub["curators"][number];

function CuratedCard({ curator }: { curator: Curator }) {
  const t = useTranslations("library.curated");
  const itemCount = curator.lists.reduce((sum, list) => sum + list.itemCount, 0);

  return (
    <article className="overflow-hidden rounded-2xl border border-white/[0.08] bg-bg-card hover:border-accent/30">
      <header className="relative overflow-hidden border-b border-white/[0.08] bg-gradient-to-br from-bg-card to-bg-secondary px-4 py-5 sm:px-5">
        <span aria-hidden className="absolute inset-y-5 start-0 w-0.5 bg-accent" />
        <div
          className={`grid items-start gap-4 ${
            curator.logoUrl
              ? "grid-cols-[minmax(0,1fr)_5rem] sm:grid-cols-[minmax(0,1fr)_6rem]"
              : "grid-cols-1"
          }`}
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-text-tertiary">
              <span className="font-bold tracking-[0.14em] text-accent">{t(`kind.${curator.kind}`)}</span>
              {curator.country && <NationalityText code={curator.country} />}
              {curator.foundedYear && <span>{t("since", { year: curator.foundedYear })}</span>}
            </div>
            <Link
              href={`/library/curated/${curator.slug}`}
              className="mt-2 block text-xl font-bold leading-tight text-text-primary hover:text-accent sm:text-[22px]"
            >
              {curator.name}
            </Link>
            {curator.description && (
              <p className="mt-3 line-clamp-3 text-[14px] leading-relaxed text-text-secondary">{curator.description}</p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-2.5 border-t border-white/[0.08] pt-3 text-[12px]">
              <span className="font-semibold text-text-primary">{t("listCount", { count: curator.listCount })}</span>
              {itemCount > 0 && <span aria-hidden className="size-1 rounded-full bg-accent" />}
              {itemCount > 0 && <span className="text-text-secondary">{t("itemCount", { count: itemCount })}</span>}
            </div>
          </div>

          {curator.logoUrl && (
            <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-white shadow-lg sm:size-24">
              <BlurDissolve className="absolute inset-0">
                <Image src={curator.logoUrl} alt={curator.name} fill className="object-contain" sizes="96px" />
              </BlurDissolve>
            </div>
          )}
        </div>
      </header>

      {curator.lists.length > 0 && (
        <div className="p-4 sm:p-5">
          {/* 기관 카드가 절반 폭이므로 목록은 한 줄에 하나씩 — 더 쪼개면 글자가 뭉간다 */}
          <div className="grid gap-3">
            {curator.lists.slice(0, LISTS_PER_CURATOR).map((list) => (
              <CuratedListCard key={list.slug} list={list} />
            ))}
          </div>
          {curator.lists.length > LISTS_PER_CURATOR && (
            <Link
              href={`/library/curated/${curator.slug}`}
              className="mt-3 inline-block text-[12px] text-text-tertiary hover:text-accent"
            >
              {t("moreLists", { count: curator.lists.length - LISTS_PER_CURATOR })}
            </Link>
          )}
        </div>
      )}
    </article>
  );
}

export default function CuratedHubView({
  hub,
  selectedKind,
  selectedMedia,
  selectedTopic,
}: {
  hub: CuratedHub;
  selectedKind: string | null;
  selectedMedia: string | null;
  selectedTopic: string | null;
}) {
  const t = useTranslations("library.curated");

  const initial: CuratedBrowseInitial = {
    media: selectedMedia,
    kind: selectedKind,
    topic: selectedTopic,
  };
  const browse = useCuratedBrowse(hub.curators, initial);
  const { shown } = browse;

  /**
   * 탭을 갈아도 서버를 다시 다녀오지 않는다 — 기관 자료는 이미 전부 받아 두었다.
   * 주소만 바꿔 링크 공유와 새로고침이 듣게 한다(라우터로 밀면 왕복이 생겨 반응이 늦다).
   */
  const syncUrl = (next: { media: string | null; kind?: string | null; topic?: string | null }) => {
    const q = new URLSearchParams();
    if (next.media) q.set("media", next.media);
    if (next.kind) q.set("kind", next.kind);
    if (next.topic) q.set("topic", next.topic);
    window.history.replaceState(null, "", `${window.location.pathname}${q.toString() ? `?${q}` : ""}`);
  };

  if (hub.curators.length === 0) {
    return <p className="py-16 text-center text-[14px] text-text-tertiary">{t("empty")}</p>;
  }

  return (
    <div className="space-y-6">
      {/* 서가로 돌아가는 길은 서가 레이아웃의 공통 뒤두 가지기가 맡는다 */}
      <p className="mx-auto max-w-3xl text-center text-[14px] leading-relaxed text-text-secondary">
        {t("intro")}
      </p>

      <CuratedBrowseTabs
        browse={browse}
        align="center"
        size="md"
        onSelectMedia={(m) => {
          browse.setMedia(m);
          syncUrl({ media: m });
        }}
        onSelectKind={(k) => {
          browse.setKind(k);
          syncUrl({ media: browse.activeMedia, kind: k });
        }}
        onSelectTopic={(tp) => {
          browse.setTopic(tp);
          syncUrl({ media: browse.activeMedia, topic: tp });
        }}
        onView={(v) => {
          browse.setViewTopic(v);
          syncUrl(v ? { media: browse.activeMedia, topic: browse.activeTopic } : { media: browse.activeMedia, kind: browse.activeKind });
        }}
      />

      {/* 기관이 스물이 넘어 한 줄에 하나씩 쌓이면 어치 없다. 넓은 화면은 두 줄로 나눈다 */}
      <div className="grid gap-4 lg:grid-cols-2">
        {shown.map((curator) => (
          <CuratedCard key={curator.slug} curator={curator} />
        ))}
      </div>
    </div>
  );
}
