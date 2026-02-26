/*
  파일명: components/features/game/labyrinth/LabyrinthLobby.tsx
  기능: 미궁 게임 로비 — 시네마틱 타이틀 스크린
  책임: BattleLobby 패턴. 타이틀 + CTA + 규칙 서브메뉴.
*/
"use client";

import { useState } from "react";
import {
  Crosshair, BookOpen, ArrowLeft, BarChart3,
  Eye, MessageSquare, Brain, User, Quote, HelpCircle,
} from "lucide-react";
import GameLobbyNavRow from "@/components/features/game/shared/GameLobbyNavRow";
import GameLobbyMain from "@/components/features/game/shared/GameLobbyMain";

interface LabyrinthLobbyProps {
  onStart: () => void;
  highScore: number;
}

type MenuId = "main" | "rules";

export default function LabyrinthLobby({ onStart, highScore }: LabyrinthLobbyProps) {
  const [menu, setMenu] = useState<MenuId>("main");

  if (menu === "rules") return <LobbyRules onBack={() => setMenu("main")} />;

  return (
    <GameLobbyMain
      title="미궁"
      englishTitle="Labyrinth"
      catchphrase="추적의 미학"
      cta={{
        icon: <>
          <Crosshair size={22} className="text-accent sm:hidden" />
          <Crosshair size={26} className="text-accent hidden sm:block" />
        </>,
        label: "추적 시작",
        sub: "Start Tracking",
        onClick: onStart,
      }}
      highScore={highScore}
      navItems={<>
        <GameLobbyNavRow icon={<BookOpen size={16} />} label="규칙" sub="Rules" onClick={() => setMenu("rules")} />
        <GameLobbyNavRow icon={<BarChart3 size={16} />} label="전적" sub="Records" disabled />
      </>}
    />
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
          <Crosshair size={28} className="mx-auto text-accent/40 mb-2" />
          <h2 className="text-2xl font-serif font-black text-white tracking-wide">게임 규칙</h2>
          <p className="text-sm text-text-tertiary mt-1.5 max-w-md mx-auto leading-relaxed">
            단서를 보고 4명 중 누구인지 맞추는 추적 게임
          </p>
        </div>

        <section className="text-center px-6 mb-8">
          <p className="text-sm text-text-secondary leading-[1.8]">
            <span className="text-accent font-bold">미궁</span>은 순차적으로 공개되는 단서를 통해
            인물의 정체를 추리하는 게임입니다.
            빠르게 맞출수록 높은 점수를 획득합니다.
          </p>
        </section>

        {/* 힌트 순서 & 점수 */}
        <div className="border-t border-white/[0.06] pt-10 pb-12 px-6">
          <div className="text-center mb-6">
            <p className="text-[10px] font-cinzel text-accent/40 uppercase tracking-[0.4em] mb-1">Hints & Scoring</p>
            <h3 className="text-lg font-serif font-black text-white">단서 순서</h3>
          </div>
          <div className="space-y-2">
            {[
              { icon: <Eye size={14} />, stage: "스탯", score: "6점", desc: "프로필 능력치와 국적/생몰년", color: "text-accent border-accent/20 bg-accent/5" },
              { icon: <BookOpen size={14} />, stage: "콘텐츠", score: "5점", desc: "인물이 즐겼던 책/영화/음악", color: "text-blue-400 border-blue-500/20 bg-blue-500/5" },
              { icon: <Brain size={14} />, stage: "철학", score: "4점", desc: "감상 철학과 문화적 태도", color: "text-purple-400 border-purple-500/20 bg-purple-500/5" },
              { icon: <User size={14} />, stage: "소개", score: "3점", desc: "인물 소개 문구 (이름 제외)", color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5" },
              { icon: <Quote size={14} />, stage: "명언", score: "2점", desc: "인물의 대표 명언", color: "text-amber-400 border-amber-500/20 bg-amber-500/5" },
              { icon: <HelpCircle size={14} />, stage: "최종 선택", score: "1점", desc: "4지선다 (최후의 기회)", color: "text-red-400 border-red-500/20 bg-red-500/5" },
            ].map((item) => (
              <div key={item.stage} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${item.color}`}>
                {item.icon}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{item.stage}</span>
                    <span className="text-[10px] text-accent/60 font-cinzel">{item.score}</span>
                  </div>
                  <p className="text-[10px] text-text-tertiary mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 게임 팁 */}
        <div className="border-t border-white/[0.06] pt-10 pb-12 px-6">
          <div className="text-center mb-6">
            <h3 className="text-lg font-serif font-black text-white">게임 팁</h3>
          </div>
          <div className="space-y-3">
            <div className="px-5 py-4 rounded-xl bg-accent/[0.03] border border-accent/10">
              <p className="text-xs text-text-secondary leading-[1.8]">
                단서는 언제든 이전 슬라이드로 돌아가 확인할 수 있습니다.
                좌우 스와이프나 탭 네비게이션으로 이동하세요.
              </p>
            </div>
            <div className="px-5 py-4 rounded-xl bg-accent/[0.03] border border-accent/10">
              <p className="text-xs text-text-secondary leading-[1.8]">
                확신이 서면 어느 단계에서든 하단의 4지선다로 바로 정답을 맞출 수 있습니다.
                빠를수록 높은 점수!
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
