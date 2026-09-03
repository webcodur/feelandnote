/*
  파일명: /components/features/library/curated/CuratedHubView.tsx
  기능: 기관 선정 허브 화면
  책임: 고른 갈래(카테고리·기관·주제)에 따라 선정 기관들을 서가 카드로 진열한다.
        기관 카드는 늘 펼쳐진 채로 전용관과 선정 목록으로 가는 길을 함께 내보인다.
*/ // ------------------------------

"use client";

import { useTranslations } from "next-intl";
import type { CuratedHub } from "@/actions/library/types";
import CuratedBrowseTabs from "./CuratedBrowseTabs";
import CuratorCard from "./CuratorCard";
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
        }}
        onSelectTopic={(tp) => {
          browse.setTopic(tp);
          syncUrl({ media: browse.activeMedia, topic: tp });
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

      {/* ── 기관 서가 카드 ── */}
      <div className="grid gap-3 pt-1 lg:grid-cols-2">
        {shown.map((curator) => (
          <CuratorCard key={curator.slug} curator={curator} />
        ))}
      </div>
    </div>
  );
}
