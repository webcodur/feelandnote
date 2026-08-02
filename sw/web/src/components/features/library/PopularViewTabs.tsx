/*
  파일명: /components/features/library/PopularViewTabs.tsx
  기능: 인기 작품 화면의 보기 전환
  책임: 같은 작품 목록을 시대로 자를지 직군으로 자를지 고르게 한다.
*/ // ------------------------------

import Link from "next/link";
import { getTranslations } from "next-intl/server";

export type PopularView = "era" | "profession";

/** 주소를 갈아 끼우는 링크 두 개. 상태를 들고 있지 않아 서버에서 그대로 그린다. */
export default async function PopularViewTabs({ view }: { view: PopularView }) {
  const t = await getTranslations("library.popular");

  const tabs: { value: PopularView; label: string; href: string }[] = [
    { value: "era", label: t("viewEra"), href: "/library/popular" },
    { value: "profession", label: t("viewProfession"), href: "/library/popular?view=profession" },
  ];

  return (
    <nav aria-label={t("viewLabel")} className="mb-8 flex justify-center gap-2">
      {tabs.map((tab) => {
        const active = tab.value === view;
        return (
          <Link
            key={tab.value}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-sm border px-5 py-2 text-sm ${
              active
                ? "border-accent bg-accent/10 text-accent"
                : "border-white/10 text-text-secondary hover:border-accent/50 hover:text-accent"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
