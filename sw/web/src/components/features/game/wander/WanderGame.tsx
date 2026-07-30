"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import GameFullScreen, { type BreadcrumbItem } from "@/components/shared/GameFullScreen";
import { createWanderState, resolveEncounter, resolveReturn } from "@/lib/game/wander/engine";
import type { WanderEra, WanderPools, WanderPower, WanderReturnResult, WanderState } from "@/lib/game/wander/types";
import WanderBackground from "./WanderBackground";
import WanderJourney from "./WanderJourney";
import WanderResult from "./WanderResult";
import WanderReturn from "./WanderReturn";
import WanderSetup from "./WanderSetup";

interface Props {
  pools: WanderPools;
  initialFullScreen?: boolean;
  onExitFullScreenExternal?: () => void;
}

export default function WanderGame({ pools, initialFullScreen, onExitFullScreenExternal }: Props) {
  const t = useTranslations("rest.arena.wander");
  const tGame = useTranslations("shared.game");
  const [selectedEra, setSelectedEra] = useState<WanderEra>("revolution");
  const [state, setState] = useState<WanderState | null>(null);
  const [pendingState, setPendingState] = useState<WanderState | null>(null);
  const [result, setResult] = useState<WanderReturnResult | null>(null);

  const reset = () => {
    setState(null);
    setPendingState(null);
    setResult(null);
  };

  const start = () => {
    const next = createWanderState(selectedEra, pools[selectedEra]);
    if (next) setState(next);
  };

  const choose = (power: WanderPower) => {
    if (state) setPendingState(resolveEncounter(state, power));
  };

  const continueJourney = () => {
    if (!pendingState) return;
    setState(pendingState);
    setPendingState(null);
  };

  const returnHome = (plan: WanderPower) => {
    if (!state) return;
    setResult(resolveReturn(state, plan));
  };

  const phaseLabel = result ? t("breadcrumbs.result") : state?.phase === "return" ? t("breadcrumbs.return") : state ? t("breadcrumbs.journey") : "";
  const breadcrumbs = useMemo((): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [{ label: t("label"), onClick: reset }];
    if (phaseLabel) items.push({ label: phaseLabel });
    return items;
  }, [phaseLabel, t]);

  return (
    <GameFullScreen
      breadcrumbs={breadcrumbs}
      onHome={reset}
      onExitFullScreen={onExitFullScreenExternal}
      initialFullScreen={initialFullScreen}
      exitLabel={tGame("exit")}
      exitEscLabel={tGame("exitEsc")}
      background={<WanderBackground />}
    >
      {!state && (
        <WanderSetup pools={pools} selectedEra={selectedEra} onEraChange={setSelectedEra} onStart={start} />
      )}
      {state && state.phase === "journey" && !result && (
        <WanderJourney state={state} pendingState={pendingState} onChoose={choose} onContinue={continueJourney} />
      )}
      {state && state.phase === "return" && !result && (
        <WanderReturn state={state} onReturn={returnHome} />
      )}
      {state && result && (
        <WanderResult state={state} result={result} onReplay={reset} onExit={onExitFullScreenExternal ?? reset} />
      )}
    </GameFullScreen>
  );
}
