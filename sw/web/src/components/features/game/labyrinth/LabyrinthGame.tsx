/*
  파일명: components/features/game/labyrinth/LabyrinthGame.tsx
  기능: 미궁 게임 클라이언트 래퍼
  책임: GameShell에 미궁 전용 config(배경, 로비, 페이즈 라벨)를 전달한다.
*/
"use client";

import { useMemo } from "react";
import { Crosshair } from "lucide-react";
import type { GameBackgroundImages } from "@/lib/getGameBackgroundImages";
import GameShell from "../shared/GameShell";
import TrackerGame from "../TrackerGame";
import LabyrinthBackground from "./LabyrinthBackground";
import LabyrinthLobby from "./LabyrinthLobby";

const PHASE_LABELS: Record<string, string> = {
  idle: "로비",
  loading: "로딩",
  stage1: "추적",
  stage2: "추적",
  stage3: "추적",
  stage4: "추적",
  stage5: "추적",
  result: "결과",
};

interface Props {
  bgImages?: GameBackgroundImages | null;
}

export default function LabyrinthGame({ bgImages }: Props) {
  const Background = useMemo(
    () =>
      function Bg(props: { phase?: string }) {
        return <LabyrinthBackground {...props} bgImages={bgImages} />;
      },
    [bgImages],
  );

  return (
    <GameShell
      gameName="미궁"
      gateIcon={<Crosshair size={40} className="mx-auto text-accent/60" />}
      gateSubtitle="인물 추적 게임"
      phaseLabels={PHASE_LABELS}
      highScoreKey="tracker-highscore"
      Background={Background}
      Lobby={LabyrinthLobby}
      Game={TrackerGame}
    />
  );
}
