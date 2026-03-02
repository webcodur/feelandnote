/*
  파일명: /app/(main)/[userId]/reading/collections/[id]/page.tsx
  기능: 플로우 상세 페이지
  책임: 플로우의 상세 정보를 표시한다.
*/

import { getTranslations } from "next-intl/server";
import FlowDetail from "@/components/features/user/detail/FlowDetail";

export async function generateMetadata() {
  const t = await getTranslations("pages");
  return { title: t("collectionDetail") };
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function FlowDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <FlowDetail flowId={id} />;
}
