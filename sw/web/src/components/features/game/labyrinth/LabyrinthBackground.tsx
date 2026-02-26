/*
  파일명: components/features/game/labyrinth/LabyrinthBackground.tsx
  기능: 미궁 게임 배경 어댑터
  책임: 로비(idle)에서는 Canvas 배경, 인게임에서는 이미지 배경으로 전환
*/
"use client";

import InfiniteCorridorBackground from "@/components/lab/InfiniteCorridorBackground";
import ImageBackground from "@/components/lab/ImageBackground";
import type { GameBackgroundImages } from "@/lib/getGameBackgroundImages";

interface Props {
  phase?: string;
  bgImages?: GameBackgroundImages | null;
}

export default function LabyrinthBackground({ phase, bgImages }: Props) {
  if (phase && phase !== "idle" && bgImages) {
    return <ImageBackground src={bgImages.pc} srcMobile={bgImages.mb} fullScreen />;
  }
  return <InfiniteCorridorBackground />;
}
