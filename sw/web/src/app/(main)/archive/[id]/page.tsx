/*
  파일명: /app/(main)/archive/[id]/page.tsx
  기능: 기록 상세 페이지
  책임: 라우팅 파라미터를 추출하여 Detail 컴포넌트에 전달한다.
*/ // ------------------------------

"use client";

import { useParams, useSearchParams } from "next/navigation";
import Detail from "@/components/features/archive/detail/Detail";

export default function Page() {
  const params = useParams();
  const searchParams = useSearchParams();
  const contentId = params.id as string;
  const viewUserId = searchParams.get("userId") ?? undefined;

  return <Detail contentId={contentId} viewUserId={viewUserId} />;
}
