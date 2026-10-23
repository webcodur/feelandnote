/*
  파일명: /components/features/library/curated/CuratorBrowse.tsx
  기능: 기관 상세의 둘러보기 영역 (클라이언트)
  책임: 그 기관이 낸 목록을 카테고리·주제로 훑는다. 허브와 같은 조작대(
        CuratedBrowseTabs + useCuratedBrowse)를 그대로 쓴다.
  이 파일이 늘 따로 자신만의 상태를 만들지 않는다 — 데이터는 들어온 curator에서 만든다.
*/ // ------------------------------

"use client";

import { useTranslations } from "next-intl";
import type { CuratorDetail } from "@/actions/library/types";
import CuratedBrowseTabs from "./CuratedBrowseTabs";
import CuratedListCard from "./CuratedListCard";
import { useCuratedBrowse } from "./useCuratedBrowse";

export default function CuratorBrowse({ curator, initialBrowse }: { curator: CuratorDetail; initialBrowse?: { media?: string; topic?: string } }) {
  const t = useTranslations("library.curated");
  const browse = useCuratedBrowse([curator], initialBrowse);

  if (curator.lists.length === 0) {
    return <p className="py-10 text-center text-[14px] text-text-tertiary">{t("emptyLists")}</p>;
  }

  return (
    <div className="space-y-5">
      <CuratedBrowseTabs
        browse={browse}
        align="center"
        size="md"
        onSelectMedia={browse.setMedia}
        onSelectKind={browse.setKind}
        onSelectTopic={browse.setTopic}
        onView={browse.setViewTopic}
      />

      {/* 기관의 각 목록은 설명과 작품 미리보기를 함께 싣는다. */}
      <div className="grid grid-cols-1 items-start gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-8">
        {browse.shown.flatMap((c) =>
          c.lists.map((list) => <CuratedListCard key={list.slug} list={list} />)
        )}
      </div>
    </div>
  );
}
