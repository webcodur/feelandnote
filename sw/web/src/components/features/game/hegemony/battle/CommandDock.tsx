/*
  파일명: components/features/game/hegemony/battle/CommandDock.tsx
  기능: 명령 고르기와 출전
  책임: 전투·책략·내정 세 단추에 고른 인물의 기본 효과를 미리 적고, 내정이면 불러올 인물을 고르게 한 뒤 출전한다.
*/
"use client";

import { useEffect, useRef } from "react";
import { Send } from "lucide-react";
import CelebAvatarImage from "@/components/ui/CelebAvatarImage";
import type { BattleCard, Command } from "@/lib/game/types";
import { COMMANDS } from "@/lib/game/types";
import { RULES, escalationOf } from "@/lib/game/hegemony/constants";
import { effectiveAptitude } from "@/lib/game/hegemony/aptitude";
import { pickRecovery } from "@/lib/game/hegemony/resolve";
import type { SideState } from "@/lib/game/hegemony/types";
import { useHegemonyText, type HegemonyText } from "../text";
import CommandSeal from "../ui/CommandSeal";
import GameButton from "../ui/GameButton";
import { COMMAND_TONE, FOCUS_RING, PANEL } from "../ui/tokens";

/** 출전 상자. 좁은 화면은 아래에 붙을 때 뒤 내용이 비치지 않도록 패널로 감싸고, 넓은 화면은 틀 없이 명령 칸 아래에 선다 */
const DEPLOY_BOX = `${PANEL} p-2 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none`;

interface Props {
  card: BattleCard | null;
  side: SideState;
  mandate: Command | null;
  round: number;
  command: Command | null;
  recoverId: string | null;
  enabled: boolean;
  onCommand: (command: Command) => void;
  onRecover: (cardId: string) => void;
  onDeploy: () => void;
  /** 출전 단추 글 — 아직 고를 것이 남았으면 그 안내를 대신 적는다 */
  deployLabel: string;
}

/** 고른 인물로 이 명령을 냈을 때의 기본 효과. 좁은 칸에서 "국력 +2 ·"처럼 구분점이 줄 끝에 매달리지 않게 항목마다 한 줄로 돌려준다 */
function preview(text: HegemonyText, card: BattleCard, cmd: Command, side: SideState, mandate: Command | null, round: number): string[] {
  const apt = effectiveAptitude(card, cmd, side, mandate).value;
  const hit = Math.round(Math.round(apt / RULES.offenseDivisor) * escalationOf(round));
  const healPower = Math.round(apt / RULES.governPowerDivisor);
  const healMorale = Math.round(apt / RULES.governMoraleDivisor);
  const heal = [
    healPower > 0 ? `${text.stat.power}\u00a0+${healPower}` : null,
    healMorale > 0 ? `${text.stat.morale}\u00a0+${healMorale}` : null,
  ].filter((line): line is string => line !== null);
  // 적성이 너무 낮아 0이 나오면 "−0" 대신 결과 패널과 같은 "효과 없음"으로 적는다
  const lines: Record<Command, () => string[]> = {
    assault: () => [hit > 0 ? text.outcome.dealtPower(hit) : text.outcome.nothing],
    stratagem: () => [hit > 0 ? text.outcome.dealtMorale(hit) : text.outcome.nothing],
    govern: () => (heal.length > 0 ? heal : [text.outcome.nothing]),
  };
  return lines[cmd]();
}

export default function CommandDock({ card, side, mandate, round, command, recoverId, enabled, onCommand, onRecover, onDeploy, deployLabel }: Props) {
  const text = useHegemonyText();
  const autoRecover = pickRecovery(side.used);
  const chosenRecover = recoverId ?? autoRecover?.id ?? null;
  const ready = enabled && !!card && !!command;
  const recallOpen = command === "govern" && side.used.length > 0;
  const boxRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // 좁은 화면에서 인물을 고르면 명령 칸에 효과가 채워지고, 내정을 고르면 불러올 인물 줄이 열린다. 화면이 낮으면
  // 둘 다 아래에 붙은 출전 상자 뒤에 일부가 가려지므로 명령 자리 전체가 보이는 데까지 내린다.
  // 원래 자리 끝이 붙은 상자보다 아래일 때(=붙어 있을 때)만 움직이고, 넓은 화면은 표시 자리가 숨어 있어(lg:hidden) 그대로다.
  // 높이 0인 표시 자리는 block "nearest"로는 움직이지 않아 "end"로 맞춘다
  const cardId = card?.id ?? null;
  useEffect(() => {
    const end = endRef.current;
    const box = boxRef.current;
    if ((!recallOpen && !cardId) || !end || !box) return;
    if (end.getBoundingClientRect().top <= box.getBoundingClientRect().bottom + 1) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    end.scrollIntoView({ block: "end", behavior: reduce ? "auto" : "smooth" });
  }, [recallOpen, cardId]);

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-1.5 lg:gap-2">
        {COMMANDS.map((cmd) => {
          const tone = COMMAND_TONE[cmd];
          const on = cmd === command;
          const isMandate = cmd === mandate;
          return (
            <button
              key={cmd}
              type="button"
              disabled={!enabled || !card}
              onClick={() => onCommand(cmd)}
              aria-pressed={on}
              className={`relative flex min-h-[88px] flex-col items-start gap-1 rounded-xl border p-2 text-start disabled:cursor-not-allowed disabled:opacity-50 lg:min-h-[100px] lg:p-2.5 lg:[@media(max-height:760px)]:min-h-[84px] ${FOCUS_RING} ${on ? `${tone.border} ${tone.soft} ring-1 ${tone.ring}` : "border-hg-line bg-hg-raised enabled:hover:border-hg-bright/40"}`}
            >
              <span className="flex w-full items-center gap-1.5">
                <CommandSeal command={cmd} size="sm" solid={on} />
                <span className={`text-sm font-black lg:text-base ${tone.text}`}>{text.command.name[cmd]}</span>
                {/* 1024~1279px는 명령 칸이 좁아 영어 이름(Scheme·Govern) 옆 단축키가 칸 밖으로 밀리므로 xl부터 적는다 */}
                <kbd className="ms-auto hidden rounded border border-hg-line px-1 text-xs font-bold uppercase text-text-tertiary xl:inline">{tone.key}</kbd>
              </span>
              <span className="text-sm font-semibold leading-snug text-text-primary">
                {!card && text.command.effect[cmd]}
                {card && preview(text, card, cmd, side, mandate, round).map((line) => <span key={line} className="block">{line}</span>)}
              </span>
              {cmd === "assault" && card && <span className="text-sm font-semibold leading-snug text-hg-enemy">{text.battle.cost(RULES.assaultMoraleCost)}</span>}
              {isMandate && (
                <span className="absolute -top-2 end-2 rounded-full bg-hg-mandate px-1.5 text-xs font-black text-hg-ink">{text.battle.mandate}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* xl은 불러올 인물 줄을 출전 단추 옆에 두어 내정을 골라도 손패 줄 높이가 그대로다.
          그보다 좁으면 상자를 만들지 않아(contents) 출전 단추가 명령 자리 전체 높이 안에서 아래에 붙는다 */}
      <div className="contents xl:flex xl:gap-2">
        {recallOpen && (
          <div className="flex items-center gap-2 rounded-xl border border-hg-govern/40 bg-hg-govern/10 px-2.5 py-1.5 xl:max-w-[58%] xl:py-1">
            <span className="shrink-0 text-sm font-bold text-hg-govern xl:hidden">{text.battle.recover}</span>
            <div className="flex shrink-0 gap-1.5 overflow-x-auto">
              {side.used.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onRecover(c.id)}
                  aria-pressed={c.id === chosenRecover}
                  title={c.nickname}
                  className={`relative size-9 shrink-0 overflow-hidden rounded-lg border-2 bg-hg-ink ${FOCUS_RING} ${c.id === chosenRecover ? "border-hg-govern" : "border-transparent opacity-60 hover:opacity-100"}`}
                >
                  {c.avatarUrl && <CelebAvatarImage src={c.avatarUrl} alt={c.nickname} className="object-cover object-top" />}
                </button>
              ))}
            </div>
            <span className="ms-auto hidden min-w-0 sm:block xl:ms-0">
              <span className="hidden text-sm font-bold leading-tight text-hg-govern xl:block">{text.battle.recover}</span>
              <span className="block truncate text-sm leading-tight text-text-primary">{side.used.find((c) => c.id === chosenRecover)?.nickname}</span>
            </span>
          </div>
        )}

        {/* 좁은 화면은 불러올 인물 줄이 열리면 출전 단추가 화면 밖으로 밀리므로 아래에 붙여 둔다.
            게임 화면 끝 아래 구석에 사이트 음악 단추(end-4·size-11)가 떠 있으므로, 좁은 화면은 양옆을 비운 가운데 단추로,
            넓은 화면은 끝만 비워 음악 단추가 출전 단추 옆에 나란히 서게 한다 */}
        <div ref={boxRef} className={`${DEPLOY_BOX} xl:min-w-0 xl:flex-1 ${enabled ? "sticky bottom-0 z-[2] lg:static" : ""}`}>
          <div className="mx-12 md:mx-9 lg:mx-0 lg:me-9">
            <GameButton variant="primary" size="lg" block disabled={!ready} hotkey={ready ? "Enter" : undefined} icon={ready ? <Send size={18} /> : undefined} onClick={onDeploy} className="lg:[@media(max-height:760px)]:h-12">
              {deployLabel}
            </GameButton>
          </div>
        </div>
        {/* 출전 상자의 원래 자리 끝. 불러올 인물 줄이 새로 열리면 여기까지 내려 두 줄이 함께 보이게 한다 */}
        <div ref={endRef} aria-hidden="true" className="-mt-2 h-0 scroll-mb-3 lg:hidden" />
      </div>
    </div>
  );
}
