/*
  파일명: /app/(standalone)/search/page.tsx
  기능: 검색 페이지
  책임: 콘텐츠/유저/태그 검색 기능을 제공한다.
*/ // ------------------------------

"use client";

import { Suspense } from "react";
import { PendingBlock } from "@/components/ui/pending";
import SearchContent from "./SearchContent";

export default function Page() {
  return (
    <Suspense fallback={<PendingBlock variant="rows" count={6} className="mx-auto max-w-3xl px-4 py-8" />}>
      <SearchContent />
    </Suspense>
  );
}
