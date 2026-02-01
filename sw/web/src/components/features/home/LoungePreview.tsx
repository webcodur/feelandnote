/*
  파일명: /components/features/home/LoungePreview.tsx
  기능: 메인페이지 라운지 프리뷰
  책임: 라운지 메뉴 구조와 각 항목의 설명을 안내한다.
*/ // ------------------------------

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LOUNGE_ITEMS } from "@/constants/lounge";

export default function LoungePreview() {
  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {LOUNGE_ITEMS.map((item) => {
          const Icon = item.icon;
          const isAvailable = item.status === "available";
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
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-text-primary group-hover:text-accent text-sm md:text-base">
                    {item.label}
                  </h4>
                  {!isAvailable && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-text-tertiary">
                      준비 중
                    </span>
                  )}
                </div>
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
