"use client";

import type { ReactNode } from "react";
import { useSelectedLayoutSegment } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { EXPLORE_FEATURED_LINKS } from "@/constants/navigation";
import PageContainer from "@/components/layout/PageContainer";
import ExploreBanner from "./ExploreBanner";
import AtlasRecentHistory from "../myth/AtlasRecentHistory";
import { atlasPageOwnsTitle } from "../myth/mythHref";
import ExploreModeNav from "./ExploreModeNav";

const sectionSwitches = [
  [{ key: "influence", labelKey: "navInfluence" }, { key: "spectrum", labelKey: "navSpectrum" }],
] as const;

/*
  탐색과 도감 상세는 같은 세 모드 전환을 쓴다. 도감 상세에는 별도 두 모드 전환을 두지 않는다.
  영향력·스펙트럼은 같은 계열 전환을 유지하고, 작품은 자체 틀을 쓴다.
*/
export default function ExploreLayoutFrame({ children }: { children: ReactNode }) {
  const segment = useSelectedLayoutSegment();
  const pathname = usePathname();
  const t = useTranslations("explore.hub");
  const atlasMode = atlasPageOwnsTitle(pathname) ? (segment === "myth" ? "myth" : "faction") : null;
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
        {atlasMode && <ExploreModeNav mode={atlasMode} />}
        {switchLinks && (
          <nav
            aria-label={switchLinks.map((link) => link.label).join(" · ")}
            className="mx-auto mb-8 grid w-full max-w-[420px] grid-cols-2 gap-1 rounded-lg border border-white/20 bg-bg-main p-1 md:mb-10"
          >
            {switchLinks.map((link) => {
              const selected = link.key === segment;
              return selected ? (
                <span key={link.key} aria-current="page" className="flex min-h-9 items-center justify-center rounded-md bg-accent/15 px-2 text-center text-sm font-bold text-accent">
                  {link.label}
                </span>
              ) : (
                <Link key={link.key} href={link.href} prefetch={false}
                  className="flex min-h-9 items-center justify-center rounded-md border border-transparent px-2 text-center text-sm font-semibold text-text-secondary outline-none hover:bg-white/10 hover:text-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent">
                  {link.label}
                </Link>
              );
            })}
          </nav>
        )}
        {children}
        {atlasMode && <AtlasRecentHistory world={atlasMode} />}
      </PageContainer>
    </>
  );
}
