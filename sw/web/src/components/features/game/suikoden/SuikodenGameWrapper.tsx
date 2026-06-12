/*
  파일명: components/features/game/suikoden/SuikodenGameWrapper.tsx
  기능: 천도 게임 클라이언트 래퍼
  책임: GameShell에 천도 전용 config(배경, 로비, 페이즈 라벨, 오디오)를 전달한다.
*/
"use client";

import { useMemo, useCallback } from "react";
import { Crown } from "lucide-react";
import { useTranslations } from "next-intl";
import GameShell from "../shared/GameShell";
import GameAudioPlayer from "@/components/shared/GameAudioPlayer";
import { useRegisterGameAudio } from "@/contexts/GameAudioContext";
import SuikodenGame from "./SuikodenGame";
import SuikodenLobby from "./SuikodenLobby";
import SuikodenBackground from "./SuikodenBackground";
import { useSuikodenAudio } from "./hooks/useSuikodenAudio";
import type { GameCharacter } from "@/lib/game/suikoden/types";

/** characterId → celeb_dialogues.lines */
export type DialoguesMap = Record<string, Record<string, string[]>>;

interface Props {
  characters: GameCharacter[];
  dialogues: DialoguesMap;
  initialFullScreen?: boolean;
  onExitFullScreenExternal?: () => void;
}

export default function SuikodenGameWrapper({ characters, dialogues, initialFullScreen, onExitFullScreenExternal }: Props) {
  const t = useTranslations("shared.game");
  const tArena = useTranslations("rest.arena.suikoden");
  const { setBgm, stopAll, audioControls } = useSuikodenAudio();
  useRegisterGameAudio(audioControls);

  const phaseLabels = useMemo(() => ({
    idle: t("phase.lobby"),
    setup: t("phase.setup"),
    wandering: t("phase.wandering"),
    strategy: t("phase.strategy"),
    battle: t("phase.battle"),
    disposition: t("phase.disposition"),
    result: t("phase.result"),
  }), [t]);

  const handlePhaseChange = useCallback((phase: string) => {
    setBgm(phase);
  }, [setBgm]);

  const handleExitFullScreen = useCallback(() => {
    stopAll();
  }, [stopAll]);

  const Lobby = useMemo(
    () =>
      function SuikodenLobbyAdapter({ onStart, onExit }: { onStart: () => void; onExit: () => void }) {
        return <SuikodenLobby characterCount={characters.length} onStart={onStart} onExit={onExit} />;
      },
    [characters.length],
  );

  const Game = useMemo(
    () =>
      function SuikodenGameAdapter(props: {
        onEnterFullScreen?: () => void;
        onHomeRef?: React.MutableRefObject<(() => void) | null>;
        onPhaseChange?: (phase: string) => void;
        onStartRef?: React.MutableRefObject<(() => void) | null>;
      }) {
        return <SuikodenGame characters={characters} dialogues={dialogues} {...props} />;
      },
    [characters, dialogues],
  );

  return (
    <GameShell
      gameName={tArena("label")}
      gateIcon={<Crown size={40} className="mx-auto text-accent/60" />}
      gateSubtitle={tArena("description")}
      phaseLabels={phaseLabels}
      Background={SuikodenBackground}
      Lobby={Lobby}
      Game={Game}
      footerExtra={<div className="md:hidden"><GameAudioPlayer controls={audioControls} /></div>}
      initialFullScreen={initialFullScreen}
      onPhaseChangeExternal={handlePhaseChange}
      onExitFullScreenExternal={() => {
        handleExitFullScreen();
        onExitFullScreenExternal?.();
      }}
    />
  );
}
