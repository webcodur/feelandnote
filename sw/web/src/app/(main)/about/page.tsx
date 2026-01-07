/*
  파일명: /app/(main)/about/page.tsx
  기능: 회사 소개 페이지
  책임: 서비스 소개 정보를 표시한다.
*/ // ------------------------------

import { Info } from "lucide-react";
import { SectionHeader } from "@/components/ui";

export default function Page() {
  return (
    <>
      <SectionHeader
        title="회사 소개"
        description="Feelnnote를 만드는 팀을 소개합니다"
        icon={<Info size={20} />}
        className="mb-4"
      />

      <div className="bg-surface rounded-2xl p-12 text-center">
        <div className="text-text-tertiary mb-2 flex justify-center">
          <Info size={48} />
        </div>
        <p className="text-lg font-medium text-text-secondary">준비 중입니다</p>
        <p className="text-sm text-text-tertiary mt-1">곧 회사 소개 페이지가 추가될 예정이에요</p>
      </div>
    </>
  );
}
