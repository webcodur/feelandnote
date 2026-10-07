/*
  파일명: /app/(main)/content/[contentId]/page.tsx
  기능: 콘텐츠 상세 페이지
  책임: 저장된 서지를 먼저 보내고 관련 목록·리뷰·로그인 개인화를 별도로 보강한다.
*/ // ------------------------------

import { cache } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import ContentDetailPage from "@/components/features/content/ContentDetailPage";
import { getInitialPublicContentInfo } from "@/actions/contents/getContentDetail";
import { getBookBannerTheme } from "@/actions/contents/getBookBannerTheme";
import {
  getAlternates,
  getCreativeWorkCreatorJsonLd,
  getSeoImageUrl,
  SITE_NAME,
  normalizeSeoText,
} from "@/lib/seo";
import { appendWithinSnippet } from "@/lib/seoSentences";
import { serializeJsonLd } from "@/lib/jsonLd";
import ExternalContentDetailFallback from "./ExternalContentDetailFallback";
import Lane from "@/components/ui/pending/Lane";
import ContentDetailPending from "./ContentDetailPending";
import { ContentRelatedSections, ContentReviewsSection } from "./ContentDetailSections";

const getContentInfo = cache(getInitialPublicContentInfo);

interface PageProps {
  params: Promise<{ locale: string; contentId: string }>;
}

// Lane은 요청별 스트리밍을 사용한다. 서지·리뷰·관련 목록의 항목별 데이터 캐시는 유지한다.
export const revalidate = false;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, contentId } = await params;
  setRequestLocale(locale);

  const content = await getContentInfo(contentId, locale);
  const t = await getTranslations({ locale, namespace: "contentDetail" });
  const alternates = getAlternates(
    `/content/${contentId}`,
    locale === "en" ? "en" : "ko",
  );

  if (!content) {
    return {
      title: t("notFoundTitle"),
      description: t("notFoundDescription"),
      robots: { index: false, follow: true },
      alternates,
    };
  }

  const { title, description, thumbnail, creator, type } = content;
  // 공유 미리보기는 저장된 소개의 끝난 문장만 사용한다. 리뷰 조회가 상단을 막지 않게 한다.
  // 소개문 전문을 싣던 때는 첫 문장 중간에서 「…」로 잘렸다(26.09.29). 문장이 하나도 안 들어가면 머리만 둔다
  const body = description;
  const desc = creator
    ? appendWithinSnippet(t("metaLead", { creator, title, type }), body ? normalizeSeoText(body) : null)
    : appendWithinSnippet("", body ? normalizeSeoText(body) : null) || t("metaFallback", { title });
  const seoLocale = locale === "en" ? "en" : "ko";
  const seoImageUrl = getSeoImageUrl("content", contentId, seoLocale, thumbnail);
  const seoImageAlt = locale === "en" ? `${title} cover` : `${title} 표지`;

  return {
    title,
    description: desc,
    // 작품 상세는 색인 대상이 아니다. 본문이 출판사 소개문이라 서점·나무위키에 같은 글이 있고,
    // 주소도 UUID라 검색어와 이어질 단서가 없다. 네이버 실측에서 작품명 질의로는 한 건도 잡히지
    // 않으면서 브랜드 질의의 인물 페이지 자리만 가져갔다(2026-08-25). 사이트맵 제외(2026-08-14)
    // 만으로는 이미 색인된 URL이 빠지지 않는다. 페이지는 그대로 열려 있고 내부 링크로 닿는다.
    robots: { index: false, follow: true },
    alternates,
    // 자기 그림이 있어 openGraph를 통째로 선언한다 — 레이아웃 값을 덮으므로 사이트명도 함께 싣는다
    openGraph: {
      siteName: SITE_NAME,
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
  return <Lane fallback={<ContentDetailPending />}><ContentBody locale={locale} contentId={contentId} /></Lane>;
}

async function ContentBody({ locale, contentId }: { locale: string; contentId: string }) {
  const content = await getContentInfo(contentId, locale);

  // 검색 API에서 아직 DB에 적재되지 않은 작품으로 들어온 경우에는 category 쿼리를
  // 클라이언트 폴백이 읽는다.
  if (!content) {
    return <ExternalContentDetailFallback contentId={contentId} />;
  }
  const bannerTheme = content.type === "BOOK" ? await getBookBannerTheme(content.id) : "library";

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
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <ContentDetailPage key={content.id}
        bannerTheme={bannerTheme}
        initialData={{ content, userRecord: null, isLoggedIn: false, initialReviews: [], fictionCharacters: [], curatedEntries: [] }}
        relatedSections={<ContentRelatedSections contentId={content.id} locale={locale} />}
        reviewsSection={<ContentReviewsSection contentId={content.id} locale={locale} title={content.title} type={content.type} />} />
    </>
  );
}
