/*
  파일명: /components/features/library/hub/CuratedHubBrowse.tsx
  기능: 서가 허브의 「기관 선정」 구획 (클라이언트)
  책임: 기관 선정 허브(/library/curated)와 같은 조작대(카테고리·기관별/주제별)를 얹고
        고른 갈래의 목록 몇 건을 보여준다. 안(전체 허브 화면)과 밖(서가 허브 구획)이
        같은 공용 부품(useCuratedBrowse + CuratedBrowseTabs + CuratedListCard)을 쓴다.
        구획 특성상 목록 수는 제한한다 — 나머지는 「더 보기」가 잇는다.
*/ // ------------------------------

"use client";

import type { CuratedHub } from "@/actions/library/types";
import CuratedBrowseTabs from "../curated/CuratedBrowseTabs";
import CuratedListCard from "../curated/CuratedListCard";
import { useCuratedBrowse } from "../curated/useCuratedBrowse";

/** 허브 구획에서 한 번에 세우는 목록 수 — 너무 많이 펼치면 아래 구획과 균형이 어긋난다 */
const LISTS_LIMIT = 6;

export default function CuratedHubBrowse({ hub }: { hub: CuratedHub }) {
  const browse = useCuratedBrowse(hub.curators);

  // 고른 갈래(매체·기관/주제)에 맞는 목록만 앞부분에서 세운다
  const lists = browse.shown.flatMap((c) => c.lists).slice(0, LISTS_LIMIT);

  return (
    <div className="space-y-5">
      <CuratedBrowseTabs
        browse={browse}
        onSelectMedia={browse.setMedia}
        onSelectKind={browse.setKind}
        onSelectTopic={browse.setTopic}
        onView={browse.setViewTopic}
        align="center"
        size="md"
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {lists.map((list) => (
          <CuratedListCard key={`${list.curatorSlug}/${list.slug}`} list={list} />
        ))}
      </div>
    </div>
  );
}