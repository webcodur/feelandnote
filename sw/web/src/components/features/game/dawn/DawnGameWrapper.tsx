/*
  파일명: components/features/game/dawn/DawnGameWrapper.tsx
  기능: 여명 게임 클라이언트 래퍼
  책임: GameShell에 여명 전용 config(배경, 로비, 페이즈 라벨)를 전달한다.
*/
"use client";

import { useMemo } from "react";
import { Clock } from "lucide-react";
import type { GameBackgroundImages } from "@/lib/getGameBackgroundImages";
import GameShell from "../shared/GameShell";
import DawnGame from "../DawnGame";
import DawnBackground from "./DawnBackground";
import DawnLobby from "./DawnLobby";

const PHASE_LABELS: Record<string, string> = {
  idle: "로비",
  playing: "게임",
  gameover: "결과",
};

interface Props {
  bgImages?: GameBackgroundImages | null;
}

export default function DawnGameWrapper({ bgImages }: Props) {
  const Background = useMemo(
    () =>
      function Bg(props: { phase?: string }) {
        return <DawnBackground {...props} bgImages={bgImages} />;
      },
    [bgImages],
  );

  return (
    <GameShell
      gameName="여명"
      gateIcon={<Clock size={40} className="mx-auto text-accent/60" />}
      gateSubtitle="시간 순서 정렬 게임"
      phaseLabels={PHASE_LABELS}
      highScoreKey="dawn-highscore"
      Background={Background}
      Lobby={DawnLobby}
      Game={DawnGame}
    />
  );
}
