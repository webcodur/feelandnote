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
      title: `${title} - Feel&Note`,
      description: desc,
      openGraph: {
        title: `${title} - Feel&Note`,
        description: desc,
        images: thumbnail ? [thumbnail] : [],
      },
      twitter: {
        card: "summary_large_image",
        title: `${title} - Feel&Note`,
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

export default async function Page({ params, searchParams }: PageProps) {
  const { contentId } = await params;
  const { category } = await searchParams;

  try {
    const data = await getContentDetail(contentId, category as CategoryId | undefined);
    return <ContentDetailPage initialData={data} />;
  } catch {
    notFound();
  }
}
