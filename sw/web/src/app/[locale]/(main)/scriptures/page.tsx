/*
  파일명: /app/(main)/scriptures/page.tsx
  기능: 서가 허브 페이지
  책임: 서가의 서브페이지들을 허브 구조로 묶어 미리보기를 제공하고 각 페이지로 안내한다.
*/ // ------------------------------

import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { getAlternates } from "@/lib/seo";
import { Clock, Route, Scroll, GraduationCap, User } from "lucide-react";
import HubNav from "@/components/shared/HubNav";
import type { HubNavItem } from "@/components/shared/HubNav";

import { getTodayFigure, getTopCelebsAcrossAllEras, getProfessionContentCounts } from "@/actions/scriptures";
import { getAcademyLessonProgressState } from "@/actions/scriptures/academyProgress";

import HubSection from "@/components/shared/HubSection";
import FigurePreview from "@/components/features/scriptures/hub/FigurePreview";
import EraPreview from "@/components/features/scriptures/hub/EraPreview";
import ProfessionPreview from "@/components/features/scriptures/hub/ProfessionPreview";
import MuseumPreview from "@/components/features/scriptures/hub/MuseumPreview";
import AcademyPreview from "@/components/features/scriptures/hub/AcademyPreview";

export async function generateMetadata() {
  const t = await getTranslations("scriptures.meta");
  return { title: t("title"), description: t("description"), alternates: getAlternates("/scriptures") };
}

// #region 서브페이지 정의
const SCRIPTURE_SECTIONS = [
  {
    href: "/scriptures/era",
    titleKey: "era",
    descKey: "era" as const,
    label: "MASTERPIECES",
    icon: <Clock className="h-5 w-5" />,
  },
  {
    href: "/scriptures/profession",
    titleKey: "profession",
    descKey: "profession" as const,
    label: "CROSSROADS",
    icon: <Route className="h-5 w-5" />,
  },
  {
    href: "/scriptures/figure",
    titleKey: "figure",
    descKey: "figure" as const,
    label: "FIGURE",
    icon: <User className="h-5 w-5" />,
  },
  {
    href: "/scriptures/museum",
    titleKey: "museum",
    descKey: "museum" as const,
    label: "MUSEUM",
    icon: <Scroll className="h-5 w-5" />,
  },
  {
    href: "/scriptures/academy",
    titleKey: "academy",
    descKey: "academy" as const,
    label: "ACADEMY",
    icon: <GraduationCap className="h-5 w-5" />,
  },
] as const;
// #endregion

const TAB_LABEL_KEYS: Record<string, string> = {
  era: "era",
  profession: "profession",
  museum: "museum",
  academy: "academy",
};

async function ScripturesHubContent() {
  const tHub = await getTranslations("scriptures.hub");

  // 병렬 데이터 페칭
  const [
    todayFigureRes,
    topCelebs,
    professionCounts,
    academyState
  ] = await Promise.all([
    getTodayFigure(),
    getTopCelebsAcrossAllEras(),
    getProfessionContentCounts(),
    getAcademyLessonProgressState()
  ]);

  const { figure, contents } = todayFigureRes;

  return (
    <div className="space-y-12 md:space-y-16 mt-4">
      {/* 1. 오늘의 인물 (가장 주목도 높게) */}
      {figure && contents && (
        <HubSection
          title={tHub("figureLabel")}
          subtitle={tHub("figure")}
          moreHref="/scriptures/figure"
          moreLabel={tHub("moreDetail")}
        >
          <FigurePreview figure={figure as any} contents={contents} />
        </HubSection>
      )}

      {/* 2. 시대의 명작 */}
      {topCelebs && topCelebs.length > 0 && (
        <HubSection
          title={tHub("eraLabel")}
          subtitle={tHub("era")}
          moreHref="/scriptures/era"
          moreLabel={tHub("moreDetail")}
        >
          <EraPreview celebs={topCelebs} />
        </HubSection>
      )}

      {/* 3. 길의 갈래 */}
      {professionCounts && professionCounts.length > 0 && (
        <HubSection
          title={tHub("professionLabel")}
          subtitle={tHub("profession")}
          moreHref="/scriptures/profession"
          moreLabel={tHub("moreDetail")}
        >
          <ProfessionPreview professionCounts={professionCounts} />
        </HubSection>
      )}

      {/* 4. 박물관 (학당 전으로 이동) */}
      <HubSection
        title={tHub("museumLabel")}
        subtitle={tHub("museum")}
        moreHref="/scriptures/museum"
        moreLabel={tHub("exploreMuseum")}
      >
        <MuseumPreview />
      </HubSection>

      {/* 5. 학당 (마지막 수련의 단계) */}
      <HubSection
        title={tHub("academyLabel")}
        subtitle={tHub("academy")}
        moreHref="/scriptures/academy"
        moreLabel={tHub("enterAcademy")}
      >
        <AcademyPreview isSignedIn={academyState.isSignedIn} />
      </HubSection>
    </div>
  );
}

export default async function ScripturesPage() {
  const tTabs = await getTranslations("scriptures.tabs");
  const tHub = await getTranslations("scriptures.hub");

  const navItems: HubNavItem[] = SCRIPTURE_SECTIONS.map((section) => {
    const tabKey = TAB_LABEL_KEYS[section.titleKey];
    return {
      label: tabKey ? tTabs(`${tabKey}.label` as any) : tHub("figureLabel"),
      href: section.href,
      icon: section.icon,
    };
  });

  return (
    <div className="space-y-8 pb-20">
      {/* 서브페이지 네비게이터 (상단 고정) */}
      <HubNav items={navItems} placeholder={tHub("quickNav")} />

      {/* 허브 콘텐츠 */}
      <Suspense fallback={
        <div className="w-full flex items-center justify-center py-32">
           <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" />
        </div>
      }>
        <ScripturesHubContent />
      </Suspense>
    </div>
  );
}
