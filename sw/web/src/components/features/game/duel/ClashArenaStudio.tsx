/*
  파일명: components/features/game/duel/ClashArenaStudio.tsx
  기능: 접전 미니게임 3종 테스트 환경
  책임: ClashArena를 독립적으로 실행하여 미니게임을 수정·디버깅할 수 있게 한다.
*/
"use client";

import { useState, useCallback } from "react";
import { Swords, ScrollText, Landmark, Play, RotateCcw } from "lucide-react";
import type { BattleCard, Command } from "@/lib/game/types";
import ClashArena from "./ClashArena";

// ─── 미니게임 탭 정의 ───

const TABS: { command: Command; label: string; icon: typeof Swords; color: string }[] = [
  { command: "assault",   label: "격돌",   icon: Swords,     color: "#ef4444" },
  { command: "stratagem", label: "설전",   icon: ScrollText, color: "#a855f7" },
  { command: "govern",    label: "지략전", icon: Landmark,   color: "#f59e0b" },
];

// ─── 더미 카드 팩토리 ───

function makeDummyCard(
  side: "player" | "ai",
  overrides: { martial: number; intellect: number; command: number },
): BattleCard {
  return {
    id: `dummy-${side}`,
    nickname: side === "player" ? "플레이어" : "AI",
    profession: "commander",
    title: "테스트",
    nationality: "KR",
    avatarUrl: null,
    portraitUrl: null,
    quotes: "",
    gender: side === "player",
    speechTone: side === "player" ? "bold" : "composed",
    influence: { political: 5, strategic: 5, tech: 5, social: 5, economic: 5, cultural: 5 },
    ability: { ...overrides, charisma: 60 },
  };
}

// ─── 슬라이더 ───

function StatSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-white/50 w-16 shrink-0">{label}</span>
      <input
        type="range"
        min={10}
        max={99}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-[#d4af37] h-1"
      />
      <span className="text-xs text-white/70 w-8 text-right tabular-nums">{value}</span>
    </div>
  );
}

// ─── 메인 컴포넌트 ───

export default function ClashArenaStudio() {
  const [command, setCommand] = useState<Command>("assault");
  const [playing, setPlaying] = useState(false);
  const [result, setResult] = useState<"player" | "ai" | "draw" | null>(null);

  // 능력치 상태
  const [pMartial, setPMartial] = useState(70);
  const [pIntellect, setPIntellect] = useState(70);
  const [pCommand, setPCommand] = useState(70);
  const [aMartial, setAMartial] = useState(50);
  const [aIntellect, setAIntellect] = useState(50);
  const [aCommand, setACommand] = useState(50);

  const handleComplete = useCallback((winner: "player" | "ai" | "draw") => {
    setResult(winner);
    setPlaying(false);
  }, []);

  const handleStart = () => {
    setResult(null);
    setPlaying(true);
  };

  const RESULT_LABEL: Record<string, { text: string; color: string }> = {
    player: { text: "VICTORY", color: "#d4af37" },
    ai:     { text: "DEFEAT",  color: "#ef4444" },
    draw:   { text: "DRAW",    color: "#9ca3af" },
  };

  return (
    <>
      {/* 컨트롤 패널 */}
      <div className="w-full max-w-lg mx-auto space-y-6">
        {/* 미니게임 선택 탭 */}
        <div className="flex gap-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = command === tab.command;
            return (
              <button
                key={tab.command}
                onClick={() => { setCommand(tab.command); setResult(null); }}
                disabled={playing}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-sm text-sm font-bold tracking-wide transition-all disabled:opacity-40"
                style={{
                  background: active ? `${tab.color}18` : "rgba(255,255,255,0.03)",
                  border: `1px solid ${active ? `${tab.color}50` : "rgba(255,255,255,0.08)"}`,
                  color: active ? tab.color : "rgba(255,255,255,0.4)",
                }}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* 능력치 슬라이더 */}
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="text-xs text-white/40 font-bold tracking-wider mb-1">PLAYER</div>
            <StatSlider label="martial" value={pMartial} onChange={setPMartial} />
            <StatSlider label="intellect" value={pIntellect} onChange={setPIntellect} />
            <StatSlider label="command" value={pCommand} onChange={setPCommand} />
          </div>
          <div className="space-y-2">
            <div className="text-xs text-white/40 font-bold tracking-wider mb-1">AI</div>
            <StatSlider label="martial" value={aMartial} onChange={setAMartial} />
            <StatSlider label="intellect" value={aIntellect} onChange={setAIntellect} />
            <StatSlider label="command" value={aCommand} onChange={setACommand} />
          </div>
        </div>

        {/* 시작/결과 */}
        <div className="flex flex-col items-center gap-3">
          {result && (
            <div className="text-center space-y-1">
              <div
                className="text-2xl font-cinzel font-bold tracking-[0.3em]"
                style={{ color: RESULT_LABEL[result].color }}
              >
                {RESULT_LABEL[result].text}
              </div>
            </div>
          )}

          <button
            onClick={handleStart}
            disabled={playing}
            className="flex items-center gap-2 px-6 py-2.5 rounded-sm text-sm font-bold tracking-wider transition-all disabled:opacity-30"
            style={{
              background: "linear-gradient(to bottom, #2a2720, #1c1a16)",
              border: "1px solid rgba(212,175,55,0.3)",
              color: "#d4af37",
            }}
          >
            {result ? <RotateCcw size={14} /> : <Play size={14} />}
            {result ? "다시 시작" : "시작"}
          </button>
        </div>
      </div>

      {/* ClashArena 오버레이 (fixed inset-0) */}
      {playing && (
        <ClashArena
          playerCard={makeDummyCard("player", { martial: pMartial, intellect: pIntellect, command: pCommand })}
          aiCard={makeDummyCard("ai", { martial: aMartial, intellect: aIntellect, command: aCommand })}
          command={command}
          onComplete={handleComplete}
        />
      )}
    </>
  );
}
