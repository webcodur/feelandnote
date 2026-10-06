/*
  파일명: /app/(main)/content/[contentId]/page.tsx
  기능: 콘텐츠 상세 페이지
  책임: 공개 본문을 ISR로 제공하고 로그인 개인화는 hydration 뒤에 보강한다.
*/ // ------------------------------

import { cache, Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import ContentDetailPage from "@/components/features/content/ContentDetailPage";
import { getInitialPublicContentDetail } from "@/actions/contents/getContentDetail";
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
import AsyncIntlProvider from "@/components/shared/AsyncIntlProvider";

const getPublicContentDetailCached = cache(getInitialPublicContentDetail);

interface PageProps {
  params: Promise<{ locale: string; contentId: string }>;
}

// Next segment config는 import 상수가 아니라 정적 분석 가능한 숫자 리터럴이어야 한다.
// 시간 재검증 없음. 데이터가 바뀌면 DB 트리거(web_revalidate_trigger)가 그 항목 태그를 비워
// 다음 방문 때만 다시 만든다 — 백오피스·스크립트·SQL 어느 길로 쓰든 같다.
// 상세 한 장의 ISR 쓰기는 HTML+RSC 0.25~0.55MB(8KB당 1단위)라 시간마다 전량 재생성하면 곧 돈이다.
export const revalidate = false;

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

  const { title, description, thumbnail, creator, type } = data.content;
  const reviewDescription = data.initialReviews.find((review) => !review.is_spoiler)?.review;
  // 공유 미리보기 설명 — 「누구의 무슨 작품」 뒤에 소개문(없으면 감상문)의 끝난 문장만 두 줄 안에 잇는다.
  // 소개문 전문을 싣던 때는 첫 문장 중간에서 「…」로 잘렸다(26.09.29). 문장이 하나도 안 들어가면 머리만 둔다
  const body = description || reviewDescription;
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

  const data = await getPublicContentDetailCached(contentId, locale);

  // 검색 API에서 아직 DB에 적재되지 않은 작품으로 들어온 경우에는 category 쿼리를
  // 클라이언트 폴백이 읽는다. 사이트맵의 DB 작품은 아래 정적 본문 경로만 탄다.
  if (!data) {
    return (
      <Suspense fallback={<div className="mx-auto min-h-80 max-w-3xl animate-pulse rounded-xl bg-white/[0.02]" />}>
        <AsyncIntlProvider>
          <ExternalContentDetailFallback contentId={contentId} />
        </AsyncIntlProvider>
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
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <Suspense fallback={<div className="mx-auto min-h-80 max-w-3xl animate-pulse rounded-xl bg-white/[0.02]" />}>
        <AsyncIntlProvider>
          <ContentDetailPage key={content.id} initialData={data} />
        </AsyncIntlProvider>
      </Suspense>
    </>
  );
}
