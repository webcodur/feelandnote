/*
  파일명: components/features/game/hegemony/battle/EnemyHand.tsx
  기능: 상대 손패
  책임: 상대가 낼 수 있는 인물과 쉬는 인물을 보여 준다. 어려움에서는 적성을 가린다.
        넓은 화면은 세로 목록, 좁은 화면은 얼굴 한 줄로 줄인다.
*/
"use client";

import { Crown } from "lucide-react";
import CelebAvatarImage from "@/components/ui/CelebAvatarImage";
import type { BattleCard, Command } from "@/lib/game/types";
import { COMMANDS } from "@/lib/game/types";
import { displayAptitude, effectiveAptitude } from "@/lib/game/hegemony/aptitude";
import type { SideState } from "@/lib/game/hegemony/types";
import { useHegemonyText } from "../text";
import { COMMAND_TONE, FOCUS_RING, PANEL } from "../ui/tokens";

interface Props {
  side: SideState;
  mandate: Command | null;
  hidden: boolean;
  compact: boolean;
  /** 어려움에서는 상세 창도 열지 않는다 */
  onInspect?: (cardId: string) => void;
}

function Row({ card, side, mandate, hidden, resting, onInspect }: { card: BattleCard; side: SideState; mandate: Command | null; hidden: boolean; resting: boolean; onInspect?: () => void }) {
  const text = useHegemonyText();
  return (
    <button
      type="button"
      onClick={onInspect}
      disabled={!onInspect}
      className={`flex w-full items-center gap-2 rounded-xl border border-hg-line/60 bg-hg-raised/80 px-1.5 py-1 text-start enabled:hover:border-hg-enemy/60 ${FOCUS_RING} ${resting ? "opacity-45 grayscale" : ""}`}
    >
      {/* 어려움은 적성 줄이 없어 이름 한 줄에 맞춰 얼굴도 줄인다 */}
      <span className={`relative shrink-0 overflow-hidden rounded-lg bg-hg-ink ${hidden ? "size-8" : "size-9"}`}>
        {card.avatarUrl && <CelebAvatarImage src={card.avatarUrl} alt="" className="object-cover object-top" />}
        {card.id === side.captainId && (
          <span className="absolute start-0 top-0 flex size-4 items-center justify-center rounded-br-md bg-hg-enemy">
            <Crown size={10} strokeWidth={3} className="text-hg-ink" />
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-sm font-bold text-hg-bright">{card.nickname}</span>
          {resting && <span className="ms-auto shrink-0 text-sm font-semibold text-text-secondary">{text.battle.resting}</span>}
        </span>
        {!resting && !hidden && (
          <span className="mt-0.5 flex gap-1.5">
            {COMMANDS.map((cmd) => (
              <span key={cmd} className={`text-sm font-bold tabular-nums ${COMMAND_TONE[cmd].text}`}>
                {text.command.seal[cmd]}
                {displayAptitude(effectiveAptitude(card, cmd, side, mandate).value)}
              </span>
            ))}
          </span>
        )}
      </span>
    </button>
  );
}

export default function EnemyHand({ side, mandate, hidden, compact, onInspect }: Props) {
  const text = useHegemonyText();
  const all = [...side.hand.map((c) => ({ card: c, resting: false })), ...side.used.map((c) => ({ card: c, resting: true }))];

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-sm font-black text-hg-enemy">{text.battle.enemyHand}</span>
        <div className="flex gap-1.5 overflow-x-auto">
          {all.map(({ card, resting }) => (
            <button key={card.id} type="button" disabled={!onInspect} onClick={() => onInspect?.(card.id)} className={`relative size-10 shrink-0 overflow-hidden rounded-lg border border-hg-enemy/50 bg-hg-ink ${FOCUS_RING} ${resting ? "opacity-40 grayscale" : ""}`}>
              {card.avatarUrl && <CelebAvatarImage src={card.avatarUrl} alt={card.nickname} className="object-cover object-top" />}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <aside className={`${PANEL} flex flex-col gap-1.5 p-2.5`}>
      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-black text-hg-enemy">{text.draft.theirs}</span>
        <span className="text-sm font-bold text-text-secondary">
          {text.stat.hand} {side.hand.length} · {text.stat.used} {side.used.length}
        </span>
      </div>
      {hidden && <p className="px-1 text-sm text-text-secondary">{text.battle.hidden}</p>}
      {all.map(({ card, resting }) => (
        <Row key={card.id} card={card} side={side} mandate={mandate} hidden={hidden} resting={resting} onInspect={onInspect ? () => onInspect(card.id) : undefined} />
      ))}
    </aside>
  );
}
