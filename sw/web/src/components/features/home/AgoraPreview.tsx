/*
  파일명: /components/features/home/AgoraPreview.tsx
  기능: 메인페이지 광장 프리뷰
  책임: 광장 메뉴 구조와 각 항목의 설명을 안내한다.
*/ // ------------------------------

"use client";

import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { AGORA_ITEMS } from "@/constants/agora";

export default function AgoraPreview() {
  const t = useTranslations("agora.items");

  // value에서 camelCase 키로 변환 (celeb-feed → celebFeed)
  const toKey = (value: string) => value.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {AGORA_ITEMS.map((item) => {
          const Icon = item.icon;
          const key = toKey(item.value);
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
                  {t(`${key}.label` as any)}
                </h4>
                <p className="text-xs md:text-sm text-text-secondary line-clamp-1">
                  {t(`${key}.description` as any)}
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
