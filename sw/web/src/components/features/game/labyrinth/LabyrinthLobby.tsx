/*
  파일명: components/features/game/labyrinth/LabyrinthLobby.tsx
  기능: 미궁 게임 로비 — 시네마틱 타이틀 스크린
  책임: BattleLobby 패턴. 타이틀 + CTA + 규칙 서브메뉴.
*/
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("shared.game");
  const tLab = useTranslations("rest.arena.labyrinth");
  const [menu, setMenu] = useState<MenuId>("main");
  const [modalOpen, setModalOpen] = useState(false);

  if (menu === "rules") return <LobbyRules onBack={() => setMenu("main")} />;

  return (
    <>
      <GameLobbyMain
        title={tLab("label")}
        englishTitle="Labyrinth"
        catchphrase={tLab("catchphrase")}
        cta={{
          icon: <>
            <Crosshair size={22} className="text-accent sm:hidden" />
            <Crosshair size={26} className="text-accent hidden sm:block" />
          </>,
          label: tLab("startTracking"),
          sub: "Start Tracking",
          onClick: () => setModalOpen(true),
        }}
        navItems={<>
          <GameLobbyNavRow icon={<BookOpen size={16} />} label={t("lobby.rules")} sub="Rules" onClick={() => setMenu("rules")} />
          <GameLobbyNavRow icon={<BarChart3 size={16} />} label={t("lobby.records")} sub="Records" disabled />
          <GameLobbyNavRow icon={<LogOut size={16} />} label={t("exit")} sub="Exit" onClick={onExit} />
        </>}
      />
      <GameStartModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onStart={() => onStart()}
        icon={<Crosshair size={28} className="text-accent/40" />}
        title={tLab("startTracking")}
        desc={tLab("startTrackingDesc")}
      />
    </>
  );
}

/* 규칙 서브메뉴 */
function LobbyRules({ onBack }: { onBack: () => void }) {
  const t = useTranslations("shared.game.ui");
  const tLab = useTranslations("rest.arena.labyrinth");

  return (
    <GameLobbySubmenu
      onBack={onBack}
      icon={<Crosshair size={28} className="text-accent/40" />}
      title={t("gameRules")}
      desc={tLab("rulesDesc")}
      longDesc
      showBackBottom
    >
      <section className="text-center px-6 mb-8">
        <p className="text-sm text-text-secondary leading-[1.8]">
          {tLab.rich("rulesIntro", {
            game: (chunks) => <span className="text-accent font-bold">{chunks}</span>,
            x: (chunks) => <span className="text-accent font-bold">{chunks}</span>,
            o: (chunks) => <span className="text-accent font-bold">{chunks}</span>,
          })}
        </p>
      </section>

      {/* 단서 해금 순서 */}
      <GameRulesSection partLabel="Clue Unlock" title={tLab("clueUnlockTitle")}>
        <div className="space-y-2">
          {[
            { icon: <BookOpen size={14} />, stage: tLab("clue1"), desc: tLab("clue1Desc"), color: "text-accent border-accent/20 bg-accent/5" },
            { icon: <BookOpen size={14} />, stage: tLab("clue2"), desc: tLab("clue2Desc"), color: "text-blue-400 border-blue-500/20 bg-blue-500/5" },
            { icon: <BookOpen size={14} />, stage: tLab("clue3"), desc: tLab("clue3Desc"), color: "text-blue-400 border-blue-500/20 bg-blue-500/5" },
            { icon: <BookOpen size={14} />, stage: tLab("clue4"), desc: tLab("clue4Desc"), color: "text-blue-400 border-blue-500/20 bg-blue-500/5" },
            { icon: <Brain size={14} />, stage: tLab("cluePhilosophy"), desc: tLab("cluePhilosophyDesc"), color: "text-purple-400 border-purple-500/20 bg-purple-500/5" },
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
      <GameRulesSection title={t("gameTips")}>
        <div className="space-y-3">
          <div className="px-5 py-4 rounded-xl bg-accent/[0.03] border border-accent/10">
            <p className="text-xs text-text-secondary leading-[1.8]">
              {tLab.rich("tip1", {
                o: (chunks) => <span className="text-accent font-bold">{chunks}</span>,
                x: (chunks) => <span className="text-red-400 font-bold">{chunks}</span>,
              })}
            </p>
          </div>
          <div className="px-5 py-4 rounded-xl bg-accent/[0.03] border border-accent/10">
            <p className="text-xs text-text-secondary leading-[1.8]">
              {tLab("tip2")}
            </p>
          </div>
        </div>
      </GameRulesSection>
    </GameLobbySubmenu>
  );
}
