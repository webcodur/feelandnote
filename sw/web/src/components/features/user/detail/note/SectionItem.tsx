/*
  파일명: /components/features/user/note/SectionItem.tsx
  기능: 노트 섹션 아이템 컴포넌트
  책임: 개별 노트 섹션의 제목과 메모를 표시하고 편집/삭제를 처리한다.
*/ // ------------------------------
"use client";

import { useState } from "react";
import { Trash2, GripVertical } from "lucide-react";
import type { NoteSection } from "@/actions/notes/types";
import Button from "@/components/ui/Button";

interface SectionItemProps {
  section: NoteSection;
  onUpdate: (id: string, updates: { title?: string; memo?: string }) => void;
  onDelete: (id: string) => void;
}

export default function SectionItem({ section, onUpdate, onDelete }: SectionItemProps) {
  const [memo, setMemo] = useState(section.memo || "");

  return (
    <div className="group/item border-b border-white/5 pb-6 last:border-none">
      <div className="flex items-center gap-2 mb-2">
        <div className="cursor-grab text-text-tertiary/30 hover:text-accent transition-colors">
          <GripVertical size={12} />
        </div>
        <span className="text-[11px] font-bold text-accent/60 flex-1 uppercase tracking-widest">{section.title}</span>
        <Button
          unstyled
          onClick={() => onDelete(section.id)}
          className="text-text-tertiary/40 hover:text-red-400/80 transition-colors p-1"
        >
          <Trash2 size={12} />
        </Button>
      </div>
      
      <hr className="border-white/5 mb-3" />

      <textarea
        className="w-full bg-transparent text-text-primary text-[14px] leading-relaxed resize-y min-h-[40px] outline-none placeholder:text-text-tertiary/10"
        placeholder="본인만 볼 수 있도록 비공개로 안전하게 기록됩니다."
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        onBlur={() => {
          if (memo !== section.memo) onUpdate(section.id, { memo });
        }}
      />
    </div>
  );
}
