/*
  파일명: components/features/game/battle/GameBackground.tsx
  기능: 게임 페이즈별 배경 전환
  책임: phase/결과에 따라 적절한 배경 컴포넌트를 크로스페이드로 전환한다.
*/
"use client";

import { useState, useEffect, useRef, lazy, Suspense } from "react";
import ImageBackground from "@/components/lab/ImageBackground";
import type { GameBackgroundImages } from "@/lib/getGameBackgroundImages";

// lazy load — 캔버스 배경은 무거우므로 필요할 때만 로드
const OlympusOrbit = lazy(() => import("@/components/lab/OlympusOrbitBackground"));
const BurningEmbers = lazy(() => import("@/components/lab/BurningEmbersBackground"));
const GoldenAscension = lazy(() => import("@/components/lab/GoldenAscensionBackground"));

type BgKey = "intro" | "game" | "victory" | "defeat";

function bgKeyFromPhase(phase: string, playerWins?: boolean): BgKey {
  switch (phase) {
    case "idle":
    case "loading":
      return "intro";
    case "captain":
    case "draft":
    case "battle":
      return "game";
    case "result":
      return playerWins ? "victory" : "defeat";
    default:
      return "intro";
  }
}

function BgComponent({ bgKey, bgImages }: { bgKey: BgKey; bgImages?: GameBackgroundImages | null }) {
  switch (bgKey) {
    case "intro":
      return <OlympusOrbit fullScreen />;
    case "game":
      if (bgImages) {
        return <ImageBackground src={bgImages.pc} srcMobile={bgImages.mb} fullScreen />;
      }
      return <OlympusOrbit fullScreen />;
    case "victory":
      return <GoldenAscension fullScreen />;
    case "defeat":
      return <BurningEmbers fullScreen />;
  }
}

const FADE_MS = 800;

interface Props {
  phase: string;
  playerWins?: boolean;
  bgImages?: GameBackgroundImages | null;
}

export default function GameBackground({ phase, playerWins, bgImages }: Props) {
  const currentKey = bgKeyFromPhase(phase, playerWins);
  const [layers, setLayers] = useState<{ key: BgKey; opacity: number; id: number }[]>([
    { key: currentKey, opacity: 1, id: 0 },
  ]);
  const nextId = useRef(1);
  const prevKeyRef = useRef(currentKey);

  useEffect(() => {
    if (currentKey === prevKeyRef.current) return;
    prevKeyRef.current = currentKey;

    const id = nextId.current++;

    // 새 레이어 추가 (opacity 0)
    setLayers((prev) => [...prev, { key: currentKey, opacity: 0, id }]);

    // 다음 프레임에서 새 레이어 페이드인 + 이전 레이어 페이드아웃
    requestAnimationFrame(() => {
      setLayers((prev) =>
        prev.map((l) => (l.id === id ? { ...l, opacity: 1 } : { ...l, opacity: 0 })),
      );
    });

    // 페이드 완료 후 이전 레이어 제거
    const t = setTimeout(() => {
      setLayers((prev) => prev.filter((l) => l.id === id));
    }, FADE_MS + 100);

    return () => clearTimeout(t);
  }, [currentKey]);

  return (
    <>
      {layers.map((layer) => (
        <div
          key={layer.id}
          className="absolute inset-0 game-bg-layer"
          style={{
            opacity: layer.opacity,
            transition: `opacity ${FADE_MS}ms ease-in-out`,
          }}
        >
          <Suspense fallback={null}>
            <BgComponent bgKey={layer.key} bgImages={bgImages} />
          </Suspense>
        </div>
      ))}
    </>
  );
}
