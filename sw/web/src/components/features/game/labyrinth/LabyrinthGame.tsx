/*
  파일명: components/features/game/labyrinth/LabyrinthGame.tsx
  기능: 미궁 게임 클라이언트 래퍼
  책임: GameShell에 미궁(추적 게임) 전용 config(배경, 로비, 페이즈 라벨)를 전달한다.
*/
"use client";

import { useMemo } from "react";
import { Crosshair } from "lucide-react";
import { useTranslations } from "next-intl";
import type { GameBackgroundImages } from "@/lib/getGameBackgroundImages";
import GameShell from "../shared/GameShell";
import TrackerGame from "../TrackerGame";
import LabyrinthBackground from "./LabyrinthBackground";
import LabyrinthLobby from "./LabyrinthLobby";

interface Props {
  bgImages?: GameBackgroundImages | null;
}

export default function LabyrinthGame({ bgImages }: Props) {
  const t = useTranslations("shared.game");
  const tArena = useTranslations("rest.arena.labyrinth");

  const phaseLabels = useMemo(() => ({
    idle: t("phase.lobby"),
    loading: t("phase.loading"),
    stage1: t("phase.tracking"),
    stage2: t("phase.tracking"),
    stage3: t("phase.tracking"),
    stage4: t("phase.tracking"),
    stage5: t("phase.tracking"),
    result: t("phase.result"),
  }), [t]);

  const Background = useMemo(
    () =>
      function Bg(props: { phase?: string }) {
        return <LabyrinthBackground {...props} bgImages={bgImages} />;
      },
    [bgImages],
  );

  return (
    <GameShell
      gameName={tArena("label")}
      gateIcon={<Crosshair size={40} className="mx-auto text-accent/60" />}
      gateSubtitle={tArena("description")}
      phaseLabels={phaseLabels}
      Background={Background}
      Lobby={LabyrinthLobby}
      Game={TrackerGame}
    />
  );
}
