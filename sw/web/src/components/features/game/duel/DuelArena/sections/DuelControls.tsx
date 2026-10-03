/*
  파일명: components/features/game/duel/DuelArena/sections/DuelControls.tsx
  기능: 설전 조작 줄
  책임: 지난 합에서 서로 무엇을 냈고 어떻게 됐는지 두 줄로 적고, 그 아래 세 행동 단추를 둔다.
*/
"use client";

import { useTranslations } from "next-intl";
import type { Command } from "@/lib/game/types";
import type { DuelAction, DuelClashResult, DuelPhase } from "@/lib/game/duelEngine";
import { ACTION_ICONS } from "./ActionIcons";
import ActionButton from "./ActionButton";
import { INTRO_ACTION_COLOR } from "./ActionButton";
const ACTIONS = ["charge", "strike", "brace"] as const;

interface Props {
  command: Command;
  labels: Record<DuelAction, string>;
  phase: DuelPhase;
  lastClash: DuelClashResult | null;
  strikeDamage: number;
  /** 기세가 넉넉해 공격이 셀 때 */
  strikeReady: boolean;
  onAct: (action: DuelAction) => void;
}

export default function DuelControls({ command, labels, phase, lastClash, strikeDamage, strikeReady, onAct }: Props) {
  const t = useTranslations("shared.game.duel");
  const enabled = phase === "select";
  const sub: Record<DuelAction, string> = {
    charge: t("momentumGain"),
    strike: t("damage", { value: strikeDamage }),
    brace: t("halfDamage"),
  };
  return (
    <div className="shrink-0 px-4 pt-2 md:px-5">
      <div aria-live="polite" className="mb-3 flex min-h-12 flex-col items-center justify-center text-center">
        {lastClash && (
          <>
            <p className="text-sm font-bold">
              <span className={INTRO_ACTION_COLOR[lastClash.playerAction]}>{labels[lastClash.playerAction]}</span>
              <span className="mx-2 text-text-secondary">{t("vs")}</span>
              <span className={INTRO_ACTION_COLOR[lastClash.aiAction]}>{labels[lastClash.aiAction]}</span>
            </p>
            <p className="text-base leading-snug text-hg-bright">
              {t(`narrative.${lastClash.narrative}`, { damage: lastClash.playerDamage || lastClash.aiDamage })}
            </p>
          </>
        )}
        {!lastClash && phase !== "intro" && <p className="text-base text-text-secondary">{t("selectAction")}</p>}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {ACTIONS.map((action) => (
          <ActionButton
            key={action}
            action={action}
            label={labels[action]}
            sub={sub[action]}
            Icon={ACTION_ICONS[command][action]}

            canAct={enabled}
            highlight={enabled && action === "strike" && strikeReady}
            onClick={() => onAct(action)}
          />
        ))}
      </div>
    </div>
  );
}
