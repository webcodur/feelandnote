"use client";

import { ArrowRight, Brain, HeartHandshake, Swords } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { withParticle, type ParticleKind } from "@/lib/korean-particle";
import {
  WANDER_EVENT_FAVORS,
  WANDER_EVENT_KEYS,
  WANDER_POWER_KEYS,
  WANDER_TRADEOFFS,
} from "@/lib/game/wander/constants";
import type { WanderPower, WanderState } from "@/lib/game/wander/types";
import WanderFigureCard from "./WanderFigureCard";
import WanderStatus from "./WanderStatus";

interface Props {
  state: WanderState;
  pendingState: WanderState | null;
  onChoose: (power: WanderPower) => void;
  onContinue: () => void;
}

const ICONS = { might: Swords, insight: Brain, support: HeartHandshake };

function formatYear(year: number, beforeLabel: string): string {
  return year < 0 ? `${beforeLabel} ${Math.abs(year)}` : `${year}`;
}

function getAffinity(state: WanderState, power: WanderPower): "strong" | "steady" | "weak" {
  const figure = state.journey[state.round];
  if (!figure) return "steady";
  const ordered = WANDER_POWER_KEYS.map((key) => figure.powers[key]).sort((a, b) => b - a);
  if (figure.powers[power] === ordered[0]) return "strong";
  if (figure.powers[power] === ordered[ordered.length - 1]) return "weak";
  return "steady";
}

export default function WanderJourney({ state, pendingState, onChoose, onContinue }: Props) {
  const t = useTranslations("rest.arena.wander");
  const locale = useLocale();
  // 한국어 문구는 이름 받침에 따라 조사가 달라진다. 영어에는 조사가 없으므로 이름만 넣는다.
  const named = (name: string, kind: ParticleKind) => (locale === "ko" ? withParticle(name, kind) : name);
  const figure = state.journey[state.round];
  if (!figure) return null;
  const bond = pendingState?.bonds[pendingState.bonds.length - 1];
  const eventKey = WANDER_EVENT_KEYS[state.round];
  const lifespan = `${formatYear(figure.birthYear, t("beforeEra"))}–${formatYear(figure.deathYear, t("beforeEra"))}`;

  return (
    <div className="mx-auto w-full max-w-5xl py-3">
      <WanderStatus state={pendingState ?? state} encounterNumber={state.round + 1} />
      <div className="mt-4 rounded-xl border border-white/10 bg-bg-main/75 p-4 text-center">
        <p className="font-cinzel text-sm font-bold tracking-[0.16em] text-accent">{t(`events.${eventKey}.title`)}</p>
        <p className="mt-2 text-sm leading-6 text-text-secondary">{t(`events.${eventKey}.body`, { name: named(figure.name, "subject") })}</p>
      </div>
      <p className="mt-3 text-center font-serif text-lg text-text-primary">
        {t("encounter", { region: t(`regions.${figure.region}`), name: named(figure.name, "object") })}
      </p>
      <div className="mt-3">
        <WanderFigureCard figure={figure} regionLabel={t(`regions.${figure.region}`)} yearLabel={lifespan} />
      </div>

      {!pendingState && (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {WANDER_POWER_KEYS.map((power) => {
            const Icon = ICONS[power];
            const tradeoff = WANDER_TRADEOFFS[power];
            const favored = WANDER_EVENT_FAVORS[eventKey] === power;
            const affinity = getAffinity(state, power);
            return (
              <button key={power} type="button" onClick={() => onChoose(power)} className="rounded-xl border border-white/15 bg-bg-main/85 p-4 text-start hover:border-accent/70 hover:bg-accent/10">
                <span className="flex items-center gap-2 font-serif font-bold text-text-primary">
                  <Icon className="h-5 w-5 text-accent" aria-hidden />
                  {t(`events.${eventKey}.choices.${power}`)}
                </span>
                <span className="mt-2 block text-sm leading-6 text-text-secondary">{t(`choices.${power}.description`)}</span>
                <span className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/10 px-2 py-1 text-sm text-text-secondary">{t(`affinity.${affinity}`)}</span>
                  {favored && <span className="rounded-full border border-accent/40 bg-accent/10 px-2 py-1 text-sm font-bold text-accent">{t("eventAdvantage")}</span>}
                  <span className="rounded-full border border-paused/30 px-2 py-1 text-sm text-paused">
                    {t("tradeoff", { power: t(`powers.${tradeoff.power}.label`), amount: tradeoff.amount })}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {pendingState && bond && (
        <div className="mt-4 rounded-xl border border-accent/35 bg-accent/10 p-5 text-center">
          <p className="font-serif text-xl font-bold text-text-primary">{t(`outcomes.${bond.power}`, { name: named(bond.figure.name, "subject") })}</p>
          <p className="mt-2 text-sm text-text-secondary">{t("powerChanged", {
            power: t(`powers.${bond.power}.label`), gain: bond.gain,
            lostPower: t(`powers.${bond.penaltyPower}.label`), penalty: bond.penalty,
          })}</p>
          <button type="button" onClick={onContinue} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg border border-accent bg-accent px-6 py-2.5 font-serif font-bold text-bg-main hover:border-accent-hover hover:bg-accent-hover">
            {pendingState.phase === "return" ? t("returnHome") : t("nextJourney")}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
