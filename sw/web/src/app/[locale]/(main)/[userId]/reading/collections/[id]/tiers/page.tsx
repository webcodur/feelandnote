/*
  파일명: /app/(main)/[userId]/reading/collections/[id]/tiers/page.tsx
  기능: 티어 편집 페이지
  책임: 재생목록의 티어 설정 UI를 제공한다.
*/ // ------------------------------

import { getTranslations } from "next-intl/server";
import TierEditView from "@/components/features/user/detail/TierEditView";

export async function generateMetadata() {
  const t = await getTranslations("pages");
  return { title: t("tierEdit") };
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TierEditPage({ params }: PageProps) {
  const { id } = await params;
  return <TierEditView flowId={id} />;
}
