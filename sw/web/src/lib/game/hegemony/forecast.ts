/*
  파일명: lib/game/hegemony/forecast.ts
  기능: 예상 전과
  책임: 플레이어가 고른 출전으로 상대가 각 명령을 냈을 때 벌어질 결과의 범위를 미리 계산한다.
        실제 결산 함수를 그대로 돌리므로 주장·천명·격화·반란까지 반영된다.
*/

import type { Command } from "../types";
import { COMMANDS } from "../types";
import { effectiveAptitude } from "./aptitude";
import { pickRecovery, resolveRound, verdictOf } from "./resolve";
import type { Play, SideState, Verdict } from "./types";

export interface Range {
  min: number;
  max: number;
}

export interface ForecastRow {
  enemyCommand: Command;
  verdict: Verdict;
  /** 내 국가 변화 */
  myPower: Range;
  myMorale: Range;
  /** 상대 국가 변화 */
  enemyPower: Range;
  enemyMorale: Range;
  /** 이 경우 상대 국력이 0 이하가 되는 상대 인물 수 / 전체 */
  lethal: number;
  /** 이 경우 내 국력이 0 이하가 되는 상대 인물 수 */
  fatal: number;
  total: number;
  /** 같은 명령 접전에서 나보다 적성이 높은·같은·낮은 상대 인물 수 */
  mirror: { stronger: number; equal: number; weaker: number } | null;
}

export interface ForecastInput {
  round: number;
  mandate: Command | null;
  player: SideState;
  ai: SideState;
  play: Play;
}

const toRange = (values: number[]): Range => ({ min: Math.min(...values), max: Math.max(...values) });

export function forecastPlay({ round, mandate, player, ai, play }: ForecastInput): ForecastRow[] {
  const myCard = player.hand.find((c) => c.id === play.cardId);
  if (!myCard || ai.hand.length === 0) return [];
  const myApt = Math.round(effectiveAptitude(myCard, play.command, player, mandate).value * 100);
  const aiRecover = pickRecovery(ai.used)?.id;

  return COMMANDS.map((enemyCommand) => {
    const results = ai.hand.map((enemyCard) => {
      const aiPlay: Play = { cardId: enemyCard.id, command: enemyCommand, recoverId: enemyCommand === "govern" ? aiRecover : undefined };
      const r = resolveRound({ round, mandate, player, ai, playerPlay: play, aiPlay });
      const enemyApt = Math.round(effectiveAptitude(enemyCard, enemyCommand, ai, mandate).value * 100);
      return { r, enemyApt };
    });
    const verdict = verdictOf(play.command, enemyCommand);
    const isMirror = verdict === "draw";
    return {
      enemyCommand,
      verdict,
      myPower: toRange(results.map(({ r }) => r.record.change.player.power)),
      myMorale: toRange(results.map(({ r }) => r.record.change.player.morale)),
      enemyPower: toRange(results.map(({ r }) => r.record.change.ai.power)),
      enemyMorale: toRange(results.map(({ r }) => r.record.change.ai.morale)),
      lethal: results.filter(({ r }) => r.ai.nation.power <= 0).length,
      fatal: results.filter(({ r }) => r.player.nation.power <= 0).length,
      total: results.length,
      mirror: isMirror
        ? {
            stronger: results.filter(({ enemyApt }) => enemyApt > myApt).length,
            equal: results.filter(({ enemyApt }) => enemyApt === myApt).length,
            weaker: results.filter(({ enemyApt }) => enemyApt < myApt).length,
          }
        : null,
    };
  });
}
