/*
  파일명: components/features/game/hegemony/title/SettingsPanel.tsx
  기능: 설정 화면
  책임: 배경음악·효과음 켜기와 연출 속도를 바꾼다.
*/
"use client";

import type { AnimationSpeed } from "../hooks/useHegemonySettings";
import { useHegemonyText } from "../text";
import { FOCUS_RING } from "../ui/tokens";
import SubPanel from "./SubPanel";

interface Props {
  bgmMuted: boolean;
  sfxMuted: boolean;
  toggleBgmMuted: () => void;
  toggleSfxMuted: () => void;
  speed: AnimationSpeed;
  onSpeed: (speed: AnimationSpeed) => void;
  onBack: () => void;
}

function Choice({ label, options }: { label: string; options: { key: string; label: string; on: boolean; onClick: () => void }[] }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-hg-line/70 bg-hg-raised px-4 py-3">
      <span className="text-base font-semibold text-hg-bright">{label}</span>
      <div className="flex gap-1.5">
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            aria-pressed={o.on}
            onClick={o.onClick}
            className={`h-9 min-w-16 rounded-lg border px-3 text-sm font-bold ${FOCUS_RING} ${o.on ? "border-accent bg-accent/15 text-accent" : "border-hg-line text-text-secondary hover:border-hg-bright/40 hover:text-hg-bright"}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function SettingsPanel({ bgmMuted, sfxMuted, toggleBgmMuted, toggleSfxMuted, speed, onSpeed, onBack }: Props) {
  const text = useHegemonyText();
  const s = text.settings;
  const toggle = (muted: boolean, flip: () => void) => [
    { key: "on", label: s.on, on: !muted, onClick: () => muted && flip() },
    { key: "off", label: s.off, on: muted, onClick: () => !muted && flip() },
  ];
  return (
    <SubPanel title={s.title} backLabel={s.back} onBack={onBack}>
      <div className="space-y-2">
        <Choice label={s.bgm} options={toggle(bgmMuted, toggleBgmMuted)} />
        <Choice label={s.sfx} options={toggle(sfxMuted, toggleSfxMuted)} />
        <Choice
          label={s.speed}
          options={[
            { key: "normal", label: s.speedNormal, on: speed === "normal", onClick: () => onSpeed("normal") },
            { key: "fast", label: s.speedFast, on: speed === "fast", onClick: () => onSpeed("fast") },
          ]}
        />
      </div>
    </SubPanel>
  );
}
