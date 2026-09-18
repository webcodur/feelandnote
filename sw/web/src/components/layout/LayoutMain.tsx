"use client";

import { useState, useEffect } from "react";
import { usePathname } from "@/i18n/navigation";
import Header from "./header/Header";
import BottomNav from "./BottomNav";
import FloatingMusicPlayer from "./FloatingMusicPlayer";
import SwipeRail from "./SwipeRail";
import RecentProfilesSection from "@/components/features/profile/RecentProfilesSection";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();
  const isExplore = pathname === "/explore";
  // 인물 상세는 틀 안에 자기 여백과 좌측 목차 레일을 이미 두고 있다. 바깥 여백을 더 주지 않는다.
  const isCeleb = pathname.startsWith("/celeb/");

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <>
      {/* 헤더는 Suspense 없이 첫 청크에 싣는다 — 봇이 내비게이션 링크를 바로 보게 */}
      <Header isMobile={isMobile} />
      <main className="pt-16 pb-16 px-0 md:pt-24 md:pb-8 md:px-5 min-h-screen [overflow-anchor:none] bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.05)_0%,transparent_50%)]">
        <div className={`max-w-[1400px] 2xl:max-w-[1800px] mx-auto border-0 md:border-4 border-double min-h-[calc(100vh-140px)] bg-bg-main px-2 md:px-8 relative mb-4 ${isExplore ? "border-transparent" : "border-accent-dim/20 shadow-[0_0_80px_rgba(0,0,0,0.6)]"}`}>

          {!isExplore && <>
          {/* Corner Decor - 상단 좌우 (신전 꺽쇠) */}
          <div className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-accent/40 rounded-tl-sm hidden md:block" />
          <div className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 border-accent/40 rounded-tr-sm hidden md:block" />
          {/* Corner Decor - 하단 좌우 */}
          <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2 border-accent/40 rounded-bl-sm hidden md:block" />
          <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-accent/40 rounded-br-sm hidden md:block" />

          {/* Pillar Decor Side Shadow */}
          <div className="absolute top-0 left-[-4px] w-[4px] h-full bg-gradient-to-r from-black/20 to-transparent hidden md:block"></div>
          <div className="absolute top-0 right-[-4px] w-[4px] h-full bg-gradient-to-l from-black/20 to-transparent hidden md:block"></div>
          </>}

          {/* PC(xl+)에서는 틀 안쪽 좌우 150px을 비워 오른쪽 스와이프 판이 틀 안에 본문과 나란히 선다.
              바깥 틀 폭은 그대로라 화면 전체 인상이 바뀌지 않는다. 인물 상세는 자기 여백이 있어 제외 */}
          <div data-main-content-region className={`relative z-10 py-6 md:py-8 ${isCeleb ? "" : "xl:px-[150px]"}`}>
            {children}
          </div>
        </div>
      </main>
      {isMobile && <BottomNav />}
      <FloatingMusicPlayer />
      {!isMobile && <RecentProfilesSection />}
      {/* PC 오른쪽의 위아래 스와이프 막대. 게임 전체 화면과 짧은 화면은 스스로 물러난다 */}
      {!isMobile && <SwipeRail celeb={isCeleb} />}
    </>
  );
}
