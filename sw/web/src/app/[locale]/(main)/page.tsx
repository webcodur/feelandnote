/*
  파일명: /app/(main)/page.tsx
  기능: 홈 — 오늘의 신문 1면
  책임: 적층 원칙을 쥔다. 위계는 탐색·서가와 같은 허브 문법(HubNav 목차 + HubSection 번호
        구획)으로 표시한다. 머리기사(오늘의 인물) 하나만 깊고, 아래 구획은 갈수록 얕아진다.
        브랜드 줄 → 목차 → 구획 1(오늘의 인물) → 방문자 첫인사 액자 → 구획 2~3 → 제휴 도서.
        첫 화면에 머리기사가 들어오도록 첫인사 액자를 구획 1 아래에 둔다.
        로그인 유저용 빠른기록은 일단 주석 처리했다 — 재투입 여부는 상황에 맞게 정한다(sections.tsx).
*/ // ------------------------------

import { getTranslations } from "next-intl/server";
import { getLocalizedAlternates, getWebSiteJsonLd } from "@/lib/seo";
import AsyncIntlProvider from "@/components/shared/AsyncIntlProvider";
import HomeBrandHeader from "@/components/features/home/HomeBrandHeader";
import HomeFigureLinks, { HOME_FIGURE_LINK_COUNT } from "@/components/features/home/HomeFigureLinks";
import PopularBooks from "@/components/features/home/PopularBooks";
import TodayFigurePending from "@/components/features/figure/TodayFigurePending";
import { FigureLinkGridPending } from "@/components/features/celeb/FigureLinkGrid";
import { HomeNoticePending } from "@/components/features/home/HomeNoticeSection";
import HubSection from "@/components/shared/HubSection";
import HubNav from "@/components/shared/HubNav";
import {
  HOME_GROUP_ID,
  HOME_SECTIONS,
  hubNavItems,
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd) }}
      />
      {/* 비동기 서버 페이지가 클라이언트 구획을 그리므로 intl 컨텍스트를 재공급한다(platform-02-code-rules.md) */}
      <AsyncIntlProvider>
        {/* 구획 폭은 두 단계뿐이다 — 격자는 이 컨테이너(max-w-5xl)를 다 쓰고,
            읽는 구획(공지·첫인사)만 안쪽에서 max-w-3xl로 좁힌다. 세 번째 폭을 만들지 않는다 */}
        <div className="mx-auto w-full max-w-5xl pb-8">
          {/* 브랜드 줄 — 한 줄로 압축, 소개 본문은 /about이 쥔다 */}
          <HomeBrandHeader
            brandHeading={siteT("brandHeading")}
            brandAlias={siteT("brandAlias")}
            aboutLabel={t("aboutLink")}
          />

          {/* 목차 줄 — 이 화면의 구획 전부. 라벨·순서·번호는 config 단일원천에서 온다.
              제호 괘선 아래 새 묶음의 시작이라 선에서 넉넉히 띄운다(platform-02-code-rules.md 「구분선」) */}
          <div className="mt-8 md:mt-10">
            <HubNav hubItems={hubNavItems(HOME_SECTIONS, t)} groupId={HOME_GROUP_ID} />
          </div>

          {/* 첫 구획은 목차 바로 아래라 구분선 없이 붙인다. 구획 사이 간격은 선 위(짧게)만 여기서 주고,
              선 아래(넓게)는 HubSection이 준다 */}
          <div className="space-y-8 md:space-y-10">

            {/* 1/3 오늘의 인물 — 머리기사. 첫 화면 안에 인물과 작품이 들어오도록 브랜드 줄 바로 아래에 둔다 */}
            <HubSection {...withoutMore(sec("todayFigure"))} hideDivider>
              <Lane fallback={<TodayFigurePending label={loading} />}>
                <FigureSection />
              </Lane>
            </HubSection>

            {/* 방문자 첫인사 액자 — 로그인 유저에게는 그리지 않는다.
                머리기사를 첫 화면에서 밀어내지 않도록 그 아래에 둔다 */}
            <Lane fallback={null}>
              <VisitorIntroSection />
            </Lane>

            {/* 빠른기록 자리 — 일단 주석 처리. 재투입 여부는 상황에 맞게 정한다(sections.tsx 「빠른기록」 주석)
            <Lane fallback={null}>
              <QuickRecordSection />
            </Lane>
            */}

            {/* 2/3 기록이 쌓인 인물 — 명부. 더보기가 같은 기준(기록순)의 전체 탐색 목록으로 잇는다 */}
            <HubSection {...sec("figureLinks")}>
              <Lane fallback={<FigureLinkGridPending count={HOME_FIGURE_LINK_COUNT} label={loading} />}>
                <HomeFigureLinks />
              </Lane>
            </HubSection>

            {/* 3/3 공지사항 — 티저 다섯 줄, 더보기가 게시판으로 잇는다 */}
            <HubSection {...sec("notice")}>
              <Lane fallback={<HomeNoticePending label={loading} />}>
                <NoticeSection />
              </Lane>
            </HubSection>
          </div>
        </div>

        <div>
          {/* 제휴 도서 — 서점으로 이을 책이 없으면 컴포넌트가 스스로 접는다 */}
          <Lane fallback={null}>
            <PopularBooks />
          </Lane>
        </div>
      </AsyncIntlProvider>
    </>
  );
}
