/*
  파일명: components/features/game/dawn/DawnGameWrapper.tsx
  기능: 여명 게임 클라이언트 래퍼
  책임: GameShell에 여명 전용 config(배경, 로비, 페이즈 라벨, 오디오)를 전달한다.
*/
"use client";

import { useCallback, useMemo } from "react";
import { Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import type { GameBackgroundImages } from "@/lib/getGameBackgroundImages";
import GameAudioPlayer from "@/components/shared/GameAudioPlayer";
import GameShell from "../shared/GameShell";
import { useRegisterGameAudio } from "@/contexts/GameAudioContext";
import DawnGame from "../DawnGame";
import DawnBackground from "./DawnBackground";
import DawnLobby from "./DawnLobby";
import { useDawnAudio } from "./hooks/useDawnAudio";

interface Props {
  bgImages?: GameBackgroundImages | null;
  initialFullScreen?: boolean;
  onExitFullScreenExternal?: () => void;
}

export default function DawnGameWrapper({ bgImages, initialFullScreen, onExitFullScreenExternal }: Props) {
  const t = useTranslations("shared.game");
  const tArena = useTranslations("rest.arena.dawn");
  const { setBgm, stopAll, audioControls } = useDawnAudio();
  useRegisterGameAudio(audioControls);

  const phaseLabels = useMemo(() => ({
    idle: t("phase.lobby"),
    playing: t("phase.playing"),
    "playing-streak": t("phase.playing"),
    gameover: t("phase.result"),
  }), [t]);

  const Background = useMemo(
    () =>
      function Bg(props: { phase?: string }) {
        return <DawnBackground {...props} bgImages={bgImages} />;
      },
    [bgImages],
  );

  const handlePhaseChange = useCallback(
    (phase: string) => setBgm(phase),
    [setBgm],
  );

  return (
    <GameShell
      gameName={tArena("label")}
      gateIcon={<Clock size={40} className="mx-auto text-accent/60" />}
      gateSubtitle={tArena("description")}
      phaseLabels={phaseLabels}
      Background={Background}
      Lobby={DawnLobby}
      Game={DawnGame}
      footerExtra={<div className="md:hidden"><GameAudioPlayer controls={audioControls} /></div>}
      initialFullScreen={initialFullScreen}
      onPhaseChangeExternal={handlePhaseChange}
      onExitFullScreenExternal={() => {
        stopAll();
        onExitFullScreenExternal?.();
      }}
    />
  );
}
