/*
  파일명: /components/features/user/explore/hub/ExploreHubNav.tsx
  기능: 탐색 허브 서브페이지 네비게이터
  책임: 허브 섹션 항목(실제 페이지 순서)과 독립 페이지를 구분 표기한다.
*/ // ------------------------------

import { Users, Rss, Sparkles, BarChart3, Fingerprint, BookOpenText } from "lucide-react";
import { getTranslations } from "next-intl/server";
import HubNav from "@/components/shared/HubNav";

export default async function ExploreHubNav() {
  const t = await getTranslations("explore.hub");

  // 허브 섹션 항목 — 실제 페이지 내 섹션 순서와 동일
  const hubItems = [
    { label: t("navCelebs"), href: "/explore/figures", icon: <Users size={14} /> },           // 01: 인물 목록
    { label: t("navTopByType"), href: "/explore/ranking", icon: <BarChart3 size={14} /> }, // 02: 분야별 랭킹
    { label: t("navPersona"), href: "/explore/persona", icon: <Fingerprint size={14} /> },     // 03: 비범한 기록가
    { label: t("navSpotlight"), href: "/explore/spotlight", icon: <Sparkles size={14} /> },    // 04: 스포트라이트
  ];

  // 독립 페이지 — Nav에서만 접근 가능
  const standaloneItems = [
    { label: t("navFeed"), href: "/explore/feed", icon: <Rss size={14} /> },
    { label: t("navDirectory"), href: "/explore/directory", icon: <BookOpenText size={14} /> },
  ];

  return <HubNav hubItems={hubItems} standaloneItems={standaloneItems} groupId="explore" />;
}
