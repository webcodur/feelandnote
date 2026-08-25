/*
  파일명: /app/(main)/celeb/[slug]/RelatedFigureLinks.tsx
  기능: 인물 상세 하단의 이어지는 인물 — 서버 렌더 전용
  책임: 관계 그래프(RelationGraphSection)는 모달로만 이동해 크롤러에게 막다른 길이다.
        여기서 실제 <a> 링크를 세워 인물 상세끼리 그물로 잇는다.
        근거 있는 사이를 먼저 세우고, 관계가 얇은 인물은 남은 자리를 직군·시대·나라가
        가까운 인물로 채운다 — 순위 규칙은 lib/celeb/relatedFigures.ts가 쥔다.
        카드는 FigureLinkGrid가 그린다.
*/

import { getTranslations } from "next-intl/server";
import { getRelatedFigures } from "@/actions/celebs/getRelatedFigures";
import type { CelebRelationItem } from "@/actions/user/getCelebBySlug";
import FigureLinkGrid from "@/components/features/celeb/FigureLinkGrid";

/** 세울 링크 상한 — 관계가 수십이면 다 걸지 않고 가까운 순으로 앞을 취한다 */
const MAX_LINKS = 12;

interface RelatedFigureLinksProps {
  displayName: string;
  celebId: string;
  profession: string | null;
  nationality: string | null;
  birthDate: string | null;
  celebTier?: string | null;
  relations: CelebRelationItem[];
}

export default async function RelatedFigureLinks({
  displayName,
  celebId,
  profession,
  nationality,
  birthDate,
  celebTier,
  relations,
}: RelatedFigureLinksProps) {
  const figures = await getRelatedFigures({
    celebId,
    profession,
    nationality,
    birthDate,
    celebTier,
    relations,
    limit: MAX_LINKS,
  });
  if (figures.length === 0) return null;

  const t = await getTranslations("celebPage");
  const tp = await getTranslations("profession");

  // 여백·구분선을 아래 「읽은 책」 구획과 같은 값으로 맞춘다 — 둘이 같은 리듬으로 서야 한다
  return (
    <div className="mt-12 w-full border-t border-white/5 pt-6 md:mt-20 md:pt-10">
      <FigureLinkGrid
        headingId="related-figure-links"
        title={t("relatedLinksTitle")}
        description={t("relatedLinksDesc", { name: displayName })}
        figures={figures.map(({ candidate, kind, relGroup }) => ({
          id: candidate.id,
          slug: candidate.slug,
          nickname: candidate.nickname,
          nickname_en: candidate.nickname_en,
          avatar_url: candidate.avatar_url,
          title: null,
          // 왜 이 사람이 섰는지를 부제로 밝힌다. 근거 있는 사이는 관계 이름,
          // 계산으로 채운 자리는 직군을 적는다 — 직군이 비면 계산이라고만 말한다.
          subtitle:
            kind === "relation"
              ? t(`relFilter_${relGroup}`)
              : candidate.profession && tp.has(candidate.profession)
                ? tp(candidate.profession)
                : t("relatedLinksSimilar"),
        }))}
      />
    </div>
  );
}
