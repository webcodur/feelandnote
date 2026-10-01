/*
  파일명: components/features/game/hegemony/battle/BattleHud.tsx
  기능: 대전 머리 표시줄
  책임: 격투 게임처럼 시작 쪽 아군·끝 쪽 적군의 국력·민심 막대와 라운드·천명을 둔다.
        넓은 화면은 한 줄, 좁은 화면은 라운드 줄을 위로 올려 막대가 찌그러지지 않게 한다.
*/
"use client";

import { Crown } from "lucide-react";
import CelebAvatarImage from "@/components/ui/CelebAvatarImage";
import type { BattleCard, Command } from "@/lib/game/types";
import { RULES } from "@/lib/game/hegemony/constants";
import type { NationChange, Side, SideState } from "@/lib/game/hegemony/types";
import { useHegemonyText } from "../text";
import NationBar from "../ui/NationBar";
import { PANEL } from "../ui/tokens";
import { visibleChange } from "./outcomeLines";
import RoundTrack from "./RoundTrack";

interface Props {
  round: number;
  mandates: Command[];
  player: SideState;
  ai: SideState;
  /** 결과 단계에서만 넘겨 막대 옆에 변화량을 띄운다 */
  change: Record<Side, NationChange> | null;
  cards: Map<string, BattleCard>;
}

function NationBlock({ side, state, change, captain, round }: { side: Side; state: SideState; change: NationChange | null; captain?: BattleCard; round: number }) {
  const text = useHegemonyText();
  const enemy = side === "ai";
  const shown = change ? visibleChange(change, state.nation) : null;
  return (
    <div className={`flex min-w-0 flex-1 items-center gap-3 ${enemy ? "flex-row-reverse lg:order-3" : "lg:order-1"}`}>
      <span className={`relative hidden size-11 shrink-0 overflow-hidden rounded-xl border-2 bg-hg-ink sm:block ${enemy ? "border-hg-enemy/70" : "border-accent/70"}`}>
        {captain?.avatarUrl && <CelebAvatarImage src={captain.avatarUrl} alt={captain.nickname} className="object-cover object-top" />}
        <span className={`absolute bottom-0 end-0 flex size-4 items-center justify-center rounded-tl-md ${enemy ? "bg-hg-enemy" : "bg-accent"}`}>
          <Crown size={10} className="text-hg-ink" strokeWidth={3} />
        </span>
      </span>
      <div className="grid min-w-0 flex-1 gap-1">
        <NationBar label={text.battle.powerOf[side]} value={state.nation.power} max={RULES.maxPower} tone={enemy ? "enemy" : "player"} mirrored={enemy} delta={shown?.power ?? null} deltaKey={round} />
        <NationBar
          label={text.stat.morale}
          value={state.nation.morale}
          max={RULES.maxMorale}
          tone="morale"
          size="sm"
          mirrored={enemy}
          danger={state.nation.morale <= RULES.moraleDanger}
          dangerLabel={text.battle.danger}
          delta={shown?.morale ?? null}
          deltaKey={round}
        />
      </div>
    </div>
  );
}

/** 좁은 화면은 라운드·천명 줄 아래에 양쪽 막대를 나란히, 넓은 화면은 막대 사이에 라운드를 끼운 한 줄 */
export default function BattleHud({ round, mandates, player, ai, change, cards }: Props) {
  return (
    <div className={`${PANEL} grid grid-cols-2 gap-x-5 gap-y-2 px-3 py-2 lg:flex lg:items-center lg:gap-6 lg:px-4`}>
      <div className="col-span-2 lg:order-2 lg:shrink-0">
        <RoundTrack round={round} mandates={mandates} />
      </div>
      <NationBlock side="player" state={player} change={change?.player ?? null} captain={player.captainId ? cards.get(player.captainId) : undefined} round={round} />
      <NationBlock side="ai" state={ai} change={change?.ai ?? null} captain={ai.captainId ? cards.get(ai.captainId) : undefined} round={round} />
    </div>
  );
}
