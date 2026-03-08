/*
  파일명: components/features/game/battle/CaptainInfoModal.tsx
  기능: 주장 시스템 설명 모달
  책임: 주장 배지 클릭 시 주장의 효과를 상세히 안내한다.
*/
"use client";

import { X, Crown, Shield, Swords, Skull } from "lucide-react";
import { useLocale } from "next-intl";
import { getBattleCaptainInfo } from "./i18n";

interface Props {
  onClose: () => void;
  zIndex?: number;
}

export default function CaptainInfoModal({ onClose, zIndex = 9999 }: Props) {
  const locale = useLocale();
  const info = getBattleCaptainInfo(locale);
  const sections = [
    { icon: <Shield size={14} className="text-amber-400" />, ...info.sections[0] },
    { icon: <Swords size={14} className="text-amber-400" />, ...info.sections[1] },
    { icon: <Skull size={14} className="text-red-400" />, ...info.sections[2] },
  ];

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex }}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-sm rounded-xl border border-amber-500/20 bg-[#111115] shadow-2xl overflow-hidden animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/20">
            <Crown size={16} className="text-amber-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-amber-400">{info.title}</h2>
            <p className="text-[11px] text-white/40 mt-0.5">{info.subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-white/30 hover:text-white/60 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* body */}
        <div className="p-5 space-y-4">
          {sections.map((s) => (
            <div key={s.label} className="flex gap-3">
              <div className="mt-0.5 shrink-0">{s.icon}</div>
              <div>
                <h4 className="text-[11px] font-bold text-amber-400 mb-0.5">{s.label}</h4>
                <p className="text-[11px] text-white/50 leading-relaxed">{s.content}</p>
              </div>
            </div>
          ))}

          <div className="w-full h-px bg-white/[0.04]" />

          {/* 전략 팁 */}
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
            <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5">{info.tipTitle}</h4>
            <p className="text-[11px] text-amber-300 leading-relaxed">
              {info.tip}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
