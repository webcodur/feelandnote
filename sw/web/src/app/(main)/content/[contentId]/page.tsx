/*
  파일명: /app/(main)/content/[contentId]/page.tsx
  기능: 콘텐츠 상세 페이지
  책임: 서버에서 데이터를 프리페치하여 ContentDetailPage에 전달한다.
*/ // ------------------------------

import { notFound } from "next/navigation";
import ContentDetailPage from "@/components/features/content/ContentDetailPage";
import { getContentDetail } from "@/actions/contents/getContentDetail";
import type { CategoryId } from "@/constants/categories";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ contentId: string }>;
  searchParams: Promise<{ category?: string }>;
}

export async function generateMetadata(
  { params, searchParams }: PageProps
): Promise<Metadata> {
  const { contentId } = await params;
  const { category } = await searchParams;

  try {
    const data = await getContentDetail(contentId, category as CategoryId | undefined);
    const { title, description, thumbnail } = data.content;
    const desc = description || `${title}에 대한 기록과 리뷰를 확인해보세요.`;

    return {
      title,
      description: desc,
      openGraph: {
        title,
        description: desc,
        images: thumbnail ? [thumbnail] : [],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description: desc,
        images: thumbnail ? [thumbnail] : [],
      },
    };
  } catch {
    return {
      title: "콘텐츠 정보 없음",
      description: "콘텐츠 정보를 불러올 수 없습니다.",
    };
  }
}

/** 콘텐츠 타입 → schema.org 타입 매핑 */
function getSchemaType(type: string): string {
  switch (type) {
    case "BOOK": return "Book";
    case "VIDEO": return "Movie";
    case "MUSIC": return "MusicRecording";
    case "GAME": return "VideoGame";
    default: return "CreativeWork";
  }
}

export default async function Page({ params, searchParams }: PageProps) {
  const { contentId } = await params;
  const { category } = await searchParams;

  try {
    const data = await getContentDetail(contentId, category as CategoryId | undefined);
    const { content } = data;

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": getSchemaType(content.type),
      name: content.title,
      ...(content.creator && { author: { "@type": "Person", name: content.creator } }),
      ...(content.description && { description: content.description }),
      ...(content.thumbnail && { image: content.thumbnail }),
      ...(content.releaseDate && { datePublished: content.releaseDate }),
    };

    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ContentDetailPage initialData={data} />
      </>
    );
  } catch {
    notFound();
  }
}
