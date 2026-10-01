/*
  파일명: components/features/game/duel/DuelArena/useDuelMatch.ts
  기능: 설전 진행
  책임: 합마다 양쪽 행동을 받아 판정하고, 자세·말풍선·게이지를 순서대로 바꾼 뒤 다음 합이나 끝으로 넘긴다.
        화면을 누르면 남은 연출을 건너뛴다. 행동을 기다리는 동안에는 양쪽이 번갈아 한마디씩 한다.
*/
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import type { Locale } from "@/types/locale";
import type { BattleCard, Command } from "@/lib/game/types";
import type { Side } from "@/lib/game/hegemony/types";
import {
  INITIAL_MOMENTUM, calcDuelHp, calcStatMod, duelAiDecide, resolveDuelClash, updateMomentum,
  type DuelAction, type DuelClashResult, type DuelPhase,
} from "@/lib/game/duelEngine";
import type { FighterPose } from "../DuelFighter";
import { RESULT_HOLD_MS, type DuelWinner } from "../shared/types";
import { actionToPose, pickDuelLine, pickIdleLine } from "./sections/duelHelpers";

const STAT_OF: Record<Command, (card: BattleCard) => number> = {
  assault: (c) => c.ability.martial,
  stratagem: (c) => c.ability.intellect,
  govern: (c) => c.ability.command,
};

export function useDuelMatch(playerCard: BattleCard, aiCard: BattleCard, command: Command, onComplete: (winner: DuelWinner) => void) {
  const locale = useLocale() as Locale;
  const maxHp = { player: calcDuelHp(playerCard, command), ai: calcDuelHp(aiCard, command) };
  const stat = { player: STAT_OF[command](playerCard), ai: STAT_OF[command](aiCard) };
  const [phase, setPhase] = useState<DuelPhase>("intro");
  const [round, setRound] = useState(1);
  const [hp, setHp] = useState<Record<Side, number>>(maxHp);
  const [momentum, setMomentum] = useState<Record<Side, number>>({ player: INITIAL_MOMENTUM, ai: INITIAL_MOMENTUM });
  const [pose, setPose] = useState<Record<Side, FighterPose>>({ player: "idle", ai: "idle" });
  const [bubble, setBubble] = useState<Record<Side, string>>({ player: "", ai: "" });
  const [lastClash, setLastClash] = useState<DuelClashResult | null>(null);
  const [shake, setShake] = useState(false);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const pendingResolve = useRef<(() => void) | null>(null);
  const pendingAdvance = useRef<(() => void) | null>(null);
  const lastPlayerAction = useRef<DuelAction | undefined>(undefined);
  const done = useRef(false);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);
  useEffect(() => clearTimers, [clearTimers]);

  const winner: DuelWinner = hp.player > hp.ai ? "player" : hp.ai > hp.player ? "ai" : "draw";
  // 계속 단추와 저절로 넘어가는 시계가 겹쳐도 결과는 한 번만 알린다
  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    onCompleteRef.current(winner);
  }, [winner]);

  const start = useCallback(() => setPhase((p) => (p === "intro" ? "select" : p)), []);

  // ─── 기다리는 동안 번갈아 한마디 ───
  const idleTurn = useRef<Side>("ai");
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const say = useCallback((side: Side) => {
    const line = pickIdleLine(side === "player" ? playerCard : aiCard, locale);
    if (!line) return;
    setBubble((b) => ({ ...b, [side]: line }));
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setBubble((b) => ({ ...b, [side]: "" })), 2500);
  }, [playerCard, aiCard, locale]);

  useEffect(() => {
    if (phase !== "select") return;
    const tick = () => {
      say(idleTurn.current);
      idleTurn.current = idleTurn.current === "player" ? "ai" : "player";
    };
    const first = setTimeout(tick, 3000);
    const interval = setInterval(tick, 4000);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [phase, say]);

  const poke = useCallback((side: Side) => {
    if (phase === "select") say(side);
  }, [phase, say]);

  // ─── 한 합: 내 행동 → 0.7초 뒤 상대 행동 → 1.4초에 충돌 → 0.6초 뒤 게이지 반영 ───
  const act = useCallback((playerAction: DuelAction) => {
    if (phase !== "select") return;
    setPhase("clash");
    clearTimers();
    const aiAction = duelAiDecide(momentum.ai, momentum.player, hp.ai, hp.player, round, lastPlayerAction.current);
    lastPlayerAction.current = playerAction;
    const clash = resolveDuelClash(playerAction, aiAction, momentum.player, momentum.ai, stat.player, stat.ai);
    setLastClash(clash);
    setPose((p) => ({ ...p, player: actionToPose(playerAction, false) }));
    setBubble((b) => ({ ...b, player: pickDuelLine(playerCard, playerAction, command, locale) }));

    const resolve = () => {
      pendingResolve.current = null;
      setPose((p) => ({ player: clash.playerDamage > 0 ? "hit" : p.player, ai: clash.aiDamage > 0 ? "hit" : p.ai }));
      if (playerAction === "strike" || aiAction === "strike") setShake(true);
      timers.current.push(setTimeout(() => {
        setHp({ player: Math.max(0, hp.player - clash.playerDamage), ai: Math.max(0, hp.ai - clash.aiDamage) });
        setMomentum({ player: updateMomentum(playerAction, momentum.player), ai: updateMomentum(aiAction, momentum.ai) });
        setShake(false);
        setPhase("resolve");
      }, 600));
    };
    pendingResolve.current = resolve;
    timers.current.push(
      setTimeout(() => {
        setPose((p) => ({ ...p, ai: actionToPose(aiAction, false) }));
        setBubble((b) => ({ ...b, ai: pickDuelLine(aiCard, aiAction, command, locale) }));
      }, 700),
      setTimeout(resolve, 1400),
    );
  }, [phase, momentum, hp, round, stat.player, stat.ai, playerCard, aiCard, command, locale, clearTimers]);

  // ─── 반영 뒤: 한쪽이 쓰러졌으면 끝, 아니면 다음 합 ───
  useEffect(() => {
    if (phase !== "resolve") return;
    const advance = () => {
      pendingAdvance.current = null;
      if (hp.player <= 0 || hp.ai <= 0) {
        setPose((p) => ({ player: hp.player <= 0 ? "fallen" : p.player, ai: hp.ai <= 0 ? "fallen" : p.ai }));
        setPhase("end");
        return;
      }
      setRound((r) => r + 1);
      setPose({ player: "idle", ai: "idle" });
      setBubble({ player: "", ai: "" });
      setPhase("select");
    };
    pendingAdvance.current = advance;
    const timer = setTimeout(advance, 1200);
    return () => {
      clearTimeout(timer);
      pendingAdvance.current = null;
    };
  }, [phase, hp]);

  useEffect(() => {
    if (phase !== "end") return;
    const timer = setTimeout(finish, RESULT_HOLD_MS);
    return () => clearTimeout(timer);
  }, [phase, finish]);

  /** 화면을 누르면 남은 연출을 건너뛴다 */
  const skip = useCallback(() => {
    if (phase === "clash" && pendingResolve.current) {
      clearTimers();
      pendingResolve.current();
      return;
    }
    if (phase === "resolve" && pendingAdvance.current) {
      pendingAdvance.current();
      return;
    }
    if (phase === "end") finish();
  }, [phase, clearTimers, finish]);

  const strikeDamage = Math.max(0, momentum.player + calcStatMod(stat.player, stat.ai));
  return { phase, round, hp, maxHp, momentum, pose, bubble, lastClash, shake, winner, strikeDamage, start, act, skip, poke, finish };
}
