/*
  파일명: components/features/game/suikoden/SuikodenLobby.tsx
  기능: 천도 게임 로비 — 시네마틱 타이틀 스크린
  책임: 다른 게임 로비와 동일한 GameLobbyMain 패턴 적용.
*/
"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { createPortal } from "react-dom";
import {
  Crown, BookOpen, BarChart3, LogOut,
  Map, Swords, Users, Scroll, Shield, Building, Construction,
} from "lucide-react";
import { Z_INDEX } from "@/constants/zIndex";
import GameLobbyNavRow from "@/components/features/game/shared/GameLobbyNavRow";
import GameLobbyMain from "@/components/features/game/shared/GameLobbyMain";
import GameLobbySubmenu from "@/components/features/game/shared/GameLobbySubmenu";
import GameRulesSection from "@/components/features/game/shared/GameRulesSection";

interface SuikodenLobbyProps {
  characterCount: number;
  onStart: () => void;
  onExit: () => void;
}

type MenuId = "main" | "rules";

export default function SuikodenLobby({ characterCount, onStart, onExit }: SuikodenLobbyProps) {
  const t = useTranslations("shared.game");
  const tArena = useTranslations("rest.arena.suikoden");
  const [menu, setMenu] = useState<MenuId>("main");
  const [devModalOpen, setDevModalOpen] = useState(false);
  const codeRef = useRef("");

  // 모달 열린 동안 키보드로 비밀코드 수집
  useEffect(() => {
    if (!devModalOpen) return;
    codeRef.current = "";
    const SECRET = "123";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setDevModalOpen(false); return; }
      if (!/^\d$/.test(e.key)) return;
      e.stopPropagation();
      const next = codeRef.current + e.key;
      if (SECRET.startsWith(next)) {
        codeRef.current = next;
        if (next === SECRET) {
          setDevModalOpen(false);
          onStart();
        }
      } else {
        codeRef.current = "";
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [devModalOpen, onStart]);

  if (menu === "rules") return <LobbyRules onBack={() => setMenu("main")} />;

  return (
    <>
      <GameLobbyMain
          title={tArena("label")}
          englishTitle="Cheondo"
          catchphrase={tArena("headerDesc")}
          cta={{
            icon: <>
              <Construction size={22} className="text-text-tertiary sm:hidden" />
              <Construction size={26} className="text-text-tertiary hidden sm:block" />
            </>,
            label: tArena("devNoticeTitle"),
            sub: "Coming Soon",
            onClick: () => setDevModalOpen(true),
          }}
          navItems={<>
            <GameLobbyNavRow icon={<BookOpen size={16} />} label={t("lobby.rules")} sub="Rules" onClick={() => setMenu("rules")} />
            <GameLobbyNavRow icon={<BarChart3 size={16} />} label={t("lobby.records")} sub="Records" disabled />
            <GameLobbyNavRow icon={<LogOut size={16} />} label={t("exit")} sub="Exit" onClick={onExit} />
          </>}
      />
      {devModalOpen && createPortal(
        <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: Z_INDEX.gameModal }}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setDevModalOpen(false)} />
          <div className="relative w-[min(90vw,320px)] rounded-2xl bg-bg-main border border-white/[0.08] shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center pt-6 pb-4 px-5">
              <Construction size={28} className="text-text-tertiary mb-2" />
              <h2 className="text-base font-serif font-black text-white">{tArena("devNoticeTitle")}</h2>
              <p className="text-[11px] text-text-tertiary mt-1 text-center leading-relaxed">{tArena("devNoticeDesc")}</p>
            </div>
            <div className="px-4 pb-4">
              <button
                onClick={() => setDevModalOpen(false)}
                className="w-full py-2 rounded-lg text-[11px] text-text-tertiary hover:text-text-secondary"
              >
                {t("ui.cancel")}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

/* ═══════════════════════════════════════════
   게임 규칙 서브메뉴
   ═══════════════════════════════════════════ */

function LobbyRules({ onBack }: { onBack: () => void }) {
  const tS = useTranslations("rest.arena.suikoden");
  return (
    <GameLobbySubmenu
      onBack={onBack}
      icon={<Crown size={28} className="text-accent/40" />}
      title={tS("rules.title")}
      desc={tS("rules.desc")}
      longDesc
      showBackBottom
    >
      {/* 개요 */}
      <section className="text-center px-6 mb-12">
        <p className="text-sm text-text-secondary leading-[1.8]">
          {tS.rich("rules.overview", {
            game: (chunks) => <span className="text-accent font-bold">{chunks}</span>,
          })}
        </p>
      </section>

      {/* PART 1: 게임 흐름 */}
      <GameRulesSection partLabel="Part 1" title={tS("rules.flowTitle")}>
        <div className="grid grid-cols-3 gap-2">
          {[
            { step: "01", icon: <Map size={18} />, title: tS("rules.flow1"), desc: tS("rules.flow1Desc") },
            { step: "02", icon: <Building size={18} />, title: tS("rules.flow2"), desc: tS("rules.flow2Desc") },
            { step: "03", icon: <Swords size={18} />, title: tS("rules.flow3"), desc: tS("rules.flow3Desc") },
          ].map((item) => (
            <div key={item.step} className="text-center px-3 py-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <span className="text-accent/30 font-cinzel text-[10px] tracking-wider">{item.step}</span>
              <div className="flex justify-center mt-1.5 mb-1.5 text-accent/50">{item.icon}</div>
              <p className="text-sm font-bold text-white">{item.title}</p>
              <p className="text-[10px] text-text-tertiary mt-1 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </GameRulesSection>

      {/* PART 2: 핵심 시스템 */}
      <GameRulesSection partLabel="Part 2" title={tS("rules.coreTitle")}>
        <div className="space-y-2">
          {[
            { key: "core1", icon: <Users size={14} />, color: "text-accent border-accent/20 bg-accent/5" },
            { key: "core2", icon: <Shield size={14} />, color: "text-blue-400 border-blue-500/20 bg-blue-500/5" },
            { key: "core3", icon: <Building size={14} />, color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5" },
            { key: "core4", icon: <Scroll size={14} />, color: "text-purple-400 border-purple-500/20 bg-purple-500/5" },
          ].map((item) => (
            <div key={item.key} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${item.color}`}>
              {item.icon}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold">{tS(`rules.${item.key}`)}</p>
                <p className="text-[10px] text-text-tertiary mt-0.5">{tS(`rules.${item.key}Desc`)}</p>
              </div>
            </div>
          ))}
        </div>
      </GameRulesSection>
    </GameLobbySubmenu>
  );
}
