/*
  파일명: components/features/game/battle/BattleLobby.tsx
  기능: 패권 게임 로비 — 타이틀 스크린
  책임: 콘솔 게임 타이틀 화면처럼 배경 위에 시네마틱 타이틀과 메뉴를 띄운다.
*/
"use client";

import { useState, useEffect } from "react";
import {
  Swords, Bot, Users, Settings, BookOpen, ChevronRight,
  ArrowLeft, Crown, Layers, Trophy, Lightbulb,
  Music, Volume2, BarChart3, ScrollText, Landmark, Shield, Flame,
} from "lucide-react";
import type { Difficulty } from "@/lib/game/types";

interface BattleLobbyProps {
  onStartVsAi: (difficulty: Difficulty) => void;
  bgmMuted: boolean;
  sfxMuted: boolean;
  toggleBgmMuted: () => void;
  toggleSfxMuted: () => void;
}

type MenuId = "main" | "rules" | "settings" | "difficulty";

/* ═══════════════════════════════════════════
   메인 로비: 시네마틱 타이틀 스크린
   ═══════════════════════════════════════════ */

export default function BattleLobby({ onStartVsAi, bgmMuted, sfxMuted, toggleBgmMuted, toggleSfxMuted }: BattleLobbyProps) {
  const [menu, setMenu] = useState<MenuId>("main");

  // 시퀀셜 입장 애니메이션 — 최초 마운트 시 1회만 실행
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 100);   // 타이틀
    const t2 = setTimeout(() => setStep(2), 500);   // 부제
    const t3 = setTimeout(() => setStep(3), 900);   // CTA
    const t4 = setTimeout(() => setStep(4), 1200);  // 하단 메뉴
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  if (menu === "rules") return <LobbyRules onBack={() => setMenu("main")} />;
  if (menu === "difficulty") return <DifficultySelect onBack={() => setMenu("main")} onStart={onStartVsAi} />;
  if (menu === "settings") {
    return (
      <LobbySettings
        onBack={() => setMenu("main")}
        bgmMuted={bgmMuted} sfxMuted={sfxMuted}
        toggleBgmMuted={toggleBgmMuted} toggleSfxMuted={toggleSfxMuted}
      />
    );
  }

  return (
    <div className="flex flex-col flex-1 relative">

      {/* ── 우측 사이드 패널: 배경 중앙(신전)을 비우고 우측에 UI 배치 ── */}
      <div className="flex flex-col justify-end h-full w-full max-w-none mx-auto text-center px-4 pb-6 sm:ml-auto sm:mr-0 sm:text-right sm:max-w-[360px] sm:pr-8 sm:pb-10 sm:pl-4">

        {/* ═══ 타이틀 블록 ═══ */}
        <div className="text-right mb-6 sm:mb-10">
          {/* 한글 타이틀 */}
          <h1
            className={`text-6xl sm:text-8xl font-serif font-black text-white leading-none tracking-[0.15em] transition-all duration-1000 ease-out ${
              step >= 1 ? "opacity-100 translate-x-0 blur-0" : "opacity-0 translate-x-8 blur-sm"
            }`}
            style={{
              textShadow: "0 4px 30px rgba(212,175,55,0.2), 0 0 80px rgba(212,175,55,0.06), 0 2px 0 rgba(0,0,0,0.8)",
            }}
          >
            패권
          </h1>

          {/* 영문 부제 — HEGEMONY 강조 */}
          <div className={`mt-1 sm:mt-3 transition-all duration-700 delay-200 ${
            step >= 2 ? "opacity-100 translate-x-0" : "opacity-0 translate-x-6"
          }`}>
            <div className="flex items-center justify-end gap-3">
              <div className="w-12 sm:w-24 h-px" style={{ background: "linear-gradient(to right, transparent, rgba(212,175,55,0.3))" }} />
              <span
                className="text-base sm:text-xl font-cinzel font-bold uppercase tracking-[0.4em] text-accent/40"
                style={{
                  textShadow: "0 0 20px rgba(212,175,55,0.15), 0 0 40px rgba(212,175,55,0.05)",
                }}
              >
                Hegemony
              </span>
            </div>
          </div>

          {/* 캐치프레이즈 */}
          <p className={`text-xs sm:text-sm text-white/20 mt-2 font-serif tracking-[0.25em] transition-all duration-700 delay-300 ${
            step >= 2 ? "opacity-100" : "opacity-0"
          }`}>
            천년의 대국
          </p>
        </div>

        {/* ═══ CTA: AI 대전 ═══ */}
        <div className={`w-full mb-4 transition-all duration-700 ease-out ${
          step >= 3 ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
        }`}>
          <button
            onClick={() => setMenu("difficulty")}
            className="group relative w-full overflow-hidden active:scale-[0.97] transition-transform"
          >
            {/* 배경 — 금속 플레이트 */}
            <div className="absolute inset-0 rounded-xl"
              style={{
                background: "linear-gradient(160deg, rgba(212,175,55,0.12) 0%, rgba(212,175,55,0.03) 40%, rgba(212,175,55,0.08) 100%)",
                border: "1px solid rgba(212,175,55,0.2)",
              }}
            />
            {/* 호버 시 빛 sweep */}
            <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{
                background: "linear-gradient(105deg, transparent 20%, rgba(212,175,55,0.1) 45%, rgba(212,175,55,0.15) 50%, rgba(212,175,55,0.1) 55%, transparent 80%)",
              }}
            />
            {/* 상하 인라인 글로우 */}
            <div className="absolute inset-x-0 top-0 h-px" style={{ background: "linear-gradient(to right, transparent 10%, rgba(212,175,55,0.3) 50%, transparent 90%)" }} />
            <div className="absolute inset-x-0 bottom-0 h-px" style={{ background: "linear-gradient(to right, transparent 10%, rgba(212,175,55,0.15) 50%, transparent 90%)" }} />

            {/* 콘텐츠 */}
            <div className="relative flex items-center gap-3 px-5 py-4 sm:py-5">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  background: "linear-gradient(145deg, rgba(212,175,55,0.2) 0%, rgba(212,175,55,0.05) 100%)",
                  boxShadow: "0 0 20px rgba(212,175,55,0.1), inset 0 1px 3px rgba(212,175,55,0.15)",
                }}
              >
                <Bot size={22} className="text-accent sm:hidden" />
                <Bot size={26} className="text-accent hidden sm:block" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <span className="text-lg sm:text-xl font-serif font-black text-accent tracking-wide">AI 대전</span>
                <p className="text-[10px] sm:text-[11px] text-accent/30 mt-0.5 font-cinzel tracking-wider uppercase">vs Computer</p>
              </div>
              <ChevronRight size={20} className="text-accent/25 group-hover:text-accent/60 group-hover:translate-x-1.5 transition-all duration-300 shrink-0" />
            </div>
          </button>
        </div>

        {/* ═══ 하단 메뉴 — 세로 스택 ═══ */}
        <div className={`w-full flex flex-col gap-0.5 transition-all duration-700 ${
          step >= 4 ? "opacity-100 translate-x-0" : "opacity-0 translate-x-6"
        }`}>
          <NavRow icon={<BookOpen size={14} />} label="규칙" sub="Rules" onClick={() => setMenu("rules")} />
          <NavRow icon={<Users size={14} />} label="대인전" sub="Multiplayer" disabled />
          <NavRow icon={<Settings size={14} />} label="설정" sub="Settings" onClick={() => setMenu("settings")} />
          <NavRow icon={<BarChart3 size={14} />} label="전적" sub="Records" disabled />
        </div>

        {/* 맨 하단 크레딧 */}
        <p className={`text-[9px] text-white/[0.08] mt-5 text-right font-cinzel tracking-[0.3em] uppercase transition-all duration-500 ${
          step >= 4 ? "opacity-100" : "opacity-0"
        }`}>
          Feel & Note
        </p>
      </div>
    </div>
  );
}

/** 우측 메뉴 행 */
function NavRow({ icon, label, sub, onClick, disabled }: { icon: React.ReactNode; label: string; sub: string; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`group flex items-center gap-3 w-full px-4 py-2.5 rounded-lg transition-all text-left
        ${disabled
          ? "text-white/25 cursor-not-allowed"
          : "text-white/70 hover:text-white hover:bg-white/[0.06] active:scale-[0.97] cursor-pointer"
        }
      `}
    >
      <span className="shrink-0 opacity-80">{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="text-sm font-serif font-bold block leading-tight">{label}</span>
        <span className={`text-[9px] font-cinzel uppercase tracking-widest block mt-px ${disabled ? "text-white/[0.12]" : "text-white/30"}`}>{sub}</span>
      </span>
      {!disabled && <ChevronRight size={14} className="text-white/10 group-hover:text-white/30 group-hover:translate-x-0.5 transition-all shrink-0" />}
    </button>
  );
}

/* ═══════════════════════════════════════════
   게임 규칙 서브메뉴 (기존 유지)
   ═══════════════════════════════════════════ */

function LobbyRules({ onBack }: { onBack: () => void }) {
  return (
    <div className="lg:ml-auto lg:w-1/3 lg:min-w-[360px]">
      <div className="flex flex-col animate-fade-in lg:bg-black/50 lg:backdrop-blur-sm lg:rounded-l-2xl lg:border-l lg:border-white/[0.05]">

      {/* 헤더 */}
      <div className="relative text-center py-8 mb-2 px-4">
        <button
          onClick={onBack}
          className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-text-secondary text-sm transition-colors"
        >
          <ArrowLeft size={14} />
          돌아가기
        </button>
        <Swords size={28} className="mx-auto text-accent/40 mb-2" />
        <h2 className="text-2xl font-serif font-black text-white tracking-wide">게임 규칙</h2>
        <p className="text-sm text-text-tertiary mt-1.5 max-w-md mx-auto leading-relaxed">
          역사 속 인물들을 영입하여 매 라운드 상대와 동시에 격돌하는 전략 게임
        </p>
      </div>

      {/* 개요 */}
      <section className="text-center px-6 mb-12">
        <p className="text-sm text-text-secondary leading-[1.8]">
          <span className="text-accent font-bold">패권</span>은 역사 속 인물들을 인재로 영입하고,
          매 라운드 카드 1장과 군령패 1장을 동시에 내어 상대를 굴복시키는 전략 게임입니다.
          상대의 국력을 0으로 만들면 승리하고, 민심이 0 이하가 되면 반란이 발생합니다.
        </p>
      </section>

      {/* PART 1: 게임 흐름 */}
      <div className="border-t border-white/[0.06] pt-10 pb-12 px-6">
        <div className="text-center mb-6">
          <p className="text-[10px] font-cinzel text-accent/40 uppercase tracking-[0.4em] mb-1">Part 1</p>
          <h3 className="text-lg font-serif font-black text-white">게임 흐름</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { step: "01", icon: <Layers size={18} />, title: "드래프트", desc: "15명 중 7명을 교대 선택" },
            { step: "02", icon: <Swords size={18} />, title: "배틀", desc: "매 라운드 동시 격돌" },
            { step: "03", icon: <Trophy size={18} />, title: "결과", desc: "국력 비교로 승패 결정" },
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
            드래프트는 교대 픽으로 진행됩니다.
            전반(1~10픽)은 플레이어 선공, 후반(11~14픽)은 AI 선공으로 순서가 역전됩니다.
            마음에 들지 않으면 첫 픽 전에 <span className="text-accent/70 font-bold">다시 섞기</span>가 가능합니다.
          </p>
        </div>
      </div>

      {/* PART 2: 국가 상태 */}
      <div className="border-t border-white/[0.06] pt-10 pb-12 px-6">
        <div className="text-center mb-6">
          <p className="text-[10px] font-cinzel text-accent/40 uppercase tracking-[0.4em] mb-1">Part 2</p>
          <h3 className="text-lg font-serif font-black text-white">국가 상태</h3>
        </div>
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
              반란 시 국력 -5, 민심 10으로 리셋됩니다.
            </p>
          </div>
        </div>
      </div>

      {/* PART 3: 3대 군령 */}
      <div className="border-t border-white/[0.06] pt-10 pb-12 px-6">
        <div className="text-center mb-6">
          <p className="text-[10px] font-cinzel text-accent/40 uppercase tracking-[0.4em] mb-1">Part 3</p>
          <h3 className="text-lg font-serif font-black text-white">3대 군령</h3>
        </div>
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
      </div>

      {/* PART 4: 카드 소모와 회수 */}
      <div className="border-t border-white/[0.06] pt-10 pb-12 px-6">
        <div className="text-center mb-6">
          <p className="text-[10px] font-cinzel text-accent/40 uppercase tracking-[0.4em] mb-1">Part 4</p>
          <h3 className="text-lg font-serif font-black text-white">카드 운용</h3>
        </div>
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
      </div>

      {/* PART 5: 천명 시스템 */}
      <div className="border-t border-white/[0.06] pt-10 pb-12 px-6">
        <div className="text-center mb-6">
          <p className="text-[10px] font-cinzel text-accent/40 uppercase tracking-[0.4em] mb-1">Part 5</p>
          <h3 className="text-lg font-serif font-black text-white">천명</h3>
        </div>
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
      </div>

      {/* 전략 팁 */}
      <div className="border-t border-white/[0.06] pt-10 pb-12 px-6">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2">
            <Lightbulb size={16} className="text-accent/40" />
            <h3 className="text-lg font-serif font-black text-white">전략 팁</h3>
          </div>
        </div>
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
      </div>

      {/* 하단 돌아가기 */}
      <div className="text-center py-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-text-secondary text-sm transition-colors"
        >
          <ArrowLeft size={14} />
          로비로 돌아가기
        </button>
      </div>

      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   난이도 선택 서브메뉴
   ═══════════════════════════════════════════ */

function DifficultySelect({ onBack, onStart }: { onBack: () => void; onStart: (d: Difficulty) => void }) {
  return (
    <div className="lg:ml-auto lg:w-1/3 lg:min-w-[360px]">
      <div className="flex flex-col animate-fade-in lg:bg-black/50 lg:backdrop-blur-sm lg:rounded-l-2xl lg:border-l lg:border-white/[0.05]">

      <div className="relative text-center py-8 px-4">
        <button
          onClick={onBack}
          className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-text-secondary text-sm transition-colors"
        >
          <ArrowLeft size={14} />
          돌아가기
        </button>
        <Bot size={28} className="mx-auto text-accent/40 mb-2" />
        <h2 className="text-2xl font-serif font-black text-white tracking-wide">AI 대전</h2>
        <p className="text-sm text-text-tertiary mt-1.5">난이도를 선택하세요</p>
      </div>

      <div className="px-6 pb-10 space-y-3">
        {/* 보통 */}
        <button
          onClick={() => onStart("normal")}
          className="group w-full text-left px-5 py-5 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-accent/[0.06] hover:border-accent/20 active:scale-[0.97] transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
              <Shield size={22} className="text-accent/70" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-lg font-serif font-black text-accent">보통</span>
                <span className="text-[9px] font-cinzel text-accent/30 uppercase tracking-wider">Normal</span>
              </div>
              <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">
                플레이어가 먼저 픽. 상대 카드 적성 공개.
              </p>
            </div>
            <ChevronRight size={16} className="text-white/10 group-hover:text-accent/40 transition-colors shrink-0" />
          </div>
        </button>

        {/* 어려움 */}
        <button
          onClick={() => onStart("hard")}
          className="group w-full text-left px-5 py-5 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-red-500/[0.06] hover:border-red-500/20 active:scale-[0.97] transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
              <Flame size={22} className="text-red-400/70" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-lg font-serif font-black text-red-400">어려움</span>
                <span className="text-[9px] font-cinzel text-red-400/30 uppercase tracking-wider">Hard</span>
              </div>
              <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">
                AI가 먼저 픽. 상대 카드 적성 비공개.
              </p>
            </div>
            <ChevronRight size={16} className="text-white/10 group-hover:text-red-400/40 transition-colors shrink-0" />
          </div>
        </button>
      </div>

      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   설정 서브메뉴 (기존 유지)
   ═══════════════════════════════════════════ */

interface LobbySettingsProps {
  onBack: () => void;
  bgmMuted: boolean;
  sfxMuted: boolean;
  toggleBgmMuted: () => void;
  toggleSfxMuted: () => void;
}

function LobbySettings({ onBack, bgmMuted, sfxMuted, toggleBgmMuted, toggleSfxMuted }: LobbySettingsProps) {
  return (
    <div className="lg:ml-auto lg:w-1/3 lg:min-w-[360px]">
      <div className="flex flex-col animate-fade-in lg:bg-black/50 lg:backdrop-blur-sm lg:rounded-l-2xl lg:border-l lg:border-white/[0.05]">

      <div className="relative text-center py-8 px-4">
        <button
          onClick={onBack}
          className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-text-secondary text-sm transition-colors"
        >
          <ArrowLeft size={14} />
          돌아가기
        </button>
        <Settings size={28} className="mx-auto text-accent/40 mb-2" />
        <h2 className="text-2xl font-serif font-black text-white tracking-wide">설정</h2>
        <p className="text-sm text-text-tertiary mt-1.5">오디오 설정</p>
      </div>

      <div className="px-6 pb-10 space-y-4">
        <button
          onClick={toggleBgmMuted}
          className="w-full flex items-center gap-4 px-5 py-4 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
            <Music size={20} className="text-accent/70" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-bold text-text-primary">게임 음악</p>
            <p className="text-[10px] text-text-tertiary mt-0.5">배경 음악 (BGM)</p>
          </div>
          <TogglePill active={!bgmMuted} />
        </button>

        <button
          onClick={toggleSfxMuted}
          className="w-full flex items-center gap-4 px-5 py-4 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
            <Volume2 size={20} className="text-accent/70" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-bold text-text-primary">사운드 이펙트</p>
            <p className="text-[10px] text-text-tertiary mt-0.5">효과음 (SFX)</p>
          </div>
          <TogglePill active={!sfxMuted} />
        </button>
      </div>

      <div className="text-center py-6 border-t border-white/[0.06]">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-text-secondary text-sm transition-colors"
        >
          <ArrowLeft size={14} />
          로비로 돌아가기
        </button>
      </div>

      </div>
    </div>
  );
}

function TogglePill({ active }: { active: boolean }) {
  return (
    <div className={`relative w-11 h-6 rounded-full shrink-0 transition-colors ${active ? "bg-accent/30" : "bg-white/10"}`}>
      <div className={`absolute top-0.5 w-5 h-5 rounded-full transition-all ${active ? "left-[22px] bg-accent" : "left-0.5 bg-white/40"}`} />
    </div>
  );
}
