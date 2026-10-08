"use client";

import Header from "./header/Header";
import BottomNav from "./BottomNav";
import FloatingMusicPlayer from "./FloatingMusicPlayer";
import SwipeRail from "./SwipeRail";
import RecentProfilesSection from "@/components/features/profile/RecentProfilesSection";

/*
  앱 뼈대. 화면 폭 구분은 모두 CSS가 한다 — 옆 레일이 서기 전까지 하단 탭을 둔다.
  그래서 서버 HTML에 하단 탭이 처음부터 들어가 첫 화면에서 뒤늦게 튀어나오지 않는다.

  폭의 주인은 둘뿐이다.
  - 이 틀(main 첫 자식): 화면 좌우 여백과 최대 폭 1440.
  - PageContainer: 목록·홈/상세·쉼터 본문 폭. 공통 상한은 globals.css가 쥔다.
*/
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* 헤더는 Suspense 없이 첫 청크에 싣는다 — 봇이 내비게이션 링크를 바로 보게 */}
      <Header />
      <main className="min-h-svh pt-[var(--layer-header-h)] [overflow-anchor:none] bg-[radial-gradient(ellipse_80%_420px_at_50%_0%,rgba(var(--color-accent-rgb),0.045),transparent)]">
        <div className="relative mx-auto w-full max-w-[1440px] px-4 md:px-6 xl:px-10">
          <div data-main-content-region className="relative pt-5 pb-10 md:pt-8 md:pb-14">
            {children}
          </div>
        </div>
      </main>
      <BottomNav />
      <FloatingMusicPlayer />
      <RecentProfilesSection />
      {/* PC 오른쪽의 위아래 스와이프 막대. 본문 옆에 자리가 남는 넓은 화면에서만 선다(SwipeRail.module.css) */}
      <SwipeRail />
    </>
  );
}
