/*
  파일명: components/features/game/battle/BattleLobby.tsx
  기능: 패권 게임 로비 메뉴
  책임: 게임 모드 선택, 난이도 설정 등 로비 UI를 제공한다.
*/
"use client";

import { useState } from "react";
import {
  Swords, Bot, Users, Settings, BookOpen, ChevronRight,
  ArrowLeft, Crown, Layers, Trophy, Zap, Scale, Lightbulb,
} from "lucide-react";

interface BattleLobbyProps {
  onStartVsAi: () => void;
}

type MenuId = "main" | "rules";

export default function BattleLobby({ onStartVsAi }: BattleLobbyProps) {
  const [menu, setMenu] = useState<MenuId>("main");

  if (menu === "rules") {
    return <LobbyRules onBack={() => setMenu("main")} />;
  }

  return (
    <div className="relative flex flex-col items-center justify-center min-h-[70vh] px-4">
      {/* ── 배경 장식 ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] rounded-full bg-accent/[0.03] blur-[120px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-px bg-gradient-to-r from-transparent via-accent/10 to-transparent" />
      </div>

      {/* ── 타이틀 영역 ── */}
      <div className="relative text-center mb-12 animate-fade-in">
        <div className="relative inline-block mb-4">
          <Swords size={56} className="text-accent/30" />
          <div className="absolute inset-0 blur-xl bg-accent/10 rounded-full" />
        </div>
        <h1 className="text-4xl sm:text-5xl font-serif font-black text-white tracking-wider">
          패권
        </h1>
        <div className="flex items-center justify-center gap-3 mt-3">
          <div className="w-8 h-px bg-accent/20" />
          <p className="text-xs font-cinzel text-accent/40 uppercase tracking-[0.3em]">Hegemony</p>
          <div className="w-8 h-px bg-accent/20" />
        </div>
        <p className="text-sm text-text-tertiary mt-3 font-serif">영향력 대전 시뮬레이션</p>
      </div>

      {/* ── 메뉴 그리드 ── */}
      <div className="relative w-full max-w-sm flex flex-col gap-3 animate-slide-up">
        {/* AI 대전 — CTA */}
        <button
          onClick={onStartVsAi}
          className="group relative overflow-hidden w-full px-6 py-5 rounded-2xl
            bg-gradient-to-br from-accent/15 to-accent/5 border border-accent/30
            hover:from-accent/20 hover:to-accent/10 hover:border-accent/50
            active:scale-[0.98] transition-all"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent/[0.06] rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl group-hover:bg-accent/10 transition-colors" />
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent/15 border border-accent/20 flex items-center justify-center">
              <Bot size={24} className="text-accent" />
            </div>
            <div className="flex-1 text-left">
              <span className="text-lg font-serif font-black text-accent">AI 대전</span>
              <p className="text-xs text-accent/50 mt-0.5">컴퓨터와 1:1 전략 대결</p>
            </div>
            <ChevronRight size={18} className="text-accent/40 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* 서브 메뉴 2열 */}
        <div className="grid grid-cols-2 gap-3">
          {/* 게임 규칙 */}
          <button
            onClick={() => setMenu("rules")}
            className="group text-center px-4 py-5 rounded-2xl
              bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/15
              active:scale-[0.97] transition-all"
          >
            <BookOpen size={22} className="mx-auto text-text-secondary group-hover:text-accent/70 transition-colors mb-2" />
            <span className="text-sm font-serif font-bold text-text-primary block">게임 규칙</span>
            <p className="text-[10px] text-text-tertiary mt-1">플레이 방법 안내</p>
          </button>

          {/* 대인전 */}
          <button
            disabled
            className="text-center px-4 py-5 rounded-2xl
              bg-white/[0.02] border border-white/[0.05] opacity-35 cursor-not-allowed"
          >
            <Users size={22} className="mx-auto text-text-secondary mb-2" />
            <span className="text-sm font-serif font-bold text-text-secondary block">대인전</span>
            <p className="text-[10px] text-text-tertiary mt-1">준비 중</p>
          </button>
        </div>

        {/* 설정 — 하단 작은 버튼 */}
        <button
          disabled
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl
            bg-white/[0.02] border border-white/[0.05] opacity-35 cursor-not-allowed"
        >
          <Settings size={14} className="text-text-tertiary" />
          <span className="text-xs text-text-tertiary font-medium">설정 (준비 중)</span>
        </button>
      </div>

      {/* ── 하단 장식선 ── */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 opacity-30">
        <div className="w-1 h-1 rounded-full bg-accent/40" />
        <div className="w-1 h-1 rounded-full bg-accent/20" />
        <div className="w-1 h-1 rounded-full bg-accent/10" />
      </div>
    </div>
  );
}

/* ── 게임 규칙 서브메뉴 ── */

function LobbyRules({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex flex-col animate-fade-in">
      {/* ═══ 히어로 헤더 ═══ */}
      <div className="relative text-center py-12 sm:py-16 mb-4">
        {/* 배경 장식 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-accent/[0.03] blur-3xl" />
        </div>
        <button
          onClick={onBack}
          className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-text-secondary text-sm transition-colors"
        >
          <ArrowLeft size={14} />
          돌아가기
        </button>
        <Swords size={36} className="mx-auto text-accent/40 mb-3" />
        <h2 className="text-2xl sm:text-3xl font-serif font-black text-white tracking-wide">게임 규칙</h2>
        <p className="text-sm text-text-tertiary mt-2 max-w-md mx-auto leading-relaxed">
          역사 속 인물들의 영향력을 카드로 만들어 겨루는 전략 대전
        </p>
      </div>

      {/* ═══ 개요 ═══ */}
      <section className="max-w-2xl mx-auto text-center px-4 mb-16">
        <p className="text-sm text-text-secondary leading-[1.8]">
          <span className="text-accent font-bold">패권</span>은 각 인물이 지닌 정치, 전략, 기술, 사회, 경제, 문화
          6개 영역의 영향력 점수를 활용한 카드 대전 게임입니다.
          플레이어는 드래프트를 통해 자신의 덱을 구성한 뒤, 6라운드에 걸쳐 상대와 맞붙게 됩니다.
          단순히 강한 카드를 모으는 것이 아니라, 어떤 영역에서 어떤 카드를 낼지 판단하는
          전략적 선택이 승부를 가릅니다.
        </p>
      </section>

      {/* ═══ PART 1: 게임 흐름 ═══ */}
      <div className="border-t border-white/[0.06] pt-12 pb-16 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-[10px] font-cinzel text-accent/40 uppercase tracking-[0.4em] mb-1">Part 1</p>
            <h3 className="text-lg font-serif font-black text-white">게임 흐름</h3>
          </div>

          <p className="text-sm text-text-secondary leading-[1.8] text-center max-w-xl mx-auto mb-8">
            게임은 크게 세 단계로 진행됩니다.
            드래프트에서 전력을 편성하고, 대전에서 승부를 겨루고, 결과에서 승패를 확인합니다.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { step: "01", icon: <Layers size={20} />, title: "드래프트", desc: "12명의 후보 중 6명을 교대로 선택하여 나만의 덱을 편성합니다." },
              { step: "02", icon: <Swords size={20} />, title: "대전", desc: "6개 영역에서 차례로 카드를 내며 1:1 대결을 펼칩니다." },
              { step: "03", icon: <Trophy size={20} />, title: "결과", desc: "더 많은 영역을 차지한 쪽이 최종 승자가 됩니다." },
            ].map((item) => (
              <div key={item.step} className="text-center px-5 py-6 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <span className="text-accent/30 font-cinzel text-[10px] tracking-wider">{item.step}</span>
                <div className="flex justify-center mt-2 mb-2 text-accent/50">{item.icon}</div>
                <p className="text-sm font-bold text-white">{item.title}</p>
                <p className="text-xs text-text-tertiary mt-2 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ PART 2: 드래프트 ═══ */}
      <div className="border-t border-white/[0.06] pt-12 pb-16 px-4 bg-white/[0.01]">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-[10px] font-cinzel text-accent/40 uppercase tracking-[0.4em] mb-1">Part 2</p>
            <h3 className="text-lg font-serif font-black text-white">드래프트</h3>
          </div>

          <p className="text-sm text-text-secondary leading-[1.8] text-center max-w-xl mx-auto mb-8">
            게임이 시작되면 등급별로 구성된 <span className="text-white font-medium">12명의 인물 풀</span>이 공개됩니다.
            플레이어와 AI는 <span className="text-white font-medium">스네이크 드래프트</span> 방식으로 번갈아 가며 카드를 선택하게 됩니다.
          </p>

          {/* 스네이크 드래프트 설명 */}
          <div className="max-w-lg mx-auto mb-8 px-5 py-5 rounded-xl bg-black/30 border border-white/[0.06]">
            <p className="text-xs text-accent font-bold mb-3 text-center">스네이크 드래프트란?</p>
            <p className="text-xs text-text-secondary leading-relaxed text-center mb-4">
              한쪽이 먼저 1장을 고르면 상대가 연속 2장을 고르고,
              다시 이쪽이 연속 2장을 고르는 식으로 진행됩니다.
              선픽의 이점과 후픽의 연속 선택권이 서로 균형을 이루도록 설계되어 있습니다.
            </p>
            <p className="text-[10px] text-text-tertiary mb-2 text-center font-medium">선택 순서</p>
            <div className="flex items-center justify-center gap-0.5">
              {["P","A","A","P","P","A","A","P","P","A","A","P"].map((who, i) => (
                <div
                  key={i}
                  className={`w-7 h-7 rounded text-[10px] font-bold flex items-center justify-center ${
                    who === "P" ? "bg-accent/15 text-accent" : "bg-red-500/15 text-red-400"
                  }`}
                >
                  {who}
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-4 mt-2">
              <span className="text-[9px] text-accent/50">P = 플레이어</span>
              <span className="text-[9px] text-red-400/50">A = AI</span>
            </div>
          </div>

          {/* 풀 구성 */}
          <div className="max-w-lg mx-auto px-5 py-5 rounded-xl bg-black/30 border border-white/[0.06]">
            <p className="text-xs text-accent font-bold mb-3 text-center">드래프트 풀 구성</p>
            <div className="grid grid-cols-2 gap-3 text-center text-xs">
              <div className="px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                <p className="text-yellow-300/80 font-bold">S ~ A급</p>
                <p className="text-text-tertiary mt-0.5">2장</p>
              </div>
              <div className="px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                <p className="text-blue-300/80 font-bold">B ~ C급</p>
                <p className="text-text-tertiary mt-0.5">4장</p>
              </div>
              <div className="px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                <p className="text-orange-300/80 font-bold">D ~ E급</p>
                <p className="text-text-tertiary mt-0.5">4장</p>
              </div>
              <div className="px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                <p className="text-white/60 font-bold">무작위</p>
                <p className="text-text-tertiary mt-0.5">2장</p>
              </div>
            </div>
            <p className="text-[11px] text-text-tertiary leading-relaxed text-center mt-4">
              강한 카드만 노리면 상대에게 특정 영역의 약점을 내줄 수 있습니다.
              상대가 가져갈 카드를 예측하며 균형 있는 덱을 구성하는 것이 핵심입니다.
            </p>
          </div>
        </div>
      </div>

      {/* ═══ PART 3: 6대 영역 ═══ */}
      <div className="border-t border-white/[0.06] pt-12 pb-16 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-[10px] font-cinzel text-accent/40 uppercase tracking-[0.4em] mb-1">Part 3</p>
            <h3 className="text-lg font-serif font-black text-white">6대 영역</h3>
          </div>

          <p className="text-sm text-text-secondary leading-[1.8] text-center max-w-xl mx-auto mb-8">
            대전은 6개 영역에서 순서대로 진행됩니다. 영역 순서는 매 게임마다 무작위로 결정되므로
            어떤 영역이 먼저 올지 예측할 수 없습니다.
            각 인물 카드는 영역마다 0~10점의 영향력을 가지고 있습니다.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-lg mx-auto">
            {[
              { name: "정치·외교", desc: "체제·정책·외교 질서" },
              { name: "전략·안보", desc: "군사 전략·무기 체계" },
              { name: "기술·과학", desc: "과학 발견·기술 혁신" },
              { name: "사회·윤리", desc: "규범·윤리·제도 변화" },
              { name: "산업·경제", desc: "산업 구조·경제 시스템" },
              { name: "문화·예술", desc: "문화 트렌드·장르 창조" },
            ].map((d) => (
              <div key={d.name} className="text-center px-3 py-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <p className="text-sm font-bold text-text-primary">{d.name}</p>
                <p className="text-[10px] text-text-tertiary mt-1">{d.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ PART 4: 대전 ═══ */}
      <div className="border-t border-white/[0.06] pt-12 pb-16 px-4 bg-white/[0.01]">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-[10px] font-cinzel text-accent/40 uppercase tracking-[0.4em] mb-1">Part 4</p>
            <h3 className="text-lg font-serif font-black text-white">대전</h3>
          </div>

          <p className="text-sm text-text-secondary leading-[1.8] text-center max-w-xl mx-auto mb-8">
            대전은 총 6라운드로 구성됩니다. 매 라운드마다 하나의 영역이 지정되고,
            플레이어가 먼저 손패에서 카드 1장을 선택한 뒤 AI가 카드를 냅니다.
            해당 영역의 영향력 점수가 높은 쪽이 그 라운드를 가져갑니다.
            한 번 낸 카드는 다시 사용할 수 없으므로, 강한 카드를 언제 쓸지 타이밍 판단이 중요합니다.
          </p>

          {/* 진행 예시 */}
          <div className="max-w-md mx-auto px-5 py-5 rounded-xl bg-black/30 border border-white/[0.06] mb-8">
            <p className="text-xs text-accent font-bold mb-4 text-center">라운드 진행 예시</p>
            <div className="space-y-3">
              {[
                { num: "1", text: <>이번 라운드 영역: <span className="text-white font-medium">전략·안보</span></> },
                { num: "2", text: <>플레이어 카드 선택 → <span className="text-accent font-medium">나폴레옹 (전략 9)</span></> },
                { num: "3", text: <>AI 카드 선택 → <span className="text-red-400 font-medium">손자 (전략 10)</span></> },
                { num: "4", text: <>결과: <span className="text-red-400 font-medium">AI 승리</span> — AI가 1점 획득</> },
              ].map((s) => (
                <div key={s.num} className="flex items-start gap-3">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-white/[0.06] flex items-center justify-center text-[10px] font-bold text-text-tertiary">
                    {s.num}
                  </span>
                  <p className="text-xs text-text-secondary leading-relaxed pt-0.5">{s.text}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-sm text-text-secondary leading-[1.8] text-center max-w-xl mx-auto">
            6라운드가 끝난 뒤 더 많은 라운드를 이긴 쪽이 최종 승자가 됩니다.
            예컨대 4:2로 이기면 승리, 3:3이면 무승부입니다.
          </p>
        </div>
      </div>

      {/* ═══ PART 5: 동점 & 등급 ═══ */}
      <div className="border-t border-white/[0.06] pt-12 pb-16 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-[10px] font-cinzel text-accent/40 uppercase tracking-[0.4em] mb-1">Part 5</p>
            <h3 className="text-lg font-serif font-black text-white">타이브레이크 & 등급</h3>
          </div>

          {/* 타이브레이크 */}
          <div className="mb-12">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Scale size={16} className="text-accent/40" />
              <h4 className="text-sm font-bold text-white">타이브레이크</h4>
            </div>
            <p className="text-sm text-text-secondary leading-[1.8] text-center max-w-xl mx-auto mb-6">
              한 라운드에서 두 카드의 영향력 점수가 같으면 타이브레이크가 발동됩니다.
              각 영역에는 지정된 보조 능력치가 있으며, 이 능력치로 재비교하게 됩니다.
              보조 능력치마저 같으면 등급(S~E)을 비교하고, 그래도 같으면 양쪽 모두 0점으로 처리됩니다.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-lg mx-auto text-xs">
              {[
                { domain: "정치·외교", ability: "지휘" },
                { domain: "전략·안보", ability: "무술" },
                { domain: "기술·과학", ability: "지성" },
                { domain: "사회·윤리", ability: "매력" },
                { domain: "산업·경제", ability: "지휘" },
                { domain: "문화·예술", ability: "매력" },
              ].map((t) => (
                <div key={t.domain} className="text-center px-3 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                  <p className="text-text-tertiary text-[10px]">{t.domain}</p>
                  <p className="text-white font-bold mt-0.5">{t.ability}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 등급 */}
          <div>
            <div className="flex items-center justify-center gap-2 mb-4">
              <Crown size={16} className="text-accent/40" />
              <h4 className="text-sm font-bold text-white">카드 등급</h4>
            </div>
            <p className="text-sm text-text-secondary leading-[1.8] text-center max-w-xl mx-auto mb-6">
              모든 인물 카드에는 영향력 총점과 통시성 점수를 합산하여 S부터 E까지 등급이 매겨집니다.
              등급이 높을수록 전반적으로 강하지만, 특정 영역만 돌출된 낮은 등급 카드가
              해당 영역에서는 S급을 이길 수도 있습니다. 카드의 숫자를 꼼꼼히 살펴보시는 것이 좋습니다.
            </p>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {[
                { tier: "S", range: "75–100", color: "text-yellow-300 bg-yellow-400/10 border-yellow-400/20" },
                { tier: "A", range: "60–74", color: "text-purple-300 bg-purple-400/10 border-purple-400/20" },
                { tier: "B", range: "45–59", color: "text-blue-300 bg-blue-400/10 border-blue-400/20" },
                { tier: "C", range: "30–44", color: "text-green-300 bg-green-400/10 border-green-400/20" },
                { tier: "D", range: "15–29", color: "text-orange-300 bg-orange-400/10 border-orange-400/20" },
                { tier: "E", range: "0–14", color: "text-gray-400 bg-gray-400/10 border-gray-400/20" },
              ].map((t) => (
                <div key={t.tier} className={`px-4 py-2 rounded-lg border text-sm font-bold ${t.color}`}>
                  {t.tier} <span className="font-normal text-xs opacity-50">({t.range})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ 전략 팁 ═══ */}
      <div className="border-t border-white/[0.06] pt-12 pb-16 px-4 bg-white/[0.01]">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2">
              <Lightbulb size={16} className="text-accent/40" />
              <h3 className="text-lg font-serif font-black text-white">전략 팁</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            <div className="px-5 py-5 rounded-xl bg-accent/[0.03] border border-accent/10">
              <p className="text-accent font-bold text-sm mb-2">드래프트 단계</p>
              <p className="text-xs text-text-secondary leading-[1.8]">
                총점이 높은 카드만 고르기보다, 영역별 분포를 함께 살펴보시는 것을 권장합니다.
                6개 영역을 모두 커버할 수 있도록 약점이 없는 덱을 만드는 것이 이상적이며,
                상대가 이미 뽑은 카드를 보고 어떤 영역이 비어 있는지 파악하시면 유리합니다.
              </p>
            </div>
            <div className="px-5 py-5 rounded-xl bg-accent/[0.03] border border-accent/10">
              <p className="text-accent font-bold text-sm mb-2">대전 단계</p>
              <p className="text-xs text-text-secondary leading-[1.8]">
                이길 수 있는 라운드에 강한 카드를 집중하고,
                이기기 어려운 라운드에는 약한 카드를 과감히 버리는 판단이 필요합니다.
                다음 라운드의 영역이 미리 공개되므로, 한 수 앞을 내다보며 카드를 배분해 보세요.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 하단 돌아가기 */}
      <div className="text-center py-8">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-text-secondary text-sm transition-colors"
        >
          <ArrowLeft size={14} />
          로비로 돌아가기
        </button>
      </div>
    </div>
  );
}
