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
    <div className="bg-bg-secondary rounded-xl p-4 border border-border">
      <div className="flex items-center gap-3 mb-3">
        <span className="font-semibold flex-1">{section.title}</span>
        <Button
          unstyled
          onClick={() => onDelete(section.id)}
          className="text-text-secondary hover:text-red-400"
        >
          <Trash2 size={14} />
        </Button>
        <div className="cursor-grab text-gray-500">
          <GripVertical size={14} />
        </div>
      </div>
      <textarea
        className="w-full bg-black/20 border border-border rounded-lg p-3 text-text-primary text-sm resize-y min-h-[80px] outline-none focus:border-accent"
        placeholder="메모를 입력하세요..."
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        onBlur={() => {
          if (memo !== section.memo) onUpdate(section.id, { memo });
        }}
      />
    </div>
  );
}
