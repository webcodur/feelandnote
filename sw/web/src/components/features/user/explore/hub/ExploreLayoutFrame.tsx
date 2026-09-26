"use client";

import type { ReactNode } from "react";
import { useSelectedLayoutSegment } from "next/navigation";
import { useTranslations } from "next-intl";
import PageContainer from "@/components/layout/PageContainer";
import HubBackLink from "@/components/shared/HubBackLink";
import ExploreModeTabs from "@/components/shared/ExploreModeTabs";
import ExploreBanner from "./ExploreBanner";

export default function ExploreLayoutFrame({ children }: { children: ReactNode }) {
  const segment = useSelectedLayoutSegment();
  const t = useTranslations("nav");

  // 작품은 자체 배너와 본문 틀을 쓴다. 서버에서 받은 본문은 그대로 통과시킨다.
  if (segment === "works") return children;
  const atlas = segment === "myth" || segment === "faction";

  return (
    <>
      <ExploreBanner />
      <PageContainer>
        {atlas ? (
          <div className="mx-auto mb-4 flex max-w-[1040px] items-center justify-between gap-4">
            <HubBackLink hubPath="/explore" label={t("modes.figures")} className="mb-0 shrink-0" />
            <ExploreModeTabs className="mx-0 mb-0 max-w-[240px] md:mb-0 md:max-w-[280px]" />
          </div>
        ) : <><ExploreModeTabs /><HubBackLink hubPath="/explore" label={t("modes.figures")} /></>}
        {children}
      </PageContainer>
    </>
  );
}
