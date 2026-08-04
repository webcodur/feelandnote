/*
  파일명: /components/ui/DetailToggle.tsx
  기능: 수치만 보이던 지표에 해설을 펼쳐 보이는 여닫이 단추
  책임: 인물 분석 두 탭(스펙트럼, 영향력)이 같은 자리·같은 모양의 단추를 쓰게 한다.
*/ // ------------------------------

"use client";

import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  open: boolean;
  onToggle: () => void;
  className?: string;
}

export default function DetailToggle({ open, onToggle, className }: Props) {
  const t = useTranslations("celebPage");

  return (
    <div className={`flex justify-center ${className ?? ""}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-4 py-1.5 text-xs text-text-secondary hover:border-accent/30 hover:text-accent"
      >
        {open ? t("hideDetail") : t("showDetail")}
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
    </div>
  );
}
