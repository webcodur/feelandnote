/*
  파일명: /app/(main)/[userId]/reading/collections/[id]/page.tsx
  기능: 플로우 상세 페이지
  책임: 플로우의 상세 정보를 표시한다.
*/

import FlowDetail from "@/components/features/user/detail/FlowDetail";

export const metadata = { title: "플로우 상세" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function FlowDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <FlowDetail flowId={id} />;
}
