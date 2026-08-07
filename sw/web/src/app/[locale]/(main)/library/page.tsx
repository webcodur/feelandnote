/*
  파일명: /app/(main)/library/page.tsx
  기능: 서가 허브 페이지
  책임: 서가의 서브페이지들을 허브 구조로 묶어 미리보기를 제공하고 각 페이지로 안내한다.
*/ // ------------------------------

import { getTranslations } from "next-intl/server";
import { getLocalizedAlternates } from "@/lib/seo";
import HubNav from "@/components/shared/HubNav";
import HubSection from "@/components/shared/HubSection";
import { LIBRARY_GROUP_ID, LIBRARY_SECTIONS, hubNavItems, hubSection } from "@/components/shared/hubSectionUtils";
import PopularBooks from "@/components/features/home/PopularBooks";

import { getChosenLibrary, getCuratedHub } from "@/actions/library";
import { getAcademyLessonProgressState } from "@/actions/library/academyProgress";
import PopularPreview from "@/components/features/library/hub/PopularPreview";
import CuratedPreview from "@/components/features/library/hub/CuratedPreview";
import MuseumPreview from "@/components/features/library/hub/MuseumPreview";
import AcademyPreview from "@/components/features/library/hub/AcademyPreview";

export async function generateMetadata() {
  const t = await getTranslations("library.meta");
  return { title: t("title"), description: t("description"), alternates: await getLocalizedAlternates("/library") };
}

async function ScripturesHubContent() {
  const tHub = await getTranslations("library.hub");

  const [popular, curatedHub, academyState] = await Promise.all([
    getChosenLibrary({ page: 1, limit: 6 }),
    getCuratedHub(),
    getAcademyLessonProgressState(),
  ]);

  // 자료가 없어 접히는 구획이 있다. 목차와 번호는 "실제로 그려지는 것"만 세야
  // 눌렀을 때 갈 곳이 있다(HubNav 계약).
  const shown = new Set<string>([
    ...(popular.contents.length ? ["popular"] : []),
    ...(curatedHub.curators.length > 0 ? ["curated"] : []),
    "museum",
    "academy",
  ]);
  const sections = LIBRARY_SECTIONS.filter(s => shown.has(s.key));
  const section = (key: string) => hubSection(sections, LIBRARY_GROUP_ID, key, tHub);

  return (
    <div className="space-y-8 pb-20">
      {/* 목차 줄 — 화면 맨 위. 그려지는 구획만 넘긴다(없는 구획을 가리키면 눌러도 안 굴러간다) */}
      <HubNav hubItems={hubNavItems(sections, tHub)} groupId={LIBRARY_GROUP_ID} />

      <div className="space-y-12 md:space-y-16 mt-4">
      {/* 1/4 인기 작품 — 인물들이 많이 고른 작품 여섯 개를 그대로 보여준다 */}
      {popular.contents.length > 0 && (
        <HubSection {...section("popular")}>
          <PopularPreview contents={popular.contents} />
        </HubSection>
      )}

      {/* 2/4 기관 선정 */}
      {curatedHub.curators.length > 0 && (
        <HubSection {...section("curated")}>
          <CuratedPreview hub={curatedHub} />
        </HubSection>
      )}

      {/* 3/4 박물관 — 매체가 걸어온 길 */}
      <HubSection {...section("museum")}>
        <MuseumPreview />
      </HubSection>

      {/* 4/4 학당 — 다루는 법, 그리고 AI로 이어지는 다음 */}
      <HubSection {...section("academy")}>
        <AcademyPreview isSignedIn={academyState.isSignedIn} />
      </HubSection>
      </div>

      {/* 제휴 도서 — 링크가 걸린 책이 없거나 영문 화면이면 컴포넌트가 스스로 접는다 */}
      <PopularBooks />
    </div>
  );
}

export default function ScripturesPage() {
  return <ScripturesHubContent />;
}
