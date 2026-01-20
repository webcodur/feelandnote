/*
  파일명: /app/(main)/play/page.tsx
  기능: 휴게실 페이지
  책임: Lounge 컴포넌트를 렌더링한다.
*/ // ------------------------------

import Lounge from "@/components/features/user/lounge/Lounge";

export const metadata = { title: "휴게실" };

export default function Page() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Lounge />
    </div>
  );
}
