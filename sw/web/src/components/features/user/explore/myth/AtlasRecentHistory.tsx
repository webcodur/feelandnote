"use client";

import { RecentHistorySection } from "@/components/shared/RecentHistoryRail";
import type { AtlasWorld } from "./atlasNavigationData";

/** 페이지의 로딩 경계 밖에서 최근 조회와 그 높이를 유지한다. */
export default function AtlasRecentHistory({ world }: { world: AtlasWorld }) {
  return <RecentHistorySection kind={world} preserveScroll />;
}
