/*
  파일명: components/features/game/duel/ClashArena.tsx
  기능: 접전(draw) 미니게임 분기 래퍼
  책임: command에 따라 DuelArena / RhythmArena / SimonArena로 분기한다.
        진입 전 안내 모달을 표시한다.
*/
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Swords, ScrollText, Landmark } from "lucide-react";
import type { BattleCard, Command } from "@/lib/game/types";
import { COMMAND_LABELS } from "@/lib/game/types";
import { Z_INDEX } from "@/constants/zIndex";
import DuelArena from "./DuelArena";
import RhythmArena from "./RhythmArena";
import SimonArena from "./SimonArena";

// ─── 명령별 미니게임 안내 ───

const CLASH_INFO: Record<Command, { label: string; desc: string; icon: typeof Swords; color: string }> = {
  assault:   { label: "격돌", desc: "타이밍에 맞춰 공격하라", icon: Swords,     color: "#ef4444" },
  stratagem: { label: "설전", desc: "기세를 모아 상대를 제압하라", icon: ScrollText, color: "#a855f7" },
  govern:    { label: "지략전", desc: "패턴을 기억하고 재현하라", icon: Landmark,   color: "#f59e0b" },
};

// ─── 아바타 ───

function Avatar({ card, side }: { card: BattleCard; side: "left" | "right" }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="w-16 h-16 rounded-full overflow-hidden border-2"
        style={{ borderColor: side === "left" ? "rgba(212,175,55,0.4)" : "rgba(220,80,80,0.4)" }}
      >
        {card.avatarUrl ? (
          <img src={card.avatarUrl} alt={card.nickname} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-[#2a2720] flex items-center justify-center text-white/30 text-lg font-bold">
            {card.nickname[0]}
          </div>
        )}
      </div>
      <span className="text-xs text-white/60 font-bold tracking-wide max-w-[80px] truncate text-center">
        {card.nickname}
      </span>
    </div>
  );
}

// ─── Props ───

interface Props {
  playerCard: BattleCard;
  aiCard: BattleCard;
  command: Command;
  onComplete: (winner: "player" | "ai" | "draw") => void;
}

export default function ClashArena({ playerCard, aiCard, command, onComplete }: Props) {
  const [showAnnounce, setShowAnnounce] = useState(true);

  if (showAnnounce) {
    const info = CLASH_INFO[command];
    const Icon = info.icon;

    return (
      <div
        className="fixed inset-0 flex items-center justify-center px-4"
        style={{ zIndex: Z_INDEX.gameDuel }}
      >
        {/* 배경 */}
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: "#151310",
            backgroundImage: `
              radial-gradient(ellipse 60% 40% at 50% 45%, rgba(212,175,55,0.06) 0%, transparent 70%),
              linear-gradient(to bottom, #151310, #1a1714 30%, #121010)
            `,
          }}
        />

        <motion.button
          onClick={() => setShowAnnounce(false)}
          className="relative w-full max-w-sm md:max-w-md text-center rounded-sm px-6 py-8 space-y-6"
          style={{
            background: "linear-gradient(to bottom, #2a2720, #1c1a16)",
            border: "1px solid rgba(212,175,55,0.22)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), inset 0 -1px 0 rgba(0,0,0,0.3), 0 12px 40px rgba(0,0,0,0.7), 0 0 60px rgba(212,175,55,0.04)",
          }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          {/* 상단 장식선 */}
          <div className="absolute top-0 left-4 right-4 h-px"
            style={{ background: "linear-gradient(to right, transparent, rgba(212,175,55,0.2), transparent)" }}
          />

          {/* 타이틀 */}
          <div>
            <div className="text-sm text-white/50 tracking-widest mb-1">같은 패!</div>
            <div
              className="font-cinzel text-[#d4af37] text-2xl tracking-[0.3em]"
              style={{ textShadow: "0 0 8px rgba(212,175,55,0.15)" }}
            >
              접전 발생
            </div>
          </div>

          {/* 아바타 + 명령 아이콘 */}
          <div className="flex items-center justify-center gap-6">
            <Avatar card={playerCard} side="left" />
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{
                  background: `radial-gradient(circle, ${info.color}20, transparent)`,
                  border: `1px solid ${info.color}40`,
                }}
              >
                <Icon size={20} color={info.color} />
              </div>
              <span className="text-[10px] text-white/40 tracking-wider">{COMMAND_LABELS[command]}</span>
            </div>
            <Avatar card={aiCard} side="right" />
          </div>

          {/* 미니게임 안내 */}
          <div
            className="rounded-sm px-4 py-3"
            style={{
              background: "rgba(0,0,0,0.3)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div className="text-base font-bold text-white/80 mb-1" style={{ color: info.color }}>
              {info.label}
            </div>
            <div className="text-sm text-white/50">
              {info.desc}
            </div>
          </div>

          {/* 하단 장식선 */}
          <div className="absolute bottom-0 left-4 right-4 h-px"
            style={{ background: "linear-gradient(to right, transparent, rgba(212,175,55,0.12), transparent)" }}
          />

          {/* TAP TO START */}
          <div className="text-xs font-cinzel text-[#d4af37]/60 tracking-[0.2em] pt-1 animate-pulse">
            TAP TO START
          </div>
        </motion.button>
      </div>
    );
  }

  switch (command) {
    case "stratagem":
      return <DuelArena playerCard={playerCard} aiCard={aiCard} command={command} onComplete={onComplete} />;
    case "assault":
      return <RhythmArena playerCard={playerCard} aiCard={aiCard} onComplete={onComplete} />;
    case "govern":
      return <SimonArena playerCard={playerCard} aiCard={aiCard} onComplete={onComplete} />;
  }
}
