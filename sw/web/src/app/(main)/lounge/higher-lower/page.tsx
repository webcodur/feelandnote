/*
  파일명: /app/(main)/lounge/higher-lower/page.tsx
  기능: 업다운 게임 페이지
  책임: 셀럽 영향력 비교 게임을 제공한다.
*/ // ------------------------------

import HigherLowerGame from "@/components/features/game/HigherLowerGame";
import { getLoungePageTitle } from "@/constants/lounge";

export const metadata = { title: getLoungePageTitle("higher-lower") };

export default function Page() {
  return <HigherLowerGame />;
}
