/*
  파일명: /app/(main)/board/notice/page.tsx
  기능: 공지사항 페이지
  책임: 서비스 공지사항을 표시한다.
*/ // ------------------------------

import { Megaphone } from "lucide-react";

export const metadata = { title: "공지사항" };

export default function Page() {
  return (
    <>
      <div className="bg-surface rounded-2xl p-12 text-center">
        <div className="text-text-tertiary mb-2 flex justify-center">
          <Megaphone size={48} />
        </div>
        <p className="text-lg font-medium text-text-secondary">준비 중입니다</p>
        <p className="text-sm text-text-tertiary mt-1">곧 공지사항 기능이 추가될 예정이에요</p>
      </div>
    </>
  );
}
