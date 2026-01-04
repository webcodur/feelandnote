"use client";

import { useState } from "react";
import { PenTool, ChevronDown, ChevronUp, Check } from "lucide-react";
import { Card } from "@/components/ui";
import type { Template } from "@/actions/notes/types";
import Button from "@/components/ui/Button";

const TEMPLATE_ITEMS = [
  { key: "context", title: "감상 계기", placeholder: "예: 시험 끝난 금요일 밤, 집에서 넷플릭스 뒤적이다 우연히 발견함...", description: "언제, 어디서, 어떤 계기로 이 작품을 만났나요? 구체적으로 적을수록 나중에 더 생생하게 떠오릅니다." },
  { key: "summary", title: "3줄 요약", placeholder: "작품을 3줄로 요약해보세요" },
  { key: "questions", title: "작품의 질문 vs 내 질문", placeholder: "작품이 던지는 질문과 내가 갖게 된 질문" },
  { key: "moment", title: "강렬했던 순간", placeholder: "가장 인상 깊었던 장면이나 순간" },
  { key: "quote", title: "인용구", placeholder: "기억하고 싶은 문장이나 대사" },
  { key: "change", title: "작품 전후 나의 변화", placeholder: "작품을 경험하기 전과 후, 달라진 점" },
];

interface TemplateSectionProps {
  template: Template;
  onTemplateChange: (key: string, value: string) => void;
  onTemplateSave: () => void;
}

export default function TemplateSection({ template, onTemplateChange, onTemplateSave }: TemplateSectionProps) {
  const [activeKey, setActiveKey] = useState<string | null>(null);

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold flex items-center gap-2 mb-6">
        <PenTool size={18} /> 돌아보기
      </h3>

      <div className="space-y-3">
        {TEMPLATE_ITEMS.map((item) => (
          <div key={item.key} className="border border-border rounded-xl overflow-hidden bg-bg-secondary">
            <Button
              unstyled
              className="w-full py-4 px-6 flex justify-between items-center font-semibold text-left hover:bg-white/5"
              onClick={() => setActiveKey(activeKey === item.key ? null : item.key)}
            >
              <span className="flex items-center gap-2">
                {template[item.key as keyof Template] && <Check size={14} className="text-accent" />}
                {item.title}
              </span>
              {activeKey === item.key && <ChevronUp size={16} />}
              {activeKey !== item.key && <ChevronDown size={16} />}
            </Button>
            {activeKey === item.key && (
              <div className="px-6 pb-6">
                {item.description && <p className="text-sm text-text-secondary mb-3">{item.description}</p>}
                <textarea
                  className="w-full bg-bg-card border border-border rounded-lg p-3 text-text-primary text-sm resize-y min-h-[120px] outline-none focus:border-accent"
                  placeholder={item.placeholder}
                  value={template[item.key as keyof Template] || ""}
                  onChange={(e) => onTemplateChange(item.key, e.target.value)}
                  onBlur={onTemplateSave}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
