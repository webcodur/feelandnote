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
import type { CuratedHub } from "@/actions/library/types";
import CuratedListCard from "./CuratedListCard";
import CuratedBrowseTabs from "./CuratedBrowseTabs";
import { useCuratedBrowse, type CuratedBrowseInitial } from "./useCuratedBrowse";

/** 한 기관 카드에서 펼치는 목록 수. 나머지는 기관 화면에서 본다 */
const LISTS_PER_CURATOR = 2;

type Curator = CuratedHub["curators"][number];

function CuratedCard({ curator }: { curator: Curator }) {
  const t = useTranslations("library.curated");

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#161616]/80 p-4 hover:border-white/[0.12] sm:p-5">
      <div className="grid grid-cols-[auto_1fr] gap-3">
        {curator.logoUrl ? (
          // 기관 로고는 대부분 흰 종이 위에 쓰이도록 만들어져 검은 글자가 많다.
          // 어두운 화면에 그대로 얹으면 묻히므로 밝은 타일 위에 올린다
          // 여백 로고 파일 자체에 이미 들어 있어, 여기서 또 넣으면 그림이 절반만 찬다
          // 타일은 설명 열 높이만큼 늘어나고, 정방형이라 폭도 함께 커진다
          <div className="relative aspect-square overflow-hidden rounded-lg bg-white">
            <Image src={curator.logoUrl} alt={curator.name} fill className="object-contain" sizes="120px" />
          </div>
        ) : (
          <div className="flex aspect-square items-center justify-center rounded-lg border border-white/[0.06] bg-neutral-900 text-[15px] font-serif font-bold text-text-tertiary">
            {curator.name.slice(0, 1)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <Link
            href={`/library/curated/${curator.slug}`}
            className="text-[16px] font-serif font-bold text-text-primary hover:text-accent"
          >
            {curator.name}
          </Link>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-text-tertiary">
            {curator.country && <NationalityText code={curator.country} />}
            {curator.foundedYear && <span>{curator.foundedYear}</span>}
            <span>{t("listCount", { count: curator.listCount })}</span>
          </div>
          {curator.description && (
            <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-text-secondary">{curator.description}</p>
          )}
        </div>
      </div>

      {curator.lists.length > 0 && (
        <>
          {/* 기관 카드가 절반 폭이므로 목록은 한 줄에 하나씩 — 더 쪼개면 글자가 뭉간다 */}
          <div className="mt-4 grid gap-3">
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
        </>
      )}
    </div>
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
      <p className="max-w-3xl text-[14px] leading-relaxed text-text-secondary">{t("intro")}</p>

      <CuratedBrowseTabs
        browse={browse}
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