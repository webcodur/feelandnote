/*
  파일명: components/features/game/battle/HegemonyGame.tsx
  기능: 패권 게임 클라이언트 래퍼
  책임: 오디오 훅을 소유하고, GameFullScreen 헤더에 플레이어를, BattleGame에 오디오 제어를 전달한다.
*/
"use client";

import { useCallback, useRef, useState, useMemo } from "react";
import GameFullScreen, { type BreadcrumbItem } from "@/components/shared/GameFullScreen";
import GameAudioPlayer from "@/components/shared/GameAudioPlayer";
import { useBattleAudio } from "./hooks/useBattleAudio";
import BattleGame from "./BattleGame";

const PHASE_LABEL: Record<string, string> = {
  idle: "로비",
  loading: "로딩",
  draft: "드래프트",
  battle: "대전",
  revealing: "대전",
  result: "결과",
};

export default function HegemonyGame() {
  const { setBgm, playSfx, stopAll, audioControls } = useBattleAudio();
  const homeRef = useRef<(() => void) | null>(null);
  const [phase, setPhase] = useState("idle");

  const handleHome = useCallback(() => {
    homeRef.current?.();
    stopAll();
    setBgm("idle");
  }, [stopAll, setBgm]);

  const breadcrumbs = useMemo((): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [{ label: "패권", onClick: handleHome }];
    const phaseLabel = PHASE_LABEL[phase];
    if (phaseLabel && phase !== "idle") {
      items.push({ label: phaseLabel });
    }
    return items;
  }, [phase, handleHome]);

  return (
    <GameFullScreen
      breadcrumbs={breadcrumbs}
      footerExtra={<GameAudioPlayer controls={audioControls} />}
      onExitFullScreen={stopAll}
      onHome={handleHome}
    >
      {({ enterFullScreen, isFullScreen }) => (
        <BattleGame
          onEnterFullScreen={enterFullScreen}
          onHomeRef={homeRef}
          onPhaseChange={setPhase}
          initialAudioReady={isFullScreen}
          setBgm={setBgm}
          playSfx={playSfx}
        />
      )}
    </GameFullScreen>
  );
}
