/*
  파일명: components/features/game/duel/DuelArena.tsx
  기능: 일기토 전체 UI (대치 → 충전/공격/버티기 → 결과)
  책임: DuelFighter 2체 배치, HP/기세 게이지, 액션 버튼, 타이머 관리.
*/
"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocale } from "next-intl";
import type { BattleCard, Command } from "@/lib/game/types";
import {
  type DuelAction, type DuelPhase, type DuelClashResult,
  calcDuelHp, resolveDuelClash, updateMomentum, duelAiDecide,
  calcStatMod,
  MAX_MOMENTUM, INITIAL_MOMENTUM, DUEL_TIME_LIMIT_PVP,
  DUEL_CMD_CONFIG,
} from "@/lib/game/duelEngine";
import DuelFighter, { type FighterPose } from "./DuelFighter";
import ArenaHud from "./shared/ArenaHud";
import { Z_INDEX } from "@/constants/zIndex";
import defaultLinesData from "@/lib/game/voice/defaultLines";
import { stripEmotionTag } from "@/components/features/game/shared/hooks/useDialogue";

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
  const fill = pct > 50
    ? "bg-gradient-to-r from-[#8a732a] to-[#d4af37]"
    : pct > 25
      ? "bg-gradient-to-r from-[#8a5a2a] to-[#c08030]"
      : "bg-gradient-to-r from-[#6b2020] to-[#a03030]";
  const dir = side === "ai" ? "justify-end" : "justify-start";

  return (
    <div className="flex-1">
      <div className={`h-5 md:h-6 rounded-[3px] overflow-hidden flex ${dir}`}
        style={{
          background: "linear-gradient(to bottom, rgba(8,8,8,0.95), rgba(20,20,20,0.9))",
          boxShadow: "inset 0 2px 4px rgba(0,0,0,0.8), inset 0 -1px 0 rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.5)",
          border: "1px solid rgba(255,255,255,0.08)",
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

// ─── 기세 게이지 — 석판 블록 ───

function MomentumGauge({ level, side }: { level: number; side: "player" | "ai" }) {
  return (
    <div className={`flex items-center gap-1 ${side === "ai" ? "justify-end" : "justify-start"}`}>
      {Array.from({ length: MAX_MOMENTUM }).map((_, i) => (
        <div
          key={i}
          className={`w-4 h-3 md:w-5 md:h-3.5 rounded-[2px] ${
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
    <span className={`text-sm font-mono tabular-nums ${timeLeft <= 2 ? "text-[#a03030]" : "text-white/50"}`}>
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

// ─── 대시 (공격 시 상대 방향으로 돌진) ───

// Player(하단좌) → 우상 방향 돌진
const playerDashVariants = {
  idle: { x: 0, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
  dash: {
    x: [0, 60, 20],
    y: [0, -50, -15],
    transition: { duration: 0.35, ease: "easeOut" as const },
  },
  recoil: {
    x: [-20, 0],
    y: [10, 0],
    transition: { duration: 0.3, ease: "easeOut" as const },
  },
};

// AI(상단우) → 좌하 방향 돌진
const aiDashVariants = {
  idle: { x: 0, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
  dash: {
    x: [0, -60, -20],
    y: [0, 50, 15],
    transition: { duration: 0.35, ease: "easeOut" as const },
  },
  recoil: {
    x: [20, 0],
    y: [-10, 0],
    transition: { duration: 0.3, ease: "easeOut" as const },
  },
};

function poseToDash(pose: FighterPose): "idle" | "dash" | "recoil" {
  if (pose === "slash") return "dash";
  if (pose === "hit") return "recoil";
  return "idle";
}

// ─── 액션 버튼 설정 ───

const ACTION_STYLE: Record<DuelAction, {
  activeClass: string;
  color: string;
  glowColor: string;
  bgTint: string;
  borderColor: string;
}> = {
  charge: {
    activeClass: "text-[#d4af37]",
    color: "#d4af37",
    glowColor: "rgba(212,175,55,0.3)",
    bgTint: "rgba(212,175,55,0.10)",
    borderColor: "rgba(212,175,55,0.45)",
  },
  strike: {
    activeClass: "text-[#e8734a]",
    color: "#e8734a",
    glowColor: "rgba(232,115,74,0.35)",
    bgTint: "rgba(232,115,74,0.12)",
    borderColor: "rgba(232,115,74,0.55)",
  },
  brace: {
    activeClass: "text-[#7a9ab0]",
    color: "#7a9ab0",
    glowColor: "rgba(122,154,176,0.3)",
    bgTint: "rgba(122,154,176,0.10)",
    borderColor: "rgba(122,154,176,0.45)",
  },
};

// ─── 인트로 액션 색상 ───

const INTRO_ACTION_COLOR: Record<DuelAction, string> = {
  charge: "text-[#d4af37]",
  strike: "text-[#c0805a]",
  brace: "text-[#7a9ab0]",
};

// ─── SVG 아이콘 (명령별) ───

function AssaultChargeIcon({ color, size = 28 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill={color} fillOpacity="0.15" />
    </svg>
  );
}

function AssaultStrikeIcon({ color, size = 28 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2L20 7.5 8 19.5 2.5 14 14.5 2z" fill={color} fillOpacity="0.1" />
      <path d="M16 8L2 22" />
      <path d="M8 2v4h4" />
    </svg>
  );
}

function AssaultBraceIcon({ color, size = 28 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3L4 9v6c0 4 3.5 7.5 8 9 4.5-1.5 8-5 8-9V9l-8-6z" fill={color} fillOpacity="0.1" />
    </svg>
  );
}

function StratagemChargeIcon({ color, size = 28 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" fill={color} fillOpacity="0.08" />
      <path d="M9 9c0-1.5 1.2-3 3-3s3 1.5 3 3c0 2-3 2.5-3 4.5" />
      <circle cx="12" cy="17.5" r="0.8" fill={color} />
    </svg>
  );
}

function StratagemStrikeIcon({ color, size = 28 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
      {/* 확성기 본체 */}
      <path
        d="M4 9h3l5-5v16l-5-5H4a1 1 0 01-1-1v-4a1 1 0 011-1z"
        fill={color} fillOpacity="0.12"
        stroke={color} strokeWidth="1.8"
      />
      {/* 음파 — 전방 확산 */}
      <path d="M16 8c1.5 1.2 2.2 2.8 2.2 4.5S17.5 15.3 16 16.5" stroke={color} strokeWidth="1.8" />
      <path d="M19 5.5c2.3 2 3.5 4.7 3.5 7s-1.2 5-3.5 7" stroke={color} strokeWidth="1.5" opacity="0.6" />
    </svg>
  );
}

function StratagemBraceIcon({ color, size = 28 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C7 2 3 6 3 11v2c0 5 4 9 9 9s9-4 9-9v-2c0-5-4-9-9-9z" fill={color} fillOpacity="0.06" />
      <path d="M8 12c1.5-2 3-2 4 0s2.5 2 4 0" />
      <path d="M8 8c1.5-2 3-2 4 0s2.5 2 4 0" />
      <path d="M8 16c1.5-2 3-2 4 0s2.5 2 4 0" />
    </svg>
  );
}

type IconComponent = React.FC<{ color: string; size?: number }>;

const ACTION_ICONS: Record<Command, Record<DuelAction, IconComponent>> = {
  assault: {
    charge: AssaultChargeIcon,
    strike: AssaultStrikeIcon,
    brace: AssaultBraceIcon,
  },
  stratagem: {
    charge: StratagemChargeIcon,
    strike: StratagemStrikeIcon,
    brace: StratagemBraceIcon,
  },
  govern: {
    charge: AssaultChargeIcon,
    strike: AssaultStrikeIcon,
    brace: AssaultBraceIcon,
  },
};

// ─── 대사 선택 ───

function pickDuelLine(card: BattleCard, action: DuelAction, command: Command, locale: 'ko' | 'en'): string {
  // strike → 개인 clash_attack 우선
  if (action === "strike" && card.dialogueLines?.clash_attack) {
    const lines = card.dialogueLines.clash_attack;
    const raw = lines[Math.floor(Math.random() * lines.length)];
    if (raw) return stripEmotionTag(raw);
  }

  const isDebate = command === "stratagem";
  const keyMap: Record<DuelAction, string> = {
    charge: isDebate ? "duel_debate_charge" : "duel_charge",
    strike: isDebate ? "duel_debate_strike" : "duel_strike",
    brace: isDebate ? "duel_debate_brace" : "duel_brace",
  };

  const tone = card.speechTone;
  const lines = defaultLinesData[locale][keyMap[action]]?.[tone];
  if (lines?.length) return lines[Math.floor(Math.random() * lines.length)];
  return "";
}

/** idle/클릭 시 대사: answer → greeting 순으로 개인 대사 탐색, 없으면 defaultLines 폴백 */
function pickIdleLine(card: BattleCard, locale: 'ko' | 'en'): string {
  for (const type of ["answer", "greeting"] as const) {
    const personal = card.dialogueLines?.[type];
    if (personal) {
      const raw = personal[Math.floor(Math.random() * personal.length)];
      if (raw) return stripEmotionTag(raw);
    }
  }
  const fallback = defaultLinesData[locale]["greeting"]?.[card.speechTone];
  if (fallback?.length) return fallback[Math.floor(Math.random() * fallback.length)];
  return "";
}

// ─── 말풍선 ───

function SpeechBubble({ text, side }: { text: string; side: "player" | "ai" }) {
  const isPlayer = side === "player";
  // DuelFighter는 200×200, 아바타(88px)는 중앙 배치 → 머리 위 = top ≈ 36px
  // 양쪽 모두 인물 머리 바로 위에 띄운다
  return (
    <motion.div
      className="absolute z-30 pointer-events-none"
      style={{
        width: 170,
        bottom: 160, // 200px 컨테이너 바닥에서 160px 위 = 머리 바로 위
        ...(isPlayer ? { left: -10 } : { right: -10 }),
      }}
      initial={{ scale: 0.6, opacity: 0, y: 8 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.7, opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <div
        className="relative rounded-lg px-3 py-2 text-xs leading-relaxed text-white/90"
        style={{
          background: "rgba(10,8,6,0.9)",
          border: "1px solid rgba(212,175,55,0.2)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
        }}
      >
        {text}
        {/* Tail — 말풍선 꼬리 (항상 아래쪽) */}
        <div
          className="absolute w-2.5 h-2.5 rotate-45"
          style={{
            background: "rgba(10,8,6,0.9)",
            bottom: -5,
            ...(isPlayer
              ? { left: 20, borderRight: "1px solid rgba(212,175,55,0.2)", borderBottom: "1px solid rgba(212,175,55,0.2)" }
              : { right: 20, borderRight: "1px solid rgba(212,175,55,0.2)", borderBottom: "1px solid rgba(212,175,55,0.2)" }),
          }}
        />
      </div>
    </motion.div>
  );
}

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
  const [playerBubble, setPlayerBubble] = useState("");
  const [aiBubble, setAiBubble] = useState("");
  const [playerLastAction, setPlayerLastAction] = useState<DuelAction | undefined>(undefined);
  const locale = useLocale() as 'ko' | 'en';

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

// ─── 액션 버튼 컴포넌트 — 석재 스타일 ───

function ActionButton({
  action,
  label,
  Icon,
  sub,
  canAct,
  highlight,
  onClick,
}: {
  action: DuelAction;
  label: string;
  Icon: IconComponent;
  sub: string;
  canAct: boolean;
  highlight: boolean;
  onClick: () => void;
}) {
  const cfg = ACTION_STYLE[action];
  const iconColor = canAct ? cfg.color : "rgba(255,255,255,0.25)";

  return (
    <button
      onClick={onClick}
      disabled={!canAct}
      className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-5 md:py-6 rounded-lg min-h-[84px] md:min-h-[96px] transition-colors
        ${canAct
          ? "active:scale-[0.97] cursor-pointer"
          : "cursor-not-allowed"
        }
        ${highlight ? "animate-pulse" : ""}
      `}
      style={{
        background: canAct
          ? `linear-gradient(to bottom, ${cfg.bgTint}, rgba(18,16,12,0.95))`
          : "linear-gradient(to bottom, rgba(24,22,18,0.5), rgba(16,14,12,0.7))",
        borderTop: canAct ? `3px solid ${cfg.borderColor}` : "1px solid rgba(255,255,255,0.06)",
        borderLeft: canAct ? `1px solid ${highlight ? cfg.color + "40" : "rgba(255,255,255,0.08)"}` : "1px solid rgba(255,255,255,0.06)",
        borderRight: canAct ? `1px solid ${highlight ? cfg.color + "40" : "rgba(255,255,255,0.08)"}` : "1px solid rgba(255,255,255,0.06)",
        borderBottom: canAct ? `1px solid rgba(255,255,255,0.05)` : "1px solid rgba(255,255,255,0.06)",
        boxShadow: canAct
          ? `inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -2px 6px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.5)${highlight ? `, 0 0 20px ${cfg.glowColor}` : ""}`
          : "inset 0 1px 3px rgba(0,0,0,0.5)",
      }}
    >
      <div style={{ opacity: canAct ? 1 : 0.3, filter: canAct ? `drop-shadow(0 0 4px ${cfg.glowColor})` : "none" }}>
        <Icon color={iconColor} size={30} />
      </div>
      <span className={`text-sm md:text-base font-bold tracking-wide ${canAct ? cfg.activeClass : "text-white/25"}`}>
        {label}
      </span>
      <span className={`text-[11px] md:text-xs font-mono ${canAct ? "text-white/45" : "text-white/20"}`}>
        {sub}
      </span>
    </button>
  );
}
