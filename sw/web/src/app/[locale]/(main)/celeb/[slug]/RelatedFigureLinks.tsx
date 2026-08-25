/*
  파일명: /app/(main)/celeb/[slug]/RelatedFigureLinks.tsx
  기능: 인물 상세 하단의 이어지는 인물 — 서버 렌더 전용
  책임: 관계 그래프(RelationGraphSection)는 모달로만 이동해 크롤러에게 막다른 길이다.
        여기서 실제 <a> 링크를 세워 인물 상세끼리 그물로 잇는다.
        근거 있는 사이를 먼저 세우고, 관계가 얇은 인물은 남은 자리를 직군·시대·나라가
        가까운 인물로 채운다 — 순위 규칙은 lib/celeb/relatedFigures.ts가 쥔다.
        카드는 FigureLinkGrid가 그린다.
*/

import { getLocale, getTranslations } from "next-intl/server";
import { getRelatedFigures } from "@/actions/celebs/getRelatedFigures";
import type { CelebRelationItem } from "@/actions/user/getCelebBySlug";
import FigureLinkGrid from "@/components/features/celeb/FigureLinkGrid";
import { withParticle } from "@/lib/korean-particle";

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
    // 관계 원본은 note_en으로 오고 순위 함수는 noteEn을 읽는다 — 여기서 맞춰 넘긴다
    relations: relations.map((relation) => ({
      ...relation,
      noteEn: relation.note_en,
    })),
    limit: MAX_LINKS,
  });
  if (figures.length === 0) return null;

  const t = await getTranslations("celebPage");
  const tp = await getTranslations("profession");
  const locale = await getLocale();
  // 카드 한 줄에 들어갈 길이. 같은 뜻이라도 영문이 길어 자릿수를 달리 잡는다
  const noteMax = locale === "en" ? 40 : 24;

  // 여백·구분선을 아래 「읽은 책」 구획과 같은 값으로 맞춘다 — 둘이 같은 리듬으로 서야 한다
  return (
    <div className="mt-12 w-full border-t border-white/5 pt-6 md:mt-20 md:pt-10">
      <FigureLinkGrid
        headingId="related-figure-links"
        title={t("relatedLinksTitle")}
        // 이름 받침에 따라 조사를 골라 붙인다 — 화면에 「정국와(과)」가 남지 않게 한다
        description={t("relatedLinksDesc", {
          name: locale === "en" ? displayName : withParticle(displayName, "with"),
        })}
        figures={figures.map(({ candidate, kind, relGroup, note, noteEn }) => {
          // 왜 이 사람이 섰는지를 부제로 밝힌다. 근거 한 줄이 짧으면 그것부터 —
          // 「동료」보다 「방탄소년단 소속」이 먼저 읽힌다. 길면 관계 이름으로 물러난다.
          // 계산으로 채운 자리는 직군을 적고, 직군이 비면 계산이라고만 말한다.
          const reason = locale === "en" ? noteEn ?? note : note;
          return {
            id: candidate.id,
            slug: candidate.slug,
            nickname: candidate.nickname,
            nickname_en: candidate.nickname_en,
            avatar_url: candidate.avatar_url,
            title: null,
            subtitle:
              kind === "relation"
                ? reason && reason.length <= noteMax
                  ? reason
                  : t(`relFilter_${relGroup}`)
                : candidate.profession && tp.has(candidate.profession)
                  ? tp(candidate.profession)
                  : t("relatedLinksSimilar"),
          };
        })}
      />
    </div>
  );
}
