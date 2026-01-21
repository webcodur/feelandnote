/*
  파일명: /app/(main)/lounge/page.tsx
  기능: 라운지 페이지
  책임: Lounge 컴포넌트를 렌더링한다.
*/ // ------------------------------

import Lounge from "@/components/features/user/lounge/Lounge";

export const metadata = { title: "라운지" };

export default function Page() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Lounge />
    </div>
  );
}
