"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Clock, Crosshair, Swords, Crown } from "lucide-react";
import HubCard from "@/components/shared/HubCard";
import { Z_INDEX } from "@/constants/zIndex";
import type { GameBackgroundImages } from "@/lib/getGameBackgroundImages";
import type { GameCharacter } from "@/lib/game/suikoden/types";
import type { DialoguesMap } from "@/components/features/game/suikoden/SuikodenGameWrapper";

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

type GameId = "dawn" | "labyrinth" | "hegemony" | "suikoden";

// image: 각 게임 로비 캔버스 광경을 정지 회화로 옮긴 카드 배경 (docs/project/game-card-images.md)
const GAME_SECTIONS = [
  { valueKey: "dawn" as const, label: "DAWN", icon: Clock, image: "/images/games/dawn-card.webp" },
  { valueKey: "labyrinth" as const, label: "LABYRINTH", icon: Crosshair, image: "/images/games/labyrinth-card.webp" },
  { valueKey: "hegemony" as const, label: "HEGEMONY", icon: Swords, image: "/images/games/hegemony-card.webp" },
  { valueKey: "suikoden" as const, label: "CHEONDO", icon: Crown, image: "/images/games/suikoden-card.webp" },
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
  gameLabels: Record<GameId, GameLabel>;
}

export default function RestGameGrid({
  bgImagesDawn,
  bgImagesLabyrinth,
  bgImagesHegemony,
  suikodenCharacters,
  suikodenDialogues,
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
    </>
  );
}
