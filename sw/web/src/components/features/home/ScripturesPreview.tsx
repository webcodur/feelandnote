/*
  파일명: /components/features/home/ScripturesPreview.tsx
  기능: 메인페이지 서가 프리뷰
  책임: 서가 탭 구조와 각 탭의 설명을 안내한다.
*/ // ------------------------------

"use client";

import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { SCRIPTURES_TABS } from "@/constants/scriptures";

export default function ScripturesPreview() {
  const t = useTranslations("scriptures.tabs");

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-4 divide-y divide-white/10 md:divide-y-0">
        {SCRIPTURES_TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.value}
              href={tab.href}
              className="group flex items-center gap-4 py-3 md:p-5 md:rounded-xl bg-transparent md:bg-white/5 border-0 md:border md:border-white/10 md:hover:border-accent/40 md:hover:bg-white/10"
            >
              <div className="shrink-0 p-3 rounded-lg bg-accent/10 text-accent group-hover:bg-accent/20">
                <Icon size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-text-primary group-hover:text-accent text-sm md:text-base mb-1">
                  {t(`${tab.value}.label` as any)}
                </h4>
                <p className="text-xs md:text-sm text-text-secondary line-clamp-1">
                  {t(`${tab.value}.description` as any)}
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
