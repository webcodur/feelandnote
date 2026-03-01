/*
  파일명: /app/(main)/board/free/page.tsx
  기능: 자유게시판 페이지
  책임: 자유게시판 UI를 표시한다.
*/ // ------------------------------

import { MessageSquare } from "lucide-react";

export const metadata = { title: "자유게시판" };

export default function Page() {
  return (
    <>
      <div className="bg-surface rounded-2xl p-12 text-center">
        <div className="text-text-tertiary mb-2 flex justify-center">
          <MessageSquare size={48} />
        </div>
        <p className="text-lg font-medium text-text-secondary">준비 중입니다</p>
        <p className="text-sm text-text-tertiary mt-1">곧 자유게시판 기능이 추가될 예정이에요</p>
      </div>
    </>
  );
}
