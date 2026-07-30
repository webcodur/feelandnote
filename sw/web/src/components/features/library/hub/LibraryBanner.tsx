/*
  파일명: /components/features/library/hub/LibraryBanner.tsx
  기능: 서가 배너 (동적 breadcrumb, N단 지원)
  책임: 현재 경로 depth에 따라 배너 breadcrumb을 동적으로 표시한다.
        - /library → 허브 타이틀만
        - /library/academy → 서가 > 학당
        - /library/academy/video/composition → 서가 > 학당 > 영상 제작
*/ // ------------------------------

"use client";

import { usePathname, Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import TreeBanner from "@/components/lab/TreeBanner";
import { ChevronRight } from "lucide-react";

/** 1단 서브페이지: 경로 세그먼트 → nav.sub 번역 키 */
const SUBPAGE_KEY: Record<string, string> = {
  era: "era",
  profession: "profession",
  museum: "museum",
  academy: "academy",
};

interface Crumb {
  label: string;
  href: string;
}

export default function LibraryBanner() {
  const pathname = usePathname();
  const router = useRouter();
  const tNav = useTranslations("nav");
  const tHome = useTranslations("home");
  const tAcademy = useTranslations("library.academy");

  const hubTitle = tNav("library");
  const hubEnglish = tHome("library.englishTitle");

  // segments: ["library", "academy", "video", "composition"]
  const segments = pathname.replace(/^\//, "").split("/");
  const subSegment = segments[1];
  const subKey = subSegment ? SUBPAGE_KEY[subSegment] : undefined;

  // breadcrumb 크럼 배열 구성 (허브 제외, 서브페이지부터)
  const crumbs: Crumb[] = [];

  if (subKey) {
    // 1단: /library/{sub}
    crumbs.push({
      label: tNav(`sub.${subKey}`),
      href: `/library/${subSegment}`,
    });

    // 2단+: academy 카테고리 (segments[2])
    if (subSegment === "academy" && segments[2]) {
      const categoryId = segments[2];
      try {
        const catLabel = tAcademy(`category.${categoryId}.label`);
        crumbs.push({
          label: catLabel,
          href: `/library/academy/${categoryId}`,
        });
      } catch {
        // 번역 키 없으면 무시
      }
    }
  }

  const isSubpage = crumbs.length > 0;

  const handleRefresh = () => {
    router.refresh();
  };

  // --- 공통 breadcrumb 렌더 ---
  const parentStyle = "text-[#d4af37] hover:text-white hover:drop-shadow-[0_0_8px_rgba(212,175,55,0.6)] transition-all duration-300";
  const parentStyleDesktop = "pointer-events-auto text-[#d4af37] hover:text-white hover:drop-shadow-[0_0_12px_rgba(212,175,55,0.6)] transition-all duration-300";
  const currentStyle = "text-transparent bg-clip-text bg-gradient-to-b from-white to-stone-500 hover:from-[#d4af37] hover:to-[#b8962e] transition-all duration-300 cursor-pointer";
  const currentStyleDesktop = "pointer-events-auto " + currentStyle;

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
          <h1 className="flex items-center gap-1.5 text-2xl font-serif font-black tracking-tight leading-normal text-center flex-wrap justify-center">
            <Link href="/library" className={parentStyle}>
              {hubTitle}
            </Link>
            {crumbs.map((crumb, i) => {
              const isLast = i === crumbs.length - 1;
              return (
                <span key={crumb.href} className="inline-flex items-center gap-1.5">
                  <ChevronRight size={20} className="text-white/30 shrink-0" />
                  {isLast ? (
                    <button onClick={handleRefresh} className={currentStyle}>
                      {crumb.label}
                    </button>
                  ) : (
                    <Link href={crumb.href} className={parentStyle}>
                      {crumb.label}
                    </Link>
                  )}
                </span>
              );
            })}
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
        <TreeBanner compact>
          {isSubpage ? (
            <h1 className="flex items-center gap-3 text-4xl sm:text-5xl md:text-6xl font-serif font-black tracking-tight leading-normal text-center flex-wrap justify-center">
              <Link href="/library" className={parentStyleDesktop}>
                {hubTitle}
              </Link>
              {crumbs.map((crumb, i) => {
                const isLast = i === crumbs.length - 1;
                return (
                  <span key={crumb.href} className="inline-flex items-center gap-3">
                    <ChevronRight size={36} className="text-white/30 shrink-0" strokeWidth={1.5} />
                    {isLast ? (
                      <button onClick={handleRefresh} className={currentStyleDesktop}>
                        {crumb.label}
                      </button>
                    ) : (
                      <Link href={crumb.href} className={parentStyleDesktop}>
                        {crumb.label}
                      </Link>
                    )}
                  </span>
                );
              })}
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
        </TreeBanner>
      </div>
    </>
  );
}
