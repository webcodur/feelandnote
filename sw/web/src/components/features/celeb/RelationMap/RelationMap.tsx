/*
  파일명: /components/features/celeb/RelationMap/RelationMap.tsx
  기능: 관계망 구획 — 탐색기와 사슬
  책임: 조회는 호출처가 하고 여기는 받은 재료를 세운다.
        관계 자료는 인물 상세의 도표 모달에만 있어 크롤러에게 막다른 길이었다.
        여기서 실제 <a>로 펴 인물 상세를 잇는다.

        주인공은 탐색기다. 방문자가 인물을 골라 그 둘레를 보고 얼굴을 눌러 파고든다.
        사슬은 탐색기로 볼 수 없는 모양이라 따로 남긴다 — 탐색기는 한 사람의 둘레를
        보여 줄 뿐, 여러 사람을 관통해 흐르는 계보는 보여 주지 못한다.
*/

import { getLocale, getTranslations } from "next-intl/server";

import CenteredSectionHeading from "@/components/ui/CenteredSectionHeading";
import { PendingBlock } from "@/components/ui/pending";
import type { RelationShapes } from "@/actions/home/getRelationShapes";
import type { RelationNeighborhood } from "@/actions/home/getRelationNeighborhood";
import ChainGraph from "./ChainGraph";
import RelationExplorer from "./RelationExplorer";

/** 이 구획이 채워지기를 기다리는 자리 */
export function RelationMapPending({ label }: { label?: string }) {
  return (
    <PendingBlock variant="grid" cols="grid-cols-1" aspect="h-[320px]" count={2} label={label} />
  );
}

/** 모양 한 무리를 여는 이름표. 구획 제목이 가운데 서므로 이름표도 같은 축에 둔다 */
function ShapeLabel({ text, hint }: { text: string; hint: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1 text-center">
      <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
        {text}
      </span>
      <span className="text-xs text-text-secondary">{hint}</span>
    </div>
  );
}

interface RelationMapProps {
  headingId?: string;
  title?: string;
  description?: string;
  shapes: RelationShapes;
  /** 탐색기가 처음 세울 관계망. 없으면 탐색기를 접고 사슬만 세운다 */
  opening: RelationNeighborhood | null;
}

export default async function RelationMap({
  headingId,
  title,
  description,
  shapes,
  opening,
}: RelationMapProps) {
  const { chains, starters } = shapes;
  if (!opening && chains.length === 0) return null;

  const locale = await getLocale();
  const isEn = locale === "en";
  const t = await getTranslations("explore.hub.relationMap");

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

      <div className="space-y-10 md:space-y-14">
        {opening && (
          <div>
            <ShapeLabel text={t("shapeExplorer")} hint={t("shapeExplorerHint")} />
            <RelationExplorer initial={opening} starters={starters} isEn={isEn} />
          </div>
        )}

        {chains.length > 0 && (
          <div>
            <ShapeLabel text={t("shapeChain")} hint={t("shapeChainHint")} />
            <div className="space-y-4">
              {chains.map((chain) => (
                <ChainGraph key={chain.id} chain={chain} isEn={isEn} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
