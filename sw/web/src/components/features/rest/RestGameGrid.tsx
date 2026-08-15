"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Clock, Crosshair, Footprints, Swords, Crown } from "lucide-react";
import HubCard from "@/components/shared/HubCard";
import { Z_INDEX } from "@/constants/zIndex";
import type { GameBackgroundImages } from "@/lib/getGameBackgroundImages";
import type { GameCharacter } from "@/lib/game/suikoden/types";
import type { WanderPools } from "@/lib/game/wander/types";
import type { DialoguesMap } from "@/components/features/game/suikoden/SuikodenGameWrapper";
import SuikodenSlot from "./SuikodenSlot";
import { Brain, ScanFace } from "lucide-react";
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
const HegemonyGame = dynamic(() => import("@/components/features/game/battle/HegemonyGame"), { loading: GameLoadingScreen });
const WanderGame = dynamic(() => import("@/components/features/game/wander/WanderGame"), { loading: GameLoadingScreen });
const MemoryGame = dynamic(() => import("@/components/features/game/memory/MemoryGame"), { loading: GameLoadingScreen });
const PortraitGame = dynamic(() => import("@/components/features/game/portrait/PortraitGame"), { loading: GameLoadingScreen });

export type GameId = "dawn" | "labyrinth" | "hegemony" | "suikoden" | "wander" | "memory" | "portrait";

// image: 각 게임 로비 캔버스 광경을 정지 회화로 옮긴 카드 배경 (docs/games/card-images.md)
// dev: true — 미공개 게임. 개발자 모드에서만 카드를 띄운다.
const GAME_SECTIONS = [
  { valueKey: "dawn" as const, label: "DAWN", icon: Clock, image: "/images/games/dawn-card.webp", dev: false },
  { valueKey: "labyrinth" as const, label: "LABYRINTH", icon: Crosshair, image: "/images/games/labyrinth-card.webp", dev: false },
  { valueKey: "hegemony" as const, label: "HEGEMONY", icon: Swords, image: "/images/games/hegemony-card.webp", dev: false },
  { valueKey: "suikoden" as const, label: "CHEONDO", icon: Crown, image: "/images/games/suikoden-card.webp", dev: false },
  { valueKey: "wander" as const, label: "WANDER", icon: Footprints, image: "/images/games/wander-card.webp", dev: true }, // i18n-audit-ignore -- 공식 영문 게임명
  { valueKey: "memory" as const, label: "MEMORY", icon: Brain, image: "/images/games/memory-card.webp", dev: true }, // i18n-audit-ignore -- 공식 영문 게임명
  // 시대의 초상은 기억 게임 카드 그림을 함께 쓴다 (docs/games/card-images.md §5)
  { valueKey: "portrait" as const, label: "PORTRAITS IN TIME", icon: ScanFace, image: "/images/games/memory-card.webp", dev: true }, // i18n-audit-ignore -- 공식 영문 게임명
] as const;

interface GameLabel {
  title: string;
  description: string;
}

interface Props {
  bgImagesDawn: GameBackgroundImages | null;
  bgImagesLabyrinth: GameBackgroundImages | null;
  bgImagesHegemony: GameBackgroundImages | null;
  /** 카드 격자를 붙잡지 않도록 기다리지 않고 넘겨받는다 — 실제로 천도 카드를 열 때 SuikodenSlot이 기다린다 */
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
  bgImagesHegemony,
  suikodenCharactersPromise,
  suikodenDialoguesPromise,
  wanderPools,
  memoryFigures,
  portraitFigures,
  gameLabels,
  devMode,
}: Props) {
  const t = useTranslations("rest.arena");
  const [activeGame, setActiveGame] = useState<GameId | null>(null);
  const visibleSections = GAME_SECTIONS.filter((game) => devMode || !game.dev);

  useEffect(() => {
    const activateFromHash = () => {
      const hash = window.location.hash.slice(1) as GameId;
      if (GAME_SECTIONS.some((game) => game.valueKey === hash && (devMode || !game.dev))) setActiveGame(hash);
    };
    const frame = window.requestAnimationFrame(activateFromHash);
    window.addEventListener("hashchange", activateFromHash);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", activateFromHash);
    };
  }, [devMode]);

  const openGame = (game: GameId) => {
    setActiveGame(game);
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${game}`);
  };

  const handleExit = () => {
    setActiveGame(null);
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {visibleSections.map((game) => {
          const Icon = game.icon;
          const labels = gameLabels[game.valueKey];
          if (!labels) return null;
          return (
            <HubCard
              key={game.valueKey}
              id={game.valueKey}
              onClick={() => openGame(game.valueKey)}
              title={labels.title}
              description={labels.description}
              label={game.dev ? `${game.label} · ${t("inDevelopment")}` : game.label}
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
