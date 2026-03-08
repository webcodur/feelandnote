"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Clock, Crosshair, Swords, Crown } from "lucide-react";
import { useTranslations } from "next-intl";
import HubCard from "@/components/shared/HubCard";
import DevGate from "@/app/[locale]/(main)/rest/suikoden/DevGate";
import type { GameBackgroundImages } from "@/lib/getGameBackgroundImages";
import type { GameCharacter } from "@/lib/game/suikoden/types";
import type { DialoguesMap } from "@/components/features/game/suikoden/SuikodenGameWrapper";

const DawnGameWrapper = dynamic(() => import("@/components/features/game/dawn/DawnGameWrapper"));
const LabyrinthGame = dynamic(() => import("@/components/features/game/labyrinth/LabyrinthGame"));
const HegemonyGame = dynamic(() => import("@/components/features/game/battle/HegemonyGame"));
const SuikodenGameWrapper = dynamic(() => import("@/components/features/game/suikoden/SuikodenGameWrapper"));

type GameId = "dawn" | "labyrinth" | "hegemony" | "suikoden";

const GAME_SECTIONS = [
  { valueKey: "dawn" as const, label: "DAWN", icon: Clock },
  { valueKey: "labyrinth" as const, label: "LABYRINTH", icon: Crosshair },
  { valueKey: "hegemony" as const, label: "HEGEMONY", icon: Swords },
  { valueKey: "suikoden" as const, label: "CHEONDO", icon: Crown },
] as const;

interface Props {
  bgImagesDawn: GameBackgroundImages | null;
  bgImagesLabyrinth: GameBackgroundImages | null;
  bgImagesHegemony: GameBackgroundImages | null;
  suikodenCharacters: GameCharacter[];
  suikodenDialogues: DialoguesMap;
}

export default function RestGameGrid({
  bgImagesDawn,
  bgImagesLabyrinth,
  bgImagesHegemony,
  suikodenCharacters,
  suikodenDialogues,
}: Props) {
  const tArena = useTranslations("rest.arena");
  const tHub = useTranslations("rest.hub");
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
              title={tArena(`${game.valueKey}.label` as any)}
              description={tHub(game.valueKey)}
              label={game.label}
              icon={<Icon className="h-5 w-5" />}
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
        <DevGate>
          <SuikodenGameWrapper
            characters={suikodenCharacters}
            dialogues={suikodenDialogues}
            initialFullScreen={true}
            onExitFullScreenExternal={handleExit}
          />
        </DevGate>
      )}
    </>
  );
}
