/*
  파일명: /app/(main)/lounge/timeline/page.tsx
  기능: 연대기 게임 페이지
  책임: 콘텐츠 연대기 정렬 게임을 제공한다.
*/ // ------------------------------

import TimelineGame from "@/components/features/game/TimelineGame";
import { getLoungePageTitle } from "@/constants/lounge";

export const metadata = { title: getLoungePageTitle("timeline") };

export default function Page() {
  return <TimelineGame />;
}
