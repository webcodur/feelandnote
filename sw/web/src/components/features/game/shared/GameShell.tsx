/*
  파일명: components/features/game/shared/GameShell.tsx
  기능: 게임 공통 래퍼
  책임: GameFullScreen + 게이트(진입 버튼) + 배경 + 로비/게임 전환 + 브레드크럼 + highScore 관리.
        config(상수)만 교체하면 미궁·여명 등 다양한 게임에 재사용 가능.
*/
"use client";

import { useCallback, useRef, useState, useMemo, useEffect, type ComponentType, type ReactNode } from "react";
import { Volume2 } from "lucide-react";
import GameFullScreen, { type BreadcrumbItem } from "@/components/shared/GameFullScreen";

interface GameShellConfig {
  gameName: string;
  gateIcon: ReactNode;
  gateSubtitle: string;
  phaseLabels: Record<string, string>;
  highScoreKey: string;
  Background: ComponentType<{ className?: string; phase?: string }>;
  Lobby: ComponentType<{ highScore: number; onStart: (...args: any[]) => void }>;
  Game: ComponentType<{
    onEnterFullScreen?: () => void;
    onHomeRef?: React.MutableRefObject<(() => void) | null>;
    onPhaseChange?: (phase: string) => void;
    onStartRef?: React.MutableRefObject<((...args: any[]) => void) | null>;
  }>;
  /** GameFullScreen 하단 푸터 (오디오 플레이어 등) */
  footerExtra?: ReactNode;
  /** 외부에서 phase 변화를 감지하기 위한 콜백 */
  onPhaseChangeExternal?: (phase: string) => void;
  /** 전체화면 해제 시 외부 콜백 (오디오 정리 등) */
  onExitFullScreenExternal?: () => void;
}

export default function GameShell({ gameName, gateIcon, gateSubtitle, phaseLabels, highScoreKey, Background, Lobby, Game, footerExtra, onPhaseChangeExternal, onExitFullScreenExternal }: GameShellConfig) {
  const homeRef = useRef<(() => void) | null>(null);
  const startRef = useRef<((...args: any[]) => void) | null>(null);
  const enterFullScreenRef = useRef<(() => void) | null>(null);
  const [phase, setPhase] = useState("idle");
  const [highScore, setHighScore] = useState(0);
  const [gateEntered, setGateEntered] = useState(false);

  // mount 시 highScore 로드
  useEffect(() => {
    const saved = localStorage.getItem(highScoreKey);
    if (saved) setHighScore(parseInt(saved, 10));
  }, [highScoreKey]);

  // idle 복귀 시 highScore 갱신
  useEffect(() => {
    if (phase === "idle") {
      const saved = localStorage.getItem(highScoreKey);
      if (saved) setHighScore(parseInt(saved, 10));
    }
  }, [phase, highScoreKey]);

  // phase 변화 시 외부 콜백 (게이트 진입 후에만)
  useEffect(() => {
    if (gateEntered) onPhaseChangeExternal?.(phase);
  }, [phase, gateEntered, onPhaseChangeExternal]);

  const handleHome = useCallback(() => {
    homeRef.current?.();
  }, []);

  const handleStart = useCallback((...args: any[]) => {
    enterFullScreenRef.current?.();
    startRef.current?.(...args);
  }, []);

  const handleEnterGate = useCallback(() => {
    setGateEntered(true);
    enterFullScreenRef.current?.();
  }, []);

  const handleExitFullScreen = useCallback(() => {
    onExitFullScreenExternal?.();
    homeRef.current?.();
    setGateEntered(false);
    setPhase("idle");
  }, [onExitFullScreenExternal]);

  const breadcrumbs = useMemo((): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [{ label: gameName, onClick: handleHome }];
    const phaseLabel = phaseLabels[phase];
    if (phaseLabel && phase !== "idle") {
      items.push({ label: phaseLabel });
    }
    return items;
  }, [phase, handleHome, gameName, phaseLabels]);

  return (
    <GameFullScreen
      breadcrumbs={breadcrumbs}
      footerExtra={footerExtra}
      onHome={handleHome}
      onExitFullScreen={handleExitFullScreen}
      background={<Background phase={phase} />}
    >
      {({ enterFullScreen }) => {
        enterFullScreenRef.current = enterFullScreen;

        if (!gateEntered) {
          return (
            <div className="max-w-md mx-auto flex flex-col items-center text-center">
              <div className="w-full max-w-sm flex flex-col items-center gap-6 py-8 bg-black/80 rounded-xl px-6">
                <div className="space-y-2">
                  {gateIcon}
                  <h2 className="text-2xl font-serif font-black text-white">{gameName}</h2>
                  <p className="text-sm text-text-secondary">{gateSubtitle}</p>
                </div>
                <button
                  onClick={handleEnterGate}
                  className="flex items-center gap-2 px-8 py-4 rounded-xl bg-accent/10 border border-accent/30 hover:bg-accent/20 active:scale-95 transition-all"
                >
                  <Volume2 size={18} className="text-accent" />
                  <span className="font-serif font-bold text-accent text-lg">게임 입장</span>
                </button>
                <p className="text-[10px] text-white/50">사운드와 함께 진행됩니다</p>
              </div>
            </div>
          );
        }

        return (
          <>
            {phase === "idle" && (
              <Lobby highScore={highScore} onStart={handleStart} />
            )}
            <div className={phase === "idle" ? "hidden" : ""}>
              <Game
                onEnterFullScreen={enterFullScreen}
                onHomeRef={homeRef}
                onPhaseChange={setPhase}
                onStartRef={startRef}
              />
            </div>
          </>
        );
      }}
    </GameFullScreen>
  );
}
