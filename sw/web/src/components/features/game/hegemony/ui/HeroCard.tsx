/*
  파일명: components/features/game/hegemony/ui/HeroCard.tsx
  기능: 인물 카드
  책임: 초상·이름·명령별 적성을 한 장에 담는다. 선발·주장·손패·전장·결과가 모두 이 카드를 쓴다.
        카드 폭은 부모가 정하고, 좁아지면(컨테이너 쿼리) 직함과 도장 글자를 접는다.
*/
"use client";

import { Crown, Info } from "lucide-react";
import CelebAvatarImage from "@/components/ui/CelebAvatarImage";
import type { BattleCard, Command } from "@/lib/game/types";
import { COMMANDS } from "@/lib/game/types";
import { baseAptitude, bestCommandOf, displayAptitude } from "@/lib/game/hegemony/aptitude";
import { useHegemonyText } from "../text";
import { COMMAND_TONE, FOCUS_RING } from "./tokens";

export type CardTagTone = "enemy" | "muted" | "accent";

const TAG_TONE: Record<CardTagTone, string> = {
  enemy: "bg-hg-enemy text-hg-ink",
  muted: "bg-hg-line text-text-primary",
  accent: "bg-accent text-hg-ink",
};

interface Props {
  card: BattleCard;
  selected?: boolean;
  disabled?: boolean;
  /** 쉬는 중·제외처럼 흐리게 보일 때 */
  dimmed?: boolean;
  tag?: { label: string; tone: CardTagTone } | null;
  captain?: boolean;
  /** 적성을 가린다 (어려움의 상대 카드) */
  hideStats?: boolean;
  /** 이 명령의 적성 칸을 강조한다 */
  activeCommand?: Command | null;
  /** 주장·천명 보정이 들어간 적성. 없으면 기본 적성 */
  aptitudes?: Partial<Record<Command, number>>;
  showTitle?: boolean;
  /** 넓고 낮은 화면(노트북)에서 초상을 5:4로 낮춰 손패 줄·주장 화면이 한 화면에 들어가게 한다 */
  lowPortrait?: boolean;
  hotkey?: string;
  onSelect?: () => void;
  onInspect?: () => void;
  selectLabel?: string;
}

function StatChip({ command, value, state }: { command: Command; value: string; state: "active" | "best" | "idle" | "off" }) {
  const text = useHegemonyText();
  const tone = COMMAND_TONE[command];
  const Icon = tone.icon;
  const look = {
    active: `${tone.fill} text-hg-ink`,
    best: `${tone.soft} ${tone.text} ring-1 ring-inset ${tone.ringSoft}`,
    idle: `bg-hg-line/50 ${tone.text}`,
    off: "bg-hg-line/30 text-text-tertiary",
  }[state];
  return (
    <span className={`flex items-center justify-center gap-0.5 rounded-md py-0.5 text-xs font-bold tabular-nums leading-4 @min-[140px]:py-1 @min-[140px]:text-sm ${look}`}>
      <Icon size={12} aria-hidden className="hidden shrink-0 @min-[104px]:inline" />
      <span className="sr-only">{text.command.name[command]} </span>
      {value}
    </span>
  );
}

export default function HeroCard({
  card, selected = false, disabled = false, dimmed = false, tag = null, captain = false, hideStats = false,
  activeCommand = null, aptitudes, showTitle = true, lowPortrait = false, hotkey, onSelect, onInspect, selectLabel,
}: Props) {
  const text = useHegemonyText();
  const best = bestCommandOf(card);
  const interactive = !!onSelect && !disabled;
  const frame = selected
    ? "border-accent ring-2 ring-accent shadow-lg shadow-accent/30"
    : interactive
      ? "border-hg-line hover:border-accent/70"
      : "border-hg-line";
  const value = (cmd: Command) => (hideStats ? "?" : String(displayAptitude(aptitudes?.[cmd] ?? baseAptitude(card, cmd))));
  const chipState = (cmd: Command) =>
    hideStats ? "off" : activeCommand ? (cmd === activeCommand ? "active" : "off") : cmd === best ? "best" : "idle";

  return (
    <div className={`@container relative w-full ${dimmed ? "opacity-45 grayscale" : ""}`}>
      <button
        type="button"
        onClick={interactive ? onSelect : undefined}
        disabled={!interactive}
        aria-pressed={onSelect ? selected : undefined}
        aria-label={selectLabel ?? card.nickname}
        className={`group relative flex w-full flex-col overflow-hidden rounded-xl border bg-hg-raised text-start ${FOCUS_RING} ${frame} ${interactive ? "cursor-pointer" : "cursor-default"}`}
      >
        <span className={`relative block aspect-square w-full overflow-hidden bg-hg-ink ${lowPortrait ? "lg:[@media(max-height:760px)]:aspect-[5/4]" : ""}`}>
          {card.avatarUrl && <CelebAvatarImage src={card.avatarUrl} alt="" className="object-cover object-top" />}
          {!card.avatarUrl && (
            <span className="flex size-full items-center justify-center text-3xl font-black text-text-tertiary">{card.nickname.slice(0, 1)}</span>
          )}
          <span className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-linear-to-t from-hg-raised to-transparent" />
          {captain && (
            <span className="absolute start-1.5 top-1.5 flex items-center gap-1 rounded-full bg-accent px-1.5 py-0.5 text-xs font-bold text-hg-ink">
              <Crown size={12} strokeWidth={2.5} />
              <span className="hidden @min-[120px]:inline">{text.stat.captain}</span>
            </span>
          )}
          {hotkey && (
            <span className="absolute bottom-5 end-1.5 hidden rounded border border-hg-line bg-hg-ink/80 px-1 text-xs font-bold text-text-secondary lg:block">
              {hotkey}
            </span>
          )}
        </span>
        <span className="relative -mt-4 flex flex-col gap-1.5 px-1.5 pb-1.5 @min-[140px]:px-2.5 @min-[140px]:pb-2.5">
          <span className="block min-w-0">
            <span className="block truncate text-xs font-bold text-hg-bright @min-[120px]:text-sm @min-[180px]:text-base">{card.nickname}</span>
            {showTitle && card.title && (
              <span className="hidden truncate text-xs text-text-secondary @min-[130px]:block @min-[180px]:text-sm">{card.title}</span>
            )}
          </span>
          <span className="grid grid-cols-3 gap-1">
            {COMMANDS.map((cmd) => (
              <StatChip key={cmd} command={cmd} value={value(cmd)} state={chipState(cmd)} />
            ))}
          </span>
        </span>
      </button>
      {tag && (
        <span className={`pointer-events-none absolute end-1.5 top-1.5 rounded-full px-2 py-0.5 text-xs font-bold ${TAG_TONE[tag.tone]}`}>
          {tag.label}
        </span>
      )}
      {onInspect && !tag && (
        <button
          type="button"
          onClick={onInspect}
          aria-label={text.draft.detail}
          className={`absolute end-1 top-1 flex size-6 items-center justify-center rounded-full border border-hg-line bg-hg-ink/75 text-text-secondary hover:border-accent hover:text-accent @min-[120px]:end-1.5 @min-[120px]:top-1.5 @min-[120px]:size-7 ${FOCUS_RING}`}
        >
          <Info size={14} />
        </button>
      )}
    </div>
  );
}
