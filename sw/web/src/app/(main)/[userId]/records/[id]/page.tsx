/*
  파일명: /app/(main)/[userId]/records/[id]/page.tsx
  기능: 기록 상세 페이지
  책임: 서버에서 데이터를 prefetch하여 Detail 컴포넌트에 전달한다.
*/ // ------------------------------

import { notFound } from "next/navigation";
import Detail from "@/components/features/user/detail/Detail";
import { getProfile } from "@/actions/user";
import { getContent, getPublicContent } from "@/actions/contents/getContent";
import { fetchContentMetadata } from "@/actions/contents/fetchContentMetadata";
import type { ContentType } from "@/types/database";

interface PageProps {
  params: Promise<{ id: string; userId: string }>;
}

export default async function Page({ params }: PageProps) {
  const { id: contentId, userId: viewUserId } = await params;

  // 1단계: 프로필 조회 (본인 여부 판단용)
  const profile = await getProfile();
  const isOwner = profile?.id === viewUserId;

  // 2단계: 콘텐츠 + 메타데이터 병렬 조회
  try {
    const contentData = isOwner
      ? await getContent(contentId)
      : await getPublicContent(contentId, viewUserId);

    // 콘텐츠 정보가 있으면 메타데이터 조회 (캐시됨)
    const metadataResult = await fetchContentMetadata(
      contentData.content.id,
      contentData.content.type as ContentType
    );

    return (
      <Detail
        contentId={contentId}
        viewUserId={viewUserId}
        initialData={contentData}
        initialMetadata={metadataResult.metadata}
        initialIsOwner={isOwner}
        initialHasApiKey={!!profile?.gemini_api_key}
      />
    );
  } catch {
    notFound();
  }
}
