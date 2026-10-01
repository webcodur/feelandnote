/*
  파일명: components/features/game/myth/troy/ui/TroyFrame.tsx
  기능: 트로이 전쟁 전체 화면 틀
  책임: 서버가 그린 첫 화면부터 실험실 머리글을 덮는 전체 화면 층을 깔고, 뒤 화면이 굴러가지 않게 막는다.
        공용 틀(MythGameFrame)과 달리 ESC로 나가지 않는다 — 싸움판에서 ESC는 「취소」다. 나가기는 각 화면의 단추가 맡는다.
*/ // ------------------------------
"use client";

import { useEffect, type ReactNode } from "react";
import { Z_INDEX } from "@/constants/zIndex";
import { setGameFullScreenLayer } from "@/components/layout/musicPlayerSlots";

export default function TroyFrame({ children }: { children: ReactNode }) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);
  return (
    <div ref={setGameFullScreenLayer} className="fixed inset-0 isolate overflow-hidden bg-bg-main text-text-primary" style={{ zIndex: Z_INDEX.top }}>
      {children}
    </div>
  );
}
