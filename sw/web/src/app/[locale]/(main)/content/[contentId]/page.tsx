/*
  파일명: /app/(main)/content/[contentId]/page.tsx
  기능: 콘텐츠 상세 페이지
  책임: 공개 본문을 ISR로 제공하고 로그인 개인화는 hydration 뒤에 보강한다.
*/ // ------------------------------

import { cache, Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import ContentDetailPage from "@/components/features/content/ContentDetailPage";
import { getPublicContentDetail } from "@/actions/contents/getContentDetail";
import {
  getAlternates,
  getCreativeWorkCreatorJsonLd,
  getSeoImageUrl,
  toSeoDescription,
} from "@/lib/seo";
import ExternalContentDetailFallback from "./ExternalContentDetailFallback";

const getPublicContentDetailCached = cache(getPublicContentDetail);

interface PageProps {
  params: Promise<{ locale: string; contentId: string }>;
}

// Next segment config는 import 상수가 아니라 정적 분석 가능한 숫자 리터럴이어야 한다.
// 30일. 상세 한 장의 ISR 쓰기는 HTML+RSC 0.5~1.2MB(8KB당 1단위)라 전량 한 바퀴가 약 $6다.
// 백오피스 저장은 태그로 그 항목만 즉시 무효화하므로 시간 재검증은 안전망일 뿐이다.
export const revalidate = 2592000;

// 사이트맵의 수천 개 작품을 빌드 때 전부 만들지 않고 첫 요청에 ISR로 생성한다.
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, contentId } = await params;
  setRequestLocale(locale);

  const data = await getPublicContentDetailCached(contentId, locale);
  const t = await getTranslations({ locale, namespace: "contentDetail" });
  const alternates = getAlternates(
    `/content/${contentId}`,
    locale === "en" ? "en" : "ko",
  );

  if (!data) {
    return {
      title: t("notFoundTitle"),
      description: t("notFoundDescription"),
      robots: { index: false, follow: true },
      alternates,
    };
  }

  const { title, description, thumbnail } = data.content;
  const reviewDescription = data.initialReviews.find((review) => !review.is_spoiler)?.review;
  const desc = toSeoDescription(
    description || reviewDescription || t("metaFallback", { title }),
  );
  const hasReview = data.initialReviews.length > 0;
  const seoLocale = locale === "en" ? "en" : "ko";
  const seoImageUrl = getSeoImageUrl("content", contentId, seoLocale, thumbnail);
  const seoImageAlt = locale === "en" ? `${title} cover` : `${title} 표지`;

  return {
    title,
    description: desc,
    ...(!hasReview && { robots: { index: false, follow: true } }),
    alternates,
    openGraph: {
      title,
      description: desc,
      url: alternates.canonical,
      images: [{
        url: seoImageUrl,
        width: 800,
        height: 800,
        type: "image/jpeg",
        alt: seoImageAlt,
      }],
    },
    twitter: {
      card: "summary",
      title,
      description: desc,
      images: [{ url: seoImageUrl, alt: seoImageAlt }],
    },
  };
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

export default async function Page({ params }: PageProps) {
  const { locale, contentId } = await params;
  setRequestLocale(locale);

  const data = await getPublicContentDetailCached(contentId, locale);

  // 검색 API에서 아직 DB에 적재되지 않은 작품으로 들어온 경우에는 category 쿼리를
  // 클라이언트 폴백이 읽는다. 사이트맵의 DB 작품은 아래 정적 본문 경로만 탄다.
  if (!data) {
    return (
      <Suspense fallback={<div className="mx-auto min-h-80 max-w-3xl animate-pulse rounded-xl bg-white/[0.02]" />}>
        <ExternalContentDetailFallback contentId={contentId} />
      </Suspense>
    );
  }

  const { content } = data;
  const canonicalUrl = getAlternates(
    `/content/${contentId}`,
    locale === "en" ? "en" : "ko",
  ).canonical;
  const seoImageUrl = getSeoImageUrl(
    "content",
    contentId,
    locale === "en" ? "en" : "ko",
    content.thumbnail,
  );
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": getSchemaType(content.type),
    "@id": canonicalUrl,
    name: content.title,
    ...getCreativeWorkCreatorJsonLd(content.type, content.creator),
    ...(content.description && { description: content.description }),
    image: seoImageUrl,
    ...(content.releaseDate && { datePublished: content.releaseDate }),
    url: canonicalUrl,
    mainEntityOfPage: canonicalUrl,
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
}
