"use client";

import { Compass, Play, ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { WANDER_ENCOUNTER_COUNT, WANDER_ERAS } from "@/lib/game/wander/constants";
import type { WanderEra, WanderPools } from "@/lib/game/wander/types";

interface Props {
  pools: WanderPools;
  selectedEra: WanderEra;
  onEraChange: (era: WanderEra) => void;
  onStart: () => void;
}

export default function WanderSetup({ pools, selectedEra, onEraChange, onStart }: Props) {
  const t = useTranslations("rest.arena.wander");
  const canStart = pools[selectedEra].length >= WANDER_ENCOUNTER_COUNT;

  return (
    <div className="mx-auto flex min-h-full w-full max-w-5xl flex-1 flex-col items-center justify-center py-6 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-accent/30 bg-bg-main/80 text-accent shadow-glow">
        <Compass className="h-8 w-8" aria-hidden />
      </div>
      <p className="font-cinzel text-sm font-bold tracking-[0.2em] text-accent">WANDER · RETURN</p>
      <h2 className="mt-2 font-serif text-4xl font-black text-text-primary sm:text-5xl">{t("label")}</h2>
      <p className="mt-3 max-w-2xl text-base leading-7 text-text-secondary">{t("premise")}</p>

      <div className="mt-6 flex max-w-2xl items-start gap-3 rounded-xl border border-paused/30 bg-bg-main/75 p-4 text-start">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-paused" aria-hidden />
        <div>
          <strong className="font-serif text-text-primary">{t("objectiveTitle")}</strong>
          <p className="mt-1 text-sm leading-6 text-text-secondary">{t("objectiveBody")}</p>
        </div>
      </div>

      <fieldset className="mt-7 w-full">
        <legend className="mb-3 font-serif text-lg font-bold text-text-primary">{t("selectEra")}</legend>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {WANDER_ERAS.map((era) => {
            const active = era.key === selectedEra;
            const available = pools[era.key].length;
            return (
              <button
                key={era.key}
                type="button"
                aria-pressed={active}
                onClick={() => onEraChange(era.key)}
                className={[
                  "rounded-xl border p-4 text-start",
                  active
                    ? "border-accent bg-accent/10 text-text-primary"
                    : "border-white/10 bg-bg-main/70 text-text-secondary hover:border-accent/60 hover:bg-white/[0.05] hover:text-text-primary",
                ].join(" ")}
              >
                <span className="block font-serif font-bold">{t(`eras.${era.key}.label`)}</span>
                <span className="mt-1 block text-sm leading-5 text-text-secondary">{t(`eras.${era.key}.period`)}</span>
                <span className="mt-2 block text-sm text-accent">{t("available", { count: available })}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <button
        type="button"
        disabled={!canStart}
        onClick={onStart}
        className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-lg border border-accent bg-accent px-7 py-3 font-serif font-bold text-bg-main hover:border-accent-hover hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Play className="h-4 w-4 fill-current" aria-hidden />
        {t("start")}
      </button>
      {!canStart && <p className="mt-3 text-sm text-paused">{t("notEnoughFigures")}</p>}
    </div>
  );
}
