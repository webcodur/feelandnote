/*
  파일명: components/features/game/dawn/DawnLobby.tsx
  기능: 여명 게임 로비 — 시네마틱 타이틀 스크린
  책임: BattleLobby 패턴. 타이틀 + 난이도 선택 + 규칙 서브메뉴.
*/
"use client";

import { useState } from "react";
import {
  BookOpen, Shield, Flame, Clock, LogOut,
  ArrowUpDown, Trophy, Heart, BarChart3,
} from "lucide-react";
import GameLobbyNavRow from "@/components/features/game/shared/GameLobbyNavRow";
import GameLobbyMain from "@/components/features/game/shared/GameLobbyMain";
import GameLobbySubmenu from "@/components/features/game/shared/GameLobbySubmenu";
import GameStartModal from "@/components/features/game/shared/GameStartModal";
import GameRulesSection from "@/components/features/game/shared/GameRulesSection";

interface DawnLobbyProps {
  onStart: (difficulty: "easy" | "hard") => void;
  onExit: () => void;
}

type MenuId = "main" | "rules";

const DIFFICULTY_OPTIONS = [
  { value: "easy", label: "초급", englishLabel: "Easy", desc: "탭하여 인물 정보 확인 가능", icon: <Shield size={22} />, color: "accent" as const },
  { value: "hard", label: "고급", englishLabel: "Hard", desc: "연도 숨김. 기억력만으로 도전", icon: <Flame size={22} />, color: "red" as const },
];

export default function DawnLobby({ onStart, onExit }: DawnLobbyProps) {
  const [menu, setMenu] = useState<MenuId>("main");
  const [modalOpen, setModalOpen] = useState(false);

  if (menu === "rules") return <LobbyRules onBack={() => setMenu("main")} />;

  return (
    <>
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
          onClick: () => setModalOpen(true),
        }}
        navItems={<>
          <GameLobbyNavRow icon={<BookOpen size={16} />} label="규칙" sub="Rules" onClick={() => setMenu("rules")} />
          <GameLobbyNavRow icon={<BarChart3 size={16} />} label="전적" sub="Records" disabled />
          <GameLobbyNavRow icon={<LogOut size={16} />} label="나가기" sub="Exit" onClick={onExit} />
        </>}
      />
      <GameStartModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onStart={(v) => onStart(v as "easy" | "hard")}
        icon={<Clock size={28} className="text-accent/40" />}
        title="난이도 선택"
        desc="난이도를 선택하세요"
        options={DIFFICULTY_OPTIONS}
      />
    </>
  );
}

/* 규칙 서브메뉴 */
function LobbyRules({ onBack }: { onBack: () => void }) {
  return (
    <GameLobbySubmenu
      onBack={onBack}
      icon={<Clock size={28} className="text-accent/40" />}
      title="게임 규칙"
      desc="인물의 탄생 순서를 맞추는 연대기 게임"
      longDesc
      showBackBottom
    >
      <section className="text-center px-6 mb-8">
        <p className="text-sm text-text-secondary leading-[1.8]">
          <span className="text-accent font-bold">여명</span>은 역사 속 인물이 주어지면
          연대기 보드의 올바른 위치에 배치하는 게임입니다.
          연속으로 맞출수록 기록이 갱신됩니다.
        </p>
      </section>

      <GameRulesSection partLabel="How to Play" title="게임 흐름">
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
      </GameRulesSection>

      <GameRulesSection partLabel="Difficulty" title="난이도">
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
      </GameRulesSection>
    </GameLobbySubmenu>
  );
}
