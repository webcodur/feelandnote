/*
  파일명: /components/features/user/explore/hub/ExploreBanner.tsx
  기능: 탐색 배너 (동적 breadcrumb)
  책임: 현재 서브페이지에 따라 배너 제목과 breadcrumb을 동적으로 표시한다.
        - 부모 세그먼트 클릭 → 해당 페이지 이동
        - 현재 세그먼트 클릭 → 새로고침
*/ // ------------------------------

"use client";

import { useEffect, useState } from "react";
import { usePathname, Link, useRouter } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import ConstellationBanner from "@/components/lab/ConstellationBanner";
import { ChevronRight } from "lucide-react";
import { getFactionTagName } from "@/actions/home";

const SUBPAGE_KEY: Record<string, string> = {
  // 현재 경로
  figures: "navCelebs",
  ranking: "navTopByType",
  spectrum: "navSpectrum",
  faction: "navFaction",
  feed: "navFeed",
  timeline: "navTimeline",
  directory: "navDirectory",
  youtube: "navYoutube",
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
  const hubEnglish = t("home.explore.englishTitle");

  const segments = pathname.replace(/^\//, "").split("/");
  const subSegment = segments[1];
  const subKey = subSegment ? SUBPAGE_KEY[subSegment] : undefined;
  const isSubpage = !!subKey;

  const pageTitle = isSubpage ? hubT(subKey!) : hubTitle;

  // 세력도감 테마(slug) 진입 시 3단계 breadcrumb: 탐색 > 세력도감 > 테마명
  const pathSlug = subSegment === "faction" && segments[2] ? segments[2] : undefined;
  const [themeSlug, setThemeSlug] = useState<string | undefined>(pathSlug);
  const [themeName, setThemeName] = useState<string | null>(null);

  // 경로 변경(직접 진입) 반영
  useEffect(() => { setThemeSlug(pathSlug); }, [pathSlug]);

  // 앱 내 테마 전환(replaceState) 반영 — FeaturedFaction이 쏘는 이벤트 수신
  useEffect(() => {
    const handler = (e: Event) => {
      const slug = (e as CustomEvent<string | null>).detail;
      setThemeSlug(slug || undefined);
    };
    window.addEventListener("faction:theme", handler);
    return () => window.removeEventListener("faction:theme", handler);
  }, []);

  useEffect(() => {
    if (!themeSlug) { setThemeName(null); return; }
    let active = true;
    getFactionTagName(themeSlug).then((r) => {
      if (active) setThemeName(r ? (locale === "en" ? (r.name_en ?? r.name) : r.name) : null);
    });
    return () => { active = false; };
  }, [themeSlug, locale]);

  const hasTheme = !!(themeSlug && themeName);

  const handleRefresh = () => {
    router.refresh();
  };

  return (
    <>
      {/* 모바일 배너 */}
      <div className="md:hidden relative py-4 flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#0a0a0a] to-[#111] -mx-2 -mt-4">
        <div className="flex items-center gap-3 opacity-40 mb-3">
          <div className="w-12 h-px bg-gradient-to-r from-transparent to-[#d4af37]" />
          <div className="w-1.5 h-1.5 rotate-45 bg-[#d4af37]" />
          <div className="w-12 h-px bg-gradient-to-l from-transparent to-[#d4af37]" />
        </div>

        {isSubpage ? (
          <div
            role="heading"
            aria-level={1}
            className="flex items-center gap-1.5 text-2xl font-serif font-black tracking-tight leading-normal text-center flex-wrap justify-center"
          >
            <Link
              href="/explore"
              className="text-[#d4af37] hover:text-white hover:drop-shadow-[0_0_8px_rgba(212,175,55,0.6)] transition-all duration-300"
            >
              {hubTitle}
            </Link>
            <ChevronRight size={20} className="text-white/30 shrink-0" />
            {hasTheme ? (
              <>
                <Link
                  href="/explore/faction"
                  className="text-[#d4af37] hover:text-white hover:drop-shadow-[0_0_8px_rgba(212,175,55,0.6)] transition-all duration-300"
                >
                  {pageTitle}
                </Link>
                <ChevronRight size={20} className="text-white/30 shrink-0" />
                <button
                  onClick={handleRefresh}
                  className="text-transparent bg-clip-text bg-gradient-to-b from-white to-stone-500 hover:from-[#d4af37] hover:to-[#b8962e] transition-all duration-300 cursor-pointer"
                >
                  {themeName}
                </button>
              </>
            ) : (
              <button
                onClick={handleRefresh}
                className="text-transparent bg-clip-text bg-gradient-to-b from-white to-stone-500 hover:from-[#d4af37] hover:to-[#b8962e] transition-all duration-300 cursor-pointer"
              >
                {pageTitle}
              </button>
            )}
          </div>
        ) : (
          <>
            <div
              role="heading"
              aria-level={1}
              className="text-2xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-stone-500 tracking-tight leading-normal text-center"
            >
              {hubTitle}
            </div>
            {hubEnglish.toLowerCase() !== hubTitle.toLowerCase() && (
              <p className="text-[#d4af37] tracking-[0.3em] text-[10px] mt-1.5 uppercase font-cinzel text-center">
                {hubEnglish}
              </p>
            )}
          </>
        )}

        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#d4af37]/20 to-transparent" />
      </div>

      {/* 데스크탑 배너 */}
      <div className="hidden md:block">
        <ConstellationBanner compact>
          {isSubpage ? (
            <h1 className="flex items-center gap-3 text-4xl sm:text-5xl md:text-6xl font-serif font-black tracking-tight leading-normal text-center flex-wrap justify-center">
              <Link
                href="/explore"
                className="pointer-events-auto text-[#d4af37] hover:text-white hover:drop-shadow-[0_0_12px_rgba(212,175,55,0.6)] transition-all duration-300"
              >
                {hubTitle}
              </Link>
              <ChevronRight size={36} className="text-white/30 shrink-0" strokeWidth={1.5} />
              {hasTheme ? (
                <>
                  <Link
                    href="/explore/faction"
                    className="pointer-events-auto text-[#d4af37] hover:text-white hover:drop-shadow-[0_0_12px_rgba(212,175,55,0.6)] transition-all duration-300"
                  >
                    {pageTitle}
                  </Link>
                  <ChevronRight size={36} className="text-white/30 shrink-0" strokeWidth={1.5} />
                  <button
                    onClick={handleRefresh}
                    className="pointer-events-auto text-transparent bg-clip-text bg-gradient-to-b from-white to-stone-500 hover:from-[#d4af37] hover:to-[#b8962e] transition-all duration-300 cursor-pointer"
                  >
                    {themeName}
                  </button>
                </>
              ) : (
                <button
                  onClick={handleRefresh}
                  className="pointer-events-auto text-transparent bg-clip-text bg-gradient-to-b from-white to-stone-500 hover:from-[#d4af37] hover:to-[#b8962e] transition-all duration-300 cursor-pointer"
                >
                  {pageTitle}
                </button>
              )}
            </h1>
          ) : (
            <>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-stone-500 tracking-tight leading-normal text-center">
                {hubTitle}
              </h1>
              {hubTitle.toLowerCase() !== hubEnglish.toLowerCase() && (
                <p className="text-[#d4af37] tracking-[0.3em] sm:tracking-[0.5em] text-xs sm:text-sm mt-3 sm:mt-4 uppercase font-cinzel text-center">
                  {hubEnglish}
                </p>
              )}
            </>
          )}
        </ConstellationBanner>
      </div>
    </>
  );
}
