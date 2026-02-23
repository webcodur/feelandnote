/*
  파일명: components/features/game/battle/CaptainInfoModal.tsx
  기능: 주장 시스템 설명 모달
  책임: 주장 배지 클릭 시 주장의 효과를 상세히 안내한다.
*/
"use client";

import { X, Crown, Shield, Swords, Skull } from "lucide-react";

interface Props {
  onClose: () => void;
  zIndex?: number;
}

const SECTIONS = [
  {
    icon: <Shield size={14} className="text-amber-400" />,
    label: "아우라 효과",
    content: "주장이 손패에 남아있으면 아군 전원의 적성이 +15% 증가한다.",
  },
  {
    icon: <Swords size={14} className="text-amber-400" />,
    label: "직접 출전",
    content: "주장이 직접 출전하면 본인의 적성이 ×1.5로 강화된다. 아우라 효과와 중복되지 않는다.",
  },
  {
    icon: <Skull size={14} className="text-red-400" />,
    label: "주장 소모",
    content: "주장이 전투/책략으로 소모되면 아우라 효과가 사라진다. 내정으로 회수하면 아우라가 복구된다.",
  },
];

export default function CaptainInfoModal({ onClose, zIndex = 9999 }: Props) {
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
            <h2 className="text-lg font-bold text-amber-400">주장</h2>
            <p className="text-[11px] text-white/40 mt-0.5">아군의 지휘관을 임명하여 전력을 강화한다.</p>
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
          {SECTIONS.map((s) => (
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
            <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5">전략</h4>
            <p className="text-[11px] text-amber-300 leading-relaxed">
              약한 카드를 주장으로 지정하면 아우라가 오래 유지된다.
              강한 카드를 지정하면 출전 시 폭발적이지만 소모 리스크가 크다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
