"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Clock, Crosshair, Swords, Crown } from "lucide-react";
import HubCard from "@/components/shared/HubCard";
import { Z_INDEX } from "@/constants/zIndex";
import type { GameBackgroundImages } from "@/lib/getGameBackgroundImages";
import type { GameCharacter } from "@/lib/game/suikoden/types";
import type { DialoguesMap } from "@/components/features/game/suikoden/SuikodenGameWrapper";
// 기억궁 비공개(26.07.28): 구현은 보존하고 /rest 등록만 주석 처리한다.
// import { Brain } from "lucide-react";
// import type { MemoryFigure } from "@/components/features/game/memory/types";
import type { PortraitFigure } from "@/components/features/game/portrait/types";

function GameLoadingScreen() {
  return (
    <div className="fixed inset-0 bg-bg-main flex items-center justify-center" style={{ zIndex: Z_INDEX.top }}>
      <div className="animate-pulse text-text-secondary font-serif text-lg">Loading…</div>
    </div>
  );
}

const DawnGameWrapper = dynamic(() => import("@/components/features/game/dawn/DawnGameWrapper"), { loading: GameLoadingScreen });
const LabyrinthGame = dynamic(() => import("@/components/features/game/labyrinth/LabyrinthGame"), { loading: GameLoadingScreen });
const HegemonyGame = dynamic(() => import("@/components/features/game/battle/HegemonyGame"), { loading: GameLoadingScreen });
const SuikodenGameWrapper = dynamic(() => import("@/components/features/game/suikoden/SuikodenGameWrapper"), { loading: GameLoadingScreen });
// const MemoryGame = dynamic(() => import("@/components/features/game/memory/MemoryGame"), { loading: GameLoadingScreen });
const PortraitGame = dynamic(() => import("@/components/features/game/portrait/PortraitGame"), { loading: GameLoadingScreen });

type GameId = "dawn" | "labyrinth" | "hegemony" | "suikoden" | "portrait";

// image: 각 게임 로비 캔버스 광경을 정지 회화로 옮긴 카드 배경 (docs/project/game-card-images.md)
const GAME_SECTIONS = [
  { valueKey: "dawn" as const, label: "DAWN", icon: Clock, image: "/images/games/dawn-card.webp" },
  { valueKey: "labyrinth" as const, label: "LABYRINTH", icon: Crosshair, image: "/images/games/labyrinth-card.webp" },
  { valueKey: "hegemony" as const, label: "HEGEMONY", icon: Swords, image: "/images/games/hegemony-card.webp" },
  { valueKey: "suikoden" as const, label: "CHEONDO", icon: Crown, image: "/images/games/suikoden-card.webp" },
  // { valueKey: "memory" as const, label: "MEMORY", icon: Brain, image: "/images/games/memory-card.webp" },
  // 시대의 초상 비공개(26.07.30): 구현은 보존하고 공개 카드만 숨긴다.
  // { valueKey: "portrait" as const, label: "PORTRAITS IN TIME", icon: ScanFace, image: "/images/games/memory-card.webp" },
] as const;

interface GameLabel {
  title: string;
  description: string;
}

interface Props {
  bgImagesDawn: GameBackgroundImages | null;
  bgImagesLabyrinth: GameBackgroundImages | null;
  bgImagesHegemony: GameBackgroundImages | null;
  suikodenCharacters: GameCharacter[];
  suikodenDialogues: DialoguesMap;
  // memoryFigures: MemoryFigure[];
  portraitFigures: PortraitFigure[];
  gameLabels: Record<Exclude<GameId, "portrait">, GameLabel>;
}

export default function RestGameGrid({
  bgImagesDawn,
  bgImagesLabyrinth,
  bgImagesHegemony,
  suikodenCharacters,
  suikodenDialogues,
  // memoryFigures,
  portraitFigures,
  gameLabels,
}: Props) {
  const [activeGame, setActiveGame] = useState<GameId | null>(null);

  const handleExit = () => {
    setActiveGame(null);
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {GAME_SECTIONS.map((game) => {
          const Icon = game.icon;
          return (
            <HubCard
              key={game.valueKey}
              id={game.valueKey}
              onClick={() => setActiveGame(game.valueKey)}
              title={gameLabels[game.valueKey].title}
              description={gameLabels[game.valueKey].description}
              label={game.label}
              icon={<Icon className="h-5 w-5" />}
              backgroundImage={game.image}
            />
          );
        })}
      </div>

      {activeGame === "dawn" && (
        <DawnGameWrapper bgImages={bgImagesDawn} initialFullScreen={true} onExitFullScreenExternal={handleExit} />
      )}
      
      {activeGame === "labyrinth" && (
        <LabyrinthGame bgImages={bgImagesLabyrinth} initialFullScreen={true} onExitFullScreenExternal={handleExit} />
      )}
      
      {activeGame === "hegemony" && (
        <HegemonyGame bgImages={bgImagesHegemony} initialFullScreen={true} onExitFullScreenExternal={handleExit} />
      )}

      {activeGame === "suikoden" && (
        <SuikodenGameWrapper
          characters={suikodenCharacters}
          dialogues={suikodenDialogues}
          initialFullScreen={true}
          onExitFullScreenExternal={handleExit}
        />
      )}

      {/* {activeGame === "memory" && (
        <MemoryGame
          figures={memoryFigures}
          initialFullScreen={true}
          onExitFullScreenExternal={handleExit}
        />
      )} */}

      {activeGame === "portrait" && (
        <PortraitGame figures={portraitFigures} initialFullScreen={true} onExitFullScreenExternal={handleExit} />
      )}
    </>
  );
}
