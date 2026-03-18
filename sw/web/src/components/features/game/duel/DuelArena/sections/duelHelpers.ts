/*
  애니메이션 변수, 포즈 매핑, 대사 선택 헬퍼
*/
import type { DuelAction } from "@/lib/game/duelEngine";
import type { FighterPose } from "../../DuelFighter";
import type { BattleCard, Command } from "@/lib/game/types";
import type { Locale } from "@/types/locale";
import defaultLinesData from "@/lib/game/voice/defaultLines";
import { stripEmotionTag } from "@/components/features/game/shared/hooks/useDialogue";

// ─── 포즈 매핑 ───

export function actionToPose(action: DuelAction, isHit: boolean): FighterPose {
  if (isHit) return "hit";
  switch (action) {
    case "charge": return "charge";
    case "strike": return "slash";
    case "brace": return "guard";
  }
}

// ─── 화면 흔들림 ───

export const shakeVariants = {
  idle: { x: 0 },
  shake: {
    x: [0, -4, 4, -3, 2, -1, 0],
    transition: { duration: 0.3, ease: "easeOut" as const },
  },
};

// ─── 대시 (공격 시 상대 방향으로 돌진) ───

// Player(하단좌) → 우상 방향 돌진
export const playerDashVariants = {
  idle: { x: 0, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
  dash: {
    x: [0, 60, 20],
    y: [0, -50, -15],
    transition: { duration: 0.35, ease: "easeOut" as const },
  },
  recoil: {
    x: [-20, 0],
    y: [10, 0],
    transition: { duration: 0.3, ease: "easeOut" as const },
  },
};

// AI(상단우) → 좌하 방향 돌진
export const aiDashVariants = {
  idle: { x: 0, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
  dash: {
    x: [0, -60, -20],
    y: [0, 50, 15],
    transition: { duration: 0.35, ease: "easeOut" as const },
  },
  recoil: {
    x: [20, 0],
    y: [-10, 0],
    transition: { duration: 0.3, ease: "easeOut" as const },
  },
};

export function poseToDash(pose: FighterPose): "idle" | "dash" | "recoil" {
  if (pose === "slash") return "dash";
  if (pose === "hit") return "recoil";
  return "idle";
}

// ─── 대사 선택 ───

export function pickDuelLine(card: BattleCard, action: DuelAction, command: Command, locale: Locale): string {
  // strike → 개인 clash_attack 우선
  if (action === "strike" && card.dialogueLines?.clash_attack) {
    const lines = card.dialogueLines.clash_attack;
    const raw = lines[Math.floor(Math.random() * lines.length)];
    if (raw) return stripEmotionTag(raw);
  }

  const isDebate = command === "stratagem";
  const keyMap: Record<DuelAction, string> = {
    charge: isDebate ? "duel_debate_charge" : "duel_charge",
    strike: isDebate ? "duel_debate_strike" : "duel_strike",
    brace: isDebate ? "duel_debate_brace" : "duel_brace",
  };

  const tone = card.speechTone;
  const lines = defaultLinesData[locale][keyMap[action]]?.[tone];
  if (lines?.length) return lines[Math.floor(Math.random() * lines.length)];
  return "";
}

/** idle/클릭 시 대사: answer → greeting 순으로 개인 대사 탐색, 없으면 defaultLines 폴백 */
export function pickIdleLine(card: BattleCard, locale: Locale): string {
  for (const type of ["roll_call", "greeting"] as const) {
    const personal = card.dialogueLines?.[type];
    if (personal) {
      const raw = personal[Math.floor(Math.random() * personal.length)];
      if (raw) return stripEmotionTag(raw);
    }
  }
  const fallback = defaultLinesData[locale]["greeting"]?.[card.speechTone];
  if (fallback?.length) return fallback[Math.floor(Math.random() * fallback.length)];
  return "";
}
