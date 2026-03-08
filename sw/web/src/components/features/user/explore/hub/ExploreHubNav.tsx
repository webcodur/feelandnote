/*
  파일명: /components/features/user/explore/hub/ExploreHubNav.tsx
  기능: 탐색 허브 서브페이지 네비게이터
  책임: 드롭다운으로 탐색 서브페이지 목록을 보여주고 이동시킨다.
*/ // ------------------------------

import { Users, Rss, Sparkles, BarChart3, Fingerprint } from "lucide-react";
import { getTranslations } from "next-intl/server";
import HubNav from "@/components/shared/HubNav";

export default async function ExploreHubNav() {
  const t = await getTranslations("explore.hub");

  const items = [
    { label: t("navCelebs"), href: "/explore/celebs", icon: <Users size={14} /> },
    { label: t("navTopByType"), href: "/explore/top-by-type", icon: <BarChart3 size={14} /> },
    { label: t("navPersona"), href: "/explore/persona", icon: <Fingerprint size={14} /> },
    { label: t("navSpotlight"), href: "/explore/spotlight", icon: <Sparkles size={14} /> },
    { label: t("navFeed"), href: "/explore/celeb-feed", icon: <Rss size={14} /> },
  ];

  return <HubNav items={items} placeholder={t("quickNav")} />;
}
