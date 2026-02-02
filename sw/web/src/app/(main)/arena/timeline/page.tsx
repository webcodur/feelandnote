/*
  파일명: /app/(main)/arena/timeline/page.tsx
  기능: 연대기 게임 페이지
  책임: 콘텐츠 연대기 정렬 게임을 제공한다.
*/ // ------------------------------

import TimelineGame from "@/components/features/game/TimelineGame";
import { getArenaPageTitle } from "@/constants/arena";

export const metadata = { title: getArenaPageTitle("timeline") };

export default function Page() {
  return <TimelineGame />;
}
