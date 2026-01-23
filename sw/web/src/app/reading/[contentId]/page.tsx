/*
  파일명: /app/reading/[contentId]/page.tsx
  기능: 특정 콘텐츠 독서 모드 페이지
  책임: 콘텐츠 정보를 조회하고 ReadingWorkspace에 전달한다.
*/ // ------------------------------

import { notFound } from "next/navigation";
import { getProfile } from "@/actions/user";
import { getContent } from "@/actions/contents/getContent";
import ReadingWorkspace from "../components/ReadingWorkspace";
import type { SelectedBook } from "../types";

interface PageProps {
  params: Promise<{ contentId: string }>;
}

export default async function ReadingPage({ params }: PageProps) {
  const { contentId } = await params;

  const profile = await getProfile();

  try {
    const contentData = await getContent(contentId);
    const content = contentData.content;

    // Content를 SelectedBook 형식으로 변환
    const initialBook: SelectedBook = {
      id: content.id,
      title: content.title,
      author: (content.metadata as { author?: string })?.author,
      thumbnail: content.image_url || undefined,
      publisher: (content.metadata as { publisher?: string })?.publisher,
      publishDate: (content.metadata as { publishDate?: string })?.publishDate,
      description: (content.metadata as { description?: string })?.description,
    };

    return (
      <ReadingWorkspace
        userId={profile?.id}
        initialBook={initialBook}
        isBookLocked={true}
      />
    );
  } catch {
    notFound();
  }
}
