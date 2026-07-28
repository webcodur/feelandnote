/*
  파일명: components/features/game/battle/BattleLobby.tsx
  기능: 패권 게임 로비 — 타이틀 스크린
  책임: 콘솔 게임 타이틀 화면처럼 배경 위에 시네마틱 타이틀과 메뉴를 띄운다.
*/
"use client";

import { useState, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
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

/* ═══════════════════════════════════════════
   메인 로비: 시네마틱 타이틀 스크린
   ═══════════════════════════════════════════ */

export default function BattleLobby({ onStartVsAi, onExit, bgmMuted, sfxMuted, toggleBgmMuted, toggleSfxMuted }: BattleLobbyProps) {
  const t = useTranslations("shared.game");
  const tArena = useTranslations("rest.arena.hegemony");
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
        title={tArena("label")}
        englishTitle="Hegemony"
        catchphrase={tArena("headerDesc")}
        onTitleTap={handleTitleTap}
        cta={{
          icon: <>
            <Bot size={22} className="text-accent sm:hidden" />
            <Bot size={26} className="text-accent hidden sm:block" />
          </>,
          label: t("lobby.aiMatch"),
          sub: "vs Computer",
          onClick: () => setModalOpen(true),
        }}
        navItems={<>
          <GameLobbyNavRow icon={<BookOpen size={16} />} label={t("lobby.rules")} sub="Rules" onClick={() => setMenu("rules")} />
          <GameLobbyNavRow icon={<Users size={16} />} label={t("lobby.multiplayer")} sub="Multiplayer" disabled />
          <GameLobbyNavRow icon={<Settings size={16} />} label={t("lobby.settings")} sub="Settings" onClick={() => setMenu("settings")} />
          <GameLobbyNavRow icon={<BarChart3 size={16} />} label={t("lobby.records")} sub="Records" disabled />
          <GameLobbyNavRow icon={<LogOut size={16} />} label={t("exit")} sub="Exit" onClick={onExit} />
        </>}
      />
      <GameStartModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onStart={(v) => onStartVsAi(v as Difficulty)}
        icon={<Bot size={28} className="text-accent/40" />}
        title={t("lobby.aiMatch")}
        desc={t("lobby.selectDifficulty")}
        options={[
          { value: "normal", label: t("lobby.diffNormal"), englishLabel: "Normal", desc: t("lobby.diffNormalDesc"), icon: <Shield size={22} />, color: "accent" as const },
          { value: "hard", label: t("lobby.diffHard"), englishLabel: "Hard", desc: t("lobby.diffHardDesc"), icon: <Flame size={22} />, color: "red" as const },
        ]}
      />
    </>
  );
}

/* ═══════════════════════════════════════════
   게임 규칙 서브메뉴
   ═══════════════════════════════════════════ */

function LobbyRules({ onBack }: { onBack: () => void }) {
  const tUI = useTranslations("shared.game.ui");
  const tArena = useTranslations("rest.arena.hegemony");
  const r = useTranslations("rest.arena.hegemony.rules");

  return (
    <GameLobbySubmenu
      onBack={onBack}
      icon={<Swords size={28} className="text-accent/40" />}
      title={tUI("gameRules")}
      desc={tArena("rulesDesc")}
      longDesc
      showBackBottom
    >
      {/* 개요 */}
      <section className="text-center px-6 mb-12">
        <p className="text-sm text-text-secondary leading-[1.8]">
          {tArena.rich("rulesIntro", {
            game: (chunks) => <span className="text-accent font-bold">{chunks}</span>,
          })}
        </p>
      </section>

      {/* PART 1: 게임 흐름 */}
      <GameRulesSection partLabel="Part 1" title={r("flowTitle")}>
        <div className="grid grid-cols-4 gap-2">
          {[
            { step: "01", icon: <Layers size={18} />, title: r("flow01"), desc: r("flow01Desc") },
            { step: "02", icon: <Crown size={18} />, title: r("flow02"), desc: r("flow02Desc") },
            { step: "03", icon: <Swords size={18} />, title: r("flow03"), desc: r("flow03Desc") },
            { step: "04", icon: <Trophy size={18} />, title: r("flow04"), desc: r("flow04Desc") },
          ].map((item) => (
            <div key={item.step} className="text-center px-3 py-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <span className="text-accent/30 font-cinzel text-[10px] tracking-wider">{item.step}</span>
              <div className="flex justify-center mt-1.5 mb-1.5 text-accent/50">{item.icon}</div>
              <p className="text-sm font-bold text-white">{item.title}</p>
              <p className="text-[10px] mt-1 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          <p className="text-[11px] text-text-secondary leading-relaxed text-center">
            {r.rich("draftNote", {
              accent: (chunks) => <span className="text-accent/70 font-bold">{chunks}</span>,
            })}
          </p>
        </div>
      </GameRulesSection>

      {/* PART 2: 국가 상태 */}
      <GameRulesSection partLabel="Part 2" title={r("stateTitle")}>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="px-4 py-4 rounded-xl bg-accent/[0.03] border border-accent/10 text-center">
            <p className="text-accent font-bold text-lg mb-1">{r("powerLabel")}</p>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              {r.rich("powerDesc", {
                red: (chunks) => <span className="text-red-400 font-bold">{chunks}</span>,
              })}
            </p>
          </div>
          <div className="px-4 py-4 rounded-xl bg-sky-500/[0.03] border border-sky-500/10 text-center">
            <p className="text-sky-400 font-bold text-lg mb-1">{r("moraleLabel")}</p>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              {r.rich("moraleDesc", {
                red: (chunks) => <span className="text-red-400 font-bold">{chunks}</span>,
              })}
            </p>
          </div>
        </div>
      </GameRulesSection>

      {/* PART 3: 3대 군령 */}
      <GameRulesSection partLabel="Part 3" title={r("ordersTitle")}>
        <p className="text-sm text-text-secondary leading-[1.8] text-center mb-6">
          {r.rich("ordersIntro", {
            white: (chunks) => <span className="text-white font-medium">{chunks}</span>,
            accent: (chunks) => <span className="text-accent font-medium">{chunks}</span>,
          })}
        </p>
        <div className="space-y-2">
          {[
            {
              name: r("cmdBattle"), icon: <Swords size={14} />,
              desc: r("cmdBattleDesc"),
              detail: r("cmdBattleDetail"),
              color: "text-red-400 border-red-500/20 bg-red-500/5",
            },
            {
              name: r("cmdScheme"), icon: <ScrollText size={14} />,
              desc: r("cmdSchemeDesc"),
              detail: r("cmdSchemeDetail"),
              color: "text-purple-400 border-purple-500/20 bg-purple-500/5",
            },
            {
              name: r("cmdGovern"), icon: <Landmark size={14} />,
              desc: r("cmdGovernDesc"),
              detail: r("cmdGovernDetail"),
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
          <p className="text-xs text-accent font-bold mb-2 text-center">{r("matchupTitle")}</p>
          <div className="flex items-center justify-center gap-2 text-sm mb-2">
            <span className="text-red-400 font-bold">{r("cmdBattle")}</span>
            <span className="text-white/20">&gt;</span>
            <span className="text-amber-400 font-bold">{r("cmdGovern")}</span>
            <span className="text-white/20">&gt;</span>
            <span className="text-purple-400 font-bold">{r("cmdScheme")}</span>
            <span className="text-white/20">&gt;</span>
            <span className="text-red-400 font-bold">{r("cmdBattle")}</span>
          </div>
          <p className="text-[11px] text-text-secondary leading-relaxed text-center">
            {r.rich("matchupDesc", {
              accent: (chunks) => <span className="text-accent font-bold">{chunks}</span>,
              red: (chunks) => <span className="text-red-400 font-bold">{chunks}</span>,
            })}
          </p>
        </div>
      </GameRulesSection>

      {/* PART 4: 주장 시스템 */}
      <GameRulesSection partLabel="Part 4" title={r("captainTitle")}>
        <p className="text-[11px] text-text-secondary leading-relaxed text-center mb-4">
          {r.rich("captainIntro", {
            accent: (chunks) => <span className="text-accent font-bold">{chunks}</span>,
          })}
        </p>
        <div className="space-y-2">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-accent/[0.03] border border-accent/10">
            <Crown size={16} className="text-accent/60 shrink-0" />
            <div>
              <p className="text-xs font-bold text-accent">{r("captainAura")}</p>
              <p className="text-[10px] text-text-secondary mt-0.5">
                {r.rich("captainAuraDesc", {
                  accent: (chunks) => <span className="text-accent font-bold">{chunks}</span>,
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-accent/[0.03] border border-accent/10">
            <Swords size={16} className="text-accent/60 shrink-0" />
            <div>
              <p className="text-xs font-bold text-accent">{r("captainDeploy")}</p>
              <p className="text-[10px] text-text-secondary mt-0.5">
                {r.rich("captainDeployDesc", {
                  accent: (chunks) => <span className="text-accent font-bold">{chunks}</span>,
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <span className="text-white/30 shrink-0 text-xs">💀</span>
            <div>
              <p className="text-xs font-bold text-white/60">{r("captainLost")}</p>
              <p className="text-[10px] text-text-secondary mt-0.5">{r("captainLostDesc")}</p>
            </div>
          </div>
        </div>
      </GameRulesSection>

      {/* PART 5: 카드 소모와 회수 */}
      <GameRulesSection partLabel="Part 5" title={r("cardsTitle")}>
        <div className="space-y-4">
          <div className="px-5 py-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <p className="text-sm font-bold text-white mb-2">{r("cardConsume")}</p>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              {r.rich("cardConsumeDesc", {
                red: (chunks) => <span className="text-red-400 font-bold">{chunks}</span>,
                purple: (chunks) => <span className="text-purple-400 font-bold">{chunks}</span>,
                amber: (chunks) => <span className="text-amber-400 font-bold">{chunks}</span>,
              })}
            </p>
          </div>
          <div className="px-5 py-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <p className="text-sm font-bold text-white mb-2">{r("cardRecovery")}</p>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              {r.rich("cardRecoveryDesc", {
                amber: (chunks) => <span className="text-amber-400 font-bold">{chunks}</span>,
              })}
            </p>
          </div>
          <div className="px-5 py-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <p className="text-sm font-bold text-white mb-2">{r("cardExhaust")}</p>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              {r.rich("cardExhaustDesc", {
                accent: (chunks) => <span className="text-accent font-bold">{chunks}</span>,
              })}
            </p>
          </div>
        </div>
      </GameRulesSection>

      {/* PART 6: 천명 시스템 */}
      <GameRulesSection partLabel="Part 6" title={r("fateTitle")}>
        <div className="space-y-4">
          <p className="text-[11px] text-text-secondary leading-relaxed text-center">
            {r.rich("fateIntro", {
              amber: (chunks) => <span className="text-amber-300 font-bold">{chunks}</span>,
            })}
          </p>
          <div className="space-y-2">
            {[
              { name: r("fateWind"), cmd: r("fateWindCmd"), color: "text-red-400 border-red-500/15 bg-red-500/[0.03]" },
              { name: r("fateShadow"), cmd: r("fateShadowCmd"), color: "text-purple-400 border-purple-500/15 bg-purple-500/[0.03]" },
              { name: r("fatePeace"), cmd: r("fatePeaceCmd"), color: "text-amber-400 border-amber-500/15 bg-amber-500/[0.03]" },
            ].map((m) => (
              <div key={m.name} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border ${m.color}`}>
                <span className="text-amber-300/70 text-sm">★</span>
                <span className="font-bold text-xs flex-1">{m.name}</span>
                <span className="text-[10px]">{m.cmd}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-white/25 text-center leading-relaxed">
            {r("fateNote")}
          </p>
        </div>
      </GameRulesSection>

      {/* 전략 팁 */}
      <GameRulesSection title={tUI("strategyTips")}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { title: r("tipBattleMorale"), desc: r("tipBattleMoraleDesc") },
            { title: r("tipGovernValue"), desc: r("tipGovernValueDesc") },
            { title: r("tipReadOpponent"), desc: r("tipReadOpponentDesc") },
            { title: r("tipAptitude"), desc: r("tipAptitudeDesc") },
          ].map((tip) => (
            <div key={tip.title} className="px-5 py-5 rounded-xl bg-accent/[0.03] border border-accent/10">
              <p className="text-accent font-bold text-sm mb-2">{tip.title}</p>
              <p className="text-xs text-text-secondary leading-[1.8]">{tip.desc}</p>
            </div>
          ))}
        </div>
      </GameRulesSection>
    </GameLobbySubmenu>
  );
}
