/*
  파일명: components/features/game/shared/GameLobbySettings.tsx
  기능: 게임 로비 설정 메뉴 (공통)
  책임: 오디오 on/off 토글 UI를 제공한다.
*/
"use client";

import { ArrowLeft, Settings, Music, Volume2 } from "lucide-react";

interface GameLobbySettingsProps {
  onBack: () => void;
  bgmMuted: boolean;
  sfxMuted: boolean;
  toggleBgmMuted: () => void;
  toggleSfxMuted: () => void;
}

export default function GameLobbySettings({ onBack, bgmMuted, sfxMuted, toggleBgmMuted, toggleSfxMuted }: GameLobbySettingsProps) {
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
        <Settings size={28} className="mx-auto text-accent/40 mb-2" />
        <h2 className="text-2xl font-serif font-black text-white tracking-wide">설정</h2>
        <p className="text-sm text-text-tertiary mt-1.5">오디오 설정</p>
      </div>

      <div className="px-6 pb-10 space-y-4">
        <button
          onClick={toggleBgmMuted}
          className="w-full flex items-center gap-4 px-5 py-4 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
            <Music size={20} className="text-accent/70" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-bold text-text-primary">게임 음악</p>
            <p className="text-[10px] text-text-tertiary mt-0.5">배경 음악 (BGM)</p>
          </div>
          <TogglePill active={!bgmMuted} />
        </button>

        <button
          onClick={toggleSfxMuted}
          className="w-full flex items-center gap-4 px-5 py-4 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
            <Volume2 size={20} className="text-accent/70" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-bold text-text-primary">사운드 이펙트</p>
            <p className="text-[10px] text-text-tertiary mt-0.5">효과음 (SFX)</p>
          </div>
          <TogglePill active={!sfxMuted} />
        </button>
      </div>

      <div className="text-center py-6 border-t border-white/[0.06]">
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

function TogglePill({ active }: { active: boolean }) {
  return (
    <div className={`relative w-11 h-6 rounded-full shrink-0 transition-colors ${active ? "bg-accent/30" : "bg-white/10"}`}>
      <div className={`absolute top-0.5 w-5 h-5 rounded-full transition-all ${active ? "left-[22px] bg-accent" : "left-0.5 bg-white/40"}`} />
    </div>
  );
}
