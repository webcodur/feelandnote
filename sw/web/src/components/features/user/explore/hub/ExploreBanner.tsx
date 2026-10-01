/*
  파일명: /components/features/user/explore/hub/ExploreBanner.tsx
  기능: 탐색 배너 (동적 breadcrumb)
  책임: 현재 서브페이지에 따라 배너 제목과 breadcrumb을 동적으로 표시한다.
        - 상위 단계는 제목 위 작은 경로 줄, 현재 단계는 큰 제목(BannerHeading)
        - 부모 세그먼트 클릭 → 해당 페이지 이동
        - 현재 세그먼트 클릭 → 새로고침
*/ // ------------------------------

"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import ConstellationBanner from "@/components/lab/ConstellationBanner";
import { getFactionName } from "@/actions/home";
import BannerHeading, { type BannerCrumb } from "@/components/shared/BannerHeading";
import { atlasPageOwnsTitle } from "@/components/features/user/explore/myth/mythHref";
import { BANNER_DESKTOP_SHELL_CLASS, BANNER_MOBILE_SHELL_CLASS } from "@/components/shared/bannerStyles";

const SUBPAGE_KEY: Record<string, string> = {
  // 현재 경로
  figures: "navCelebs",
  ranking: "navTopByType",
  influence: "navInfluence",
  spectrum: "navSpectrum",
  myth: "mythology",
  faction: "navFaction",
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
  const locale = useLocale();

  const hubTitle = t("nav.explore");

  const segments = pathname.replace(/^\//, "").split("/");
  const subSegment = segments[1];
  const subKey = subSegment ? SUBPAGE_KEY[subSegment] : undefined;
  const isSubpage = !!subKey;

  const pageTitle = isSubpage ? hubT(subKey!) : hubTitle;

  // 세력도감 테마(slug) 진입 시 3단계 breadcrumb: 탐색 > 세력도감 > 테마명
  const themeSlug = subSegment === "faction" && segments[2] ? segments[2] : undefined;
  /* 어느 테마의 이름인지 함께 쥔다 — 테마를 벗어나면 비우는 대신 slug가 어긋나 저절로 사라진다 */
  const [loadedTheme, setLoadedTheme] = useState<{ slug: string; name: string | null } | null>(null);

  useEffect(() => {
    if (!themeSlug) return;
    let active = true;
    getFactionName(themeSlug).then((r) => {
      if (active) setLoadedTheme({ slug: themeSlug, name: r ? (locale === "en" ? (r.name_en ?? r.name) : r.name) : null });
    });
    return () => { active = false; };
  }, [themeSlug, locale]);

  const themeName = themeSlug && loadedTheme?.slug === themeSlug ? loadedTheme.name : null;
  /* 신화·세력 한 편의 주소는 본문 머리(MythOverview)가 그 이름을 h1로 세운다 — 배너는 제목 요소를 내려놓는다.
     배너 이름은 클라이언트에서 채워져 서버 HTML에서 「세력도감」으로 굳는다(기관 선정 상세와 같은 사정) */
  const pageOwnsTitle = atlasPageOwnsTitle(pathname);

  const hasTheme = !!(themeSlug && themeName);

  const handleRefresh = () => {
    router.refresh();
  };

  // 경로는 한 번만 짓고 휴대폰·넓은 화면 배너가 같은 것을 쓴다 — 탐색 › 세력도감 › (현재) 테마명
  const ancestors: BannerCrumb[] = isSubpage
    ? [{ label: hubTitle, href: "/explore" }, ...(hasTheme ? [{ label: pageTitle, href: "/explore/faction" }] : [])]
    : [];
  const current = hasTheme && themeName ? themeName : pageTitle;
  const heading = (variant: "desktop" | "mobile") => (
    <BannerHeading ancestors={ancestors} current={current} onCurrentClick={isSubpage ? handleRefresh : undefined} variant={variant}
      asHeading={!pageOwnsTitle} />
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
