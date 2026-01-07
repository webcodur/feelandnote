/*
  파일명: /components/layout/MainLayout.tsx
  기능: 메인 레이아웃 컴포넌트
  책임: 헤더, 사이드바, 하단 네비게이션을 조합한 전체 레이아웃을 구성한다.
*/ // ------------------------------

"use client";

import { useState, useEffect } from "react";
import Header from "./Header";
import Sidebar, { SIDEBAR_WIDTH } from "./Sidebar";
import BottomNav from "./BottomNav";
import { AchievementProvider } from "@/components/features/achievements";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.code === "KeyB") {
        e.preventDefault();
        setIsSidebarOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const showSidebar = !isMobile && isSidebarOpen;

  return (
    <AchievementProvider>
      <Header onMenuClick={toggleSidebar} isMobile={isMobile} />
      {!isMobile && <Sidebar isOpen={isSidebarOpen} />}
      <main
        className="pt-16 pb-16 px-3 md:pt-20 md:pb-6 md:px-5 min-h-screen overflow-y-auto scrollbar-stable"
        style={{ marginLeft: showSidebar ? SIDEBAR_WIDTH : 0 }}
      >
        <div className="max-w-[1400px] mx-auto">
          {children}
        </div>
      </main>
      {isMobile && <BottomNav />}
    </AchievementProvider>
  );
}
