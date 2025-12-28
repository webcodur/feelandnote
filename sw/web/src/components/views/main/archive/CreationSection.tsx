"use client";

import { PenTool } from "lucide-react";

const CREATION_TYPES = [
  { emoji: "💭", label: "What If", desc: "대체 역사, 다른 결말" },
  { emoji: "🎬", label: "매체 전환", desc: "캐스팅, 연출 상상" },
  { emoji: "🎵", label: "OST 상상", desc: "장면별 음악 선곡" },
];

export default function CreationSection() {
  return (
    <div className="animate-fade-in">
      <div className="grid grid-cols-3 gap-2 mb-4">
        {CREATION_TYPES.map((item) => (
          <div key={item.label} className="p-2.5 bg-bg-secondary rounded-lg text-center">
            <div className="text-lg mb-1">{item.emoji}</div>
            <div className="text-xs font-medium mb-0.5">{item.label}</div>
            <div className="text-[10px] text-text-secondary hidden sm:block">{item.desc}</div>
          </div>
        ))}
      </div>

      <div className="text-center py-8 text-text-secondary">
        <PenTool size={32} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm">아직 작성한 창작물이 없습니다</p>
        <p className="text-xs mt-1">+ 버튼으로 첫 창작을 시작해보세요</p>
      </div>
    </div>
  );
}
