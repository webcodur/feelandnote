/*
  파일명: /app/(main)/lounge/timeline/page.tsx
  기능: 연대기 게임 페이지
  책임: 콘텐츠 연대기 정렬 게임을 제공한다.
*/ // ------------------------------

import TimelineGame from "@/components/features/game/TimelineGame";

export const metadata = { title: "연대기 | 라운지" };

export default function Page() {
  return <TimelineGame />;
}
