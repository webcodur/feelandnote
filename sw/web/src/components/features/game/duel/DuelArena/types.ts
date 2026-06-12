import type { BattleCard, Command } from "@/lib/game/types";
import type { DuelAction } from "@/lib/game/duelEngine";

export interface DuelArenaProps {
  playerCard: BattleCard;
  aiCard: BattleCard;
  command: Command;
  vsAi?: boolean;
  onComplete: (winner: "player" | "ai" | "draw") => void;
}

export type IconComponent = React.FC<{ color: string; size?: number }>;

type ActionStyleConfig = {
  activeClass: string;
  color: string;
  glowColor: string;
  bgTint: string;
  borderColor: string;
};

export type ActionStyleMap = Record<DuelAction, ActionStyleConfig>;
