/*
  파일명: /app/(main)/arena/higher-lower/page.tsx
  기능: 업다운 게임 페이지
  책임: 셀럽 영향력 비교 게임을 제공한다.
*/ // ------------------------------

import HigherLowerGame from "@/components/features/game/HigherLowerGame";
import { getArenaPageTitle } from "@/constants/arena";

export const metadata = { title: getArenaPageTitle("higher-lower") };

export default function Page() {
  return <HigherLowerGame />;
}
