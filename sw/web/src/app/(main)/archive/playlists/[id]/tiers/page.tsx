/*
  파일명: /app/(main)/archive/playlists/[id]/tiers/page.tsx
  기능: 티어 편집 페이지
  책임: 재생목록의 티어 설정 UI를 제공한다.
*/ // ------------------------------

import TierEditView from "@/components/features/archive/detail/TierEditView";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TierEditPage({ params }: PageProps) {
  const { id } = await params;
  return <TierEditView playlistId={id} />;
}
