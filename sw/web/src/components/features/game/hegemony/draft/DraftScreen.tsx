/*
  파일명: components/features/game/hegemony/draft/DraftScreen.tsx
  기능: 인재 선발 화면
  책임: 묶음 진행 박자(AI 고르기·묶음 넘김)를 잡고, 가운데 후보 셋과 양쪽 명단을 배치한다.
        두 번째 픽이 끝난 묶음은 잠깐 남겨 제외된 인물을 보여 준 뒤 다음 묶음으로 넘긴다.
*/
"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import {
  batchCards, currentBatchIndex, currentPicker, excludedIds, isDraftDone, picksOf, type DraftState,
} from "@/lib/game/hegemony/draft";
import type { Side } from "@/lib/game/hegemony/types";
import type { HegemonyGameApi } from "../hooks/useHegemonyGame";
import { useHotkeys } from "../hooks/useHotkeys";
import { useWideLayout } from "../hooks/useWideLayout";
import type { ScreenCommon } from "../screenTypes";
import { useHegemonyText } from "../text";
import GameButton from "../ui/GameButton";
import DraftCandidates from "./DraftCandidates";
import DraftHeader from "./DraftHeader";
import RosterPanel from "./RosterPanel";
import RosterStrip from "./RosterStrip";

const AI_THINK_MS = 800;
const BATCH_HOLD_MS = 1000;

interface Props extends ScreenCommon {
  draft: DraftState;
  game: HegemonyGameApi;
}

export default function DraftScreen({ draft, game, sfx, say, hush, onInspect, speed }: Props) {
  const text = useHegemonyText();
  const wide = useWideLayout();
  const batch = currentBatchIndex(draft);
  const done = isDraftDone(draft);
  const [shownBatch, setShownBatch] = useState(batch);
  const [shownDone, setShownDone] = useState(done);
  const holding = shownBatch !== batch || shownDone !== done;
  const picker = currentPicker(draft);
  const mine = picksOf(draft, "player");
  const theirs = picksOf(draft, "ai");
  const owner = useMemo(() => new Map(draft.picks.map((p) => [p.cardId, p.side] as [string, Side])), [draft.picks]);
  const excluded = useMemo(() => excludedIds(draft), [draft]);

  // 끝난 묶음을 잠깐 보여 준 뒤 넘긴다
  useEffect(() => {
    if (!holding) return;
    const id = setTimeout(() => {
      setShownBatch(batch);
      setShownDone(done);
    }, BATCH_HOLD_MS * speed);
    return () => clearTimeout(id);
  }, [holding, batch, done, speed]);

  // AI 차례면 잠깐 고민하는 척한 뒤 고른다
  const { aiPick } = game;
  useEffect(() => {
    if (holding || picker !== "ai") return;
    const id = setTimeout(() => {
      sfx("aiPick");
      aiPick();
    }, AI_THINK_MS * speed);
    return () => clearTimeout(id);
  }, [holding, picker, aiPick, sfx, speed]);

  const canPick = !holding && picker === "player";
  const shownCards = batchCards(draft, shownBatch);
  const pickCard = (index: number) => {
    const card = shownCards[index];
    if (!canPick || !card || owner.has(card.id) || excluded.has(card.id)) return;
    sfx("pick");
    say(card, "greeting");
    game.pick(card.id);
  };
  // 선발 인사말이 주장 임명 화면까지 남아 임명 단추를 가리지 않게 넘어가면서 거둔다
  const finish = () => {
    sfx("draftDone");
    hush();
    game.confirmDraft();
  };
  useHotkeys({ "1": () => pickCard(0), "2": () => pickCard(1), "3": () => pickCard(2), Enter: () => shownDone && finish() });

  const turn: Side | "done" | "wait" = shownDone ? "done" : holding ? "wait" : (picker ?? "done");
  const firstPicker = draft.order[shownBatch * 2] ?? null;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 py-2 lg:gap-6">
      <DraftHeader
        batch={shownBatch}
        turn={turn}
        firstPicker={firstPicker}
        canReshuffle={draft.picks.length === 0}
        onReshuffle={() => {
          sfx("reshuffle");
          void game.reshuffle();
        }}
        onAuto={() => {
          sfx("confirm");
          game.autoDraft();
        }}
      />
      <div className="grid items-start gap-4 lg:flex-1 lg:grid-cols-[260px_minmax(0,1fr)_260px] lg:gap-6">
        {wide && <RosterPanel side="player" title={text.draft.mine} cards={mine} active={turn === "player"} onInspect={onInspect} />}
        <div className="flex flex-col items-center justify-center gap-4 lg:gap-5 lg:self-stretch">
          {!shownDone && <p className="max-w-xl text-center text-sm text-text-secondary">{text.draft.guide}</p>}
          <div className="w-full max-w-4xl">
            <DraftCandidates
              batch={shownBatch}
              cards={shownCards}
              owner={owner}
              excluded={excluded}
              mine={mine}
              canPick={canPick}
              onPick={(card) => pickCard(shownCards.indexOf(card))}
              onInspect={onInspect}
            />
          </div>
          {shownDone && (
            <GameButton variant="primary" size="lg" hotkey="Enter" onClick={finish} icon={<ArrowRight size={20} />}>
              {text.draft.next}
            </GameButton>
          )}
        </div>
        {wide && <RosterPanel side="ai" title={text.draft.theirs} cards={theirs} active={turn === "ai"} onInspect={onInspect} />}
      </div>
      {!wide && (
        <div className="grid grid-cols-2 gap-2">
          <RosterStrip side="player" title={text.draft.mine} cards={mine} />
          <RosterStrip side="ai" title={text.draft.theirs} cards={theirs} />
        </div>
      )}
    </div>
  );
}
