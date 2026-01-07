/*
  파일명: /components/features/dashboard/ContinueReading.tsx
  기능: 내 콘텐츠 미리보기 섹션
  책임: 대시보드에서 사용자의 콘텐츠 라이브러리를 축약 표시한다.
*/ // ------------------------------
"use client";

import { BookOpen } from "lucide-react";
import ContentLibrary from "@/components/features/archive/contentLibrary/ContentLibrary";
import { SectionHeader } from "@/components/ui";

export default function ContinueReading() {
  return (
    <div className="mb-8">
      <SectionHeader
        title="내 콘텐츠"
        icon={<BookOpen size={24} />}
        linkText="전체보기 →"
        linkHref="/archive"
      />
      <ContentLibrary
        compact
        maxItems={6}
        showTabs
        showFilters
        showViewToggle
        emptyMessage="아직 등록된 콘텐츠가 없습니다"
      />
    </div>
  );
}
