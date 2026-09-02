/*
  파일명: /components/features/library/curated/CuratedListBrowseLinks.tsx
  기능: 목록 상세에서 허브로 되돌릴 수 있는 둘러보기 조작대 (클라이언트)
  책임: 허브와 같은 조작대(카테고리·기관별/주제별)를 얹되,
        이 화면은 목록 하나뿐이라 탭이 화면 안 구성을 바꾸지 않고 기관 선정 허브 조합으로 이동한다.
*/ // ------------------------------

"use client";

import type { CuratedHub, CuratedListDetail } from "@/actions/library/types";
import CuratedBrowseTabs from "./CuratedBrowseTabs";
import { useCuratedBrowse } from "./useCuratedBrowse";

export default function CuratedListBrowseLinks({
  hub,
  list,
}: {
  hub: CuratedHub;
  list: CuratedListDetail;
}) {
  const browse = useCuratedBrowse(hub.curators, {
    media: list.contentType,
    kind: list.curator.kind,
  });

  const linkHref = (q: { media?: string; kind?: string; topic?: string }) => {
    const params = new URLSearchParams();
    if (q.media) params.set("media", q.media);
    if (q.topic) params.set("topic", q.topic);
    // 기관(성격) 탭은 매체만 기억한다 — 허브의 기관별은 카테고리 안에서 갈린다
    if (!q.topic && q.kind) params.set("kind", q.kind);
    const qs = params.toString();
    return qs ? `/library/curated?${qs}` : "/library/curated";
  };

  // 링크 모드지만 기관별/주제별 갈아타기는 탭 행이 바뀌므로 살아 있어야 한다
  return (
    <CuratedBrowseTabs
      browse={browse}
      linkHref={linkHref}
      align="center"
      size="md"
      onView={browse.setViewTopic}
    />
  );
}
