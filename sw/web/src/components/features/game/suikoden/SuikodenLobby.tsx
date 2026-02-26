/*
  파일명: components/features/game/suikoden/SuikodenLobby.tsx
  기능: 천도 게임 로비 — 시네마틱 타이틀 스크린
  책임: 다른 게임 로비와 동일한 GameLobbyMain 패턴 적용.
*/
"use client";

import { useState } from "react";
import {
  Crown, BookOpen, BarChart3, ArrowLeft,
  Map, Swords, Users, Scroll, Shield, Building,
} from "lucide-react";
import GameLobbyNavRow from "@/components/features/game/shared/GameLobbyNavRow";
import GameLobbyMain from "@/components/features/game/shared/GameLobbyMain";

interface SuikodenLobbyProps {
  characterCount: number;
  onStart: () => void;
}

type MenuId = "main" | "rules";

export default function SuikodenLobby({ characterCount, onStart }: SuikodenLobbyProps) {
  const [menu, setMenu] = useState<MenuId>("main");

  if (menu === "rules") return <LobbyRules onBack={() => setMenu("main")} />;

  return (
    <GameLobbyMain
        title="천도"
        englishTitle="Cheondo"
        catchphrase="뜻이 있는 자, 천하를 얻으리라"
        cta={{
          icon: <>
            <Crown size={22} className="text-accent sm:hidden" />
            <Crown size={26} className="text-accent hidden sm:block" />
          </>,
          label: "게임 시작",
          sub: `${characterCount} Heroes Await`,
          onClick: onStart,
        }}
        navItems={<>
          <GameLobbyNavRow icon={<BookOpen size={16} />} label="규칙" sub="Rules" onClick={() => setMenu("rules")} />
          <GameLobbyNavRow icon={<BarChart3 size={16} />} label="전적" sub="Records" disabled />
        </>}
    />
  );
}

/* ═══════════════════════════════════════════
   게임 규칙 서브메뉴
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
        <Crown size={28} className="mx-auto text-accent/40 mb-2" />
        <h2 className="text-2xl font-serif font-black text-white tracking-wide">게임 규칙</h2>
        <p className="text-sm text-text-tertiary mt-1.5 max-w-md mx-auto leading-relaxed">
          역사 속 인물들로 세력을 키우는 전략 시뮬레이션
        </p>
      </div>

      {/* 개요 */}
      <section className="text-center px-6 mb-12">
        <p className="text-sm text-text-secondary leading-[1.8]">
          <span className="text-accent font-bold">천도</span>는 역사 속 인물들을 이끌고
          세력을 키워 문명을 통일하는 전략 시뮬레이션입니다.
          수호전 천도 108성에서 영감을 받은 전략 게임입니다.
        </p>
      </section>

      {/* PART 1: 게임 흐름 */}
      <div className="border-t border-white/[0.06] pt-10 pb-12 px-6">
        <div className="text-center mb-6">
          <p className="text-[10px] font-cinzel text-accent/40 uppercase tracking-[0.4em] mb-1">Part 1</p>
          <h3 className="text-lg font-serif font-black text-white">게임 흐름</h3>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { step: "01", icon: <Map size={18} />, title: "방랑", desc: "세계를 탐험하며 인재를 모집" },
            { step: "02", icon: <Building size={18} />, title: "전략", desc: "거점을 관리하고 세력을 확장" },
            { step: "03", icon: <Swords size={18} />, title: "전투", desc: "적 세력과 부대를 이끌고 격돌" },
          ].map((item) => (
            <div key={item.step} className="text-center px-3 py-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <span className="text-accent/30 font-cinzel text-[10px] tracking-wider">{item.step}</span>
              <div className="flex justify-center mt-1.5 mb-1.5 text-accent/50">{item.icon}</div>
              <p className="text-sm font-bold text-white">{item.title}</p>
              <p className="text-[10px] text-text-tertiary mt-1 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* PART 2: 핵심 시스템 */}
      <div className="border-t border-white/[0.06] pt-10 pb-12 px-6">
        <div className="text-center mb-6">
          <p className="text-[10px] font-cinzel text-accent/40 uppercase tracking-[0.4em] mb-1">Part 2</p>
          <h3 className="text-lg font-serif font-black text-white">핵심 시스템</h3>
        </div>
        <div className="space-y-2">
          {[
            { icon: <Users size={14} />, title: "인재 영입", desc: "방랑 중 만난 인물을 설득하여 세력에 합류시킵니다", color: "text-accent border-accent/20 bg-accent/5" },
            { icon: <Shield size={14} />, title: "부대 편성", desc: "영입한 인재들로 전투 부대를 구성합니다", color: "text-blue-400 border-blue-500/20 bg-blue-500/5" },
            { icon: <Building size={14} />, title: "거점 건설", desc: "시설을 짓고 세력의 기반을 다집니다", color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5" },
            { icon: <Scroll size={14} />, title: "전술 운용", desc: "전투에서 전술을 선택하여 유리하게 싸웁니다", color: "text-purple-400 border-purple-500/20 bg-purple-500/5" },
          ].map((item) => (
            <div key={item.title} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${item.color}`}>
              {item.icon}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold">{item.title}</p>
                <p className="text-[10px] text-text-tertiary mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
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
