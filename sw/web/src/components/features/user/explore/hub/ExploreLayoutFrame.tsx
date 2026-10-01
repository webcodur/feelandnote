"use client";

import type { ReactNode } from "react";
import { useSelectedLayoutSegment } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { EXPLORE_FEATURED_LINKS } from "@/constants/navigation";
import PageContainer from "@/components/layout/PageContainer";
import ExploreModeTabs from "@/components/shared/ExploreModeTabs";
import ExploreBanner from "./ExploreBanner";

const sectionSwitches = [
  [{ key: "influence", labelKey: "navInfluence" }, { key: "spectrum", labelKey: "navSpectrum" }],
  [{ key: "myth", labelKey: "mythology" }, { key: "faction", labelKey: "navFaction" }],
] as const;

/*
  인물 모드 틀 — 배너(제목·경로) → 인물 | 작품 모드 탭 → 같은 계열 화면 전환 → 본문.
  하위 화면에서 위로 가는 길은 배너의 경로 줄(탐색 › 세력도감 ›)이 쥔다. 따로 「← 인물」 링크를 두지 않는다.
*/
export default function ExploreLayoutFrame({ children }: { children: ReactNode }) {
  const segment = useSelectedLayoutSegment();
  const t = useTranslations("explore.hub");
  const switchGroup = sectionSwitches.find((items) => items.some((item) => item.key === segment));
  const switchLinks = switchGroup?.map((item) => ({
    key: item.key,
    href: EXPLORE_FEATURED_LINKS.find((link) => link.key === item.key)!.href,
    label: t(item.labelKey),
  }));

  // 작품은 자체 배너와 본문 틀을 쓴다. 서버에서 받은 본문은 그대로 통과시킨다.
  if (segment === "works") return children;

  return (
    <>
      <ExploreBanner />
      <PageContainer>
        <ExploreModeTabs />
        {switchLinks && (
          <nav
            aria-label={switchLinks.map((link) => link.label).join(" · ")}
            className="mx-auto mb-8 grid w-full max-w-[420px] grid-cols-2 gap-1 rounded-lg border border-white/20 bg-bg-main p-1 md:mb-10"
          >
            {switchLinks.map((link) => link.key === segment ? (
                <span key={link.key} aria-current="page" className="flex min-h-9 items-center justify-center rounded-md bg-accent/15 px-2 text-center text-sm font-bold text-accent">
                  {link.label}
                </span>
              ) : (
                <Link key={link.key} href={link.href} prefetch={false}
                  className="flex min-h-9 items-center justify-center rounded-md px-2 text-center text-sm font-semibold text-text-secondary outline-none hover:bg-white/10 hover:text-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent">
                  {link.label}
                </Link>
              ))}
          </nav>
        )}
        {children}
      </PageContainer>
    </>
  );
}
