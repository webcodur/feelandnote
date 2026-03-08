/*
  파일명: /app/(main)/content/[contentId]/page.tsx
  기능: 콘텐츠 상세 페이지
  책임: 서버에서 데이터를 프리페치하여 ContentDetailPage에 전달한다.
*/ // ------------------------------

import { cache } from "react";
import { notFound } from "next/navigation";
import ContentDetailPage from "@/components/features/content/ContentDetailPage";
import { getContentDetail } from "@/actions/contents/getContentDetail";
import type { CategoryId } from "@/constants/categories";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getAlternates } from "@/lib/seo";

const getContentDetailCached = cache(getContentDetail);

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
    const data = await getContentDetailCached(contentId, category as CategoryId | undefined);
    const t = await getTranslations("contentDetail");
    const { title, description, thumbnail } = data.content;
    const desc = description || t("metaFallback", { title });

    const canonicalUrl = `https://feelandnote.com/content/${contentId}`;

    return {
      title,
      description: desc,
      alternates: getAlternates(`/content/${contentId}`),
      openGraph: {
        title,
        description: desc,
        url: canonicalUrl,
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
    const t = await getTranslations("contentDetail");
    return {
      title: t("notFoundTitle"),
      description: t("notFoundDescription"),
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
    const data = await getContentDetailCached(contentId, category as CategoryId | undefined);
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
  } catch (err) {
    console.error("[content/page] 콘텐츠 상세 로드 실패:", contentId, err);
    notFound();
  }
}
