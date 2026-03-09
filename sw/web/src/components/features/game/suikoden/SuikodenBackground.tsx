/*
  파일명: components/features/game/suikoden/SuikodenBackground.tsx
  기능: 천도 게임 배경 어댑터
  책임: 로비(idle)에서는 Canvas 배경, 인게임에서는 단색 배경으로 전환
*/
"use client";

import WindsOfLiangshanBackground from "@/components/lab/WindsOfLiangshanBackground";
import { useIsMobile } from "@/hooks/useIsMobile";

interface Props {
  phase?: string;
}

export default function SuikodenBackground({ phase }: Props) {
  const isMobile = useIsMobile();

  if (phase && phase !== "idle") {
    return <div className="absolute inset-0 bg-bg-main" />;
  }
  if (isMobile) return null;
  return <WindsOfLiangshanBackground />;
}
