/*
  파일명: DuelFighter/DuelFighter.tsx
  기능: 아바타 중심 일기토 캐릭터
  책임: 원형 아바타 + SVG 이펙트(기세 오라, 검격선, 방패, 피격, 낙진)로 행동을 표현한다.
        스켈레톤 바디 없이 아바타 사진과 이펙트만으로 연출.
*/
"use client";

import { motion, AnimatePresence, type Variants } from "framer-motion";
import Image from "next/image";
import { VB, CX, CY, type DuelFighterProps } from "./types";
import { SlashEffect } from "./sections/SlashEffect";
import { DebateEffect } from "./sections/DebateEffect";
import { HitEffect } from "./sections/HitEffect";

// ─── 아바타 위치 Variants (Step 2~6 재설계) ───

const avatarVariants: Variants = {
  // Step 2: idle — 호흡 강화
  idle: {
    x: 0, y: [0, -4, 0], scale: 1, rotate: 0, opacity: 1,
    transition: { y: { duration: 2.4, repeat: Infinity, ease: "easeInOut" } },
  },
  // charge — 제자리에서 기 모으기 (이동 없음, scale 맥동)
  charge: {
    x: 0, y: 0, scale: [1, 1.08, 1.04], rotate: 0,
    transition: { scale: { duration: 0.8, repeat: Infinity, ease: "easeInOut" }, duration: 0.2 },
  },
  // Step 4: slash — 전진 돌격 keyframes
  slash: {
    x: [0, 52, 18], scale: [1, 1.15, 1], rotate: [0, -8, 0], opacity: 1,
    transition: { duration: 0.35, ease: "easeOut" },
  },
  // Step 6: guard — 방어 웅크림
  guard: {
    x: -10, y: 3, scale: 0.93, rotate: 3,
    transition: { duration: 0.18, type: "spring", stiffness: 400, damping: 20 },
  },
  // Step 5: hit — spring-like 바운스
  hit: {
    x: [-30, -15], scale: [0.88, 1], rotate: [10, 0], opacity: 1,
    transition: { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] },
  },
  // Step 2: fallen — 쓰러짐
  fallen: {
    x: -28, y: 32, scale: 0.68, rotate: 45, opacity: 0.25,
    transition: { duration: 0.7, ease: "easeIn" },
  },
};

// ─── 기세 글로우 ───

function getMomentumGlow(level: number): string {
  if (level >= 4) return "drop-shadow(0 0 20px rgba(251,191,36,0.95)) drop-shadow(0 0 40px rgba(251,146,36,0.5)) drop-shadow(0 0 8px rgba(255,220,100,0.3))";
  if (level >= 3) return "drop-shadow(0 0 14px rgba(251,191,36,0.75)) drop-shadow(0 0 6px rgba(255,220,100,0.2))";
  if (level >= 2) return "drop-shadow(0 0 8px rgba(251,191,36,0.55))";
  if (level >= 1) return "drop-shadow(0 0 5px rgba(251,191,36,0.35))";
  return "none";
}

// ─── 낙진 이펙트 (fallen) ───

function FallenEffect() {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${VB} ${VB}`} fill="none">
      {/* 낙진 파티클 4개 */}
      {[
        { x: 35, y: 70, r: 2, delay: 0.3 },
        { x: 45, y: 75, r: 1.5, delay: 0.4 },
        { x: 55, y: 68, r: 2.5, delay: 0.35 },
        { x: 42, y: 80, r: 1.8, delay: 0.45 },
      ].map((p, i) => (
        <motion.circle
          key={`fp${i}`}
          cx={p.x} cy={p.y} r={p.r}
          fill="rgba(255,255,255,0.4)"
          initial={{ opacity: 0.6, y: -10 }}
          animate={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.5, delay: p.delay, ease: "easeIn" }}
        />
      ))}
      {/* 소멸 링 — 쓰러진 위치에 타원 확산 후 사라짐 */}
      <motion.ellipse
        cx={38} cy={85} rx={8} ry={3}
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="0.8"
        fill="none"
        initial={{ scale: 0.3, opacity: 0.5 }}
        animate={{ scale: 2.5, opacity: 0 }}
        transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
      />
    </svg>
  );
}

// ─── 충전 오라 (charge) ───

function ChargeAura({ momentum }: { momentum: number }) {
  const rings = Math.min(Math.max(momentum, 1), 5);

  return (
    <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${VB} ${VB}`} fill="none">
      {/* 수렴 집중선 8방향 — 바깥→중심 수렴 (dashoffset 애니메이션) */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i * 45) * (Math.PI / 180);
        const x1 = CX + Math.cos(angle) * 56;
        const y1 = CY + Math.sin(angle) * 56;
        const x2 = CX + Math.cos(angle) * 26;
        const y2 = CY + Math.sin(angle) * 26;
        return (
          <motion.line
            key={`cl${i}`}
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="rgba(251,191,36,0.6)"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeDasharray="4 3"
            initial={{ strokeDashoffset: 0, opacity: 0.3 }}
            animate={{ strokeDashoffset: -14, opacity: [0.3, 0.8, 0.3] }}
            transition={{
              duration: 0.5,
              delay: i * 0.03,
              repeat: Infinity,
              repeatDelay: 0.4,
              ease: "linear",
            }}
          />
        );
      })}

      {/* 에너지 링 — momentum 개수만큼, 맥동 */}
      {Array.from({ length: rings }).map((_, i) => (
        <motion.circle
          key={`er${i}`}
          cx={CX} cy={CY} r={30 + i * 5}
          stroke={`rgba(251,191,36,${0.35 - i * 0.05})`}
          strokeWidth="0.8"
          fill="none"
          initial={{ scale: 0.85, opacity: 0.2 }}
          animate={{ scale: [0.85, 1.05, 0.85], opacity: [0.2, 0.5, 0.2] }}
          transition={{
            duration: 1.4,
            repeat: Infinity,
            delay: i * 0.12,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* 내부 글로우 원 — 미세 opacity 맥동 */}
      <motion.circle
        cx={CX} cy={CY} r={24}
        fill="rgba(251,191,36,0.04)"
        initial={{ opacity: 0.3 }}
        animate={{ opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      />
    </svg>
  );
}

// ─── 방패 (guard) ───

function GuardEffect() {
  // 방패형 path — 뾰족 상단
  const shieldPath = "M60 18 L80 35 L80 72 Q80 82 60 88 Q40 82 40 72 L40 35 Z";

  return (
    <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${VB} ${VB}`} fill="none">
      <defs>
        <filter id="guard-glow">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="rgba(96,165,250,0.6)" />
        </filter>
      </defs>

      {/* 방패 본체 — 뾰족 상단 방패형 */}
      <motion.path
        d={shieldPath}
        stroke="rgba(96,165,250,0.85)"
        strokeWidth="2.2"
        strokeLinejoin="round"
        fill="rgba(96,165,250,0.06)"
        filter="url(#guard-glow)"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.18, type: "spring", stiffness: 350, damping: 18 }}
      />

      {/* 방패 내부 가로 리본 3줄 */}
      {[44, 55, 66].map((y, i) => (
        <motion.line
          key={`rib${i}`}
          x1={44} y1={y} x2={76} y2={y}
          stroke="rgba(96,165,250,0.25)"
          strokeWidth="1"
          strokeLinecap="round"
          initial={{ opacity: 0, pathLength: 0 }}
          animate={{ opacity: 0.25, pathLength: 1 }}
          transition={{ duration: 0.15, delay: 0.2 + i * 0.03 }}
        />
      ))}

      {/* 충격 흡수 파동 2개 — 방패 표면에서 외부로 타원 확산 */}
      {[0, 0.15].map((delay, i) => (
        <motion.ellipse
          key={`gw${i}`}
          cx={CX} cy={55} rx={22} ry={35}
          stroke="rgba(96,165,250,0.3)"
          strokeWidth="0.8"
          fill="none"
          initial={{ scale: 0.8, opacity: 0.4 }}
          animate={{ scale: 1.6, opacity: 0 }}
          transition={{ duration: 0.45, delay: 0.15 + delay, ease: "easeOut" }}
        />
      ))}

      {/* 테두리 글로우 지속 — drop-shadow 맥동 */}
      <motion.path
        d={shieldPath}
        stroke="rgba(96,165,250,0.4)"
        strokeWidth="1"
        fill="none"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.2, 0.5, 0.2] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      />
    </svg>
  );
}

// ─── 컴포넌트 ───

export default function DuelFighter({
  avatarUrl,
  nickname,
  pose,
  flipped = false,
  momentum = 0,
  command,
  className = "",
}: DuelFighterProps) {
  const mirrorX = flipped ? -1 : 1;
  const avatarSize = 88;

  return (
    <div
      className={`relative w-[200px] h-[200px] ${className}`}
      style={{ transform: `scaleX(${mirrorX})` }}
    >
      {/* ─── 이펙트 레이어 (아바타 뒤) ─── */}
      <AnimatePresence mode="wait">
        {pose === "charge" && (
          <motion.div
            key="charge"
            className="absolute inset-0 z-0"
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
          >
            <ChargeAura momentum={momentum} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── 아바타 ─── */}
      <motion.div
        className="absolute z-10"
        style={{
          left: "50%",
          top: "50%",
          marginLeft: -avatarSize / 2,
          marginTop: -avatarSize / 2,
          width: avatarSize,
          height: avatarSize,
          filter: getMomentumGlow(momentum),
        }}
        animate={pose}
        variants={avatarVariants}
      >
        <div className={`w-full h-full rounded-full overflow-hidden shadow-lg ${
          pose === "hit"
            ? "border-[3px] border-red-500/70"
            : pose === "guard"
              ? "border-[3px] border-blue-400/60"
              : "border-[3px] border-white/25"
        }`}
          style={{
            boxShadow: pose === "hit"
              ? "inset 0 0 8px rgba(239,68,68,0.3), 0 0 12px rgba(239,68,68,0.2), 0 2px 8px rgba(0,0,0,0.6)"
              : pose === "guard"
                ? "inset 0 0 8px rgba(96,165,250,0.2), 0 0 12px rgba(96,165,250,0.15), 0 2px 8px rgba(0,0,0,0.6)"
                : "inset 0 0 6px rgba(0,0,0,0.4), 0 0 8px rgba(212,175,55,0.08), 0 3px 10px rgba(0,0,0,0.7)",
          }}
        >
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={nickname}
              width={avatarSize}
              height={avatarSize}
              className="w-full h-full object-cover"
              style={{ transform: `scaleX(${mirrorX})` }}
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center bg-white/[0.06] text-white/30 text-sm font-bold"
              style={{ transform: `scaleX(${mirrorX})` }}
            >
              {nickname.charAt(0)}
            </div>
          )}
        </div>

        {/* 피격 시 붉은 오버레이 (Step 5) */}
        <AnimatePresence>
          {pose === "hit" && (
            <motion.div
              className="absolute inset-0 rounded-full bg-red-500/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.7, 0] }}
              transition={{ duration: 0.35 }}
            />
          )}
        </AnimatePresence>
      </motion.div>

      {/* ─── 이펙트 레이어 (아바타 앞) ─── */}
      <AnimatePresence mode="wait">
        {pose === "slash" && (
          <motion.div
            key="slash"
            className="absolute inset-0 z-20"
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
          >
            <HitEffect />
          </motion.div>
        )}
        {pose === "guard" && (
          <motion.div
            key="guard"
            className="absolute inset-0 z-20"
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
          >
            <GuardEffect />
          </motion.div>
        )}
        {pose === "hit" && (
          <motion.div
            key="hit"
            className="absolute inset-0 z-20"
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
          >
            {command === "stratagem" ? <DebateEffect /> : <SlashEffect />}
          </motion.div>
        )}
        {pose === "fallen" && (
          <motion.div
            key="fallen"
            className="absolute inset-0 z-20"
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
          >
            <FallenEffect />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
