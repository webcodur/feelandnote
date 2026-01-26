/*
  파일명: /app/(main)/lounge/page.tsx
  기능: 라운지 페이지
  책임: Lounge 컴포넌트를 렌더링한다.
*/ // ------------------------------

import Lounge from "@/components/features/user/lounge/Lounge";
import PageContainer from "@/components/layout/PageContainer";

export const metadata = { title: "라운지" };

export default function Page() {
  return (
    <PageContainer>
      <Lounge />
    </PageContainer>
  );
}
