/*
  파일명: /components/features/user/explore/hub/ExploreBanner.tsx
  기능: 탐색 배너 (동적 breadcrumb)
  책임: 현재 서브페이지에 따라 배너 제목과 breadcrumb을 동적으로 표시한다.
        - 부모 세그먼트 클릭 → 해당 페이지 이동
        - 현재 세그먼트 클릭 → 새로고침
*/ // ------------------------------

"use client";

import { usePathname, Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import ConstellationBanner from "@/components/lab/ConstellationBanner";
import { ChevronRight } from "lucide-react";

const SUBPAGE_KEY: Record<string, string> = {
  // 현재 경로
  figures: "navCelebs",
  ranking: "navTopByType",
  persona: "navPersona",
  spotlight: "navSpotlight",
  feed: "navFeed",
  timeline: "navTimeline",
  directory: "navDirectory",
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
  const hubEnglish = t("home.explore.englishTitle");

  const segments = pathname.replace(/^\//, "").split("/");
  const subSegment = segments[1];
  const subKey = subSegment ? SUBPAGE_KEY[subSegment] : undefined;
  const isSubpage = !!subKey;

  const pageTitle = isSubpage ? hubT(subKey!) : hubTitle;

  const handleRefresh = () => {
    router.refresh();
  };

  return (
    <>
      {/* 모바일 배너 */}
      <div className="md:hidden relative py-6 flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#0a0a0a] to-[#111] -mx-2 -mt-6">
        <div className="flex items-center gap-3 opacity-40 mb-3">
          <div className="w-12 h-px bg-gradient-to-r from-transparent to-[#d4af37]" />
          <div className="w-1.5 h-1.5 rotate-45 bg-[#d4af37]" />
          <div className="w-12 h-px bg-gradient-to-l from-transparent to-[#d4af37]" />
        </div>

        {isSubpage ? (
          <h1 className="flex items-center gap-1.5 text-2xl font-serif font-black tracking-tight leading-normal text-center">
            <Link
              href="/explore"
              className="text-[#d4af37] hover:text-white hover:drop-shadow-[0_0_8px_rgba(212,175,55,0.6)] transition-all duration-300"
            >
              {hubTitle}
            </Link>
            <ChevronRight size={20} className="text-white/30 shrink-0" />
            <button
              onClick={handleRefresh}
              className="text-transparent bg-clip-text bg-gradient-to-b from-white to-stone-500 hover:from-[#d4af37] hover:to-[#b8962e] transition-all duration-300 cursor-pointer"
            >
              {pageTitle}
            </button>
          </h1>
        ) : (
          <>
            <h1 className="text-2xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-stone-500 tracking-tight leading-normal text-center">
              {hubTitle}
            </h1>
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
            <h1 className="flex items-center gap-3 text-4xl sm:text-5xl md:text-6xl font-serif font-black tracking-tight leading-normal text-center">
              <Link
                href="/explore"
                className="pointer-events-auto text-[#d4af37] hover:text-white hover:drop-shadow-[0_0_12px_rgba(212,175,55,0.6)] transition-all duration-300"
              >
                {hubTitle}
              </Link>
              <ChevronRight size={36} className="text-white/30 shrink-0" strokeWidth={1.5} />
              <button
                onClick={handleRefresh}
                className="pointer-events-auto text-transparent bg-clip-text bg-gradient-to-b from-white to-stone-500 hover:from-[#d4af37] hover:to-[#b8962e] transition-all duration-300 cursor-pointer"
              >
                {pageTitle}
              </button>
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
