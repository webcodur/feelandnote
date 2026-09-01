/*
  파일명: /app/(main)/page.tsx
  기능: 홈 — 오늘의 신문 1면
  책임: 적층 원칙을 쥔다. 위계는 탐색·서가와 같은 허브 문법(HubNav 목차 + HubSection 번호
        구획)으로 표시한다. 머리기사(오늘의 인물) 하나만 깊고, 아래 구획은 갈수록 얕아진다.
        브랜드 줄 → 인사 슬롯(방문자: 첫인사 액자 / 로그인: 기록 도구 배너) → 목차 →
        구획 1~4 → 제휴 도서.
*/ // ------------------------------

import { getTranslations } from "next-intl/server";
import { getLocalizedAlternates, getWebSiteJsonLd } from "@/lib/seo";
import AsyncIntlProvider from "@/components/shared/AsyncIntlProvider";
import HomeBrandHeader from "@/components/features/home/HomeBrandHeader";
import HomeFigureLinks, { HOME_FIGURE_LINK_COUNT } from "@/components/features/home/HomeFigureLinks";
import YoutubeChannelLink from "@/components/features/home/YoutubeChannelLink";
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
import { FigureSection, GreetingSection, NoticeSection } from "./sections";

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
      {/* 비동기 서버 페이지가 클라이언트 구획을 그리므로 intl 컨텍스트를 재공급한다(code-rules.md) */}
      <AsyncIntlProvider>
        <div className="pb-20">
          {/* 브랜드 줄 — 선언은 한 단으로 압축, 소개 본문은 /about이 쥔다 */}
          <HomeBrandHeader
            brandHeading={siteT("brandHeading")}
            brandAlias={siteT("brandAlias")}
            aboutLabel={t("aboutLink")}
          />

          {/* 인사 슬롯 — 방문자에게는 첫인사 액자, 로그인 유저에게는 빠른기록 배너 */}
          <div className="mt-6 md:mt-8">
            <Lane fallback={null}>
              <GreetingSection />
            </Lane>
          </div>

          {/* 구획 폭은 두 단계뿐이다 — 격자는 이 컨테이너(max-w-5xl)를 다 쓰고,
              읽는 구획(영상관·공지)만 안쪽에서 max-w-3xl로 좁힌다. 세 번째 폭을 만들지 않는다 */}
          <div className="mx-auto w-full max-w-5xl space-y-12 px-2 md:space-y-16 md:px-4">
            {/* 목차 줄 — 이 화면의 구획 전부. 라벨·순서·번호는 config 단일원천에서 온다 */}
            <div className="mt-10 md:mt-14">
              <HubNav hubItems={hubNavItems(HOME_SECTIONS, t)} groupId={HOME_GROUP_ID} />
            </div>

            {/* 1/4 오늘의 인물 — 머리기사. 상세로 가는 전체 보기는 구획 안에 있다 */}
            <HubSection {...withoutMore(sec("todayFigure"))}>
              <Lane fallback={<TodayFigurePending label={loading} />}>
                <FigureSection />
              </Lane>
            </HubSection>

            {/* 2/4 기록이 쌓인 인물 — 명부. 더보기가 같은 기준(기록순)의 전체 탐색 목록으로 잇는다 */}
            <HubSection {...sec("figureLinks")}>
              <Lane fallback={<FigureLinkGridPending count={HOME_FIGURE_LINK_COUNT} label={loading} />}>
                <HomeFigureLinks />
              </Lane>
            </HubSection>

            {/* 3/4 공지사항 — 티저 다섯 줄, 더보기가 게시판으로 잇는다 */}
            <HubSection {...sec("notice")}>
              <Lane fallback={<HomeNoticePending label={loading} />}>
                <NoticeSection />
              </Lane>
            </HubSection>

            {/* 4/4 영상관 — 사실상 이동 배너라 콘텐츠 구획들 뒤에 선다.
                히어로가 자체 이동 단추를 쥐므로 래퍼 더보기는 뗀다 */}
            <HubSection {...withoutMore(sec("youtube"))}>
              <div className="mx-auto w-full max-w-3xl">
                <YoutubeChannelLink />
              </div>
            </HubSection>
          </div>

          {/* 제휴 도서 — 링크가 걸린 책이 없거나 영문 화면이면 컴포넌트가 스스로 접는다 */}
          <Lane fallback={null}>
            <PopularBooks />
          </Lane>
        </div>
      </AsyncIntlProvider>
    </>
  );
}