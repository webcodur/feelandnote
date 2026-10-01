/*
  파일명: components/features/game/hegemony/text/en.ts
  기능: 패권 영어 문구
  책임: ko.ts와 같은 모양을 영어로 채운다.
*/

import type { Command } from "@/lib/game/types";
import { RULES } from "@/lib/game/hegemony/constants";
import type { HegemonyText } from "./ko";
import { enPlay } from "./enPlay";

const CMD: Record<Command, string> = { assault: "Battle", stratagem: "Scheme", govern: "Govern" };
const pct = (x: number) => `${Math.round(x * 100)}%`;
/** "1W 0L"처럼 줄이면 굵은 0과 O가 헷갈려 낱말로 적는다 */
const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export const en: HegemonyText = {
  game: { title: "Hegemony", english: "HEGEMONY", tagline: "The strong shall rule" },
  command: {
    name: CMD,
    seal: { assault: "戰", stratagem: "策", govern: "政" },
    effect: {
      assault: "Strike enemy power",
      stratagem: "Shake enemy morale",
      govern: "Restore power and morale",
    },
    beats: (winner, loser) => `${CMD[winner]} beats ${CMD[loser]}`,
  },
  stat: { power: "Power", morale: "Morale", aptitude: "Aptitude", hand: "Hand", used: "Resting", captain: "Captain" },
  difficulty: {
    name: { easy: "Easy", normal: "Normal", hard: "Hard" },
    desc: {
      easy: "The AI slips up often. Start here if you are new.",
      normal: "Enemy aptitudes are visible and you pick first in the draft.",
      hard: "Enemy aptitudes are hidden and the AI picks first.",
    },
  },
  title: {
    start: "Start battle",
    startSub: (difficulty) => `${difficulty} · vs AI`,
    rules: "Rules",
    records: "Records",
    settings: "Settings",
    exit: "Exit",
    loading: "Gathering figures",
    errorLoad: "Could not load figures. Please try again in a moment.",
    errorNotEnough: "Not enough figures for a match.",
    recordLine: (w, l, d) => `${count(w, "win", "wins")} · ${count(l, "loss", "losses")}${d > 0 ? ` · ${count(d, "draw", "draws")}` : ""}`,
    streak: (n) => `${n}-win streak`,
    noRecord: "No matches yet",
    shortcuts: "Keys 1–5 figure · Q W E order · Enter deploy",
  },
  records: {
    title: "Records",
    total: "Total",
    best: (n) => `Best streak ${n}`,
    recent: "Recent matches",
    rounds: (n) => `${n} rounds`,
    result: { player: "Win", ai: "Loss", draw: "Draw" },
    unit: { win: "W", loss: "L", draw: "D" },
    empty: "Finished matches will appear here.",
    back: "Back",
  },
  settings: {
    title: "Settings",
    bgm: "Music",
    sfx: "Sound effects & voice",
    speed: "Animation speed",
    speedNormal: "Normal",
    speedFast: "Fast",
    on: "On",
    off: "Off",
    back: "Back",
  },
  draft: {
    title: "Draft",
    batch: (n, total) => `Trio ${n} / ${total}`,
    guide: "Take one of three; the AI takes one; the last one is out.",
    myTurn: "Your pick",
    aiTurn: "The AI is choosing",
    done: "Draft complete",
    first: (mine) => (mine ? "You pick first this trio" : "The AI picks first this trio"),
    excluded: "Out",
    reshuffle: "Redraw",
    auto: "Auto draft",
    mine: "Your roster",
    theirs: "Enemy roster",
    empty: "Empty",
    next: "Appoint captain",
    best: "Specialty",
    teamBest: "Best aptitude per order",
    detail: "Details",
  },
  captain: {
    title: "Appoint a captain",
    guide: `While the captain is in hand, other figures gain ${pct(RULES.captainAura)} aptitude. Deployed directly, the captain gets ×${RULES.captainSelf}.`,
    tip: "Battle or Scheme sends the captain to rest and the bonus stops. Govern keeps them in hand.",
    auraTitle: `In hand: allies +${pct(RULES.captainAura)} aptitude`,
    selfTitle: (name) => `${name} deployed: ×${RULES.captainSelf}`,
    recommend: "Pick",
    confirm: (name) => `Appoint ${name}`,
    pick: "Choose your captain",
    enemy: "Enemy roster",
  },
  battle: {
    round: (n) => `Round ${n}`,
    roundLabel: "Round",
    of: (n, max) => `${n} / ${max}`,
    mandate: "Mandate",
    mandateNow: (cmd) => `${CMD[cmd]} ×${RULES.mandateBonus}`,
    mandateNext: "Next",
    escalation: "Escalation",
    escalationValue: (x) => `Attack ×${x.toFixed(2)}`,
    danger: "Revolt risk",
    you: "You",
    enemy: "Enemy",
    powerOf: { player: "Your power", ai: "Enemy power" },
    hidden: "Aptitude hidden",
    chooseCard: "Choose a figure to deploy",
    chooseCommand: "Choose an order",
    ready: "Ready to deploy",
    deploy: "Deploy",
    recover: "Bring back",
    recoverAuto: "Strongest figure",
    recallTitle: "Your hand is empty",
    recallGuide: "Bring one resting figure back and send them out this round.",
    recallPick: "Bring back",
    log: "Battle log",
    logEmpty: "No rounds yet",
    forfeit: "Forfeit",
    forfeitConfirm: "Forfeiting records this match as a loss.",
    forfeitYes: "Forfeit",
    cancel: "Keep fighting",
    help: "Rules",
    enemyWaiting: "The enemy is choosing",
    enemyHand: "Enemy hand",
    cost: (n) => `Costs morale\u00a0−${n}`,
    duelsLeft: (n) => `${n} duel${n > 1 ? "s" : ""} left`,
    duelsLeftLong: (n) => (n > 0 ? `You can still call ${n === 1 ? "one duel" : `${n} duels`} this match` : "No duels left this match"),
    menu: "Menu",
    resting: "Resting",
  },
  ...enPlay,
};
