import { getTranslations } from "next-intl/server";
import { getLocalizedAlternates, getWebSiteJsonLd } from "@/lib/seo";
import HomeIntroPanel from "./about/HomeIntroPanel";
import AsyncIntlProvider from "@/components/shared/AsyncIntlProvider";
import HomeTabSection from "@/components/features/home/HomeTabSection";
import PopularBooks from "@/components/features/home/PopularBooks";
import { PendingBlock } from "@/components/ui/pending";
import Lane from "@/components/ui/pending/Lane";
import { FigureSection, RecordSection, FreeBoardSection } from "./sections";

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
    getTranslations("home.ui.tabs"),
    getTranslations("site"),
    getTranslations("pending"),
  ]);
  const webSiteJsonLd = getWebSiteJsonLd(siteT("description"));
  // 환영판은 첫인사 액자만 세운다. 맺음 문장이 서비스 소개(/about)로 가는 문이다
  const aboutPanel = <HomeIntroPanel />;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd) }}
      />
      {/* 비동기 서버 페이지가 클라이언트 구획(HomeTabSection 등)을 그리므로 intl 컨텍스트를 재공급한다(code-rules.md) */}
      <AsyncIntlProvider>
        <div className="pb-20">
          <HomeTabSection
            recordSection={
              <Lane fallback={<PendingBlock variant="rows" count={3} label={tPending("loading")} />}>
                <RecordSection />
              </Lane>
            }
            figureSection={
              <Lane fallback={<PendingBlock variant="panel" minHeight="min-h-64" label={tPending("loading")} />}>
                <FigureSection />
              </Lane>
            }
            freeSection={
              <Lane fallback={<PendingBlock variant="rows" count={5} label={tPending("loading")} />}>
                <FreeBoardSection />
              </Lane>
            }
            aboutPanel={aboutPanel}
            brandHeading={siteT("brandHeading")}
            brandAlias={siteT("brandAlias")}
            labels={{
              todayFigure: t("todayFigure"),
              quickRecord: t("quickRecord"),
              freeBoard: t("freeBoard"),
            }}
          />
          {/* 제휴 도서 — 링크가 걸린 책이 없거나 영문 화면이면 컴포넌트가 스스로 접는다 */}
          <Lane fallback={null}>
            <PopularBooks />
          </Lane>
        </div>
      </AsyncIntlProvider>
    </>
  );
}
