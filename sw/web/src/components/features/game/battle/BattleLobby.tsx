/*
  파일명: components/features/game/battle/BattleLobby.tsx
  기능: 패권 게임 로비 — 타이틀 스크린
  책임: 콘솔 게임 타이틀 화면처럼 배경 위에 시네마틱 타이틀과 메뉴를 띄운다.
*/
"use client";

import { useState, useRef, useCallback } from "react";
import {
  Swords, Bot, Users, Settings, BookOpen, LogOut,
  Crown, Layers, Trophy,
  BarChart3, ScrollText, Landmark, Shield, Flame,
} from "lucide-react";
import GameLobbySettings from "@/components/features/game/shared/GameLobbySettings";
import GameLobbyNavRow from "@/components/features/game/shared/GameLobbyNavRow";
import GameLobbyMain from "@/components/features/game/shared/GameLobbyMain";
import GameLobbySubmenu from "@/components/features/game/shared/GameLobbySubmenu";
import GameStartModal from "@/components/features/game/shared/GameStartModal";
import GameRulesSection from "@/components/features/game/shared/GameRulesSection";
import DuelDevStudio from "@/components/features/game/duel/DuelDevStudio";
import type { Difficulty } from "@/lib/game/types";

interface BattleLobbyProps {
  onStartVsAi: (difficulty: Difficulty) => void;
  onExit: () => void;
  bgmMuted: boolean;
  sfxMuted: boolean;
  toggleBgmMuted: () => void;
  toggleSfxMuted: () => void;
}

type MenuId = "main" | "rules" | "settings" | "dev_studio";

const DIFFICULTY_OPTIONS = [
  { value: "normal", label: "보통", englishLabel: "Normal", desc: "플레이어가 먼저 픽. 상대 카드 적성 공개.", icon: <Shield size={22} />, color: "accent" as const },
  { value: "hard", label: "어려움", englishLabel: "Hard", desc: "AI가 먼저 픽. 상대 카드 적성 비공개.", icon: <Flame size={22} />, color: "red" as const },
];

/* ═══════════════════════════════════════════
   메인 로비: 시네마틱 타이틀 스크린
   ═══════════════════════════════════════════ */

export default function BattleLobby({ onStartVsAi, onExit, bgmMuted, sfxMuted, toggleBgmMuted, toggleSfxMuted }: BattleLobbyProps) {
  const [menu, setMenu] = useState<MenuId>("main");
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleTitleTap = useCallback(() => {
    tapCountRef.current += 1;
    clearTimeout(tapTimerRef.current);
    if (tapCountRef.current >= 7) {
      tapCountRef.current = 0;
      setMenu("dev_studio");
      return;
    }
    tapTimerRef.current = setTimeout(() => { tapCountRef.current = 0; }, 2000);
  }, []);

  const [modalOpen, setModalOpen] = useState(false);

  if (menu === "dev_studio") return <DuelDevStudio onBack={() => setMenu("main")} />;
  if (menu === "rules") return <LobbyRules onBack={() => setMenu("main")} />;
  if (menu === "settings") {
    return (
      <GameLobbySettings
        onBack={() => setMenu("main")}
        bgmMuted={bgmMuted} sfxMuted={sfxMuted}
        toggleBgmMuted={toggleBgmMuted} toggleSfxMuted={toggleSfxMuted}
      />
    );
  }

  return (
    <>
      <GameLobbyMain
        title="패권"
        englishTitle="Hegemony"
        catchphrase="천년의 대국"
        onTitleTap={handleTitleTap}
        cta={{
          icon: <>
            <Bot size={22} className="text-accent sm:hidden" />
            <Bot size={26} className="text-accent hidden sm:block" />
          </>,
          label: "AI 대전",
          sub: "vs Computer",
          onClick: () => setModalOpen(true),
        }}
        navItems={<>
          <GameLobbyNavRow icon={<BookOpen size={16} />} label="규칙" sub="Rules" onClick={() => setMenu("rules")} />
          <GameLobbyNavRow icon={<Users size={16} />} label="대인전" sub="Multiplayer" disabled />
          <GameLobbyNavRow icon={<Settings size={16} />} label="설정" sub="Settings" onClick={() => setMenu("settings")} />
          <GameLobbyNavRow icon={<BarChart3 size={16} />} label="전적" sub="Records" disabled />
          <GameLobbyNavRow icon={<LogOut size={16} />} label="나가기" sub="Exit" onClick={onExit} />
        </>}
      />
      <GameStartModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onStart={(v) => onStartVsAi(v as Difficulty)}
        icon={<Bot size={28} className="text-accent/40" />}
        title="AI 대전"
        desc="난이도를 선택하세요"
        options={DIFFICULTY_OPTIONS}
      />
    </>
  );
}

/* ═══════════════════════════════════════════
   게임 규칙 서브메뉴
   ═══════════════════════════════════════════ */

function LobbyRules({ onBack }: { onBack: () => void }) {
  return (
    <GameLobbySubmenu
      onBack={onBack}
      icon={<Swords size={28} className="text-accent/40" />}
      title="게임 규칙"
      desc="역사 속 인물들을 영입하여 매 라운드 상대와 동시에 격돌하는 전략 게임"
      longDesc
      showBackBottom
    >
      {/* 개요 */}
      <section className="text-center px-6 mb-12">
        <p className="text-sm text-text-secondary leading-[1.8]">
          <span className="text-accent font-bold">패권</span>은 역사 속 인물들을 인재로 영입하고,
          매 라운드 카드 1장에 군령을 내려 상대와 동시에 격돌하는 전략 게임입니다.
          주장을 임명하고, 천명을 읽고, 상성을 꿰뚫어 상대의 국력을 0으로 만드세요.
        </p>
      </section>

      {/* PART 1: 게임 흐름 */}
      <GameRulesSection partLabel="Part 1" title="게임 흐름">
        <div className="grid grid-cols-4 gap-2">
          {[
            { step: "01", icon: <Layers size={18} />, title: "드래프트", desc: "15명 중 5명을 교대 선택" },
            { step: "02", icon: <Crown size={18} />, title: "주장 선택", desc: "5명 중 지휘관 1명 임명" },
            { step: "03", icon: <Swords size={18} />, title: "배틀", desc: "매 라운드 동시 격돌" },
            { step: "04", icon: <Trophy size={18} />, title: "결과", desc: "국력 비교로 승패 결정" },
          ].map((item) => (
            <div key={item.step} className="text-center px-3 py-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <span className="text-accent/30 font-cinzel text-[10px] tracking-wider">{item.step}</span>
              <div className="flex justify-center mt-1.5 mb-1.5 text-accent/50">{item.icon}</div>
              <p className="text-sm font-bold text-white">{item.title}</p>
              <p className="text-[10px] text-text-tertiary mt-1 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          <p className="text-[11px] text-text-secondary leading-relaxed text-center">
            드래프트는 3장씩 공개되며, 2장을 교대로 선택하고 1장은 폐기됩니다.
            배치마다 선공이 바뀌어 공정한 픽이 보장됩니다.
            마음에 들지 않으면 첫 픽 전에 <span className="text-accent/70 font-bold">다시 섞기</span>가 가능합니다.
          </p>
        </div>
      </GameRulesSection>

      {/* PART 2: 국가 상태 */}
      <GameRulesSection partLabel="Part 2" title="국가 상태">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="px-4 py-4 rounded-xl bg-accent/[0.03] border border-accent/10 text-center">
            <p className="text-accent font-bold text-lg mb-1">국력 30</p>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              HP 역할. 0 이하가 되면 <span className="text-red-400 font-bold">즉시 패배</span>합니다.
              내정 명령으로만 소량 회복할 수 있습니다.
            </p>
          </div>
          <div className="px-4 py-4 rounded-xl bg-sky-500/[0.03] border border-sky-500/10 text-center">
            <p className="text-sky-400 font-bold text-lg mb-1">민심 50</p>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              0 이하가 되면 <span className="text-red-400 font-bold">반란</span>이 발생합니다.
              초과분은 국력 피해로 전환되며, 라운드가 진행될수록 반란 피해가 증가합니다.
            </p>
          </div>
        </div>
      </GameRulesSection>

      {/* PART 3: 3대 군령 */}
      <GameRulesSection partLabel="Part 3" title="3대 군령">
        <p className="text-sm text-text-secondary leading-[1.8] text-center mb-6">
          매 라운드 손패에서 <span className="text-white font-medium">카드 1장</span>을 선택하고
          3가지 군령 중 하나를 지정합니다.
          양측이 <span className="text-accent font-medium">동시에</span> 공개하여 상성을 판정합니다.
        </p>
        <div className="space-y-2">
          {[
            {
              name: "전투", icon: <Swords size={14} />,
              desc: "상대 국력 타격 (적성/2)",
              detail: "민심 -3 항상 지불. 카드 소모.",
              color: "text-red-400 border-red-500/20 bg-red-500/5",
            },
            {
              name: "책략", icon: <ScrollText size={14} />,
              desc: "상대 민심 공격 (적성/2)",
              detail: "카드 소모.",
              color: "text-purple-400 border-purple-500/20 bg-purple-500/5",
            },
            {
              name: "내정", icon: <Landmark size={14} />,
              desc: "국력 회복 (적성/3) + 민심 회복 (적성/2)",
              detail: "카드 유지 + 버린패 1장 회수.",
              color: "text-amber-400 border-amber-500/20 bg-amber-500/5",
            },
          ].map((cmd) => (
            <div key={cmd.name} className={`px-4 py-3 rounded-xl border ${cmd.color}`}>
              <div className="flex items-center gap-2 mb-1">
                {cmd.icon}
                <span className="font-bold text-sm">{cmd.name}</span>
              </div>
              <p className="text-[11px] text-text-secondary">{cmd.desc}</p>
              <p className="text-[10px] text-white/30 mt-0.5">{cmd.detail}</p>
            </div>
          ))}
        </div>
        {/* 상성 */}
        <div className="mt-4 px-4 py-3 rounded-xl bg-black/30 border border-white/[0.06]">
          <p className="text-xs text-accent font-bold mb-2 text-center">상성 (가위바위보)</p>
          <div className="flex items-center justify-center gap-2 text-sm mb-2">
            <span className="text-red-400 font-bold">전투</span>
            <span className="text-white/20">&gt;</span>
            <span className="text-amber-400 font-bold">내정</span>
            <span className="text-white/20">&gt;</span>
            <span className="text-purple-400 font-bold">책략</span>
            <span className="text-white/20">&gt;</span>
            <span className="text-red-400 font-bold">전투</span>
          </div>
          <p className="text-[11px] text-text-secondary leading-relaxed text-center">
            상성 승리 시 효과 <span className="text-accent font-bold">x1.5</span>, 상대 효과 <span className="text-red-400 font-bold">무효</span>.
            같은 명령끼리 접전 시 적성이 높은 쪽만 효과 발동.
          </p>
        </div>
      </GameRulesSection>

      {/* PART 4: 주장 시스템 */}
      <GameRulesSection partLabel="Part 4" title="주장">
        <p className="text-[11px] text-text-secondary leading-relaxed text-center mb-4">
          드래프트 후 5장 중 <span className="text-accent font-bold">주장(지휘관)</span> 1명을 임명합니다.
          주장은 손패에서 아군을 지원하거나, 직접 출전하여 강력한 힘을 발휘합니다.
        </p>
        <div className="space-y-2">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-accent/[0.03] border border-accent/10">
            <Crown size={16} className="text-accent/60 shrink-0" />
            <div>
              <p className="text-xs font-bold text-accent">오라 효과</p>
              <p className="text-[10px] text-text-secondary mt-0.5">주장이 손패에 대기 중이면 출전하는 카드의 적성 <span className="text-accent font-bold">+15%</span></p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-accent/[0.03] border border-accent/10">
            <Swords size={16} className="text-accent/60 shrink-0" />
            <div>
              <p className="text-xs font-bold text-accent">직접 출전</p>
              <p className="text-[10px] text-text-secondary mt-0.5">주장이 직접 출전하면 본인 적성 <span className="text-accent font-bold">x1.5</span> (오라 소멸)</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <span className="text-white/30 shrink-0 text-xs">💀</span>
            <div>
              <p className="text-xs font-bold text-white/60">주장 소모</p>
              <p className="text-[10px] text-text-secondary mt-0.5">주장이 버린패로 가면 오라 효과가 사라집니다</p>
            </div>
          </div>
        </div>
      </GameRulesSection>

      {/* PART 5: 카드 소모와 회수 */}
      <GameRulesSection partLabel="Part 5" title="카드 운용">
        <div className="space-y-4">
          <div className="px-5 py-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <p className="text-sm font-bold text-white mb-2">카드 소모</p>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              <span className="text-red-400 font-bold">전투</span>와 <span className="text-purple-400 font-bold">책략</span>에 사용한 카드는 버린패로 이동합니다.
              <span className="text-amber-400 font-bold"> 내정</span>은 카드가 소모되지 않고 손패에 남습니다.
            </p>
          </div>
          <div className="px-5 py-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <p className="text-sm font-bold text-white mb-2">버린패 회수</p>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              <span className="text-amber-400 font-bold">내정</span> 명령 시 버린패에서 1장을 선택하여 손패로 회수합니다.
              이 효과는 상성 패배와 무관하게 항상 발동됩니다.
            </p>
          </div>
          <div className="px-5 py-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <p className="text-sm font-bold text-white mb-2">손패 소진</p>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              손패가 전부 소모되면 버린패에서 <span className="text-accent font-bold">랜덤 1장</span>이 자동 회수됩니다.
              양측 모두 낼 카드가 없어지면 게임이 종료되고 국력으로 승패를 판정합니다.
            </p>
          </div>
        </div>
      </GameRulesSection>

      {/* PART 6: 천명 시스템 */}
      <GameRulesSection partLabel="Part 6" title="천명">
        <div className="space-y-4">
          <p className="text-[11px] text-text-secondary leading-relaxed text-center">
            매 라운드 하나의 <span className="text-amber-300 font-bold">천명</span>이 발동됩니다.
            내 군령이 천명과 일치하면 적성이 <span className="text-amber-300 font-bold">x1.5</span>로 증폭됩니다.
          </p>
          <div className="space-y-2">
            {[
              { name: "풍운의 천명", cmd: "전투 적성 x1.5", color: "text-red-400 border-red-500/15 bg-red-500/[0.03]" },
              { name: "암중의 천명", cmd: "책략 적성 x1.5", color: "text-purple-400 border-purple-500/15 bg-purple-500/[0.03]" },
              { name: "태평의 천명", cmd: "내정 적성 x1.5", color: "text-amber-400 border-amber-500/15 bg-amber-500/[0.03]" },
            ].map((m) => (
              <div key={m.name} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border ${m.color}`}>
                <span className="text-amber-300/70 text-sm">★</span>
                <span className="font-bold text-xs flex-1">{m.name}</span>
                <span className="text-[10px] text-text-tertiary">{m.cmd}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-white/25 text-center leading-relaxed">
            천명 순서는 게임 시작 시 랜덤 결정되며, 같은 천명이 연속으로 나오지 않습니다.
          </p>
        </div>
      </GameRulesSection>

      {/* 전략 팁 */}
      <GameRulesSection title="전략 팁">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="px-5 py-5 rounded-xl bg-accent/[0.03] border border-accent/10">
            <p className="text-accent font-bold text-sm mb-2">전투와 민심</p>
            <p className="text-xs text-text-secondary leading-[1.8]">
              전투는 강력하지만 민심 -3 페널티가 항상 발생합니다.
              연속 전투 시 민심이 급락하여 반란 위험이 커집니다.
              내정으로 민심을 관리하며 공격 타이밍을 잡으세요.
            </p>
          </div>
          <div className="px-5 py-5 rounded-xl bg-accent/[0.03] border border-accent/10">
            <p className="text-accent font-bold text-sm mb-2">내정의 가치</p>
            <p className="text-xs text-text-secondary leading-[1.8]">
              내정은 카드가 소모되지 않고, 버린패 회수까지 해줍니다.
              하지만 상대에게 자유턴을 주는 것이므로 남발은 금물.
              천명과 맞추면 강력한 회복이 됩니다.
            </p>
          </div>
          <div className="px-5 py-5 rounded-xl bg-accent/[0.03] border border-accent/10">
            <p className="text-accent font-bold text-sm mb-2">상대 읽기</p>
            <p className="text-xs text-text-secondary leading-[1.8]">
              상대의 민심이 낮으면 내정이 예상됩니다 — 전투로 카운터하세요.
              상대가 전투를 남발하면 책략으로 무효화할 수 있습니다.
              천명 확인 후 상대의 선택을 예측하는 것이 핵심입니다.
            </p>
          </div>
          <div className="px-5 py-5 rounded-xl bg-accent/[0.03] border border-accent/10">
            <p className="text-accent font-bold text-sm mb-2">적성 활용</p>
            <p className="text-xs text-text-secondary leading-[1.8]">
              각 카드는 군령별 적성이 다릅니다.
              전투 적성이 높은 카드는 전투에, 지력이 높은 카드는 책략에 배정하세요.
              카드 하단의 별점으로 적성을 확인할 수 있습니다.
            </p>
          </div>
        </div>
      </GameRulesSection>
    </GameLobbySubmenu>
  );
}
