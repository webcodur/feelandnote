/*
  파일명: components/features/game/battle/HegemonyGame.tsx
  기능: 패권 게임 클라이언트 래퍼
  책임: 오디오 훅을 소유하고, GameFullScreen 헤더에 플레이어를, BattleGame에 오디오 제어를 전달한다.
*/
"use client";

import { useCallback, useRef, useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import GameFullScreen, { type BreadcrumbItem } from "@/components/shared/GameFullScreen";
import GameAudioPlayer from "@/components/shared/GameAudioPlayer";
import { useRegisterGameAudio } from "@/contexts/GameAudioContext";
import type { GameBackgroundImages } from "@/lib/getGameBackgroundImages";
import { useBattleAudio } from "./hooks/useBattleAudio";
import BattleGame from "./BattleGame";
import GameBackground from "./GameBackground";

const PHASE_LABEL_KEYS: Record<string, string> = {
  idle: "lobby",
  loading: "loading",
  draft: "draft",
  captain: "captain",
  battle: "battle",
  result: "result",
};

interface Props {
  bgImages?: GameBackgroundImages | null;
  initialFullScreen?: boolean;
  onExitFullScreenExternal?: () => void;
}

export default function HegemonyGame({ bgImages, initialFullScreen, onExitFullScreenExternal }: Props) {
  const t = useTranslations("shared.game");
  const tArena = useTranslations("rest.arena.hegemony");
  const { setBgm, playSfx, stopAll, audioControls, bgmMuted, sfxMuted, toggleBgmMuted, toggleSfxMuted } = useBattleAudio();
  useRegisterGameAudio(audioControls);
  const homeRef = useRef<(() => void) | null>(null);
  const [phase, setPhase] = useState("idle");
  const [playerWins, setPlayerWins] = useState(false);

  const handleHome = useCallback(() => {
    homeRef.current?.();
    stopAll();
    setBgm("idle");
  }, [stopAll, setBgm]);

  const breadcrumbs = useMemo((): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [{ label: tArena("label"), onClick: handleHome }];
    const phaseKey = PHASE_LABEL_KEYS[phase];
    if (phaseKey && phase !== "idle") {
      items.push({ label: t(`phase.${phaseKey}`) });
    }
    return items;
  }, [phase, handleHome, tArena, t]);

  return (
    <GameFullScreen
      breadcrumbs={breadcrumbs}
      footerExtra={<div className="md:hidden"><GameAudioPlayer controls={audioControls} /></div>}
      initialFullScreen={initialFullScreen}
      onExitFullScreen={(() => {
        stopAll();
        onExitFullScreenExternal?.();
      })}
      onHome={handleHome}
      background={<GameBackground phase={phase} playerWins={playerWins} bgImages={bgImages} />}
      exitLabel={t("exit")}
      exitEscLabel={t("exitEsc")}
    >
      {({ enterFullScreen, exitFullScreen, isFullScreen }) => (
        <>
          <BattleGame
            onEnterFullScreen={enterFullScreen}
            onExitFullScreen={exitFullScreen}
            onHomeRef={homeRef}
            onPhaseChange={setPhase}
            onPlayerWinsChange={setPlayerWins}
            initialAudioReady={isFullScreen}
            setBgm={setBgm}
            playSfx={playSfx}
            bgmMuted={bgmMuted}
            sfxMuted={sfxMuted}
            toggleBgmMuted={toggleBgmMuted}
            toggleSfxMuted={toggleSfxMuted}
          />
          {phase !== "idle" && phase !== "result" && phase !== "loading" && (
            <button
              onClick={handleHome}
              className="fixed bottom-4 end-4 text-[11px] text-white/30 hover:text-white/50 transition-colors px-2 py-1 rounded"
              style={{ border: "1px solid rgba(255,255,255,0.08)", zIndex: 10 }}
            >
              {t("forfeit")}
            </button>
          )}
        </>
      )}
    </GameFullScreen>
  );
}
