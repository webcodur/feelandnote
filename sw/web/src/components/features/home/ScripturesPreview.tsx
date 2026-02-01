/*
  파일명: /components/features/home/ScripturesPreview.tsx
  기능: 메인페이지 서고 프리뷰
  책임: 서고 탭 구조와 각 탭의 설명을 안내한다.
*/ // ------------------------------

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SCRIPTURES_TABS } from "@/constants/scriptures";

export default function ScripturesPreview() {
  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SCRIPTURES_TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.value}
              href={tab.href}
              className="group flex items-center gap-4 p-4 md:p-5 rounded-xl bg-white/5 border border-white/10 hover:border-accent/40 hover:bg-white/10"
            >
              <div className="shrink-0 p-3 rounded-lg bg-accent/10 text-accent group-hover:bg-accent/20">
                <Icon size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-text-primary group-hover:text-accent text-sm md:text-base mb-1">
                  {tab.label}
                </h4>
                <p className="text-xs md:text-sm text-text-secondary line-clamp-1">
                  {tab.description}
                </p>
              </div>
              <ArrowRight size={18} className="shrink-0 text-text-tertiary group-hover:text-accent" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
