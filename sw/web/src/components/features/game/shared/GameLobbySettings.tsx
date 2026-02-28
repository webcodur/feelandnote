/*
  파일명: components/features/game/shared/GameLobbySettings.tsx
  기능: 게임 로비 설정 메뉴 (공통)
  책임: 오디오 on/off 토글 UI를 제공한다.
*/
"use client";

import { Settings, Music, Volume2 } from "lucide-react";
import GameLobbySubmenu from "./GameLobbySubmenu";

interface GameLobbySettingsProps {
  onBack: () => void;
  bgmMuted: boolean;
  sfxMuted: boolean;
  toggleBgmMuted: () => void;
  toggleSfxMuted: () => void;
}

export default function GameLobbySettings({ onBack, bgmMuted, sfxMuted, toggleBgmMuted, toggleSfxMuted }: GameLobbySettingsProps) {
  return (
    <GameLobbySubmenu
      onBack={onBack}
      icon={<Settings size={28} className="text-accent/40" />}
      title="설정"
      desc="오디오 설정"
      showBackBottom
    >
      <div className="px-4 pb-6 space-y-2.5">
        <button
          onClick={toggleBgmMuted}
          data-lobby-item
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] transition-colors outline-none data-[focused=true]:ring-1 data-[focused=true]:ring-accent/30 data-[focused=true]:bg-white/[0.06]"
        >
          <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
            <Music size={16} className="text-accent/70" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-xs font-bold text-text-primary">게임 음악</p>
            <p className="text-[9px] text-text-tertiary mt-0.5">배경 음악 (BGM)</p>
          </div>
          <TogglePill active={!bgmMuted} />
        </button>

        <button
          onClick={toggleSfxMuted}
          data-lobby-item
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] transition-colors outline-none data-[focused=true]:ring-1 data-[focused=true]:ring-accent/30 data-[focused=true]:bg-white/[0.06]"
        >
          <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
            <Volume2 size={16} className="text-accent/70" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-xs font-bold text-text-primary">사운드 이펙트</p>
            <p className="text-[9px] text-text-tertiary mt-0.5">효과음 (SFX)</p>
          </div>
          <TogglePill active={!sfxMuted} />
        </button>
      </div>
    </GameLobbySubmenu>
  );
}

function TogglePill({ active }: { active: boolean }) {
  return (
    <div className={`relative w-11 h-6 rounded-full shrink-0 transition-colors ${active ? "bg-accent/30" : "bg-white/10"}`}>
      <div className={`absolute top-0.5 w-5 h-5 rounded-full transition-all ${active ? "left-[22px] bg-accent" : "left-0.5 bg-white/40"}`} />
    </div>
  );
}
