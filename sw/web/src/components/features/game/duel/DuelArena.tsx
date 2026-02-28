/*
  파일명: components/features/game/duel/DuelArena.tsx
  기능: 일기토 전체 UI (대치 → 충전/공격/버티기 → 결과)
  책임: DuelFighter 2체 배치, HP/기세 게이지, 액션 버튼, 타이머 관리.
*/
"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { BattleCard, Command } from "@/lib/game/types";
import {
  type DuelAction, type DuelPhase, type DuelClashResult,
  calcDuelHp, resolveDuelClash, updateMomentum, duelAiDecide,
  MAX_MOMENTUM, INITIAL_MOMENTUM, DUEL_TIME_LIMIT_PVP,
  DUEL_ACTION_LABELS, DUEL_ACTION_ICONS,
} from "@/lib/game/duelEngine";
import DuelFighter, { type FighterPose } from "./DuelFighter";
import { Z_INDEX } from "@/constants/zIndex";

// ─── Props ───

interface Props {
  playerCard: BattleCard;
  aiCard: BattleCard;
  command: Command;
  vsAi?: boolean;
  onComplete: (winner: "player" | "ai" | "draw") => void;
}

// ─── HP 바 — 석재 게이지 ───

function HpBar({ hp, maxHp, side }: { hp: number; maxHp: number; side: "player" | "ai" }) {
  const pct = Math.max(0, (hp / maxHp) * 100);
  // 채도 낮은 톤: 충분 → 금색, 위험 → 붉은 돌색
  const fill = pct > 50
    ? "bg-gradient-to-r from-[#8a732a] to-[#d4af37]"
    : pct > 25
      ? "bg-gradient-to-r from-[#8a5a2a] to-[#c08030]"
      : "bg-gradient-to-r from-[#6b2020] to-[#a03030]";
  const dir = side === "ai" ? "justify-end" : "justify-start";

  return (
    <div className="flex-1">
      <div className={`h-4 md:h-[18px] rounded-[3px] overflow-hidden flex ${dir}`}
        style={{
          background: "linear-gradient(to bottom, rgba(8,8,8,0.95), rgba(20,20,20,0.9))",
          boxShadow: "inset 0 2px 4px rgba(0,0,0,0.8), inset 0 -1px 0 rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.5)",
          border: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <motion.div
          className={`h-full rounded-[2px] ${fill}`}
          style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.3), 0 0 6px rgba(212,175,55,0.2)" }}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

// ─── 기세 게이지 — 작은 석판 블록 ───

function MomentumGauge({ level, side }: { level: number; side: "player" | "ai" }) {
  return (
    <div className={`flex items-center gap-[3px] ${side === "ai" ? "justify-end" : "justify-start"}`}>
      {Array.from({ length: MAX_MOMENTUM }).map((_, i) => (
        <div
          key={i}
          className={`w-3 h-2 md:w-3.5 md:h-2.5 rounded-[2px] ${
            i < level
              ? "shadow-[0_0_6px_rgba(212,175,55,0.5)]"
              : ""
          }`}
          style={i < level ? {
            backgroundImage: "linear-gradient(to bottom, #f0d060, #d4af37, #8a732a)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3), 0 0 6px rgba(212,175,55,0.5)",
          } : {
            background: "linear-gradient(to bottom, rgba(30,30,30,0.6), rgba(15,15,15,0.8))",
            boxShadow: "inset 0 1px 2px rgba(0,0,0,0.5)",
          }}
        />
      ))}
    </div>
  );
}

// ─── 타이머 ───

function DuelTimer({ active, onTimeout }: { active: boolean; onTimeout: () => void }) {
  const limit = DUEL_TIME_LIMIT_PVP;
  const [timeLeft, setTimeLeft] = useState(limit);
  const cbRef = useRef(onTimeout);
  cbRef.current = onTimeout;

  useEffect(() => {
    if (!active) { setTimeLeft(limit); return; }
    setTimeLeft(limit);
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(interval); cbRef.current(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [active, limit]);

  return (
    <span className={`text-[10px] font-mono tabular-nums ${timeLeft <= 2 ? "text-[#a03030]" : "text-white/30"}`}>
      {timeLeft}s
    </span>
  );
}

// ─── 포즈 매핑 ───

function actionToPose(action: DuelAction, isHit: boolean): FighterPose {
  if (isHit) return "hit";
  switch (action) {
    case "charge": return "charge";
    case "strike": return "slash";
    case "brace": return "guard";
  }
}

// ─── 화면 흔들림 ───

const shakeVariants = {
  idle: { x: 0 },
  shake: {
    x: [0, -4, 4, -3, 2, -1, 0],
    transition: { duration: 0.3, ease: "easeOut" as const },
  },
};

// ─── 액션 버튼 설정 ───

const ACTION_CFG = {
  charge: {
    label: "충전",
    activeClass: "text-[#d4af37]",
    activeBorder: "border-[#8a732a]/50",
    activeBg: "bg-[#d4af37]/[0.04]",
  },
  strike: {
    label: "공격",
    activeClass: "text-[#c0805a]",
    activeBorder: "border-[#8a5a2a]/50",
    activeBg: "bg-[#c0805a]/[0.04]",
  },
  brace: {
    label: "버티기",
    activeClass: "text-[#7a9ab0]",
    activeBorder: "border-[#4a6a80]/50",
    activeBg: "bg-[#7a9ab0]/[0.04]",
  },
} as const;

// ─── 메인 컴포넌트 ───

export default function DuelArena({ playerCard, aiCard, command, vsAi = true, onComplete }: Props) {
  const [phase, setPhase] = useState<DuelPhase>("intro");
  const [entered, setEntered] = useState(false);
  const [round, setRound] = useState(1);
  const [playerHp, setPlayerHp] = useState(() => calcDuelHp(playerCard, command));
  const [aiHp, setAiHp] = useState(() => calcDuelHp(aiCard, command));
  const [playerMomentum, setPlayerMomentum] = useState(INITIAL_MOMENTUM);
  const [aiMomentum, setAiMomentum] = useState(INITIAL_MOMENTUM);
  const [playerPose, setPlayerPose] = useState<FighterPose>("idle");
  const [aiPose, setAiPose] = useState<FighterPose>("idle");
  const [lastClash, setLastClash] = useState<DuelClashResult | null>(null);
  const [shakeScreen, setShakeScreen] = useState(false);

  const maxPlayerHp = calcDuelHp(playerCard, command);
  const maxAiHp = calcDuelHp(aiCard, command);
  const canAct = phase === "select";

  const playerStat = command === "assault" ? playerCard.ability.martial
    : command === "stratagem" ? playerCard.ability.intellect
    : playerCard.ability.command;
  const aiStat = command === "assault" ? aiCard.ability.martial
    : command === "stratagem" ? aiCard.ability.intellect
    : aiCard.ability.command;
  const playerAdvantage = playerStat > aiStat;

  // ─── 타이머 ref (스킵용) ───
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const pendingResolve = useRef<(() => void) | null>(null);
  const pendingAdvance = useRef<(() => void) | null>(null);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const dismissIntro = useCallback(() => {
    if (phase === "intro") setPhase("select");
  }, [phase]);

  const handleAction = useCallback((playerAction: DuelAction) => {
    if (phase !== "select") return;
    setPhase("clash");
    clearTimers();

    const aiAction = duelAiDecide(aiMomentum, playerMomentum, aiHp, playerHp, round);
    const clash = resolveDuelClash(playerAction, aiAction, playerMomentum, aiMomentum, playerAdvantage);
    setLastClash(clash);

    setPlayerPose(actionToPose(playerAction, false));
    setAiPose(actionToPose(aiAction, false));

    if (playerAction === "strike" || aiAction === "strike") setShakeScreen(true);

    // resolve 콜백 — 클릭 스킵과 타이머 양쪽에서 사용
    const doResolve = () => {
      if (clash.playerDamage > 0) setPlayerPose("hit");
      if (clash.aiDamage > 0) setAiPose("hit");
      setPlayerHp(Math.max(0, playerHp - clash.playerDamage));
      setAiHp(Math.max(0, aiHp - clash.aiDamage));
      setPlayerMomentum(updateMomentum(playerAction, playerMomentum));
      setAiMomentum(updateMomentum(aiAction, aiMomentum));
      setShakeScreen(false);
      setPhase("resolve");
      pendingResolve.current = null;
    };
    pendingResolve.current = doResolve;

    timersRef.current.push(
      setTimeout(() => {
        if (clash.playerDamage > 0) setPlayerPose("hit");
        if (clash.aiDamage > 0) setAiPose("hit");
      }, 200),
      setTimeout(doResolve, 800),
    );
  }, [phase, playerMomentum, aiMomentum, playerHp, aiHp, round, playerAdvantage, clearTimers]);

  // resolve → 다음 합 or 종료
  useEffect(() => {
    if (phase !== "resolve") return;

    const doAdvance = () => {
      if (playerHp <= 0 || aiHp <= 0) {
        if (playerHp <= 0) setPlayerPose("fallen");
        if (aiHp <= 0) setAiPose("fallen");
        setPhase("end");
      } else {
        setRound(r => r + 1);
        setPlayerPose("idle");
        setAiPose("idle");
        setPhase("select");
      }
      pendingAdvance.current = null;
    };
    pendingAdvance.current = doAdvance;

    const t = setTimeout(doAdvance, 1000);
    return () => { clearTimeout(t); pendingAdvance.current = null; };
  }, [phase, playerHp, aiHp]);

  // 종료 → onComplete
  useEffect(() => {
    if (phase !== "end") return;
    const t = setTimeout(() => {
      onComplete(playerHp > aiHp ? "player" : aiHp > playerHp ? "ai" : "draw");
    }, 1500);
    return () => clearTimeout(t);
  }, [phase, playerHp, aiHp, onComplete]);

  // ─── 화면 클릭: 모션 스킵 ───
  const handleScreenClick = useCallback(() => {
    // clash 중 → 즉시 resolve
    if (phase === "clash" && pendingResolve.current) {
      clearTimers();
      pendingResolve.current();
      return;
    }
    // resolve 중 → 즉시 다음 합/종료
    if (phase === "resolve" && pendingAdvance.current) {
      pendingAdvance.current();
      return;
    }
    // end 중 → 즉시 완료
    if (phase === "end") {
      onComplete(playerHp > aiHp ? "player" : aiHp > playerHp ? "ai" : "draw");
      return;
    }
  }, [phase, playerHp, aiHp, onComplete, clearTimers]);

  const handleTimeout = useCallback(() => {
    if (phase !== "select") return;
    const actions: DuelAction[] = ["charge", "strike", "brace"];
    handleAction(actions[Math.floor(Math.random() * actions.length)]);
  }, [phase, playerMomentum, handleAction]);

  const strikeDmg = Math.max(1, playerMomentum);
  const nextMomentum = Math.min(playerMomentum + 1, MAX_MOMENTUM);

  return (
    <div className="fixed inset-0" style={{ zIndex: Z_INDEX.gameDuel }} onClick={handleScreenClick}>

      {/* ─── 진입 연출: 위에서 내리찍기 ─── */}
      <motion.div
        className="absolute inset-0 flex flex-col"
        style={{
          backgroundColor: "#0a0a0a",
          backgroundImage: `
            var(--pattern-noise),
            radial-gradient(ellipse 60% 40% at 50% 45%, rgba(212,175,55,0.03) 0%, transparent 70%),
            radial-gradient(ellipse 100% 100% at 50% 50%, rgba(20,18,12,0.8) 0%, rgba(10,10,10,1) 70%),
            linear-gradient(to bottom, #0a0a0a, #0e0e0e 30%, #080808)
          `,
        }}
        initial={{ y: "-100%", opacity: 0.7 }}
        animate={{ y: "0%", opacity: 1 }}
        transition={{
          y: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
          opacity: { duration: 0.2 },
        }}
        onAnimationComplete={() => setEntered(true)}
      >
      <div className="flex flex-col h-full w-full max-w-lg mx-auto">

        {/* ═══ HUD 상단 — 석재 패널 ═══ */}
        <div className="shrink-0 px-3 pt-3 pb-2 md:px-5 md:pt-4"
          style={{
            background: "linear-gradient(to bottom, rgba(22,20,16,0.95), rgba(14,13,10,0.9))",
            borderBottom: "1px solid rgba(212,175,55,0.08)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.03), inset 0 -1px 0 rgba(0,0,0,0.3)",
          }}
        >

          {/* 닉네임 행 */}
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] md:text-xs font-serif text-white/50 truncate max-w-[100px] md:max-w-[130px] tracking-wide">
              {aiCard.nickname}
            </span>

            <div className="flex items-center gap-2">
              <span className="font-cinzel text-[#d4af37]/70 text-xs md:text-sm tracking-[0.2em]"
                style={{ textShadow: "0 0 8px rgba(212,175,55,0.2)" }}
              >
                {phase !== "intro" && phase !== "end" ? `${round}합` : ""}
              </span>
              {!vsAi && <DuelTimer active={phase === "select"} onTimeout={handleTimeout} />}
            </div>

            <span className="text-[11px] md:text-xs font-serif text-white/50 truncate max-w-[100px] md:max-w-[130px] text-right tracking-wide">
              {playerCard.nickname}
            </span>
          </div>

          {/* HP 바 행 */}
          <div className="flex items-center gap-2 md:gap-2.5">
            <span className="text-[10px] md:text-[11px] font-mono text-white/30 w-7 md:w-9 text-right tabular-nums font-bold">
              {aiHp}
            </span>
            <HpBar hp={aiHp} maxHp={maxAiHp} side="ai" />

            {/* 중앙 구분 — 금빛 다이아몬드 */}
            <div className="shrink-0 w-1.5 h-1.5 rotate-45 bg-[#d4af37]/30" style={{ boxShadow: "0 0 4px rgba(212,175,55,0.2)" }} />

            <HpBar hp={playerHp} maxHp={maxPlayerHp} side="player" />
            <span className="text-[10px] md:text-[11px] font-mono text-white/30 w-7 md:w-9 tabular-nums font-bold">
              {playerHp}
            </span>
          </div>

          {/* 기세 행 */}
          <div className="flex items-center justify-between mt-1.5">
            <MomentumGauge level={aiMomentum} side="ai" />
            <MomentumGauge level={playerMomentum} side="player" />
          </div>

          {/* HUD 하단 장식선 */}
          <div className="mt-2 h-px"
            style={{ background: "linear-gradient(to right, transparent, rgba(212,175,55,0.15) 20%, rgba(212,175,55,0.15) 80%, transparent)" }}
          />
        </div>

        {/* ═══ 대치 영역 — 가변 높이 ═══ */}
        <motion.div
          className="flex-1 relative overflow-hidden"
          variants={shakeVariants}
          animate={shakeScreen ? "shake" : "idle"}
        >
          {/* 투기장 링 — 바닥 원형 */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{
              width: "70%",
              paddingBottom: "35%",
              borderRadius: "50%",
              border: "1px solid rgba(212,175,55,0.06)",
              background: "radial-gradient(ellipse at center, rgba(212,175,55,0.02) 0%, transparent 70%)",
              boxShadow: "inset 0 0 40px rgba(0,0,0,0.3)",
            }}
          />

          {/* AI (상단 우측) */}
          <div className="absolute top-[10%] right-[10%] md:top-[15%] md:right-[16%]">
            <DuelFighter
              avatarUrl={aiCard.avatarUrl}
              nickname={aiCard.nickname}
              pose={aiPose}
              flipped
              momentum={aiMomentum}
            />
          </div>

          {/* 합 워터마크 — 바닥 각인 */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <span className="font-cinzel text-white/[0.03] text-6xl md:text-7xl tracking-[0.4em] select-none"
              style={{ textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}
            >
              {phase !== "intro" && phase !== "end" ? `${round}` : ""}
            </span>
          </div>

          {/* Player (하단 좌측) */}
          <div className="absolute bottom-[10%] left-[10%] md:bottom-[15%] md:left-[16%]">
            <DuelFighter
              avatarUrl={playerCard.avatarUrl}
              nickname={playerCard.nickname}
              pose={playerPose}
              momentum={playerMomentum}
            />
          </div>
        </motion.div>

        {/* ═══ 하단 컨트롤 ═══ */}
        <div className="shrink-0 px-3 pb-4 pt-2 md:px-5 md:pb-5 safe-area-bottom"
          style={{
            background: "linear-gradient(to top, rgba(14,13,10,0.95), rgba(14,13,10,0.7) 60%, transparent)",
          }}
        >

          {/* 내러티브 */}
          <div className="text-center h-6 mb-3">
            {lastClash ? (
              <motion.span
                key={`${round}-${lastClash.playerAction}`}
                className="text-xs font-serif text-white/50"
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {DUEL_ACTION_LABELS[lastClash.playerAction]}
                <span className="text-white/25 mx-1.5">vs</span>
                {DUEL_ACTION_LABELS[lastClash.aiAction]}
                <span className="text-white/15 mx-1.5">&mdash;</span>
                <span className="text-white/40">{lastClash.narrative}</span>
              </motion.span>
            ) : (
              <span className="text-xs font-serif text-white/25">
                {phase === "intro" ? "" : "행동을 선택하세요"}
              </span>
            )}
          </div>

          {/* 액션 버튼 3열 */}
          <div className="flex gap-2.5 md:gap-3">
            {/* 충전 */}
            <ActionButton
              action="charge"
              icon={DUEL_ACTION_ICONS.charge}
              sub={`${playerMomentum}→${nextMomentum}`}
              canAct={canAct}
              highlight={false}
              onClick={() => handleAction("charge")}
            />
            {/* 공격 */}
            <ActionButton
              action="strike"
              icon={DUEL_ACTION_ICONS.strike}
              sub={`${strikeDmg}`}
              canAct={canAct}
              highlight={canAct && playerMomentum >= 4}
              onClick={() => handleAction("strike")}
            />
            {/* 버티기 */}
            <ActionButton
              action="brace"
              icon={DUEL_ACTION_ICONS.brace}
              sub="반감"
              canAct={canAct}
              highlight={false}
              onClick={() => handleAction("brace")}
            />
          </div>
        </div>

        {/* ═══ 인트로 오버레이 ═══ */}
        <AnimatePresence>
          {phase === "intro" && (
            <motion.div
              className="absolute inset-0 z-30 flex items-center justify-center px-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="absolute inset-0" style={{ background: "rgba(10,10,10,0.88)" }} />
              <button
                onClick={dismissIntro}
                className="relative w-full max-w-[300px] md:max-w-xs text-left rounded-sm px-5 py-5 space-y-4"
                style={{
                  background: "linear-gradient(to bottom, #1e1c18, #141310)",
                  border: "1px solid rgba(212,175,55,0.18)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), inset 0 -1px 0 rgba(0,0,0,0.3), 0 12px 40px rgba(0,0,0,0.7), 0 0 60px rgba(212,175,55,0.04)",
                }}
              >
                {/* 상단 장식선 */}
                <div className="absolute top-0 left-4 right-4 h-px"
                  style={{ background: "linear-gradient(to right, transparent, rgba(212,175,55,0.2), transparent)" }}
                />

                <div className="text-center">
                  <div className="font-cinzel text-[#d4af37] text-lg tracking-[0.3em]"
                    style={{ textShadow: "0 0 8px rgba(212,175,55,0.15)" }}
                  >
                    DUEL
                  </div>
                  <div className="text-[11px] font-serif text-white/30 mt-1 tracking-wide">
                    {playerCard.nickname} vs {aiCard.nickname}
                  </div>
                </div>

                <div className="space-y-2 text-[11px] text-white/40">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 text-center text-sm opacity-70">{DUEL_ACTION_ICONS.charge}</span>
                    <span><span className="text-[#d4af37]/70 font-serif">충전</span> <span className="text-white/25">&mdash;</span> 기세를 1 올린다</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 text-center text-sm opacity-70">{DUEL_ACTION_ICONS.strike}</span>
                    <span><span className="text-[#c0805a]/70 font-serif">공격</span> <span className="text-white/25">&mdash;</span> 기세만큼 피해</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 text-center text-sm opacity-70">{DUEL_ACTION_ICONS.brace}</span>
                    <span><span className="text-[#7a9ab0]/70 font-serif">버티기</span> <span className="text-white/25">&mdash;</span> 피해 반감</span>
                  </div>
                </div>

                <div className="text-[9px] text-white/20 space-y-0.5 font-serif">
                  <div>충전 중 공격당하면 풀데미지</div>
                  <div>상대 HP를 먼저 0으로 만들면 승리</div>
                </div>

                {/* 하단 장식선 */}
                <div className="absolute bottom-0 left-4 right-4 h-px"
                  style={{ background: "linear-gradient(to right, transparent, rgba(212,175,55,0.12), transparent)" }}
                />

                <div className="text-center text-[9px] font-cinzel text-[#d4af37]/30 tracking-[0.2em] pt-1 animate-pulse">
                  TAP TO START
                </div>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══ 종료 결과 ═══ */}
        <AnimatePresence>
          {phase === "end" && (
            <motion.div
              className="absolute inset-0 z-20 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className="absolute inset-0" style={{
                background: playerHp < aiHp
                  ? "radial-gradient(ellipse at center, rgba(160,48,48,0.15) 0%, rgba(10,10,10,0.9) 60%)"
                  : playerHp > aiHp
                    ? "radial-gradient(ellipse at center, rgba(212,175,55,0.08) 0%, rgba(10,10,10,0.9) 60%)"
                    : "rgba(10,10,10,0.88)",
              }} />
              <div className="relative text-center px-10 py-8 rounded-sm"
                style={{
                  background: "linear-gradient(to bottom, #1e1c18, #111)",
                  border: `1px solid ${playerHp > aiHp ? "rgba(212,175,55,0.2)" : playerHp < aiHp ? "rgba(160,48,48,0.2)" : "rgba(255,255,255,0.06)"}`,
                  boxShadow: "0 16px 48px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.04)",
                }}
              >
                <div className={`text-2xl md:text-3xl font-cinzel tracking-[0.25em] font-bold ${
                  playerHp > aiHp
                    ? "text-[#d4af37]"
                    : playerHp < aiHp
                      ? "text-[#c04040]"
                      : "text-white/40"
                }`}
                  style={playerHp > aiHp
                    ? { textShadow: "0 0 20px rgba(212,175,55,0.35), 0 0 40px rgba(212,175,55,0.15)" }
                    : playerHp < aiHp
                      ? { textShadow: "0 0 16px rgba(192,64,64,0.3)" }
                      : undefined
                  }
                >
                  {playerHp > aiHp ? "VICTORY" : playerHp < aiHp ? "DEFEAT" : "DRAW"}
                </div>
                <div className="text-[11px] md:text-xs font-mono text-white/30 mt-3 tabular-nums">
                  {playerCard.nickname} {playerHp} vs {aiHp} {aiCard.nickname}
                </div>
                <div className="text-[10px] md:text-[11px] font-serif text-white/25 mt-2">
                  {playerHp > aiHp
                    ? "아군 명령 효과 100% 적용"
                    : playerHp < aiHp
                      ? "적군 명령 효과 100% 적용"
                      : "양쪽 명령 효과 50% 적용"}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </motion.div>

      {/* ─── 착지 임팩트 플래시 ─── */}
      <AnimatePresence>
        {entered && phase === "intro" && (
          <motion.div
            key="impact-flash"
            className="absolute inset-0 pointer-events-none"
            style={{ zIndex: 1 }}
            initial={{ opacity: 0.7 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {/* 상단 임팩트 라인 */}
            <div className="absolute top-0 left-0 right-0 h-1"
              style={{ background: "linear-gradient(to right, transparent, rgba(212,175,55,0.5), transparent)" }}
            />
            {/* 전체 백색 플래시 */}
            <div className="absolute inset-0 bg-white/[0.06]" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── 액션 버튼 컴포넌트 — 석재 스타일 ───

function ActionButton({
  action,
  icon,
  sub,
  canAct,
  highlight,
  onClick,
}: {
  action: DuelAction;
  icon: string;
  sub: string;
  canAct: boolean;
  highlight: boolean;
  onClick: () => void;
}) {
  const cfg = ACTION_CFG[action];

  return (
    <button
      onClick={onClick}
      disabled={!canAct}
      className={`flex-1 flex flex-col items-center justify-center py-3.5 md:py-4 rounded-[4px] min-h-[60px] md:min-h-[68px]
        ${canAct
          ? `${cfg.activeClass} active:scale-[0.97] cursor-pointer`
          : "text-white/10 cursor-not-allowed"
        }
        ${highlight ? "animate-pulse" : ""}
      `}
      style={{
        background: canAct
          ? "linear-gradient(to bottom, rgba(38,36,30,0.8), rgba(20,18,14,0.95))"
          : "linear-gradient(to bottom, rgba(14,14,14,0.6), rgba(10,10,10,0.8))",
        border: canAct
          ? `2px solid ${highlight ? "rgba(212,175,55,0.35)" : "rgba(255,255,255,0.08)"}`
          : "1px solid rgba(255,255,255,0.03)",
        boxShadow: canAct
          ? `inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -2px 4px rgba(0,0,0,0.4), 0 4px 8px rgba(0,0,0,0.4)${highlight ? ", 0 0 12px rgba(212,175,55,0.15)" : ""}`
          : "inset 0 1px 3px rgba(0,0,0,0.5)",
      }}
    >
      <span className="text-base md:text-lg" style={{ opacity: canAct ? 0.9 : 0.3 }}>{icon}</span>
      <span className={`text-[11px] md:text-xs font-serif font-bold mt-1 tracking-wide ${canAct ? cfg.activeClass : ""}`}>
        {cfg.label}
      </span>
      <span className={`text-[9px] md:text-[10px] font-mono mt-0.5 ${canAct ? "text-white/30" : "text-white/10"}`}>
        {sub}
      </span>
    </button>
  );
}
