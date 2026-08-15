/*
  파일명: /app/(main)/explore/ranking/sections.tsx
  기능: 분야별 랭킹 화면 매체별 구획
  책임: 매체 하나가 자기 순위 목록 + 공통 감상작을 조회한다. 다른 매체를 기다리지 않는다.
        Lane 안에서 그려지므로 여기서 던지면 안 된다 — 완성 HTML 모드에서 화면 전체가 죽는다.
*/ // ------------------------------

import { getTopByContentTypeFull } from "@/actions/home/getTopByContentTypeFull";
import { getSharedContents } from "@/actions/home/getSharedContents";
import type { ContentTypeKey } from "./constants";
import TopByTypeCard from "@/components/features/user/explore/sections/TopByTypeCard";
import { RetryBlock } from "@/components/ui/pending";

export async function TopByTypeMedia({ type }: { type: ContentTypeKey }) {
  let entry: Awaited<ReturnType<typeof getTopByContentTypeFull>>;
  let shared: Awaited<ReturnType<typeof getSharedContents>> = [];
  try {
    entry = await getTopByContentTypeFull(type);
    if (entry) {
      shared = await getSharedContents(entry.celebs.map((c) => c.id), entry.type, 10);
    }
  } catch (e) {
    console.error(`[RankingPage] ${type} 조회 실패:`, e);
    return <RetryBlock />;
  }

  // JSX 생성은 try 밖에서 한다 — try 안 JSX는 렌더 오류를 못 잡으면서 린트만 문다
  // 정말 이 매체를 감상한 인물이 없는 경우다. 매체 목록은 config(CONTENT_TYPES) 고정이라
  // 이 레인 하나만 접히고 나머지 매체는 그대로 뜬다.
  if (!entry) return null;
  return <TopByTypeCard entry={entry} shared={shared} />;
}
