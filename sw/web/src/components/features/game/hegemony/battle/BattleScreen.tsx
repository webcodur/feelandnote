/*
  파일명: components/features/game/hegemony/battle/BattleScreen.tsx
  기능: 대전 화면
  책임: 머리 표시줄·무대·예상 전과·상대 손패·내 손패·명령 자리를 배치하고, 단계별 패널과 단축키·효과음·대사를 잇는다.
*/
"use client";

import { useMemo } from "react";
import ClashArena from "@/components/features/game/duel/ClashArena";
import type { BattleCard, Command } from "@/lib/game/types";
import { aptitudeSet, captainEffectOf } from "@/lib/game/hegemony/aptitude";
import { DIFFICULTY_PROFILE, type Difficulty } from "@/lib/game/hegemony/constants";
import { forecastPlay } from "@/lib/game/hegemony/forecast";
import { verdictOf } from "@/lib/game/hegemony/resolve";
import { currentMandate, mirrorAptitudes } from "@/lib/game/hegemony/session/battleFlow";
import type { BattleState } from "@/lib/game/hegemony/session/types";
import type { SideOutcome, SideState } from "@/lib/game/hegemony/types";
import type { HegemonyGameApi } from "../hooks/useHegemonyGame";
import { useWideLayout } from "../hooks/useWideLayout";
import type { ScreenCommon } from "../screenTypes";
import { useHegemonyText } from "../text";
import { PANEL } from "../ui/tokens";
import Arena from "./Arena";
import BattleHud from "./BattleHud";
import BattleLog from "./BattleLog";
import BattleMenu from "./BattleMenu";
import CommandDock from "./CommandDock";
import EnemyHand from "./EnemyHand";
import ForecastPanel from "./ForecastPanel";
import OutcomeSummary from "./OutcomeSummary";
import { aptitudePair } from "./outcomeLines";
import PlayerHand from "./PlayerHand";
import { DuelOfferPanel, RecallPanel } from "./StepPanels";
import { useBattleFlow } from "./useBattleFlow";
import { useBattleHotkeys } from "./useBattleHotkeys";
import { useOutcomeCue } from "./useOutcomeCue";

interface Props extends ScreenCommon {
  battle: BattleState;
  difficulty: Difficulty;
  game: HegemonyGameApi;
  /** 효과음을 껐으면 일기토 미니게임 소리도 끈다 */
  sfxMuted: boolean;
}

/** 넓은 배치의 양옆 열. 아주 낮은 화면은 넘치는 열이 생기므로 끝을 흐리고 그만큼 여백을 둬 아래에 더 있음을 알린다 */
const SIDE_COLUMN = "flex min-h-0 flex-col gap-2 overflow-y-auto [@media(max-height:700px)]:pb-10 [@media(max-height:700px)]:clip-fade-end";

export default function BattleScreen({ battle, difficulty, game, sfx, say, hush, onInspect, speed, sfxMuted }: Props) {
  const text = useHegemonyText();
  const wide = useWideLayout();
  const hidden = !DIFFICULTY_PROFILE[difficulty].revealEnemy;
  const { player, ai, step, round, plays } = battle;
  const mandate = currentMandate(battle);
  const flow = useBattleFlow(battle, speed, sfx, game.revealDone);
  const planning = step === "plan";
  const last = battle.records[battle.records.length - 1] ?? null;
  const outcome = step === "outcome" && last?.round === round ? last : null;

  const cards = useMemo(() => new Map([...player.hand, ...player.used, ...ai.hand, ...ai.used].map((c) => [c.id, c] as [string, BattleCard])), [player, ai]);
  const nameOf = (id: string) => cards.get(id)?.nickname ?? "";
  const selected = flow.cardId ? player.hand.find((c) => c.id === flow.cardId) ?? null : null;
  const shownPlayer = plays ? cards.get(plays.player.cardId) ?? null : selected;
  const shownEnemy = plays ? cards.get(plays.ai.cardId) ?? null : null;
  const verdict = plays ? verdictOf(plays.player.command, plays.ai.command) : null;

  // 상대 인물 다섯 × 명령 셋만 돌리므로 매번 계산해도 가볍다
  const forecast = planning && selected && flow.command
    ? forecastPlay({ round, mandate, player, ai, play: { cardId: selected.id, command: flow.command } })
    : [];

  useOutcomeCue(outcome, cards, sfx, say);

  const chooseCard = (card: BattleCard | undefined) => {
    if (!planning || !card) return;
    sfx(card.id === flow.cardId ? "deselect" : "select");
    flow.selectCard(card.id === flow.cardId ? null : card.id);
  };
  const chooseCommand = (cmd: Command) => {
    if (!planning || !selected) return;
    sfx(cmd === mandate ? "mandate" : "command");
    flow.selectCommand(cmd);
  };
  const deploy = () => {
    if (!planning || !selected || !flow.command) return;
    game.lockIn({ cardId: selected.id, command: flow.command, recoverId: flow.command === "govern" ? flow.recoverId ?? undefined : undefined });
  };
  const next = () => {
    sfx("confirm");
    hush();
    game.nextRound();
  };
  const recall = (cardId: string) => {
    sfx("select");
    game.recall(cardId);
  };
  const acceptDuel = () => {
    sfx("confirm");
    game.acceptDuel();
  };
  useBattleHotkeys({
    step, hand: player.hand, recallOptions: battle.recallOptions, chooseCard, chooseCommand, deploy,
    skipReveal: game.revealDone, next, recall, acceptDuel, declineDuel: game.declineDuel,
  });

  // 무대 카드도 손패와 같은 적성을 보인다. 결산 뒤에는 손패가 바뀌므로 기록에 남은 주장 효과를 쓴다
  const stageApts = (card: BattleCard | null, side: SideState, recorded: SideOutcome | undefined) =>
    card ? aptitudeSet(card, recorded ? recorded.captain : captainEffectOf(card, side), mandate) : undefined;

  const mirror = step === "duelOffer" ? mirrorAptitudes(battle) : null;
  const duelApts = mirror ? { pair: aptitudePair(mirror.mine / 100, mirror.theirs / 100), tie: mirror.mine === mirror.theirs } : null;

  const planGuide = !selected ? text.battle.chooseCard : !flow.command ? text.battle.chooseCommand : text.battle.ready;
  // 따로 안내 줄을 두지 않고, 고를 것이 남았으면 출전 단추가 그 안내를 대신 보여 준다
  const deployLabel = planning && !(selected && flow.command) ? planGuide : text.battle.deploy;

  const hasOverlay = step === "recall" || !!duelApts || !!outcome;
  const overlay = hasOverlay && (
    <>
      {step === "recall" && <RecallPanel options={battle.recallOptions} onPick={(c) => recall(c.id)} />}
      {duelApts && <DuelOfferPanel mine={duelApts.pair[0]} theirs={duelApts.pair[1]} tie={duelApts.tie} onAccept={acceptDuel} onDecline={game.declineDuel} />}
      {outcome && <OutcomeSummary record={outcome} gameOver={!!battle.winner} nameOf={nameOf} onNext={next} />}
    </>
  );

  const arena = (
    <Arena
      playerCard={shownPlayer}
      playerCommand={plays?.player.command ?? flow.command}
      enemyCard={shownEnemy}
      enemyCommand={plays?.ai.command ?? null}
      stage={flow.stage}
      verdict={flow.stage >= 2 ? verdict : null}
      hideEnemyStats={hidden}
      captains={{ player: player.captainId, ai: ai.captainId }}
      aptitudes={{ player: stageApts(shownPlayer, player, outcome?.player), ai: stageApts(shownEnemy, ai, outcome?.ai) }}
      overlay={overlay}
      inlineOverlay={!wide}
      onSkip={step === "reveal" ? game.revealDone : undefined}
    />
  );
  const menu = <BattleMenu records={battle.records} nameOf={nameOf} duelsLeft={player.duelsLeft} onForfeit={game.forfeit} compact={!wide} />;

  return (
    // 좁은 화면의 아래 여백은 끝까지 내렸을 때 마지막 예상 전과 줄이 떠 있는 음악 단추 밑에 깔리지 않게 둔다
    <div className={`mx-auto flex w-full max-w-[1400px] flex-col gap-2.5 ${wide ? "h-full min-h-0" : "flex-1 pt-1 pb-14"}`}>
      <BattleHud round={round} mandates={battle.mandates} player={player} ai={ai} change={outcome?.change ?? null} cards={cards} />
      {!wide && (
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <EnemyHand side={ai} mandate={mandate} hidden={hidden} compact onInspect={hidden ? undefined : onInspect} />
          </div>
          {menu}
        </div>
      )}
      <div className={wide ? "grid min-h-0 flex-1 grid-cols-[288px_minmax(0,1fr)_248px] gap-4" : "flex flex-col gap-3"}>
        {wide && (
          <div className={SIDE_COLUMN}>
            {planning && <ForecastPanel rows={forecast} hidden={hidden} />}
            {!planning && (
              <section className={`${PANEL} p-3`}>
                <h3 className="mb-2 text-sm font-black text-hg-bright">{text.battle.log}</h3>
                <BattleLog records={battle.records.slice(-6)} nameOf={nameOf} compact />
              </section>
            )}
          </div>
        )}
        <div className={wide ? "min-h-0" : `flex flex-col ${hasOverlay ? "" : "h-[212px]"}`}>{arena}</div>
        {wide && (
          <div className={SIDE_COLUMN}>
            {menu}
            <EnemyHand side={ai} mandate={mandate} hidden={hidden} compact={false} onInspect={hidden ? undefined : onInspect} />
          </div>
        )}
      </div>
      <div className={wide ? "grid shrink-0 grid-cols-[minmax(0,720px)_minmax(360px,1fr)] items-end gap-4" : "flex flex-col gap-3"}>
        <PlayerHand side={player} mandate={mandate} selectedId={flow.cardId} activeCommand={flow.command} enabled={planning} onSelect={chooseCard} onInspect={onInspect} />
        <CommandDock
          card={selected}
          side={player}
          mandate={mandate}
          round={round}
          command={flow.command}
          recoverId={flow.recoverId}
          enabled={planning}
          onCommand={chooseCommand}
          onRecover={flow.selectRecover}
          onDeploy={deploy}
          deployLabel={deployLabel}
        />
      </div>
      {!wide && planning && forecast.length > 0 && <ForecastPanel rows={forecast} hidden={hidden} />}
      {step === "duel" && shownPlayer && shownEnemy && plays && (
        <ClashArena playerCard={shownPlayer} aiCard={shownEnemy} command={plays.player.command} muted={sfxMuted} onComplete={game.duelResult} />
      )}
    </div>
  );
}
