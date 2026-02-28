/*
  파일명: components/features/game/labyrinth/LabyrinthLobby.tsx
  기능: 미궁 게임 로비 — 시네마틱 타이틀 스크린
  책임: BattleLobby 패턴. 타이틀 + CTA + 규칙 서브메뉴.
*/
"use client";

import { useState } from "react";
import {
  Crosshair, BookOpen, BarChart3, LogOut,
  Brain,
} from "lucide-react";
import GameLobbyNavRow from "@/components/features/game/shared/GameLobbyNavRow";
import GameLobbyMain from "@/components/features/game/shared/GameLobbyMain";
import GameLobbySubmenu from "@/components/features/game/shared/GameLobbySubmenu";
import GameStartModal from "@/components/features/game/shared/GameStartModal";
import GameRulesSection from "@/components/features/game/shared/GameRulesSection";

interface LabyrinthLobbyProps {
  onStart: () => void;
  onExit: () => void;
}

type MenuId = "main" | "rules";

export default function LabyrinthLobby({ onStart, onExit }: LabyrinthLobbyProps) {
  const [menu, setMenu] = useState<MenuId>("main");
  const [modalOpen, setModalOpen] = useState(false);

  if (menu === "rules") return <LobbyRules onBack={() => setMenu("main")} />;

  return (
    <>
      <GameLobbyMain
        title="미궁"
        englishTitle="Labyrinth"
        catchphrase="숨어든 용의자를 찾아내세요"
        cta={{
          icon: <>
            <Crosshair size={22} className="text-accent sm:hidden" />
            <Crosshair size={26} className="text-accent hidden sm:block" />
          </>,
          label: "추적 시작",
          sub: "Start Tracking",
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
        onStart={() => onStart()}
        icon={<Crosshair size={28} className="text-accent/40" />}
        title="추적 시작"
        desc="용의자 6인 중 숨어든 인물을 추적합니다"
      />
    </>
  );
}

/* 규칙 서브메뉴 */
function LobbyRules({ onBack }: { onBack: () => void }) {
  return (
    <GameLobbySubmenu
      onBack={onBack}
      icon={<Crosshair size={28} className="text-accent/40" />}
      title="게임 규칙"
      desc="용의자 6인의 단서를 분석해 숨어든 인물을 추적하는 게임"
      longDesc
      showBackBottom
    >
      <section className="text-center px-6 mb-8">
        <p className="text-sm text-text-secondary leading-[1.8]">
          <span className="text-accent font-bold">미궁</span>은 용의자 6인 속에
          숨어든 인물을 추적하는 게임입니다.
          용의자의 혐의를 해제<span className="text-accent font-bold">(X)</span>하면
          새로운 단서가 해금됩니다.
          확신이 서면 추적 대상을 지목<span className="text-accent font-bold">(O)</span>하세요.
        </p>
      </section>

      {/* 단서 해금 순서 */}
      <GameRulesSection partLabel="Clue Unlock" title="단서 해금 순서">
        <div className="space-y-2">
          {[
            { icon: <BookOpen size={14} />, stage: "단서 1", desc: "콘텐츠 감상평 1개 — 게임 시작 시 공개", color: "text-accent border-accent/20 bg-accent/5" },
            { icon: <BookOpen size={14} />, stage: "단서 2", desc: "콘텐츠 감상평 2개째 — 혐의 해제 1회로 해금", color: "text-blue-400 border-blue-500/20 bg-blue-500/5" },
            { icon: <BookOpen size={14} />, stage: "단서 3", desc: "콘텐츠 감상평 3개째 — 혐의 해제 2회로 해금", color: "text-blue-400 border-blue-500/20 bg-blue-500/5" },
            { icon: <BookOpen size={14} />, stage: "단서 4", desc: "콘텐츠 감상평 4개째 — 혐의 해제 3회로 해금", color: "text-blue-400 border-blue-500/20 bg-blue-500/5" },
            { icon: <Brain size={14} />, stage: "철학", desc: "감상 철학 — 혐의 해제 4회로 해금", color: "text-purple-400 border-purple-500/20 bg-purple-500/5" },
          ].map((item) => (
            <div key={item.stage} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${item.color}`}>
              {item.icon}
              <div className="flex-1 min-w-0">
                <span className="font-bold text-sm">{item.stage}</span>
                <p className="text-[10px] text-text-tertiary mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </GameRulesSection>

      {/* 게임 팁 */}
      <GameRulesSection title="게임 팁">
        <div className="space-y-3">
          <div className="px-5 py-4 rounded-xl bg-accent/[0.03] border border-accent/10">
            <p className="text-xs text-text-secondary leading-[1.8]">
              용의자 카드를 클릭하면 <span className="text-accent font-bold">O</span>(지목)와 <span className="text-red-400 font-bold">X</span>(배제) 버튼이 나타납니다.
              배제할 때마다 단서가 하나씩 해금되니, 단서를 모아 범위를 좁히세요.
            </p>
          </div>
          <div className="px-5 py-4 rounded-xl bg-accent/[0.03] border border-accent/10">
            <p className="text-xs text-text-secondary leading-[1.8]">
              지목은 언제든 가능하지만, 적게 배제하고 빠르게 맞힐수록 좋습니다.
              오답 시 숨은 인물이 도주합니다. 신중하게 판단하세요.
            </p>
          </div>
        </div>
      </GameRulesSection>
    </GameLobbySubmenu>
  );
}
