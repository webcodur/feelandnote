"use client";

import { useState } from "react";
import { ArrowRight, Brain, HeartHandshake, Swords } from "lucide-react";
import { useTranslations } from "next-intl";
import { calculateReturnScore } from "@/lib/game/wander/engine";
import { WANDER_POWER_KEYS, WANDER_RETURN_THRESHOLD } from "@/lib/game/wander/constants";
import type { WanderPower, WanderState } from "@/lib/game/wander/types";
import WanderStatus from "./WanderStatus";

interface Props {
  state: WanderState;
  onReturn: (plan: WanderPower) => void;
}

const ICONS = { might: Swords, insight: Brain, support: HeartHandshake };

export default function WanderReturn({ state, onReturn }: Props) {
  const t = useTranslations("rest.arena.wander");
  const [selectedPlan, setSelectedPlan] = useState<WanderPower | null>(null);
  const selectedScore = selectedPlan ? calculateReturnScore(state, selectedPlan) : 0;
  return (
    <div className="mx-auto flex min-h-full w-full max-w-5xl flex-1 flex-col justify-center py-6">
      <WanderStatus state={state} />
      <div className="mt-6 text-center">
        <p className="font-cinzel text-sm font-bold tracking-[0.2em] text-accent">THE HOMECOMING</p>
        <h2 className="mt-2 font-serif text-3xl font-black text-text-primary sm:text-4xl">{t("returnTitle")}</h2>
        <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-text-secondary">{t("returnBody")}</p>
        <p className="mt-2 text-sm text-accent">{t("requiredScore", { score: WANDER_RETURN_THRESHOLD })}</p>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {WANDER_POWER_KEYS.map((power) => {
          const Icon = ICONS[power];
          const score = calculateReturnScore(state, power);
          const ready = score >= WANDER_RETURN_THRESHOLD;
          const active = selectedPlan === power;
          return (
            <button key={power} type="button" aria-pressed={active} onClick={() => setSelectedPlan(power)} className={active ? "rounded-2xl border border-accent bg-accent/10 p-5 text-start" : "rounded-2xl border border-white/15 bg-bg-main/85 p-5 text-start hover:border-accent/70 hover:bg-accent/10"}>
              <Icon className="h-7 w-7 text-accent" aria-hidden />
              <h3 className="mt-4 font-serif text-xl font-bold text-text-primary">{t(`plans.${power}.label`)}</h3>
              <p className="mt-2 text-sm leading-6 text-text-secondary">{t(`plans.${power}.description`)}</p>
              <div className="mt-5 flex items-end justify-between border-t border-white/10 pt-4">
                <span className="text-sm text-text-secondary">{t("decisionPower")}</span>
                <strong className={ready ? "font-cinzel text-2xl text-watching" : "font-cinzel text-2xl text-paused"}>{score}</strong>
              </div>
              <span className={ready ? "mt-2 block text-sm font-bold text-watching" : "mt-2 block text-sm font-bold text-paused"}>{ready ? t("ready") : t("notReady")}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-5 flex min-h-20 flex-col items-center justify-center rounded-xl border border-white/10 bg-bg-main/80 p-4 text-center">
        {!selectedPlan && <p className="text-sm text-text-secondary">{t("chooseReturnPlan")}</p>}
        {selectedPlan && (
          <>
            <p className="text-sm text-text-secondary">{t("confirmReturn", { plan: t(`plans.${selectedPlan}.label`), score: selectedScore })}</p>
            <button type="button" onClick={() => onReturn(selectedPlan)} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg border border-accent bg-accent px-6 py-2.5 font-serif font-bold text-bg-main hover:border-accent-hover hover:bg-accent-hover">
              {t("launchReturn")}<ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
