/*
  파일명: /app/(main)/explore/page.tsx
  기능: 탐색 허브 페이지
  책임: 목차와 공개 구획 세 개의 골격을 기다림 없이 먼저 그리고, 본문만 구획별 레인으로 채운다.
        신화 구획은 공개 전까지 개발 서버에서만 보인다.
        노출 구획은 조회에 실패해도 0건이어도 자리를 지킨다 — 목차·번호는 config 고정이다.
*/ // ------------------------------

import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

import { getLocalizedAlternates } from "@/lib/seo";
import HubSection from "@/components/shared/HubSection";
import HubNav from "@/components/shared/HubNav";
import {
  EXPLORE_GROUP_ID,
  EXPLORE_SECTIONS,
  EXPLORE_STANDALONE,
  hubNavItems,
  hubSection,
  withoutMore,
} from "@/components/shared/hubSectionUtils";
import { PendingBlock } from "@/components/ui/pending";
import Lane from "@/components/ui/pending/Lane";
import PopularBooks from "@/components/features/home/PopularBooks";

import { FactionSection, MythSection, ProfileSection, SpectrumSection } from "./sections";

/* 콜드 상태에서 봇이 받는 완성 HTML이 중간에 잘리지 않게 상한을 넉넉히 둔다 */
export const maxDuration = 30;

export async function generateMetadata() {
  const t = await getTranslations("explore.meta");
  return {
    title: t("title"),
    description: t("description"),
    alternates: await getLocalizedAlternates("/explore"),
    openGraph: {
      title: t("title"),
      description: t("description"),
    },
  };
}

export default function ExplorePage() {
  const t = useTranslations("explore.hub");
  const tPending = useTranslations("pending");
  const sec = (key: string) => hubSection(EXPLORE_SECTIONS, EXPLORE_GROUP_ID, key, t);
  const loading = tPending("loading");

  return (
    <>
      <div className="space-y-12 md:space-y-16">
        {/* 목차 줄 — 구획 전체 + 별도 화면. 라벨·순서·번호는 config 단일원천에서 온다 */}
        <HubNav
          hubItems={hubNavItems(EXPLORE_SECTIONS, t)}
          standaloneItems={EXPLORE_STANDALONE.map((s) => ({ label: t(s.key), href: s.href, icon: s.icon }))}
          groupId={EXPLORE_GROUP_ID}
        />

        {/* 프로필 — 인기 · 기록왕 · 랜덤 탭. 전체 링크는 탭 안에서 따로 걸어 래퍼에서 뗀다.
            헤더는 레인 밖이라 기다림 없이 뜨고, 본문만 채워진다 */}
        <HubSection {...withoutMore(sec("ranking"))}>
          {/* 열 구성은 HubCelebGrid와 같아야 한다 — 어긋나면 자료가 들어올 때 격자가 다시 짜인다 */}
          <Lane
            fallback={
              <PendingBlock
                variant="grid"
                cols="grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6"
                count={12}
                label={loading}
              />
            }
          >
            <ProfileSection />
          </Lane>
        </HubSection>

        {/* 성향 분석 — 성향 분포 */}
        <HubSection {...sec("spectrumAnalysis")}>
          <Lane fallback={<PendingBlock variant="panel" minHeight="min-h-40" label={loading} />}>
            <SpectrumSection />
          </Lane>
        </HubSection>

        {/* 신화·전승 — 인물 목록에서 빠지는 신화 인물들의 유일한 진입점이다.
            전승별 공개 여부는 getMythAtlas의 공개 목록이 쥔다 */}
        <HubSection {...withoutMore(sec("myth"))}>
          <Lane fallback={<PendingBlock variant="panel" minHeight="min-h-[520px]" label={loading} />}>
            <MythSection />
          </Lane>
        </HubSection>

        {/* 세력도감 */}
        <HubSection {...sec("faction")}>
          <Lane
            fallback={
              <PendingBlock variant="grid" cols="grid-cols-1 md:grid-cols-2" count={4} label={loading} />
            }
          >
            <FactionSection />
          </Lane>
        </HubSection>
      </div>

      {/* 제휴 도서 — 링크가 걸린 책이 없거나 영문 화면이면 컴포넌트가 스스로 접는다.
          접힐 수 있는 구획이라 자리를 미리 잡지 않는다 */}
      <Lane fallback={null}>
        <PopularBooks />
      </Lane>
    </>
  );
}
