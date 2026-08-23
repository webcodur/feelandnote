/*
  파일명: /app/(main)/celeb/[slug]/RelatedFigureLinks.tsx
  기능: 인물 상세 하단의 관계 인물 링크 — 서버 렌더 전용
  책임: 관계 그래프(RelationGraphSection)는 모달로만 이동해 크롤러에게 막다른 길이다.
        이미 서버가 들고 있는 relations에서 공개 인물(slug 보유)만 골라 실제 <a> 링크로 세워
        인물 상세끼리 그물로 잇는다. 추가 조회 없음 — 카드는 FigureLinkGrid가 그린다.
*/

import { getTranslations } from "next-intl/server";
import type { CelebRelationItem } from "@/actions/user/getCelebBySlug";
import FigureLinkGrid from "@/components/features/celeb/FigureLinkGrid";

/** 세울 링크 상한 — 관계가 수십이면 다 걸지 않고 정렬 순서(관계 유형순) 앞을 취한다 */
const MAX_LINKS = 12;

interface RelatedFigureLinksProps {
  displayName: string;
  relations: CelebRelationItem[];
}

export default async function RelatedFigureLinks({
  displayName,
  relations,
}: RelatedFigureLinksProps) {
  // slug는 공개(active) 인물에만 채워진다 — 비공개·명단 밖 인물은 걸지 않는다.
  // 한 사람과 관계가 둘 이상일 수 있다(알모도바르와 페넬로페 크루즈는 friend이자 influenced).
  // 그래프는 두 관계를 다 보여 주지만 이 그리드는 인물 목록이라 한 번만 세운다.
  const seen = new Set<string>();
  const linkable = relations
    .filter((r) => {
      if (!r.slug || seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    })
    .slice(0, MAX_LINKS);
  if (linkable.length === 0) return null;

  const t = await getTranslations("celebPage");

  return (
    <div className="mt-12">
      <FigureLinkGrid
        headingId="related-figure-links"
        title={t("relatedLinksTitle")}
        description={t("relatedLinksDesc", { name: displayName })}
        figures={linkable.map((relation) => ({
          id: relation.id,
          slug: relation.slug,
          nickname: relation.nickname,
          nickname_en: relation.nickname_en,
          avatar_url: relation.avatar_url,
          title: null,
          subtitle: t(`relFilter_${relation.relGroup}`),
        }))}
      />
    </div>
  );
}
