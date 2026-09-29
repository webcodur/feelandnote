/*
  파일명: /components/features/library/hub/LibraryBanner.tsx
  기능: 서가 배너 (동적 breadcrumb, N단 지원)
  책임: 현재 경로 depth에 따라 배너 breadcrumb을 동적으로 표시한다.
        - /explore/works → 허브 타이틀만
        - /explore/works/academy → 경로 「탐색 ›」 + 큰 제목 「학당」
        - /explore/works/academy/video/composition → 경로 「탐색 › 학당 ›」 + 큰 제목 「영상 제작」
        그리는 모양은 BannerHeading이 쥔다.
*/ // ------------------------------

"use client";

import { usePathname, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import ConstellationBanner from "@/components/lab/ConstellationBanner";
import BannerHeading from "@/components/shared/BannerHeading";
import { BANNER_DESKTOP_SHELL_CLASS, BANNER_MOBILE_SHELL_CLASS } from "@/components/shared/bannerStyles";
import { useExtraCrumbs } from "./LibraryCrumbs";

/** 1단 서브페이지: 경로 세그먼트 → nav.sub 번역 키 */
const SUBPAGE_KEY: Record<string, string> = {
  popular: "popular",
  curated: "curated",
  museum: "museum",
  academy: "academy",
};

interface Crumb {
  label: string;
  href: string;
}

/** 본문이 자기 이름을 h1로 세우는 화면 — 기관 상세와 목록 상세(CuratorView·CuratedListView) */
const CURATED_DETAIL_PATH = /^\/explore\/works\/curated\/[^/]+/;

export default function LibraryBanner() {
  const pathname = usePathname();
  const router = useRouter();
  const tNav = useTranslations("nav");
  const tHub = useTranslations("library.hub");
  const tAcademy = useTranslations("library.academy");
  const extraCrumbs = useExtraCrumbs();

  const hubTitle = tNav("explore");

  // 탐색 접두어를 제외해 기존 작품 하위 경로의 깊이를 유지한다.
  const segments = pathname.replace(/^\/explore\//, "").split("/");
  const subSegment = segments[1];
  const subKey = subSegment ? SUBPAGE_KEY[subSegment] : undefined;
  // breadcrumb 크럼 배열 구성 (허브 제외, 서브페이지부터)
  const crumbs: Crumb[] = [];

  if (subKey) {
    // 1단: /explore/works/{sub}. popular는 불후의 명작만 남았다 — 베스트셀러는 작품 첫 화면(/explore/works)이 맡는다
    crumbs.push({
      label: subSegment === "popular" ? tHub("classicsLabel") : tNav(`sub.${subKey}`),
      href: `/explore/works/${subSegment}${subSegment === "popular" ? "?mode=classics" : ""}`,
    });

    // 2단+: academy 카테고리 (segments[2])
    if (subSegment === "academy" && segments[2]) {
      const categoryId = segments[2];
      try {
        const catLabel = tAcademy(`category.${categoryId}.label`);
        crumbs.push({
          label: catLabel,
          href: `/explore/works/academy/${categoryId}`,
        });
      } catch {
        // 번역 키 없으면 무시
      }
    }

    // 2단+: 이름이 자료에 있는 화면(기관·목록)은 그 화면이 직접 알려준다.
    // 주소에는 식별자만 있어 경로만으로는 사람이 읽을 이름을 만들 수 없다
    crumbs.push(...extraCrumbs);
  }

  const isSubpage = crumbs.length > 0;

  const handleRefresh = () => {
    router.refresh();
  };

  // 경로는 한 번만 짓고 휴대폰·넓은 화면 배너가 같은 것을 쓴다 — 탐색 › 학당 › (현재) 영상 제작
  const ancestors: Crumb[] = isSubpage ? [{ label: hubTitle, href: "/explore/works" }, ...crumbs.slice(0, -1)] : [];
  const current = isSubpage ? crumbs[crumbs.length - 1].label : hubTitle;
  // 기관·목록 화면은 본문이 기관명·목록명을 h1로 세운다 — 배너 이름은 클라이언트에서 늦게 채워져 서버 HTML에서
  // 「기관 선정」으로 굳는다(BannerHeading asHeading). 주소로 가른다 — 알림표(SetLibraryCrumbs)는 서버 렌더에 없다
  const pageOwnsTitle = CURATED_DETAIL_PATH.test(pathname);
  const heading = (variant: "desktop" | "mobile") => (
    <BannerHeading ancestors={ancestors} current={current} onCurrentClick={isSubpage ? handleRefresh : undefined} variant={variant} asHeading={!pageOwnsTitle} />
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
