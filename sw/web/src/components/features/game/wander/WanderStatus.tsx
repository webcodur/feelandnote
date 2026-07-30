"use client";

import { Brain, HeartHandshake, Swords } from "lucide-react";
import { useTranslations } from "next-intl";
import Avatar from "@/components/ui/Avatar";
import { getBestReturnPlan } from "@/lib/game/wander/engine";
import { WANDER_ENCOUNTER_COUNT, WANDER_POWER_KEYS, WANDER_RETURN_THRESHOLD } from "@/lib/game/wander/constants";
import type { WanderState } from "@/lib/game/wander/types";

interface Props {
  state: WanderState;
  encounterNumber?: number;
}

const ICONS = { might: Swords, insight: Brain, support: HeartHandshake };

export default function WanderStatus({ state, encounterNumber }: Props) {
  const t = useTranslations("rest.arena.wander");
  const best = getBestReturnPlan(state);
  const progress = encounterNumber ?? (state.phase === "return" ? WANDER_ENCOUNTER_COUNT : state.round + 1);
  const readiness = Math.min(100, Math.round((best.score / WANDER_RETURN_THRESHOLD) * 100));
  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
      <div className="grid grid-cols-3 gap-2">
        {WANDER_POWER_KEYS.map((power) => {
          const Icon = ICONS[power];
          return (
            <div key={power} className="flex flex-col items-start gap-1 rounded-lg border border-white/10 bg-bg-main/80 p-2 sm:flex-row sm:items-center sm:gap-2 sm:p-3">
              <Icon className="h-4 w-4 shrink-0 text-accent" aria-hidden />
              <div>
                <span className="block text-sm text-text-secondary">{t(`powers.${power}.label`)}</span>
                <strong className="font-cinzel text-xl text-text-primary">{state.strengths[power]}</strong>
              </div>
            </div>
          );
        })}
      </div>
      <div className="rounded-lg border border-white/10 bg-bg-main/80 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="block text-sm text-text-secondary">{t("progress")}</span>
            <strong className="font-cinzel text-lg text-text-primary">{progress} / {WANDER_ENCOUNTER_COUNT}</strong>
          </div>
          <div className="text-end">
            <span className="block text-sm text-text-secondary">{t("bestReturn")}</span>
            <strong className={best.score >= WANDER_RETURN_THRESHOLD ? "font-cinzel text-lg text-watching" : "font-cinzel text-lg text-accent"}>
              {best.score} / {WANDER_RETURN_THRESHOLD}
            </strong>
          </div>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label={t("returnReadiness")} aria-valuenow={readiness} aria-valuemin={0} aria-valuemax={100}>
          <div className={best.score >= WANDER_RETURN_THRESHOLD ? "h-full bg-watching" : "h-full bg-accent"} style={{ width: `${readiness}%` }} />
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-sm text-text-secondary">{t(`plans.${best.plan}.label`)}</span>
          <div className="flex -space-x-2">
            {state.bonds.slice(-4).map((bond) => (
              <Avatar key={bond.figure.id} url={bond.figure.avatarUrl} name={bond.figure.name} size="sm" className="ring-bg-main" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
