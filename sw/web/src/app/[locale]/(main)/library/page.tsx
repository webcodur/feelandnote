/*
  파일명: /app/(main)/library/page.tsx
  기능: 서가 허브 페이지
  책임: 서가의 서브페이지들을 허브 구조로 묶어 미리보기를 제공하고 각 페이지로 안내한다.
*/ // ------------------------------

import { getTranslations } from "next-intl/server";
import { getLocalizedAlternates } from "@/lib/seo";
import HubNav from "@/components/shared/HubNav";
import HubSection from "@/components/shared/HubSection";
import { SCRIPTURES_GROUP_ID, SCRIPTURES_SECTIONS, scripturesSection } from "@/components/shared/hubSectionUtils";
import PopularBooks from "@/components/features/home/PopularBooks";

import { getTodayFigure, getScripturesByEra, getProfessionContentCounts, getContentSamplesByProfession } from "@/actions/scriptures";
import { getAcademyLessonProgressState } from "@/actions/scriptures/academyProgress";
import FigurePreview from "@/components/features/scriptures/hub/FigurePreview";
import EraPreview from "@/components/features/scriptures/hub/EraPreview";
import ProfessionPreview from "@/components/features/scriptures/hub/ProfessionPreview";
import MuseumPreview from "@/components/features/scriptures/hub/MuseumPreview";
import AcademyPreview from "@/components/features/scriptures/hub/AcademyPreview";

export async function generateMetadata() {
  const t = await getTranslations("scriptures.meta");
  return { title: t("title"), description: t("description"), alternates: await getLocalizedAlternates("/library") };
}

async function ScripturesHubContent() {
  const tHub = await getTranslations("scriptures.hub");

  const [todayFigureRes, eraData, professionCounts, academyState] = await Promise.all([
    getTodayFigure(),
    getScripturesByEra(),
    getProfessionContentCounts(),
    getAcademyLessonProgressState(),
  ]);

  const { figure, contents } = todayFigureRes;

  const allProfessions = professionCounts.map(p => p.profession);
  const professionContentSamples = await getContentSamplesByProfession(allProfessions, 3);

  return (
    <div className="space-y-12 md:space-y-16 mt-4">
      {/* 1/5 오늘의 인물 */}
      {figure && contents && (
        <HubSection {...scripturesSection("figure", tHub)}>
          <FigurePreview figure={figure} contents={contents} />
        </HubSection>
      )}

      {/* 2/5 불후의 명작 */}
      {eraData && eraData.length > 0 && (
        <HubSection {...scripturesSection("era", tHub)}>
          <EraPreview eras={eraData.map(e => ({
            era: e.era,
            label: e.label,
            period: e.period,
            description: e.description,
            celebCount: e.celebCount,
            contentCount: e.contentCount,
            topCelebs: e.topCelebs,
            topContents: e.contents.slice(0, 3).map(c => ({ id: c.id, title: c.title, thumbnail_url: c.thumbnail_url, type: c.type })),
          }))} />
        </HubSection>
      )}

      {/* 3/5 길의 갈래 */}
      {professionCounts && professionCounts.length > 0 && (
        <HubSection {...scripturesSection("profession", tHub)}>
          <ProfessionPreview professionCounts={professionCounts} contentSamples={professionContentSamples} />
        </HubSection>
      )}

      {/* 4/5 박물관 */}
      <HubSection {...scripturesSection("museum", tHub)}>
        <MuseumPreview />
      </HubSection>

      {/* 5/5 학당 */}
      <HubSection {...scripturesSection("academy", tHub)}>
        <AcademyPreview isSignedIn={academyState.isSignedIn} />
      </HubSection>
    </div>
  );
}

export default async function ScripturesPage() {
  const tHub = await getTranslations("scriptures.hub");

  return (
    <div className="space-y-8 pb-20">
      {/* 서브페이지 네비게이터 — SSoT config에서 라벨·순서·넘버링 동기화 */}
      <HubNav
        hubItems={SCRIPTURES_SECTIONS.map((s) => ({
          label: tHub(s.titleKey),
          href: s.moreHref,
          icon: s.icon,
        }))}
        groupId={SCRIPTURES_GROUP_ID}
      />

      <ScripturesHubContent />

      {/* 쿠팡 제휴: AdSense 승인 전까지 비활성 */}
      {/* <PopularBooks /> */}
    </div>
  );
}
