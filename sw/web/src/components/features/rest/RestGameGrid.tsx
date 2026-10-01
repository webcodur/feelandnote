"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import HubSection from "@/components/shared/HubSection";
import { hubSectionId } from "@/components/shared/hubSectionUtils";
import { navigateToSection } from "@/lib/scroll/useSectionNavigation";
import { REST_GAMES, REST_GROUP_ID, type GameId } from "@/constants/rest-games";
import { Z_INDEX } from "@/constants/zIndex";
import type { GameBackgroundImages } from "@/lib/getGameBackgroundImages";
import type { GameCharacter } from "@/lib/game/suikoden/types";
import type { WanderPools } from "@/lib/game/wander/types";
import type { DialoguesMap } from "@/components/features/game/suikoden/SuikodenGameWrapper";
import SuikodenSlot from "./SuikodenSlot";
import TroySlot from "./TroySlot";
import RestGameCard from "./RestGameCard";
import type { MemoryFigure } from "@/components/features/game/memory/types";
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
const HegemonyGame = dynamic(() => import("@/components/features/game/hegemony/HegemonyGame"), { loading: GameLoadingScreen });
const WanderGame = dynamic(() => import("@/components/features/game/wander/WanderGame"), { loading: GameLoadingScreen });
const MemoryGame = dynamic(() => import("@/components/features/game/memory/MemoryGame"), { loading: GameLoadingScreen });
const PortraitGame = dynamic(() => import("@/components/features/game/portrait/PortraitGame"), { loading: GameLoadingScreen });

interface GameLabel {
  title: string;
  description: string;
}

interface Props {
  bgImagesDawn: GameBackgroundImages | null;
  bgImagesLabyrinth: GameBackgroundImages | null;
  suikodenCharactersPromise: Promise<GameCharacter[]>;
  suikodenDialoguesPromise: Promise<DialoguesMap>;
  /** 미공개 게임 자료는 개발자 모드가 아닐 때 조회하지 않으므로 null이 들어온다 */
  wanderPools: WanderPools | null;
  memoryFigures: MemoryFigure[] | null;
  portraitFigures: PortraitFigure[] | null;
  gameLabels: Partial<Record<GameId, GameLabel>>;
  devMode: boolean;
}

export default function RestGameGrid({
  bgImagesDawn,
  bgImagesLabyrinth,
  suikodenCharactersPromise,
  suikodenDialoguesPromise,
  wanderPools,
  memoryFigures,
  portraitFigures,
  gameLabels,
  devMode,
}: Props) {
  const [activeGame, setActiveGame] = useState<GameId | null>(null);
  const visibleSections = REST_GAMES.filter((game) => devMode || !game.dev);

  useEffect(() => {
    const activateFromHash = () => {
      const hash = window.location.hash.slice(1) as GameId;
      setActiveGame(REST_GAMES.some((game) => game.valueKey === hash && (devMode || !game.dev)) ? hash : null);
    };
    const frame = window.requestAnimationFrame(activateFromHash);
    window.addEventListener("hashchange", activateFromHash);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", activateFromHash);
    };
  }, [devMode]);

  const openGame = (game: GameId) => {
    if (!visibleSections.some((section) => section.valueKey === game)) return;
    setActiveGame(game);
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${game}`);
  };

  const handleExit = () => {
    const index = visibleSections.findIndex((game) => game.valueKey === activeGame);
    setActiveGame(null);
    if (index >= 0) navigateToSection(hubSectionId(index, REST_GROUP_ID));
  };

  return (
    <>
      <div className="space-y-8 md:space-y-10">
        {visibleSections.map((game, index) => {
          const labels = gameLabels[game.valueKey];
          if (!labels) return null;
          return (
            <HubSection
              key={game.valueKey}
              title={labels.title}
              subtitle={labels.description}
              index={index}
              total={visibleSections.length}
              groupId={REST_GROUP_ID}
              hideDivider={index === 0}
            >
              <RestGameCard game={game} title={labels.title} onClick={() => openGame(game.valueKey)} />
            </HubSection>
          );
        })}
      </div>

      {devMode && activeGame === "troy" && (
        <TroySlot onExitFullScreenExternal={handleExit} />
      )}

      {activeGame === "dawn" && (
        <DawnGameWrapper bgImages={bgImagesDawn} initialFullScreen={true} onExitFullScreenExternal={handleExit} />
      )}
      
      {activeGame === "labyrinth" && (
        <LabyrinthGame bgImages={bgImagesLabyrinth} initialFullScreen={true} onExitFullScreenExternal={handleExit} />
      )}
      
      {activeGame === "hegemony" && (
        <HegemonyGame initialFullScreen={true} onExitFullScreenExternal={handleExit} />
      )}

      {devMode && activeGame === "suikoden" && (
        <SuikodenSlot
          charactersPromise={suikodenCharactersPromise}
          dialoguesPromise={suikodenDialoguesPromise}
          onExitFullScreenExternal={handleExit}
        />
      )}

      {activeGame === "wander" && wanderPools && (
        <WanderGame pools={wanderPools} initialFullScreen onExitFullScreenExternal={handleExit} />
      )}

      {activeGame === "memory" && memoryFigures && (
        <MemoryGame figures={memoryFigures} initialFullScreen={true} onExitFullScreenExternal={handleExit} />
      )}

      {activeGame === "portrait" && portraitFigures && (
        <PortraitGame figures={portraitFigures} initialFullScreen={true} onExitFullScreenExternal={handleExit} />
      )}
    </>
  );
}
