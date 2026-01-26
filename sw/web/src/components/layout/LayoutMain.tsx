/*
  파일명: /components/layout/MainLayout.tsx
  기능: 메인 레이아웃 컴포넌트
  책임: 헤더, 하단 네비게이션을 조합한 전체 레이아웃을 구성한다.
*/ // ------------------------------

"use client";

import { useState, useEffect } from "react";
import Header from "./header/Header";
import BottomNav from "./BottomNav";
import { AchievementProvider } from "@/components/features/profile/achievements";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <AchievementProvider>
      <Header isMobile={isMobile} />
      <main className="pt-16 pb-16 px-0 md:pt-24 md:pb-8 md:px-5 min-h-screen overflow-y-auto scrollbar-stable bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.05)_0%,transparent_50%)]">
        <div className="max-w-[1400px] mx-auto border-2 md:border-4 border-double border-accent-dim/20 min-h-[calc(100vh-140px)] bg-bg-main shadow-[0_0_80px_rgba(0,0,0,0.6)] px-2 md:px-8 relative mb-4">
          
          {/* Corner Decor - 상단 좌우 (신전 꺽쇠) */}
          <div className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-accent/40 rounded-tl-sm hidden md:block" />
          <div className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 border-accent/40 rounded-tr-sm hidden md:block" />
          {/* Corner Decor - 하단 좌우 */}
          <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2 border-accent/40 rounded-bl-sm hidden md:block" />
          <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-accent/40 rounded-br-sm hidden md:block" />
          
          {/* Pillar Decor Side Shadow */}
          <div className="absolute top-0 left-[-4px] w-[4px] h-full bg-gradient-to-r from-black/20 to-transparent hidden md:block"></div>
          <div className="absolute top-0 right-[-4px] w-[4px] h-full bg-gradient-to-l from-black/20 to-transparent hidden md:block"></div>
          
          <div className="relative z-10 py-6 md:py-8">
            {children}
          </div>
        </div>
      </main>
      {isMobile && <BottomNav />}
    </AchievementProvider>
  );
}
