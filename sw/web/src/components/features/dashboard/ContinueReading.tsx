"use client";

import { BookOpen } from "lucide-react";
import ContentLibrary from "@/components/features/archive/ContentLibrary";
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
