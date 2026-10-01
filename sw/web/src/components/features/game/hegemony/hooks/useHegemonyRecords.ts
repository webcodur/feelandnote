/*
  파일명: components/features/game/hegemony/hooks/useHegemonyRecords.ts
  기능: 패권 전적
  책임: 난이도별 승·패·무와 연승, 최근 대전 몇 판을 이 브라우저에 저장하고 읽는다. 서버에는 남기지 않는다.
*/
"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { Difficulty } from "@/lib/game/hegemony/constants";
import type { GameWinner } from "@/lib/game/hegemony/types";

const KEY = "feelandnote:hegemony:records:v1";
const RECENT_MAX = 5;

type Tally = Record<Difficulty, number>;

export interface RecentGame {
  at: number;
  difficulty: Difficulty;
  winner: GameWinner;
  rounds: number;
  power: { player: number; ai: number };
  captainName: string;
}

export interface HegemonyRecords {
  wins: Tally;
  losses: Tally;
  draws: Tally;
  streak: number;
  bestStreak: number;
  recent: RecentGame[];
}

const zero = (): Tally => ({ easy: 0, normal: 0, hard: 0 });
const EMPTY: HegemonyRecords = { wins: zero(), losses: zero(), draws: zero(), streak: 0, bestStreak: 0, recent: [] };

let cache: { raw: string | null; value: HegemonyRecords } = { raw: null, value: EMPTY };
const listeners = new Set<() => void>();

function parse(raw: string | null): HegemonyRecords {
  if (!raw) return EMPTY;
  try {
    const data = JSON.parse(raw) as Partial<HegemonyRecords>;
    return {
      wins: { ...zero(), ...data.wins },
      losses: { ...zero(), ...data.losses },
      draws: { ...zero(), ...data.draws },
      streak: data.streak ?? 0,
      bestStreak: data.bestStreak ?? 0,
      recent: Array.isArray(data.recent) ? data.recent.slice(0, RECENT_MAX) : [],
    };
  } catch {
    return EMPTY;
  }
}

function read(): HegemonyRecords {
  const raw = window.localStorage.getItem(KEY);
  if (raw !== cache.raw) cache = { raw, value: parse(raw) };
  return cache.value;
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function totalsOf(records: HegemonyRecords) {
  const sum = (t: Tally) => t.easy + t.normal + t.hard;
  return { wins: sum(records.wins), losses: sum(records.losses), draws: sum(records.draws) };
}

export function useHegemonyRecords() {
  const records = useSyncExternalStore(subscribe, read, () => EMPTY);

  const addResult = useCallback((game: RecentGame) => {
    const prev = read();
    const won = game.winner === "player";
    const bump = (t: Tally, on: boolean): Tally => (on ? { ...t, [game.difficulty]: t[game.difficulty] + 1 } : t);
    const streak = won ? prev.streak + 1 : 0;
    const next: HegemonyRecords = {
      wins: bump(prev.wins, won),
      losses: bump(prev.losses, game.winner === "ai"),
      draws: bump(prev.draws, game.winner === "draw"),
      streak,
      bestStreak: Math.max(prev.bestStreak, streak),
      recent: [game, ...prev.recent].slice(0, RECENT_MAX),
    };
    window.localStorage.setItem(KEY, JSON.stringify(next));
    listeners.forEach((l) => l());
  }, []);

  return { records, addResult };
}
