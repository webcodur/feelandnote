/*
  파일명: /components/features/library/curated/CuratedHubView.tsx
  기능: 기관 선정 허브 화면
  책임: 고른 갈래(카테고리·기관·주제)에 따라 선정 기관들을 단정한 아코디언 서가로 진열한다.
        기관을 누르면 해당 기관의 소개와 목록이 집중도 있게 열리고,
        목록을 누르면 그 자리에서 퀵 프리뷰 모달을 띄워 탐색 흐름을 가볍게 유지한다.
*/ // ------------------------------

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { CuratedHub, CuratedListSummary } from "@/actions/library/types";
import CuratedBrowseTabs from "./CuratedBrowseTabs";
import CuratorAccordion from "./CuratorAccordion";
import CuratedListModal from "./CuratedListModal";
import { useCuratedBrowse, type CuratedBrowseInitial } from "./useCuratedBrowse";

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

  // 현재 열려 있는 기관 (한 번에 1곳만 펼쳐 시각적 피로도를 방지, 기본값은 첫 번째 기관)
  const [openCuratorSlug, setOpenCuratorSlug] = useState<string | null>(
    shown[0]?.slug ?? null
  );

  // 퀵 프리뷰 모달에 띄울 목록
  const [activeList, setActiveList] = useState<CuratedListSummary | null>(null);

  /**
   * 탭을 갈아도 서버를 다시 다녀오지 않는다 — 기관 자료는 이미 전부 받아 두었다.
   * 주소만 바꿔 링크 공유와 새로고침이 듣게 한다.
   */
  const syncUrl = (next: {
    media: string | null;
    kind?: string | null;
    topic?: string | null;
  }) => {
    const q = new URLSearchParams();
    if (next.media) q.set("media", next.media);
    if (next.kind) q.set("kind", next.kind);
    if (next.topic) q.set("topic", next.topic);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${q.toString() ? `?${q}` : ""}`
    );
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

      {/* 상단 둘러보기 조작대 */}
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
          // 카테고리가 바뀌면 바뀐 목록의 첫 번째 기관을 열어준다
          const nextShown = browse.shown;
          if (nextShown.length > 0) setOpenCuratorSlug(nextShown[0].slug);
        }}
        onSelectTopic={(tp) => {
          browse.setTopic(tp);
          syncUrl({ media: browse.activeMedia, topic: tp });
          const nextShown = browse.shown;
          if (nextShown.length > 0) setOpenCuratorSlug(nextShown[0].slug);
        }}
        onView={(v) => {
          browse.setViewTopic(v);
          syncUrl(
            v
              ? { media: browse.activeMedia, topic: browse.activeTopic }
              : { media: browse.activeMedia, kind: browse.activeKind }
          );
        }}
      />

      {/* ── 기관 아코디언 서가 목록 (정갈한 단일 스택) ── */}
      <div className="space-y-3 pt-1">
        {shown.map((curator) => (
          <CuratorAccordion
            key={curator.slug}
            curator={curator}
            isOpen={openCuratorSlug === curator.slug}
            onToggle={() =>
              setOpenCuratorSlug((prev) => (prev === curator.slug ? null : curator.slug))
            }
            onSelectList={(list) => setActiveList(list)}
          />
        ))}
      </div>

      {/* ── 목록 퀵 프리뷰 모달 ── */}
      <CuratedListModal list={activeList} onClose={() => setActiveList(null)} />
    </div>
  );
}
