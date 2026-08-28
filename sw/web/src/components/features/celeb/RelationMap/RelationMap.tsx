/*
  파일명: /components/features/celeb/RelationMap/RelationMap.tsx
  기능: 관계망 구획 — 한 인물을 중심으로 관계를 따라가는 탐색기
  책임: 조회는 호출처가 하고 여기는 받은 재료를 세운다.
        관계 자료는 인물 상세의 도표 모달에만 있어 크롤러에게 막다른 길이었다.
        여기서 실제 <a>로 펴 인물 상세를 잇는다.

        방문자가 인물을 골라 그 둘레를 보고 얼굴을 눌러 파고든다.
*/

import { getLocale } from "next-intl/server";

import CenteredSectionHeading from "@/components/ui/CenteredSectionHeading";
import { PendingBlock } from "@/components/ui/pending";
import type { RelationShapes } from "@/actions/home/getRelationShapes";
import type { RelationNeighborhood } from "@/actions/home/getRelationNeighborhood";
import RelationExplorer from "./RelationExplorer";

/** 이 구획이 채워지기를 기다리는 자리 */
export function RelationMapPending({ label }: { label?: string }) {
  return (
    <PendingBlock variant="grid" cols="grid-cols-1" aspect="h-[320px]" count={1} label={label} />
  );
}

interface RelationMapProps {
  headingId?: string;
  title?: string;
  description?: string;
  shapes: RelationShapes;
  /** 탐색기가 처음 세울 관계망 */
  opening: RelationNeighborhood | null;
}

export default async function RelationMap({
  headingId,
  title,
  description,
  shapes,
  opening,
}: RelationMapProps) {
  const { starters } = shapes;
  if (!opening) return null;

  const locale = await getLocale();
  const isEn = locale === "en";
  return (
    <section aria-labelledby={headingId}>
      {title && (
        <CenteredSectionHeading
          id={headingId}
          title={title}
          description={description}
          className="mb-6 md:mb-10"
        />
      )}

      <RelationExplorer initial={opening} starters={starters} isEn={isEn} />
    </section>
  );
}
