/*
  파일명: /components/features/archive/modals/createCreation/WhatIfForm.tsx
  기능: What If 창작물 폼
  책임: 다른 결말, 시대 변경 등 What If 유형 선택 및 내용 입력을 처리한다.
*/ // ------------------------------
"use client";

import Button from "@/components/ui/Button";

const WHATIF_TYPES = [
  { id: "ending", label: "다른 결말" },
  { id: "choice", label: "다른 선택" },
  { id: "era", label: "시대 변경" },
  { id: "setting", label: "배경 변경" },
  { id: "perspective", label: "시점 전환" },
  { id: "prequel", label: "프리퀄" },
  { id: "spinoff", label: "외전" },
  { id: "sequel", label: "속편" },
];

interface WhatIfFormProps {
  whatifType: string;
  whatifContent: string;
  onTypeChange: (type: string) => void;
  onContentChange: (content: string) => void;
}

export default function WhatIfForm({ whatifType, whatifContent, onTypeChange, onContentChange }: WhatIfFormProps) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-semibold mb-3">What If 유형 선택 *</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {WHATIF_TYPES.map((type) => (
            <Button
              unstyled
              key={type.id}
              onClick={() => onTypeChange(type.id)}
              className={`py-2 px-4 rounded-lg text-sm font-medium
                ${whatifType === type.id
                  ? "bg-accent text-white"
                  : "bg-bg-main border border-border text-text-secondary hover:border-accent"
                }`}
            >
              {type.label}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2">상상 시나리오 *</label>
        <textarea
          value={whatifContent}
          onChange={(e) => onContentChange(e.target.value)}
          placeholder="만약 ~했다면 어떤 이야기가 펼쳐질까요? 상상력을 마음껏 펼쳐보세요."
          className="w-full h-64 px-4 py-3 bg-bg-main border border-border rounded-lg outline-none resize-none focus:border-accent"
          maxLength={10000}
        />
        <div className="text-xs text-text-secondary text-end mt-1">
          {whatifContent.length} / 10,000자
        </div>
      </div>
    </div>
  );
}
