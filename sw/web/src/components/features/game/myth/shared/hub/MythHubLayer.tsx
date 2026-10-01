/*
  파일명: components/features/game/myth/shared/hub/MythHubLayer.tsx
  기능: 신화 게임 목록 전체화면 층
  책임: 목록 화면을 실험실 머리글 위에 화면 전체로 띄운다. 서버가 그린 첫 화면부터 덮고,
        떠 있는 동안 뒤 화면이 따라 굴러가지 않게 막는다. 스크롤은 이 층이 따로 갖는다.
*/ // ------------------------------
"use client";

import { useEffect, type ReactNode } from "react";
import { Z_INDEX } from "@/constants/zIndex";

export default function MythHubLayer({ children }: { children: ReactNode }) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <div className="fixed inset-0 isolate overflow-y-auto overflow-x-hidden overscroll-contain bg-bg-main text-text-primary" style={{ zIndex: Z_INDEX.top }}>
      {children}
    </div>
  );
}
