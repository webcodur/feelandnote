/*
  파일명: lib/game/hegemony/mandate.ts
  기능: 천명 순서
  책임: 판 전체의 라운드별 천명을 미리 정한다. 세 명령이 고르게 나오고 같은 천명이 연달아 나오지 않는다.
*/

import type { Command } from "../types";
import { COMMANDS } from "../types";
import { RULES } from "./constants";
import { pickWeighted } from "./rng";
import type { Rng } from "./types";

function attempt(length: number, rng: Rng): Command[] | null {
  const perCommand = Math.ceil(length / COMMANDS.length);
  const left = new Map<Command, number>(COMMANDS.map((c) => [c, perCommand]));
  const out: Command[] = [];
  while (out.length < length) {
    const prev = out[out.length - 1];
    const choices = COMMANDS.filter((c) => c !== prev && (left.get(c) ?? 0) > 0);
    if (choices.length === 0) return null;
    // 많이 남은 명령일수록 잘 뽑혀 막다른 길을 피한다
    const weights = choices.map((c) => left.get(c) ?? 0);
    const sum = weights.reduce((a, b) => a + b, 0);
    const pick = choices[pickWeighted(weights.map((w) => w / sum), rng)];
    out.push(pick);
    left.set(pick, (left.get(pick) ?? 0) - 1);
  }
  return out;
}

export function buildMandates(rng: Rng, length: number = RULES.maxRounds): Command[] {
  for (let i = 0; i < 50; i++) {
    const seq = attempt(length, rng);
    if (seq) return seq;
  }
  // 이론상 닿지 않는 대체 경로 — 순서대로 돌린다
  return Array.from({ length }, (_, i) => COMMANDS[i % COMMANDS.length]);
}

export function mandateOfRound(mandates: readonly Command[], round: number): Command | null {
  return mandates[round - 1] ?? null;
}
