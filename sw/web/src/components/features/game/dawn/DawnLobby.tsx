/*
  파일명: components/features/game/dawn/DawnLobby.tsx
  기능: 여명 게임 로비 — 시네마틱 타이틀 스크린
  책임: BattleLobby 패턴. 타이틀 + 난이도 선택 + 규칙 서브메뉴.
*/
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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

export default function DawnLobby({ onStart, onExit }: DawnLobbyProps) {
  const t = useTranslations("shared.game");
  const tDawn = useTranslations("rest.arena.dawn");
  const [menu, setMenu] = useState<MenuId>("main");
  const [modalOpen, setModalOpen] = useState(false);

  const DIFFICULTY_OPTIONS = [
    { value: "easy", label: t("ui.diffEasy"), englishLabel: "Easy", desc: tDawn("diffEasyDesc"), icon: <Shield size={22} />, color: "accent" as const },
    { value: "hard", label: t("ui.diffHard"), englishLabel: "Hard", desc: tDawn("diffHardDesc"), icon: <Flame size={22} />, color: "red" as const },
  ];

  if (menu === "rules") return <LobbyRules onBack={() => setMenu("main")} />;

  return (
    <>
      <GameLobbyMain
        title={tDawn("label")}
        englishTitle="Dawn"
        catchphrase={tDawn("catchphrase")}
        cta={{
          icon: <>
            <Clock size={22} className="text-accent sm:hidden" />
            <Clock size={26} className="text-accent hidden sm:block" />
          </>,
          label: tDawn("startGame"),
          sub: "Start Game",
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
        onStart={(v) => onStart(v as "easy" | "hard")}
        icon={<Clock size={28} className="text-accent/40" />}
        title={tDawn("selectDifficulty")}
        desc={tDawn("selectDifficultyDesc")}
        options={DIFFICULTY_OPTIONS}
      />
    </>
  );
}

/* 규칙 서브메뉴 */
function LobbyRules({ onBack }: { onBack: () => void }) {
  const t = useTranslations("shared.game.ui");
  const tDawn = useTranslations("rest.arena.dawn");

  return (
    <GameLobbySubmenu
      onBack={onBack}
      icon={<Clock size={28} className="text-accent/40" />}
      title={t("gameRules")}
      desc={tDawn("rulesDesc")}
      longDesc
      showBackBottom
    >
      <section className="text-center px-6 mb-8">
        <p className="text-sm text-text-secondary leading-[1.8]">
          {tDawn.rich("rulesIntro", {
            game: (chunks) => <span className="text-accent font-bold">{chunks}</span>,
          })}
        </p>
      </section>

      <GameRulesSection partLabel="How to Play" title={t("gameFlow")}>
        <div className="space-y-2">
          {[
            { icon: <ArrowUpDown size={14} />, title: tDawn("flowCheckFigure"), desc: tDawn("flowCheckFigureDesc") },
            { icon: <Clock size={14} />, title: tDawn("flowSelectSlot"), desc: tDawn("flowSelectSlotDesc") },
            { icon: <Heart size={14} />, title: tDawn("flowLives"), desc: tDawn("flowLivesDesc") },
            { icon: <Flame size={14} />, title: tDawn("flowTorches"), desc: tDawn("flowTorchesDesc") },
            { icon: <Trophy size={14} />, title: tDawn("flowClear"), desc: tDawn("flowClearDesc") },
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

      <GameRulesSection partLabel="Difficulty" title={t("difficulty")}>
        <div className="grid grid-cols-2 gap-4">
          <div className="px-4 py-4 rounded-xl bg-accent/[0.03] border border-accent/10 text-center">
            <p className="text-accent font-bold text-lg mb-1">{tDawn("diffEasyTitle")}</p>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              {tDawn("diffEasyRuleDesc")}
            </p>
          </div>
          <div className="px-4 py-4 rounded-xl bg-red-500/[0.03] border border-red-500/10 text-center">
            <p className="text-red-400 font-bold text-lg mb-1">{tDawn("diffHardTitle")}</p>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              {tDawn("diffHardRuleDesc")}
            </p>
          </div>
        </div>
      </GameRulesSection>
    </GameLobbySubmenu>
  );
}
