/*
  파일명: /app/(main)/lounge/higher-lower/page.tsx
  기능: Higher or Lower 게임 페이지
  책임: 셀럽 영향력 비교 게임을 제공한다.
*/ // ------------------------------

import HigherLowerGame from "@/components/features/game/HigherLowerGame";
import PageContainer from "@/components/layout/PageContainer";

export const metadata = { title: "Higher or Lower" };

export default function Page() {
  return (
    <PageContainer>
      <HigherLowerGame />
    </PageContainer>
  );
}
