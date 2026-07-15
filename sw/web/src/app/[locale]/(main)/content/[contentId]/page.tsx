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
import { getLocalizedAlternates } from "@/lib/seo";

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

    // 감상문이 하나도 없는 콘텐츠는 외부에서 가져온 소개문만 남아 독창성이 없다 → 색인 제외.
    // 링크는 따라가게 두어(follow) 감상문이 달린 다른 콘텐츠로 크롤러가 이동할 수 있게 한다.
    // 현재 감상문은 전량 셀럽이 작성한 것이라 "감상문 유무 = 셀럽 감상문 유무"다.
    // 셀럽 여부를 따로 가리지 않는 이유: 여기 실린 목록은 최근 10건까지만이라
    // 일반 사용자 감상문이 앞을 채우면 셀럽 감상문이 밀려 사이트맵 등재 페이지를
    // 색인 거부하는 모순이 생긴다. 감상문 존재 여부로 판별하면 그 모순이 원천 차단된다.
    const hasReview = data.initialReviews.length > 0;

    return {
      title,
      description: desc,
      ...(!hasReview && { robots: { index: false, follow: true } }),
      alternates: await getLocalizedAlternates(`/content/${contentId}`),
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
