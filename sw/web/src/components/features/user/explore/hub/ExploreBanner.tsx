/*
  파일명: /components/features/user/explore/hub/ExploreBanner.tsx
  기능: 탐색 배너 (동적 breadcrumb)
  책임: 현재 서브페이지에 따라 배너 제목과 breadcrumb을 동적으로 표시한다.
        - 배너의 큰 글자 자체가 상위 단계부터 현재까지 이어지는 경로(BannerHeading)
        - 부모 세그먼트 클릭 → 해당 페이지 이동
        - 현재 세그먼트 클릭 → 새로고침
*/ // ------------------------------

"use client";

import { usePathname, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import ConstellationBanner from "@/components/lab/ConstellationBanner";
import BannerHeading, { type BannerCrumb } from "@/components/shared/BannerHeading";
import { BANNER_DESKTOP_SHELL_CLASS, BANNER_MOBILE_SHELL_CLASS } from "@/components/shared/bannerStyles";
import { exploreModeHref } from "@/constants/exploreModes";
import { atlasPageOwnsTitle } from "../myth/mythHref";

const SUBPAGE_KEY: Record<string, string> = {
  // 현재 경로
  figures: "navCelebs",
  ranking: "navTopByType",
  influence: "navInfluence",
  spectrum: "navSpectrum",
  feed: "navFeed",
  timeline: "navTimeline",
  directory: "navDirectory",
  monologue: "navMonologue",
  today: "navToday",
  // 레거시 경로 (리다이렉트 전 직접 접근 대비)
  celebs: "navCelebs",
  "top-by-type": "navTopByType",
  "celeb-feed": "navFeed",
};

export default function ExploreBanner() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations();
  const hubT = useTranslations("explore.hub");

  const hubTitle = t("nav.explore");

  const segments = pathname.replace(/^\//, "").split("/");
  const subSegment = segments[1];
  const atlasMode = atlasPageOwnsTitle(pathname) ? (subSegment === "myth" ? "myth" : "faction") : null;
  const subKey = subSegment ? SUBPAGE_KEY[subSegment] : undefined;
  const isSubpage = !!subKey;

  const pageTitle = atlasMode ? t(`nav.modes.${atlasMode}`) : isSubpage ? hubT(subKey!) : hubTitle;

  const handleRefresh = () => {
    router.refresh();
  };

  // 배너는 상세에서도 유지하고, 한 편의 고유 이름만 본문의 h1으로 둔다.
  const ancestors: BannerCrumb[] = isSubpage || atlasMode
    ? [{ label: hubTitle, href: "/explore" }]
    : [];
  const heading = (variant: "desktop" | "mobile") => (
    <BannerHeading ancestors={ancestors} current={pageTitle} currentHref={atlasMode ? exploreModeHref(atlasMode) : undefined} onCurrentClick={isSubpage ? handleRefresh : undefined} variant={variant} asHeading={!atlasMode} />
  );

  return (
    <>
      {/* 모바일 배너 */}
      <div className={BANNER_MOBILE_SHELL_CLASS}>{heading("mobile")}</div>

      {/* 데스크탑 배너 */}
      <div className={BANNER_DESKTOP_SHELL_CLASS}>
        <ConstellationBanner compact>{heading("desktop")}</ConstellationBanner>
      </div>
    </>
  );
}
