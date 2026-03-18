/*
  파일명: DuelArena/DuelArena.tsx
  기능: 일기토 전체 UI (대치 → 충전/공격/버티기 → 결과)
  책임: DuelFighter 2체 배치, HP/기세 게이지, 액션 버튼, 타이머 관리.
*/
"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocale } from "next-intl";
import type { Locale } from "@/types/locale";
import type { DuelAction, DuelPhase, DuelClashResult } from "@/lib/game/duelEngine";
import {
  calcDuelHp, resolveDuelClash, updateMomentum, duelAiDecide,
  calcStatMod,
  INITIAL_MOMENTUM,
  DUEL_CMD_CONFIG,
} from "@/lib/game/duelEngine";
import DuelFighter, { type FighterPose } from "../DuelFighter";
import ArenaHud from "../shared/ArenaHud";
import { Z_INDEX } from "@/constants/zIndex";

import type { DuelArenaProps } from "./types";
import { HpBar, MomentumGauge, DuelTimer } from "./sections/DuelGauges";
import ActionButton from "./sections/ActionButton";
import { ACTION_STYLE, INTRO_ACTION_COLOR } from "./sections/ActionButton";
import { ACTION_ICONS } from "./sections/ActionIcons";
import SpeechBubble from "./sections/SpeechBubble";
import {
  actionToPose, shakeVariants,
  playerDashVariants, aiDashVariants, poseToDash,
  pickDuelLine, pickIdleLine,
} from "./sections/duelHelpers";

// ─── 메인 컴포넌트 ───

export default function DuelArena({ playerCard, aiCard, command, vsAi = true, onComplete }: DuelArenaProps) {
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
  const [playerBubble, setPlayerBubble] = useState("");
  const [aiBubble, setAiBubble] = useState("");
  const [playerLastAction, setPlayerLastAction] = useState<DuelAction | undefined>(undefined);
  const locale = useLocale() as Locale;

  const maxPlayerHp = calcDuelHp(playerCard, command);
  const maxAiHp = calcDuelHp(aiCard, command);
  const canAct = phase === "select";

  const cmdCfg = useMemo(() => DUEL_CMD_CONFIG[command], [command]);
  const statLabel = command === "assault" ? "무력" : command === "stratagem" ? "논리" : "통솔";

  const playerStat = command === "assault" ? playerCard.ability.martial
    : command === "stratagem" ? playerCard.ability.intellect
    : playerCard.ability.command;
  const aiStat = command === "assault" ? aiCard.ability.martial
    : command === "stratagem" ? aiCard.ability.intellect
    : aiCard.ability.command;

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

  // ─── idle 잡담: select 대기 중 번갈아 대사 ───
  const idleTurnRef = useRef<"player" | "ai">("ai");
  const idleDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showIdleBubble = useCallback((side: "player" | "ai") => {
    const card = side === "player" ? playerCard : aiCard;
    const line = pickIdleLine(card, locale);
    if (!line) return;

    if (side === "player") setPlayerBubble(line);
    else setAiBubble(line);

    // 2.5초 후 자동 소멸
    if (idleDismissRef.current) clearTimeout(idleDismissRef.current);
    idleDismissRef.current = setTimeout(() => {
      if (side === "player") setPlayerBubble("");
      else setAiBubble("");
    }, 2500);
  }, [playerCard, aiCard]);

  useEffect(() => {
    if (phase !== "select") return;

    const tick = () => {
      const side = idleTurnRef.current;
      showIdleBubble(side);
      idleTurnRef.current = side === "player" ? "ai" : "player";
    };

    // 첫 대사 3초 후, 이후 4초 간격 교대
    const first = setTimeout(tick, 3000);
    const interval = setInterval(tick, 4000);

    return () => {
      clearTimeout(first);
      clearInterval(interval);
      if (idleDismissRef.current) clearTimeout(idleDismissRef.current);
    };
  }, [phase, showIdleBubble]);

  // ─── 파이터 클릭 → 대사 ───
  const handleFighterClick = useCallback((side: "player" | "ai", e: React.MouseEvent) => {
    e.stopPropagation(); // 화면 탭 스킵 방지
    if (phase !== "select") return;
    showIdleBubble(side);
  }, [phase, showIdleBubble]);

  const handleAction = useCallback((playerAction: DuelAction) => {
    if (phase !== "select") return;
    setPhase("clash");
    clearTimers();

    const aiAction = duelAiDecide(aiMomentum, playerMomentum, aiHp, playerHp, round, playerLastAction);
    setPlayerLastAction(playerAction);
    const clash = resolveDuelClash(playerAction, aiAction, playerMomentum, aiMomentum, playerStat, aiStat);
    setLastClash(clash);

    // ── 순차 연출: 플레이어 → AI → 결과 ──

    // t=0: 플레이어 행동 + 대사
    setPlayerPose(actionToPose(playerAction, false));
    setPlayerBubble(pickDuelLine(playerCard, playerAction, command, locale));

    const doResolve = () => {
      // t=1400: 피격 + 데미지 적용
      if (clash.playerDamage > 0) setPlayerPose("hit");
      if (clash.aiDamage > 0) setAiPose("hit");
      if (playerAction === "strike" || aiAction === "strike") setShakeScreen(true);

      timersRef.current.push(setTimeout(() => {
        setPlayerHp(Math.max(0, playerHp - clash.playerDamage));
        setAiHp(Math.max(0, aiHp - clash.aiDamage));
        setPlayerMomentum(updateMomentum(playerAction, playerMomentum));
        setAiMomentum(updateMomentum(aiAction, aiMomentum));
        setShakeScreen(false);
        setPhase("resolve");
        pendingResolve.current = null;
      }, 600));
    };
    pendingResolve.current = doResolve;

    timersRef.current.push(
      // t=700: AI 행동 + 대사
      setTimeout(() => {
        setAiPose(actionToPose(aiAction, false));
        setAiBubble(pickDuelLine(aiCard, aiAction, command, locale));
      }, 700),
      // t=1400: 충돌 결과
      setTimeout(doResolve, 1400),
    );
  }, [phase, playerMomentum, aiMomentum, playerHp, aiHp, round, playerStat, aiStat, playerLastAction, clearTimers]);

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
        setPlayerBubble("");
        setAiBubble("");
        setPhase("select");
      }
      pendingAdvance.current = null;
    };
    pendingAdvance.current = doAdvance;

    const t = setTimeout(doAdvance, 1200);
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
    if (phase === "clash" && pendingResolve.current) {
      clearTimers();
      pendingResolve.current();
      return;
    }
    if (phase === "resolve" && pendingAdvance.current) {
      pendingAdvance.current();
      return;
    }
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

  const statMod = calcStatMod(playerStat, aiStat);
  const strikeDmg = Math.max(0, playerMomentum + statMod);

  return (
    <div className="fixed inset-0" style={{ zIndex: Z_INDEX.gameDuel }} onClick={handleScreenClick}>

      {/* ─── 진입 연출: 위에서 내리찍기 ─── */}
      <motion.div
        className="absolute inset-0 flex flex-col"
        style={{
          backgroundColor: "#151310",
          backgroundImage: `
            var(--pattern-noise),
            radial-gradient(ellipse 60% 40% at 50% 45%, rgba(212,175,55,0.06) 0%, transparent 70%),
            radial-gradient(ellipse 100% 100% at 50% 50%, rgba(30,26,18,0.8) 0%, rgba(16,14,10,1) 70%),
            linear-gradient(to bottom, #151310, #1a1714 30%, #121010)
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

        {/* ═══ HUD 상단 — ArenaHud ═══ */}
        <ArenaHud
          playerCard={playerCard}
          aiCard={aiCard}
          themeColor="212,175,55"
          centerContent={
            phase !== "intro" && phase !== "end" ? (
              <>
                <span className="text-[9px] font-cinzel text-white/40 tracking-[0.2em] uppercase">합</span>
                <span className="text-2xl sm:text-3xl font-cinzel font-black text-white/90 leading-none"
                  style={{ textShadow: "0 0 8px rgba(212,175,55,0.2)" }}>{round}</span>
                {!vsAi && <DuelTimer active={phase === "select"} onTimeout={handleTimeout} />}
              </>
            ) : (
              <span className="text-sm font-cinzel text-[#d4af37]/50 tracking-[0.2em]">DUEL</span>
            )
          }
          playerContent={
            <>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-[#d4af37]/60 shrink-0">{statLabel}</span>
                <HpBar hp={playerHp} maxHp={maxPlayerHp} side="player" />
                <span className="text-sm font-mono text-white/60 tabular-nums font-bold shrink-0">{playerHp}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] font-bold text-[#d4af37]/60 shrink-0">기세</span>
                <MomentumGauge level={playerMomentum} side="player" />
                <span className="text-sm font-mono text-white/60 tabular-nums font-bold shrink-0">{playerMomentum}</span>
              </div>
            </>
          }
          aiContent={
            <>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-mono text-white/60 tabular-nums font-bold shrink-0">{aiHp}</span>
                <HpBar hp={aiHp} maxHp={maxAiHp} side="ai" />
                <span className="text-[10px] font-bold text-red-400/50 shrink-0">{statLabel}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-sm font-mono text-white/60 tabular-nums font-bold shrink-0">{aiMomentum}</span>
                <MomentumGauge level={aiMomentum} side="ai" />
                <span className="text-[10px] font-bold text-red-400/50 shrink-0">기세</span>
              </div>
            </>
          }
        />

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
              border: "1px solid rgba(212,175,55,0.12)",
              background: "radial-gradient(ellipse at center, rgba(212,175,55,0.04) 0%, transparent 70%)",
              boxShadow: "inset 0 0 40px rgba(0,0,0,0.3)",
            }}
          />

          {/* AI (상단 우측) — 공격 시 좌하 돌진 */}
          <motion.div
            className="absolute top-[10%] right-[10%] md:top-[15%] md:right-[16%] cursor-pointer"
            onClick={(e) => handleFighterClick("ai", e)}
            variants={aiDashVariants}
            animate={poseToDash(aiPose)}
          >
            <div className="relative">
              <DuelFighter
                avatarUrl={aiCard.avatarUrl}
                nickname={aiCard.nickname}
                pose={aiPose}
                flipped
                momentum={aiMomentum}
                command={command}
              />
              <AnimatePresence>
                {aiBubble && (
                  <SpeechBubble key={`ai-b-${round}-${aiBubble.slice(0, 6)}`} text={aiBubble} side="ai" />
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Player (하단 좌측) — 공격 시 우상 돌진 */}
          <motion.div
            className="absolute bottom-[10%] left-[10%] md:bottom-[15%] md:left-[16%] cursor-pointer"
            onClick={(e) => handleFighterClick("player", e)}
            variants={playerDashVariants}
            animate={poseToDash(playerPose)}
          >
            <div className="relative">
              <AnimatePresence>
                {playerBubble && (
                  <SpeechBubble key={`p-b-${round}-${playerBubble.slice(0, 6)}`} text={playerBubble} side="player" />
                )}
              </AnimatePresence>
              <DuelFighter
                avatarUrl={playerCard.avatarUrl}
                nickname={playerCard.nickname}
                pose={playerPose}
                momentum={playerMomentum}
                command={command}
              />
            </div>
          </motion.div>
        </motion.div>

        {/* ═══ 하단 컨트롤 ═══ */}
        <div className="shrink-0 px-4 pb-5 pt-3 md:px-6 md:pb-6 safe-area-bottom"
          style={{
            background: "linear-gradient(to top, rgba(24,22,18,0.97), rgba(20,18,14,0.8) 60%, transparent)",
          }}
        >

          {/* 내러티브 */}
          <div className="text-center h-7 mb-3">
            {lastClash ? (
              <motion.span
                key={`${round}-${lastClash.playerAction}`}
                className="text-sm text-white/70"
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {cmdCfg.labels[lastClash.playerAction]}
                <span className="text-white/40 mx-2">vs</span>
                {cmdCfg.labels[lastClash.aiAction]}
                <span className="text-white/30 mx-2">&mdash;</span>
                <span className="text-white/60">{lastClash.narrative}</span>
              </motion.span>
            ) : (
              <span className="text-sm text-white/40">
                {phase === "intro" ? "" : "행동을 선택하세요"}
              </span>
            )}
          </div>

          {/* 액션 버튼 3열 + 기권 */}
          <div className="flex gap-3 md:gap-4">
            <ActionButton
              action="charge"
              label={cmdCfg.labels.charge}
              Icon={ACTION_ICONS[command].charge}
              sub="기세 +1"
              canAct={canAct}
              highlight={false}
              onClick={() => handleAction("charge")}
            />
            <ActionButton
              action="strike"
              label={cmdCfg.labels.strike}
              Icon={ACTION_ICONS[command].strike}
              sub={`피해 ${strikeDmg}`}
              canAct={canAct}
              highlight={canAct && playerMomentum >= 4}
              onClick={() => handleAction("strike")}
            />
            <ActionButton
              action="brace"
              label={cmdCfg.labels.brace}
              Icon={ACTION_ICONS[command].brace}
              sub="피해 반감"
              canAct={canAct}
              highlight={false}
              onClick={() => handleAction("brace")}
            />
          </div>

          {/* 기권 버튼 */}
          <div className="flex justify-end mt-2">
            <button
              onClick={(e) => { e.stopPropagation(); onComplete("ai"); }}
              className="text-[11px] text-white/30 hover:text-white/50 transition-colors px-2 py-1 rounded"
              style={{ border: "1px solid rgba(255,255,255,0.08)" }}
            >
              기권
            </button>
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
              <div className="absolute inset-0" style={{ background: "rgba(10,10,10,0.82)" }} />
              <button
                onClick={dismissIntro}
                className="relative w-full max-w-sm md:max-w-md text-left rounded-sm px-6 py-6 space-y-5"
                style={{
                  background: "linear-gradient(to bottom, #2a2720, #1c1a16)",
                  border: "1px solid rgba(212,175,55,0.22)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), inset 0 -1px 0 rgba(0,0,0,0.3), 0 12px 40px rgba(0,0,0,0.7), 0 0 60px rgba(212,175,55,0.04)",
                }}
              >
                {/* 상단 장식선 */}
                <div className="absolute top-0 left-4 right-4 h-px"
                  style={{ background: "linear-gradient(to right, transparent, rgba(212,175,55,0.2), transparent)" }}
                />

                <div className="text-center">
                  <div className="font-cinzel text-[#d4af37] text-2xl tracking-[0.3em]"
                    style={{ textShadow: "0 0 8px rgba(212,175,55,0.15)" }}
                  >
                    DUEL
                  </div>
                  <div className="text-sm text-white/50 mt-1.5 tracking-wide">
                    {playerCard.nickname} vs {aiCard.nickname}
                  </div>
                </div>

                <div className="space-y-3 text-sm text-white/60">
                  {(["charge", "strike", "brace"] as DuelAction[]).map((action) => {
                    const IntroIcon = ACTION_ICONS[command][action];
                    return (
                      <div key={action} className="flex items-center gap-3">
                        <div className="shrink-0 w-7 flex justify-center">
                          <IntroIcon color={ACTION_STYLE[action].color} size={22} />
                        </div>
                        <span>
                          <span className={`${INTRO_ACTION_COLOR[action]} font-bold`}>{cmdCfg.labels[action]}</span>
                          <span className="text-white/40 mx-2">&mdash;</span>
                          {cmdCfg.descriptions[action]}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="text-xs text-white/40 space-y-1">
                  {cmdCfg.rules.map((rule, i) => (
                    <div key={i}>{rule}</div>
                  ))}
                </div>

                {/* 하단 장식선 */}
                <div className="absolute bottom-0 left-4 right-4 h-px"
                  style={{ background: "linear-gradient(to right, transparent, rgba(212,175,55,0.12), transparent)" }}
                />

                <div className="text-center text-xs font-cinzel text-[#d4af37]/60 tracking-[0.2em] pt-1 animate-pulse">
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
              <div className="relative text-center px-12 py-10 rounded-sm"
                style={{
                  background: "linear-gradient(to bottom, #2a2720, #1a1816)",
                  border: `1px solid ${playerHp > aiHp ? "rgba(212,175,55,0.2)" : playerHp < aiHp ? "rgba(160,48,48,0.2)" : "rgba(255,255,255,0.06)"}`,
                  boxShadow: "0 16px 48px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.04)",
                }}
              >
                <div className={`text-3xl md:text-4xl font-cinzel tracking-[0.25em] font-bold ${
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
                <div className="text-sm md:text-base font-mono text-white/50 mt-4 tabular-nums">
                  {playerCard.nickname} {playerHp}/{maxPlayerHp} vs {aiHp}/{maxAiHp} {aiCard.nickname}
                </div>
                <div className="text-sm text-white/40 mt-2">
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
            <div className="absolute top-0 left-0 right-0 h-1"
              style={{ background: "linear-gradient(to right, transparent, rgba(212,175,55,0.5), transparent)" }}
            />
            <div className="absolute inset-0 bg-white/[0.06]" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
