/*
  파일명: components/features/game/hegemony/battle/outcomeLines.ts
  기능: 라운드 결과 문장
  책임: 구조화된 라운드 기록(SideOutcome·NationChange)을 화면에 적을 짧은 줄로 바꾼다.
        결과 패널·전황 기록·결과 화면이 같은 문장을 쓴다.
*/

import type { DuelWinner, Nation, NationChange, RoundRecord, Side, SideOutcome, Verdict } from "@/lib/game/hegemony/types";
import type { HegemonyText } from "../text";

export type LineTone = "good" | "bad" | "neutral" | "alert";

export interface OutcomeLine {
  text: string;
  tone: LineTone;
}

export function sideLines(text: HegemonyText, out: SideOutcome, change: NationChange, nameOf: (id: string) => string): OutcomeLine[] {
  const o = text.outcome;
  const lines: OutcomeLine[] = [];
  const nothing: OutcomeLine = { text: o.nothing, tone: "neutral" };
  // 회복은 국력·민심을 한 줄에 " · "로 이으면 좁은 칸에서 점이 줄 끝에 매달려 항목마다 한 줄로 적는다
  const healParts: (OutcomeLine | false)[] = [
    out.healedPower > 0 && { text: o.healedPower(out.healedPower), tone: "good" },
    out.healedMorale > 0 && { text: o.healedMorale(out.healedMorale), tone: "good" },
  ];
  const heal = healParts.filter((line): line is OutcomeLine => line !== false);
  const main: Record<SideOutcome["command"], OutcomeLine[]> = {
    assault: [out.dealtPower > 0 ? { text: o.dealtPower(out.dealtPower), tone: "good" } : nothing],
    stratagem: [out.dealtMorale > 0 ? { text: o.dealtMorale(out.dealtMorale), tone: "good" } : nothing],
    govern: heal.length > 0 ? heal : [nothing],
  };
  lines.push(...main[out.command]);
  if (out.moraleCost > 0) lines.push({ text: o.cost(out.moraleCost), tone: "bad" });
  if (out.recoveredId) lines.push({ text: o.recovered(nameOf(out.recoveredId)), tone: "neutral" });
  if (out.consumed) lines.push({ text: o.resting(nameOf(out.cardId)), tone: "neutral" });
  if (change.overflow > 0) lines.push({ text: o.overflow(change.overflow), tone: "alert" });
  if (change.rebellion > 0) lines.push({ text: o.rebellion(change.rebellion), tone: "alert" });
  return lines;
}

export function recordLines(text: HegemonyText, record: RoundRecord, side: Side, nameOf: (id: string) => string): OutcomeLine[] {
  return sideLines(text, record[side], record.change[side], nameOf);
}

/** 두 적성을 화면에 적을 값으로 바꾼다. 반올림하면 같아지는 서로 다른 값은 갈리는 자리까지 적어 "7 대 7로 밀린다"가 나오지 않게 한다 */
export function aptitudePair(mine: number, theirs: number): [number, number] {
  if (mine === theirs) return [Math.round(mine), Math.round(theirs)];
  const digits = [0, 1, 2].find((d) => Math.round(mine * 10 ** d) !== Math.round(theirs * 10 ** d)) ?? 2;
  const f = 10 ** digits;
  return [Math.round(mine * f) / f, Math.round(theirs * f) / f];
}

/** 맞대결(같은 명령)·일기토 설명 한 줄 */
export function mirrorNote(text: HegemonyText, record: RoundRecord): string | null {
  const v = text.verdict;
  const [mine, theirs] = aptitudePair(record.player.aptitude, record.ai.aptitude);
  if (record.mirror === "duel") return v.duelNote(mine, theirs);
  if (record.mirror === "tie") return v.mirrorTie;
  if (record.mirror === "aptitude") return v.mirrorAptitude(mine, theirs);
  return null;
}

/** 이 라운드를 누가 가져갔는가 (플레이어 관점). 같은 명령이면 적성 판정·일기토 결과로 가른다 */
export function roundTaker(record: RoundRecord): Verdict {
  if (record.verdict !== "draw") return record.verdict;
  const duel: Record<DuelWinner, Verdict> = { player: "win", ai: "lose", draw: "draw" };
  if (record.mirror === "duel" && record.duelWinner) return duel[record.duelWinner];
  if (record.mirror === "aptitude") return record.player.aptitude > record.ai.aptitude ? "win" : "lose";
  return "draw";
}

/** 판정 딱지: 상성이면 우세·열세, 같은 명령이면 판정승·판정패·일기토 결과 */
export function roundBadge(text: HegemonyText, record: RoundRecord, long: boolean): { label: string; tone: Verdict } {
  const tone = roundTaker(record);
  if (record.verdict !== "draw") return { label: long ? text.verdict.name[record.verdict] : text.verdict.short[record.verdict], tone };
  return { label: text.verdict.taken[record.mirror === "duel" ? "duel" : "mirror"][tone], tone };
}

/** 화면에 보이는 변화량. 국력은 0 아래로 내려가도 0으로 보이므로, 0 밑으로 넘친 피해는 세지 않는다 */
export function visibleChange(change: NationChange, after: Nation): Nation {
  const shown = (value: number, delta: number) => Math.max(0, value) - Math.max(0, value - delta);
  return { power: shown(after.power, change.power), morale: shown(after.morale, change.morale) };
}

const signed = (n: number) => (n > 0 ? `+${n}` : `−${Math.abs(n)}`);

/** 한 진영의 라운드 변화를 "국력 −5 · 민심 +3"처럼 적는다 (값과 이름은 줄이 갈리지 않게 붙인다). 변화가 없으면 빈 문자열 */
export function changeText(text: HegemonyText, change: Nation): string {
  const parts: string[] = [];
  if (change.power !== 0) parts.push(`${text.stat.power}\u00a0${signed(change.power)}`);
  if (change.morale !== 0) parts.push(`${text.stat.morale}\u00a0${signed(change.morale)}`);
  return parts.join(" · ");
}

export const LINE_TONE: Record<LineTone, string> = {
  good: "text-hg-bright",
  bad: "text-hg-enemy",
  neutral: "text-text-secondary",
  alert: "text-hg-enemy font-black",
};
