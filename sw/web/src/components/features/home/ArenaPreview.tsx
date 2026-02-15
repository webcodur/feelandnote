/*
  파일명: /components/features/home/ArenaPreview.tsx
  기능: 메인페이지 전장 프리뷰
  책임: 전장 메뉴 구조와 각 항목의 설명을 안내한다.
*/ // ------------------------------

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ARENA_ITEMS } from "@/constants/arena";

export default function ArenaPreview() {
  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ARENA_ITEMS.filter((item) => !item.hidden).map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.value}
              href={item.href}
              className="group flex items-center gap-4 p-4 md:p-5 rounded-xl bg-white/5 border border-white/10 hover:border-accent/40 hover:bg-white/10"
            >
              <div className="shrink-0 p-3 rounded-lg bg-accent/10 text-accent group-hover:bg-accent/20">
                <Icon size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-text-primary group-hover:text-accent text-sm md:text-base mb-1">
                  {item.label}
                </h4>
                <p className="text-xs md:text-sm text-text-secondary line-clamp-1">
                  {item.description}
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
