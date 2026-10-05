/*
  파일명: /app/(main)/page.tsx
  기능: 홈 — 오늘의 신문 1면
  책임: 적층 원칙을 쥔다. 위계는 탐색·서가와 같은 허브 문법(아틀라스 목차 + HubSection 번호
        구획)으로 표시한다. 머리기사(오늘의 인물) 하나만 깊고, 아래 구획은 갈수록 얕아진다.
        브랜드 줄 → 방문자 첫인사 액자 → 오늘의 인물 → 검색 급증 → 공지 → 추천 도서.
        로그인 유저용 빠른기록은 일단 주석 처리했다 — 재투입 여부는 상황에 맞게 정한다(sections.tsx).
*/ // ------------------------------

import { getTranslations } from "next-intl/server";
import { getLocalizedAlternates, getWebSiteJsonLd } from "@/lib/seo";
import { serializeJsonLd } from "@/lib/jsonLd";
import AsyncIntlProvider from "@/components/shared/AsyncIntlProvider";
import PageContainer from "@/components/layout/PageContainer";
import HomeBrandHeader from "@/components/features/home/HomeBrandHeader";
import HomeFigureLinks, { HOME_FIGURE_LINK_COLS, HOME_FIGURE_LINK_COUNT } from "@/components/features/home/HomeFigureLinks";
import PopularBooks from "@/components/features/home/PopularBooks";
import TodayFigurePending from "@/components/features/figure/TodayFigurePending";
import { FigureLinkGridPending } from "@/components/features/celeb/FigureLinkGrid";
import { HomeNoticePending } from "@/components/features/home/HomeNoticeSection";
import HubSection from "@/components/shared/HubSection";
import AtlasNavSections from "@/components/shared/atlasNav/AtlasNavSections";
import {
  HOME_GROUP_ID,
  HOME_SECTIONS,
  hubAtlasNavItems,
  hubSection,
  withoutMore,
} from "@/components/shared/hubSectionUtils";
import Lane from "@/components/ui/pending/Lane";
import { FigureSection, NoticeSection, VisitorIntroSection } from "./sections";

export const maxDuration = 30;

export async function generateMetadata() {
  const t = await getTranslations("site");
  return {
    title: { absolute: t("title") },
    description: t("description"),
    alternates: await getLocalizedAlternates("/"),
  };
}

export default async function MainPage() {
  const [t, siteT, tPending] = await Promise.all([
    getTranslations("home.hub"),
    getTranslations("site"),
    getTranslations("pending"),
  ]);
  const webSiteJsonLd = getWebSiteJsonLd(siteT("description"));
  const sec = (key: string) => hubSection(HOME_SECTIONS, HOME_GROUP_ID, key, t);
  const loading = tPending("loading");

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(webSiteJsonLd) }}
      />
      {/* 비동기 서버 페이지가 클라이언트 구획을 그리므로 intl 컨텍스트를 재공급한다(platform-02-code-rules.md) */}
      <AsyncIntlProvider>
        {/* 구획별 본문 폭은 안쪽에서 제한한다. */}
        <AtlasNavSections items={hubAtlasNavItems(HOME_SECTIONS.map((s) => t(s.navTitleKey ?? s.titleKey)), HOME_GROUP_ID)} />
        {/* 좁은 화면에서는 하단 목차 띠가 본문 위에 떠 있다 — 마지막 줄이 가리지 않게 비운다 */}
        <PageContainer className="pb-[60px] min-[1340px]:pb-8">
          {/* 브랜드 줄 — 한 줄로 압축, 소개 본문은 /about이 쥔다 */}
          <HomeBrandHeader
            brandHeading={siteT("brandHeading")}
            brandAlias={siteT("brandAlias")}
            aboutLabel={t("aboutLink")}
          />

          {/* 방문자 첫인사 액자 — 서비스 최상단, 브랜드 줄 바로 아래에 둔다.
              로그인 유저에게는 그리지 않는다 */}
          <div className="mt-8 md:mt-10">
            <Lane fallback={null}>
              <VisitorIntroSection />
            </Lane>
          </div>

          {/* 목차는 아틀라스 내비(옆 레일·하단 띠)가 진다. 라벨·순서·번호는 config 단일원천에서 온다.
              첫 구획 머리가 첫인사 액자 바로 아래에 오도록 같은 간격을 둔다 */}
          <div className="mt-8 space-y-8 md:mt-10 md:space-y-10">

            {/* 오늘의 인물 — 머리기사. 첫 화면 안에 인물과 작품이 들어오도록 브랜드 줄 바로 아래에 둔다 */}
            <HubSection {...withoutMore(sec("todayFigure"))} hideDivider>
              <Lane fallback={<TodayFigurePending label={loading} />}>
                <FigureSection />
              </Lane>
            </HubSection>

            {/* 빠른기록 자리 — 일단 주석 처리. 재투입 여부는 상황에 맞게 정한다(sections.tsx 「빠른기록」 주석)
            <Lane fallback={null}>
              <QuickRecordSection />
            </Lane>
            */}

            {/* 검색 급증 인물 — 더보기가 국가별 트렌드 탐색 목록으로 잇는다 */}
            <HubSection {...sec("figureLinks")}>
              <div className="mx-auto w-full max-w-3xl">
                <Lane fallback={<FigureLinkGridPending count={HOME_FIGURE_LINK_COUNT} cols={HOME_FIGURE_LINK_COLS} label={loading} />}>
                  <HomeFigureLinks />
                </Lane>
              </div>
            </HubSection>

            {/* 공지사항 — 티저 다섯 줄, 더보기가 게시판으로 잇는다 */}
            <HubSection {...sec("notice")}>
              <Lane fallback={<HomeNoticePending label={loading} />}>
                <NoticeSection />
              </Lane>
            </HubSection>

            <HubSection {...sec("popularBooks")}>
              <Lane fallback={null}>
                <PopularBooks />
              </Lane>
            </HubSection>
          </div>
        </PageContainer>

      </AsyncIntlProvider>
    </>
  );
}
