/*
  파일명: components/features/game/dawn/DawnLobby.tsx
  기능: 여명 게임 로비 — 시네마틱 타이틀 스크린
  책임: BattleLobby 패턴. 타이틀 + 난이도 선택 + 규칙 서브메뉴.
*/
"use client";

import { useState } from "react";
import {
  BookOpen, ArrowLeft, ChevronRight, Shield, Flame, Clock,
  ArrowUpDown, Trophy, Heart, BarChart3,
} from "lucide-react";
import GameLobbyNavRow from "@/components/features/game/shared/GameLobbyNavRow";
import GameLobbyMain from "@/components/features/game/shared/GameLobbyMain";

interface DawnLobbyProps {
  onStart: (difficulty: "easy" | "hard") => void;
  highScore: number;
}

type MenuId = "main" | "rules" | "difficulty";

export default function DawnLobby({ onStart, highScore }: DawnLobbyProps) {
  const [menu, setMenu] = useState<MenuId>("main");

  if (menu === "rules") return <LobbyRules onBack={() => setMenu("main")} />;
  if (menu === "difficulty") return <DifficultySelect onBack={() => setMenu("main")} onStart={onStart} />;

  return (
    <GameLobbyMain
      title="여명"
      englishTitle="Dawn"
      catchphrase="역사의 서광"
      cta={{
        icon: <>
          <Clock size={22} className="text-accent sm:hidden" />
          <Clock size={26} className="text-accent hidden sm:block" />
        </>,
        label: "게임 시작",
        sub: "Start Game",
        onClick: () => setMenu("difficulty"),
        showChevron: true,
      }}
      highScore={highScore}
      navItems={<>
        <GameLobbyNavRow icon={<BookOpen size={16} />} label="규칙" sub="Rules" onClick={() => setMenu("rules")} />
        <GameLobbyNavRow icon={<BarChart3 size={16} />} label="전적" sub="Records" disabled />
      </>}
    />
  );
}

/* 난이도 선택 */
function DifficultySelect({ onBack, onStart }: { onBack: () => void; onStart: (d: "easy" | "hard") => void }) {
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
          <Clock size={28} className="mx-auto text-accent/40 mb-2" />
          <h2 className="text-2xl font-serif font-black text-white tracking-wide">난이도 선택</h2>
          <p className="text-sm text-text-tertiary mt-1.5">난이도를 선택하세요</p>
        </div>

        <div className="px-6 pb-10 space-y-3">
          <button
            onClick={() => onStart("easy")}
            className="group w-full text-left px-5 py-5 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-accent/[0.06] hover:border-accent/20 active:scale-[0.97] transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                <Shield size={22} className="text-accent/70" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-serif font-black text-accent">초급</span>
                  <span className="text-[9px] font-cinzel text-accent/30 uppercase tracking-wider">Easy</span>
                </div>
                <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">
                  탭하여 인물 정보 확인 가능
                </p>
              </div>
              <ChevronRight size={16} className="text-white/10 group-hover:text-accent/40 transition-colors shrink-0" />
            </div>
          </button>

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
                  <span className="text-lg font-serif font-black text-red-400">고급</span>
                  <span className="text-[9px] font-cinzel text-red-400/30 uppercase tracking-wider">Hard</span>
                </div>
                <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">
                  연도 숨김. 기억력만으로 도전
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

/* 규칙 서브메뉴 */
function LobbyRules({ onBack }: { onBack: () => void }) {
  return (
    <div className="lg:ml-auto lg:w-1/3 lg:min-w-[360px]">
      <div className="flex flex-col animate-fade-in lg:bg-black/50 lg:backdrop-blur-sm lg:rounded-l-2xl lg:border-l lg:border-white/[0.05]">

        <div className="relative text-center py-8 mb-2 px-4">
          <button
            onClick={onBack}
            className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-text-secondary text-sm transition-colors"
          >
            <ArrowLeft size={14} />
            돌아가기
          </button>
          <Clock size={28} className="mx-auto text-accent/40 mb-2" />
          <h2 className="text-2xl font-serif font-black text-white tracking-wide">게임 규칙</h2>
          <p className="text-sm text-text-tertiary mt-1.5 max-w-md mx-auto leading-relaxed">
            인물의 탄생 순서를 맞추는 연대기 게임
          </p>
        </div>

        <section className="text-center px-6 mb-8">
          <p className="text-sm text-text-secondary leading-[1.8]">
            <span className="text-accent font-bold">여명</span>은 역사 속 인물이 주어지면
            연대기 보드의 올바른 위치에 배치하는 게임입니다.
            연속으로 맞출수록 기록이 갱신됩니다.
          </p>
        </section>

        {/* 게임 흐름 */}
        <div className="border-t border-white/[0.06] pt-10 pb-12 px-6">
          <div className="text-center mb-6">
            <p className="text-[10px] font-cinzel text-accent/40 uppercase tracking-[0.4em] mb-1">How to Play</p>
            <h3 className="text-lg font-serif font-black text-white">게임 흐름</h3>
          </div>
          <div className="space-y-2">
            {[
              { icon: <ArrowUpDown size={14} />, title: "인물 확인", desc: "상단에 표시된 인물의 정보를 확인합니다" },
              { icon: <Clock size={14} />, title: "위치 선택", desc: "하단 연대기 보드에서 올바른 위치 슬롯을 탭합니다" },
              { icon: <Heart size={14} />, title: "체력 3칸", desc: "오답 시 1칸 감소, 0이 되면 게임 종료" },
              { icon: <Flame size={14} />, title: "횃불 2개", desc: "사용 시 랜덤 힌트 제공 (세기 공개 / 위치 힌트 / 슬롯 제거)" },
              { icon: <Trophy size={14} />, title: "연속 성공", desc: "모든 인물을 배치하면 클리어!" },
            ].map((item) => (
              <div key={item.title} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <span className="text-accent/50 shrink-0">{item.icon}</span>
                <div>
                  <p className="text-sm font-bold text-white">{item.title}</p>
                  <p className="text-[10px] text-text-tertiary mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 난이도 비교 */}
        <div className="border-t border-white/[0.06] pt-10 pb-12 px-6">
          <div className="text-center mb-6">
            <p className="text-[10px] font-cinzel text-accent/40 uppercase tracking-[0.4em] mb-1">Difficulty</p>
            <h3 className="text-lg font-serif font-black text-white">난이도</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="px-4 py-4 rounded-xl bg-accent/[0.03] border border-accent/10 text-center">
              <p className="text-accent font-bold text-lg mb-1">초급</p>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                카드를 탭하면 인물 상세 정보를 확인할 수 있습니다.
              </p>
            </div>
            <div className="px-4 py-4 rounded-xl bg-red-500/[0.03] border border-red-500/10 text-center">
              <p className="text-red-400 font-bold text-lg mb-1">고급</p>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                보드 카드의 연도가 숨겨집니다. 기억력으로 도전하세요.
              </p>
            </div>
          </div>
        </div>

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
