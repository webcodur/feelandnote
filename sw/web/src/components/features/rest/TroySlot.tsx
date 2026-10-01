/*
  파일명: /components/features/rest/TroySlot.tsx
  기능: 트로이 전쟁 게임 슬롯
  책임: 트로이 카드를 열 때만 3D 모델 및 게임 데이터를 불러와 전체화면으로 마운트한다.
*/ // ------------------------------

"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Z_INDEX } from "@/constants/zIndex";
import { getTroyGameData, type TroyGameData } from "@/actions/game/troy";

function GameLoadingScreen() {
  return (
    <div className="fixed inset-0 bg-bg-main flex items-center justify-center" style={{ zIndex: Z_INDEX.top }}>
      <div className="animate-pulse text-text-secondary font-serif text-lg">Loading…</div>
    </div>
  );
}

const TroyGame = dynamic(() => import("@/components/features/game/myth/troy/ui/TroyGame"), {
  ssr: false,
  loading: GameLoadingScreen,
});

interface Props {
  onExitFullScreenExternal: () => void;
}

export default function TroySlot({ onExitFullScreenExternal }: Props) {
  const [data, setData] = useState<TroyGameData | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getTroyGameData().then((res) => {
      if (!cancelled) setData(res);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) return <GameLoadingScreen />;

  return (
    <TroyGame
      pool={data.pool}
      medals={data.medals}
      onExit={onExitFullScreenExternal}
    />
  );
}
