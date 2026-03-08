/*
  파일명: components/features/game/shared/GameShell.tsx
  기능: 게임 공통 래퍼
  책임: GameFullScreen + 게이트(진입 버튼) + 배경 + 로비/게임 전환 + 브레드크럼.
        config(상수)만 교체하면 미궁·여명 등 다양한 게임에 재사용 가능.
*/
"use client";

import { useCallback, useRef, useState, useMemo, useEffect, type ComponentType, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import GameFullScreen, { type BreadcrumbItem } from "@/components/shared/GameFullScreen";
import GameGate from "./GameGate";

interface GameShellConfig {
  gameName: string;
  gateIcon: ReactNode;
  gateSubtitle: string;
  phaseLabels: Record<string, string>;
  Background: ComponentType<{ className?: string; phase?: string }>;
  Lobby: ComponentType<{ onStart: (...args: any[]) => void; onExit: () => void }>;
  Game: ComponentType<{
    onEnterFullScreen?: () => void;
    onHomeRef?: React.MutableRefObject<(() => void) | null>;
    onPhaseChange?: (phase: string) => void;
    onStartRef?: React.MutableRefObject<((...args: any[]) => void) | null>;
  }>;
  /** GameFullScreen 하단 푸터 (오디오 플레이어 등) */
  footerExtra?: ReactNode;
  /** 초기 전체화면 모드 여부 */
  initialFullScreen?: boolean;
  /** 외부에서 phase 변화를 감지하기 위한 콜백 */
  onPhaseChangeExternal?: (phase: string) => void;
  /** 전체화면 해제 시 외부 콜백 (오디오 정리 등) */
  onExitFullScreenExternal?: () => void;
}

export default function GameShell({ gameName, gateIcon, gateSubtitle, phaseLabels, Background, Lobby, Game, footerExtra, initialFullScreen, onPhaseChangeExternal, onExitFullScreenExternal }: GameShellConfig) {
  const t = useTranslations("shared.game");
  const homeRef = useRef<(() => void) | null>(null);
  const startRef = useRef<((...args: any[]) => void) | null>(null);
  const enterFullScreenRef = useRef<(() => void) | null>(null);
  const exitFullScreenRef = useRef<(() => void) | null>(null);
  const [phase, setPhase] = useState("idle");
  const [gateEntered, setGateEntered] = useState(initialFullScreen ?? false);

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

  // 게이트 화면 Enter 키 입장
  useEffect(() => {
    if (gateEntered) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleEnterGate(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [gateEntered, handleEnterGate]);

  // phase 변화 시 외부 콜백 (게이트 진입 후에만)
  useEffect(() => {
    if (gateEntered) onPhaseChangeExternal?.(phase);
  }, [phase, gateEntered, onPhaseChangeExternal]);

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
      initialFullScreen={initialFullScreen}
      exitLabel={t("exit")}
      exitEscLabel={t("exitEsc")}
    >
      {({ enterFullScreen, exitFullScreen }) => {
        enterFullScreenRef.current = enterFullScreen;
        exitFullScreenRef.current = exitFullScreen;

        if (!gateEntered) {
          return (
            <GameGate
              icon={gateIcon}
              gameName={gameName}
              subtitle={gateSubtitle}
              onEnter={handleEnterGate}
            />
          );
        }

        return (
          <>
            {phase === "idle" && (
              <Lobby onStart={handleStart} onExit={() => exitFullScreenRef.current?.()} />
            )}
            <div className={`flex-1 flex flex-col w-full ${phase === "idle" ? "hidden" : ""}`}>
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
