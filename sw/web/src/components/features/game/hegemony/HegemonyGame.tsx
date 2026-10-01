/*
  파일명: components/features/game/hegemony/HegemonyGame.tsx
  기능: 패권 게임 진입점
  책임: 전체화면 틀·배경·오디오를 묶고, 단계별 화면은 HegemonyApp에 맡긴다. 쉼터(/rest#hegemony)가 이 파일을 연다.
*/
"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import GameFullScreen, { type BreadcrumbItem } from "@/components/shared/GameFullScreen";
import { useRegisterGameAudio } from "@/contexts/GameAudioContext";
import type { Phase } from "@/lib/game/hegemony/session/types";
import HegemonyApp from "./HegemonyApp";
import HegemonyBackground from "./HegemonyBackground";
import { useHegemonyAudio } from "./hooks/useHegemonyAudio";
import { useHegemonyGame } from "./hooks/useHegemonyGame";
import { useHegemonyText } from "./text";

/** 머리줄 경로에 붙는 단계 이름 (shared.game.phase) */
const PHASE_CRUMB: Record<Phase, string | null> = {
  title: null,
  loading: "loading",
  draft: "draft",
  captain: "captain",
  battle: "battle",
  result: "result",
};

/** 단계 → 배경음악 상태 */
const PHASE_BGM: Record<Phase, string> = {
  title: "title",
  loading: "title",
  draft: "draft",
  captain: "captain",
  battle: "battle",
  result: "result",
};

interface Props {
  initialFullScreen?: boolean;
  onExitFullScreenExternal?: () => void;
}

export default function HegemonyGame({ initialFullScreen, onExitFullScreenExternal }: Props) {
  const t = useTranslations("shared.game");
  const text = useHegemonyText();
  const audio = useHegemonyAudio();
  useRegisterGameAudio(audio.audioControls);
  const game = useHegemonyGame();
  const { phase } = game.state;
  const winner = game.state.battle?.winner ?? null;
  const { setBgm, stopAll } = audio;

  useEffect(() => {
    setBgm(PHASE_BGM[phase], { playerWins: winner === "player" });
  }, [phase, winner, setBgm]);

  const { reset } = game;
  const goHome = useCallback(() => reset(), [reset]);

  const breadcrumbs = useMemo((): BreadcrumbItem[] => {
    const crumb = PHASE_CRUMB[phase];
    return [{ label: text.game.title, onClick: goHome }, ...(crumb ? [{ label: t(`phase.${crumb}`) }] : [])];
  }, [phase, goHome, text.game.title, t]);

  return (
    <GameFullScreen
      breadcrumbs={breadcrumbs}
      initialFullScreen={initialFullScreen}
      onExitFullScreen={() => {
        stopAll();
        onExitFullScreenExternal?.();
      }}
      onHome={goHome}
      background={<HegemonyBackground phase={phase} winner={winner} />}
      exitLabel={t("exit")}
      exitEscLabel={t("exitEsc")}
      reserveSubtitleSpace={false}
    >
      {({ exitFullScreen }) => <HegemonyApp game={game} audio={audio} onExit={exitFullScreen} />}
    </GameFullScreen>
  );
}
