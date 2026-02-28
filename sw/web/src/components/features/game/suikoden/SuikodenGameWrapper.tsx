/*
  파일명: components/features/game/suikoden/SuikodenGameWrapper.tsx
  기능: 천도 게임 클라이언트 래퍼
  책임: GameShell에 천도 전용 config(배경, 로비, 페이즈 라벨, 오디오)를 전달한다.
*/
"use client";

import { useMemo, useCallback } from "react";
import { Crown } from "lucide-react";
import GameShell from "../shared/GameShell";
import GameAudioPlayer from "@/components/shared/GameAudioPlayer";
import SuikodenGame from "./SuikodenGame";
import SuikodenLobby from "./SuikodenLobby";
import SuikodenBackground from "./SuikodenBackground";
import { useSuikodenAudio } from "./hooks/useSuikodenAudio";
import type { GameCharacter, GameItem } from "@/lib/game/suikoden/types";

const PHASE_LABELS: Record<string, string> = {
  idle: "로비",
  setup: "세력 설정",
  wandering: "방랑",
  strategy: "전략",
  battle: "전투",
  disposition: "포로 처분",
  result: "결과",
};

interface Props {
  characters: GameCharacter[];
  items: GameItem[];
}

export default function SuikodenGameWrapper({ characters, items }: Props) {
  const { setBgm, stopAll, audioControls } = useSuikodenAudio();

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
        onStartRef?: React.MutableRefObject<((...args: any[]) => void) | null>;
      }) {
        return <SuikodenGame characters={characters} items={items} {...props} />;
      },
    [characters, items],
  );

  return (
    <GameShell
      gameName="천도"
      gateIcon={<Crown size={40} className="mx-auto text-accent/60" />}
      gateSubtitle="셀럽 전략 시뮬레이션"
      phaseLabels={PHASE_LABELS}
      Background={SuikodenBackground}
      Lobby={Lobby}
      Game={Game}
      footerExtra={<GameAudioPlayer controls={audioControls} />}
      onPhaseChangeExternal={handlePhaseChange}
      onExitFullScreenExternal={handleExitFullScreen}
    />
  );
}
