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

  return (
    <>
      <ExploreBanner />
      <PageContainer>
        <ExploreModeTabs />
        <HubBackLink hubPath="/explore" label={t("modes.figures")} />
        {children}
      </PageContainer>
    </>
  );
}
