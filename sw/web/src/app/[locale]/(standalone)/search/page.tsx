/*
  파일명: /app/(standalone)/search/page.tsx
  기능: 검색 페이지
  책임: 콘텐츠/유저/태그 검색 기능을 제공한다.
*/ // ------------------------------

"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import SearchContent from "./SearchContent";

export default function Page() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 size={32} className="animate-spin text-accent" /></div>}>
      <SearchContent />
    </Suspense>
  );
}
