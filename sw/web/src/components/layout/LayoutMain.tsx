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
      <main className="pt-16 pb-16 px-2 md:pt-20 md:pb-6 md:px-5 min-h-screen overflow-y-auto scrollbar-stable">
        <div className="max-w-[1400px] mx-auto border-x-2 md:border-x-4 border-double border-accent-dim/20 min-h-[calc(100vh-100px)] bg-bg-main shadow-[0_0_50px_rgba(0,0,0,0.5)] px-3 md:px-8 relative">
          {/* Pillar Decor Top */}
          <div className="absolute top-0 left-[-6px] w-[6px] h-full border-l border-accent-dim/10 hidden md:block"></div>
          <div className="absolute top-0 right-[-6px] w-[6px] h-full border-r border-accent-dim/10 hidden md:block"></div>
          
          {children}
        </div>
      </main>
      {isMobile && <BottomNav />}
    </AchievementProvider>
  );
}
