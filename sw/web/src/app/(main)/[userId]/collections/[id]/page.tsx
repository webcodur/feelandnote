/*
  파일명: /app/(main)/archive/playlists/[id]/page.tsx
  기능: 재생목록 상세 페이지
  책임: 재생목록의 상세 정보를 표시한다.
*/ // ------------------------------

import PlaylistDetail from "@/components/features/archive/detail/PlaylistDetail";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PlaylistDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <PlaylistDetail playlistId={id} />;
}
