"use client";

import { Home, RotateCcw, ShieldX, Trophy } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Avatar from "@/components/ui/Avatar";
import { withParticle } from "@/lib/korean-particle";
import type { WanderReturnResult, WanderState } from "@/lib/game/wander/types";

interface Props {
  state: WanderState;
  result: WanderReturnResult;
  onReplay: () => void;
  onExit: () => void;
}

export default function WanderResult({ state, result, onReplay, onExit }: Props) {
  const t = useTranslations("rest.arena.wander");
  const locale = useLocale();
  // 한국어 문구는 이름 받침에 따라 조사가 달라진다. 영어에는 조사가 없으므로 이름만 넣는다.
  const named = (name: string) => (locale === "ko" ? withParticle(name, "subject") : name);
  const ResultIcon = result.victory ? Trophy : ShieldX;
  const victoryBody = result.strongestBond
    ? t(`result.victoryBodies.${result.plan}`, { name: named(result.strongestBond.figure.name) })
    : t("result.victoryBody");
  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-1 flex-col items-center justify-center py-8 text-center">
      <div className={result.victory ? "flex h-20 w-20 items-center justify-center rounded-full border border-accent/40 bg-accent/10 text-accent shadow-glow" : "flex h-20 w-20 items-center justify-center rounded-full border border-paused/40 bg-paused/10 text-paused"}>
        <ResultIcon className="h-9 w-9" aria-hidden />
      </div>
      <p className="mt-5 font-cinzel text-sm font-bold tracking-[0.2em] text-accent">{t(`plans.${result.plan}.label`)}</p>
      <h2 className="mt-2 font-serif text-4xl font-black text-text-primary">{result.victory ? t("result.victoryTitle") : t("result.defeatTitle")}</h2>
      <p className="mt-3 max-w-2xl text-base leading-7 text-text-secondary">
        {result.victory ? victoryBody : t("result.defeatBody")}
      </p>
      {!result.victory && (
        <p className="mt-3 rounded-lg border border-accent/30 bg-accent/10 px-4 py-2 text-sm text-accent">
          {t("result.betterPlan", { plan: t(`plans.${result.bestPlan}.label`), score: result.bestScore })}
        </p>
      )}

      <div className="mt-7 grid w-full grid-cols-3 gap-3 rounded-xl border border-white/10 bg-bg-main/80 p-4">
        <div><span className="block text-sm text-text-secondary">{t("result.score")}</span><strong className="font-cinzel text-2xl text-text-primary">{result.score}</strong></div>
        <div><span className="block text-sm text-text-secondary">{t("result.required")}</span><strong className="font-cinzel text-2xl text-text-primary">{result.threshold}</strong></div>
        <div><span className="block text-sm text-text-secondary">{t("result.bonds")}</span><strong className="font-cinzel text-2xl text-text-primary">{state.bonds.length}</strong></div>
      </div>
      {result.strongestBond && <p className="mt-3 text-sm font-bold text-accent">{t("result.decidingBond", { name: result.strongestBond.figure.name })}</p>}

      <div className="mt-6 w-full rounded-xl border border-white/10 bg-bg-main/75 p-5 text-start">
        <h3 className="font-serif text-lg font-bold text-text-primary">{t("result.companions")}</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {state.bonds.map((bond) => (
            <div key={bond.figure.id} className="flex items-center gap-3 rounded-lg border border-white/10 p-3">
              <Avatar url={bond.figure.avatarUrl} name={bond.figure.name} size="md" />
              <div className="min-w-0">
                <strong className="block truncate text-sm text-text-primary">{bond.figure.name}</strong>
                <span className="block truncate text-sm text-text-secondary">{t(`events.${bond.event}.title`)} · {t(`bondRoles.${bond.power}`)}</span>
                <span className="block text-sm text-text-tertiary">{t("result.bondEffect", {
                  power: t(`powers.${bond.power}.label`), gain: bond.gain,
                  lostPower: t(`powers.${bond.penaltyPower}.label`), penalty: bond.penalty,
                })}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-7 flex w-full flex-col gap-3 sm:flex-row">
        <button type="button" onClick={onReplay} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.04] px-5 py-2.5 font-serif font-bold text-text-primary hover:border-accent/60 hover:bg-white/[0.08] hover:text-accent">
          <RotateCcw className="h-4 w-4" aria-hidden />{t("result.replay")}
        </button>
        <button type="button" onClick={onExit} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-accent bg-accent px-5 py-2.5 font-serif font-bold text-bg-main hover:border-accent-hover hover:bg-accent-hover">
          <Home className="h-4 w-4" aria-hidden />{t("result.exit")}
        </button>
      </div>
    </div>
  );
}
