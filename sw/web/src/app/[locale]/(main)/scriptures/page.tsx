/*
  파일명: /app/(main)/scriptures/page.tsx
  기능: 서가 허브 페이지
  책임: 서가의 서브페이지들을 허브 구조로 묶어 미리보기를 제공하고 각 페이지로 안내한다.
*/ // ------------------------------

import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { getAlternates } from "@/lib/seo";
import { Clock, Route, Scroll, GraduationCap } from "lucide-react";
import HubNav from "@/components/shared/HubNav";

import { getTodayFigure, getScripturesByEra, getProfessionContentCounts, getContentSamplesByProfession } from "@/actions/scriptures";
import { getAcademyLessonProgressState } from "@/actions/scriptures/academyProgress";

import HubSection from "@/components/shared/HubSection";
import PopularBooks from "@/components/features/home/PopularBooks";
import FigurePreview from "@/components/features/scriptures/hub/FigurePreview";
import EraPreview from "@/components/features/scriptures/hub/EraPreview";
import ProfessionPreview from "@/components/features/scriptures/hub/ProfessionPreview";
import MuseumPreview from "@/components/features/scriptures/hub/MuseumPreview";
import AcademyPreview from "@/components/features/scriptures/hub/AcademyPreview";

export async function generateMetadata() {
  const t = await getTranslations("scriptures.meta");
  return { title: t("title"), description: t("description"), alternates: getAlternates("/scriptures") };
}

// #region 허브 섹션 Nav 항목 — 실제 페이지 내 섹션 순서와 동일
const SCRIPTURE_HUB_ITEMS = [
  { titleKey: "era", icon: <Clock className="h-4 w-4" /> },         // 01: 시대의 명작
  { titleKey: "profession", icon: <Route className="h-4 w-4" /> },  // 02: 길의 갈래
  { titleKey: "museum", icon: <Scroll className="h-4 w-4" /> },     // 03: 박물관
  { titleKey: "academy", icon: <GraduationCap className="h-4 w-4" /> }, // 04: 학당
] as const;
// #endregion

async function ScripturesHubContent() {
  const tHub = await getTranslations("scriptures.hub");

  // 1차 병렬 데이터 페칭
  const [
    todayFigureRes,
    eraData,
    professionCounts,
    academyState
  ] = await Promise.all([
    getTodayFigure(),
    getScripturesByEra(),
    getProfessionContentCounts(),
    getAcademyLessonProgressState()
  ]);

  const { figure, contents } = todayFigureRes;

  // 2차: 콘텐츠 샘플 (1차 결과에 의존)
  const topProfessions = [...professionCounts].sort((a, b) => b.count - a.count).slice(0, 6).map(p => p.profession);
  const professionContentSamples = await getContentSamplesByProfession(topProfessions, 2);

  return (
    <div className="space-y-12 md:space-y-16 mt-4">
      {/* 1. 오늘의 인물 (크로스 링크 — explore로 이동됨) */}
      {figure && contents && (
        <HubSection
          title={tHub("figureLabel")}
          subtitle={tHub("figure")}
          moreHref="/explore/today"
          moreLabel={tHub("moreDetail")}
          index={0} total={5} groupId="scriptures"
        >
          <FigurePreview figure={figure as any} contents={contents} />
        </HubSection>
      )}

      {/* 2. 시대의 명작 */}
      {eraData && eraData.length > 0 && (
        <HubSection
          title={tHub("eraLabel")}
          subtitle={tHub("era")}
          moreHref="/scriptures/era"
          moreLabel={tHub("moreDetail")}
          index={1} total={5} groupId="scriptures"
        >
          <EraPreview eras={eraData.map(e => ({
            era: e.era,
            label: e.label,
            period: e.period,
            description: e.description,
            celebCount: e.celebCount,
            contentCount: e.contentCount,
            topCelebs: e.topCelebs,
          }))} />
        </HubSection>
      )}

      {/* 3. 길의 갈래 */}
      {professionCounts && professionCounts.length > 0 && (
        <HubSection
          title={tHub("professionLabel")}
          subtitle={tHub("profession")}
          moreHref="/scriptures/profession"
          moreLabel={tHub("moreDetail")}
          index={2} total={5} groupId="scriptures"
        >
          <ProfessionPreview professionCounts={professionCounts} contentSamples={professionContentSamples} />
        </HubSection>
      )}

      {/* 4. 박물관 */}
      <HubSection
        title={tHub("museumLabel")}
        subtitle={tHub("museum")}
        moreHref="/scriptures/museum"
        moreLabel={tHub("exploreMuseum")}
        index={3} total={5} groupId="scriptures"
      >
        <MuseumPreview />
      </HubSection>

      {/* 5. 학당 */}
      <HubSection
        title={tHub("academyLabel")}
        subtitle={tHub("academy")}
        moreHref="/scriptures/academy"
        moreLabel={tHub("enterAcademy")}
        index={4} total={5} groupId="scriptures"
      >
        <AcademyPreview isSignedIn={academyState.isSignedIn} />
      </HubSection>
    </div>
  );
}

export default async function ScripturesPage() {
  const tHub = await getTranslations("scriptures.hub");

  const hubItems = SCRIPTURE_HUB_ITEMS.map((item) => ({
    label: tHub(`${item.titleKey}Label` as any),
    href: `/scriptures/${item.titleKey}`,
    icon: item.icon,
  }));

  return (
    <div className="space-y-8 pb-20">
      {/* 서브페이지 네비게이터 */}
      <HubNav hubItems={hubItems} groupId="scriptures" />

      {/* 허브 콘텐츠 */}
      <Suspense fallback={
        <div className="w-full flex items-center justify-center py-32">
           <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" />
        </div>
      }>
        <ScripturesHubContent />
      </Suspense>

      <PopularBooks />
    </div>
  );
}
