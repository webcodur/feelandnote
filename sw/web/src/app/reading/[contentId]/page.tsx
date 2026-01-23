/*
  파일명: /app/reading/[contentId]/page.tsx
  기능: 리딩 세션 페이지
  책임: 콘텐츠 정보를 조회하고 ReadingSession 컴포넌트에 전달한다.
*/ // ------------------------------

import { notFound, redirect } from "next/navigation";
import { getProfile } from "@/actions/user";
import { getContent } from "@/actions/contents/getContent";
import ReadingSession from "./ReadingSession";

interface PageProps {
  params: Promise<{ contentId: string }>;
}

export default async function ReadingPage({ params }: PageProps) {
  const { contentId } = await params;

  const profile = await getProfile();

  try {
    const contentData = await getContent(contentId);

    return (
      <ReadingSession
        userContentId={contentData.id}
        content={contentData.content}
        userId={profile?.id}
      />
    );
  } catch {
    notFound();
  }
}
