/*
  파일명: components/features/game/hegemony/text/enPlay.ts
  기능: 패권 영어 문구 — 대전 결과·예상 전과·일기토·결과 화면·규칙 안내
  책임: koPlay.ts와 같은 모양을 영어로 채운다.
*/

import type { Command } from "@/lib/game/types";
import { RULES } from "@/lib/game/hegemony/constants";
import type { koPlay } from "./koPlay";

const CMD: Record<Command, string> = { assault: "Battle", stratagem: "Scheme", govern: "Govern" };
const pct = (x: number) => `${Math.round(x * 100)}%`;
/** "1 time", "1 duel" 대신 once, One duel */
const timesOf = (n: number) => (n === 1 ? "once" : `${n} times`);
const duelCount = (n: number) => (n === 1 ? "One duel" : `${n} duels`);

export const enPlay: typeof koPlay = {
  verdict: {
    name: { win: "Counter", lose: "Countered", draw: "Standoff" },
    short: { win: "Edge", lose: "Behind", draw: "Standoff" },
    taken: {
      mirror: { win: "Won on points", lose: "Lost on points", draw: "Even" },
      duel: { win: "Duel won", lose: "Duel lost", draw: "Duel drawn" },
    },
    mirrorAptitude: (mine, theirs) => `Same order, aptitude ${mine} vs ${theirs}`,
    mirrorTie: "Equal aptitude: both sides land half",
    duelNote: (mine, theirs) => `Aptitude ${mine} vs ${theirs}, settled by duel`,
  },
  outcome: {
    title: (n) => `Round ${n}`,
    dealtPower: (n) => `Enemy power\u00a0−${n}`,
    dealtMorale: (n) => `Enemy morale\u00a0−${n}`,
    healedPower: (n) => `Power\u00a0+${n}`,
    healedMorale: (n) => `Morale\u00a0+${n}`,
    cost: (n) => `War cost: morale\u00a0−${n}`,
    nothing: "No effect",
    recovered: (name) => `${name} returns`,
    resting: (name) => `${name} rests`,
    overflow: (n) => `Morale collapsed: power\u00a0−${n}`,
    rebellion: (n) => `Revolt! Power\u00a0−${n}`,
    mandate: "Mandate",
    next: "Next round",
    toResult: "See result",
    skip: "Tap to skip",
    finalRound: "Final round",
  },
  forecast: {
    title: "Forecast",
    ifEnemy: (cmd) => `If they play ${CMD[cmd]}`,
    enemyPower: (min, max) => (min === max ? `Enemy power ${min}` : `Enemy power ${min} to ${max}`),
    // 음수 범위를 "−3–−11"처럼 줄표로 이으면 읽기 어려워 to로 잇는다
    range: (from, to) => `${from}\u00a0to\u00a0${to}`,
    you: "You",
    them: "Them",
    lethal: "Win on hit",
    fatal: "Lethal risk",
    mirror: (stronger, total) => (stronger === 0 ? "You out-rank every enemy figure" : `${stronger} of ${total} enemy figures are stronger`),
    hidden: "Values that depend on enemy aptitude show as ?",
    noPlay: "Pick a figure and an order to preview each enemy response",
    loseHidden: `Their effect lands at ×${RULES.counterWin}`,
    drawHidden: "Same orders: only the higher aptitude lands",
    none: "No change",
  },
  duel: {
    title: "Challenge to a duel?",
    body: (mine, theirs) => `Same orders collide. Your aptitude trails, ${mine} to ${theirs}.`,
    tie: (value) => `Same orders collide at equal aptitude (${value}). As is, both sides land half.`,
    stake: `Win the duel and the round is yours. ${duelCount(RULES.duelsPerGame)} per match.`,
    accept: "Challenge",
    decline: "Let it stand",
  },
  result: {
    title: { player: "Victory", ai: "Defeat", draw: "Draw" },
    koWin: (n) => `You broke the enemy in ${n} rounds`,
    koLose: (n) => `Your nation fell in round ${n}`,
    timeWin: (a, b) => `After ${RULES.maxRounds} rounds you lead ${a} to ${b} in power`,
    timeLose: (a, b) => `After ${RULES.maxRounds} rounds you trail ${a} to ${b} in power`,
    draw: "Neither side prevailed",
    forfeit: "You forfeited",
    dealt: "Damage dealt",
    taken: "Damage taken",
    counters: "Counters",
    rebellions: "Revolts (you\u00a0/\u00a0enemy)",
    mvp: "Most valuable figure",
    mvpLine: (dealt, healed) => `Damage ${dealt} · Recovery ${healed}`,
    chart: "Power over time",
    rounds: "Rounds",
    rematch: "Rematch",
    home: "Title",
    record: (w, l) => `All-time record: ${w} ${w === 1 ? "win" : "wins"}, ${l} ${l === 1 ? "loss" : "losses"}`,
  },
  card: {
    aptitude: "Order aptitude",
    best: "Specialty",
    basis: "Where it comes from",
    influence: "Influence",
    ability: "Abilities",
    quote: "In their words",
    formula: {
      assault: "Avg. of strategy & society × martial",
      stratagem: "Avg. of politics & tech × intellect",
      govern: "Avg. of economy & culture × command",
    },
    close: "Close",
  },
  rules: {
    title: "How to play",
    back: "Back",
    sections: [
      {
        title: "A match",
        body: [
          "Draft: five trios are revealed. In each trio you and the AI take one figure each; the third is out.",
          "Captain: appoint one of your five figures as captain.",
          `Battle: up to ${RULES.maxRounds} rounds. Each round both sides secretly commit one figure and one order, then reveal.`,
        ],
      },
      {
        title: "Three orders",
        body: [
          "Battle beats Govern, Govern beats Scheme, Scheme beats Battle.",
          `Win the matchup and your effect is ×${RULES.counterWin} while theirs is cancelled.`,
          "Same orders: only the higher aptitude lands. Equal aptitude: both land half.",
        ],
      },
      {
        title: "Power and morale",
        body: [
          `Start with ${RULES.initialPower} power. Reach 0 and you lose. After round ${RULES.maxRounds}, higher power wins.`,
          `Start with ${RULES.initialMorale} morale. Every Battle order costs ${RULES.assaultMoraleCost} morale.`,
          `At 0 morale a revolt hits every round for (${RULES.rebellionBase} + round) power.`,
        ],
      },
      {
        title: "Managing figures",
        body: [
          "Figures sent to Battle or Scheme go to rest. A Govern figure stays in hand and brings one resting figure back.",
          `If your hand is empty, pick one of ${RULES.recallChoices} resting figures to return.`,
        ],
      },
      {
        title: "Captain, mandate, escalation",
        body: [
          `Captain in hand: other figures +${pct(RULES.captainAura)} aptitude. Captain deployed: ×${RULES.captainSelf}.`,
          `Mandate: each round one order gets ×${RULES.mandateBonus} aptitude. The next two mandates are shown in advance.`,
          `Escalation: from round ${RULES.escalationStartRound}, attack damage grows ${pct(RULES.escalationPerRound)} per round. Recovery does not.`,
        ],
      },
      {
        title: "Duel",
        body: [
          `When same orders collide and your aptitude trails or ties, you may call a duel ${timesOf(RULES.duelsPerGame)} per match to turn it around.`,
        ],
      },
    ],
    keys: "Keys: 1–5 figure · Q Battle · W Scheme · E Govern · Enter deploy",
  },
};
