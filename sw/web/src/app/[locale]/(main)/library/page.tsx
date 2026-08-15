/*
  파일명: /app/(main)/library/page.tsx
  기능: 서가 허브 페이지
  책임: 서가의 서브페이지들을 허브 구조로 묶어 미리보기를 제공하고 각 페이지로 안내한다.
        목차·구획 헤더는 즉시 그리고, 구획마다 자기 조회만 기다리는 독립 레인을 둔다.
*/ // ------------------------------

import { getTranslations } from "next-intl/server";
import { getLocalizedAlternates } from "@/lib/seo";
import HubNav from "@/components/shared/HubNav";
import HubSection from "@/components/shared/HubSection";
import { LIBRARY_GROUP_ID, LIBRARY_SECTIONS, hubNavItems, hubSection } from "@/components/shared/hubSectionUtils";
import PopularBooks from "@/components/features/home/PopularBooks";
import { PendingBlock } from "@/components/ui/pending";
import Lane from "@/components/ui/pending/Lane";
import AcademyPreview from "@/components/features/library/hub/AcademyPreview";
import MuseumPreview from "@/components/features/library/hub/MuseumPreview";
import { AcademyContinueLink, CuratedSection, PopularSection } from "./sections";

export const maxDuration = 30;

export async function generateMetadata() {
  const t = await getTranslations("library.meta");
  return { title: t("title"), description: t("description"), alternates: await getLocalizedAlternates("/library") };
}

export default async function ScripturesPage() {
  const tHub = await getTranslations("library.hub");
  const tPending = await getTranslations("pending");

  // 목차·구획 번호는 config 고정이다 — 구획은 자료 유무와 무관하게 항상 그려진다.
  // 실패·빈 자리는 각 구획 레인이 제자리에서 알아서 처리한다.
  const sections = LIBRARY_SECTIONS;
  const section = (key: string) => hubSection(sections, LIBRARY_GROUP_ID, key, tHub);

  return (
    <div className="space-y-8 pb-20">
      <HubNav hubItems={hubNavItems(sections, tHub)} groupId={LIBRARY_GROUP_ID} />

      <div className="space-y-12 md:space-y-16 mt-4">
        {/* 1/4 인기 작품 — 인물들이 많이 고른 작품 여섯 개를 그대로 보여준다 */}
        <HubSection {...section("popular")}>
          <Lane fallback={<PendingBlock variant="grid" count={6} label={tPending("loading")} />}>
            <PopularSection />
          </Lane>
        </HubSection>

        {/* 2/4 기관 선정 */}
        <HubSection {...section("curated")}>
          <Lane fallback={<PendingBlock variant="grid" count={6} label={tPending("loading")} />}>
            <CuratedSection />
          </Lane>
        </HubSection>

        {/* 3/4 박물관 — 매체가 걸어온 길. 정적 상수라 즉시 그린다 */}
        <HubSection {...section("museum")}>
          <MuseumPreview />
        </HubSection>

        {/* 4/4 학당 — 카드는 정적 상수라 즉시 그리고, 로그인 진도만 작은 레인으로 따로 채운다 */}
        <HubSection {...section("academy")}>
          <AcademyPreview
            continueLink={
              <Lane fallback={null}>
                <AcademyContinueLink />
              </Lane>
            }
          />
        </HubSection>
      </div>

      {/* 제휴 도서 — 링크가 걸린 책이 없거나 영문 화면이면 컴포넌트가 스스로 접는다 */}
      <PopularBooks />
    </div>
  );
}
