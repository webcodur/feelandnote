/*
  파일명: /celeb/[slug]/opengraph-image.tsx
  기능: 셀럽별 동적 OG 이미지 생성
  책임: SNS 공유 시 셀럽 이름·직군·콘텐츠 수가 포함된 1200x630 미리보기 이미지를 생성한다.
*/ // ------------------------------

import { ImageResponse } from "next/og";
import { getCelebBySlug } from "@/actions/user/getCelebBySlug";
import { getCelebProfessionLabel } from "@/constants/celebProfessions";

export const alt = "Feel&Note 셀럽 프로필";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function loadFont() {
  const css = await fetch(
    "https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@500;700",
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1",
      },
    },
  ).then((res) => res.text());

  const urls = [...css.matchAll(/src: url\((.+?)\)/g)].map((m) => m[1]);
  if (urls.length === 0) return null;

  // 700(Bold) 우선, 없으면 첫 번째
  const fontUrl = urls.length > 1 ? urls[1] : urls[0];
  return fetch(fontUrl).then((res) => res.arrayBuffer());
}

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const result = await getCelebBySlug(slug, locale);
  const fontData = await loadFont();

  if (!result.success || !result.data) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#0a0a0a",
            color: "#f8f4ed",
            fontSize: 48,
            fontFamily: "Noto Sans KR",
          }}
        >
          Feel&Note
        </div>
      ),
      { ...size },
    );
  }

  const { nickname, profession, contentTypeCounts } = result.data;
  const professionLabel = getCelebProfessionLabel(profession, locale);

  const parts: string[] = [];
  if (locale === 'en') {
    if (contentTypeCounts.BOOK > 0) parts.push(`${contentTypeCounts.BOOK} books`);
    if (contentTypeCounts.VIDEO > 0) parts.push(`${contentTypeCounts.VIDEO} movies`);
    if (contentTypeCounts.MUSIC > 0) parts.push(`${contentTypeCounts.MUSIC} songs`);
    if (contentTypeCounts.GAME > 0) parts.push(`${contentTypeCounts.GAME} games`);
  } else {
    if (contentTypeCounts.BOOK > 0) parts.push(`${contentTypeCounts.BOOK}권의 책`);
    if (contentTypeCounts.VIDEO > 0) parts.push(`${contentTypeCounts.VIDEO}편의 영화`);
    if (contentTypeCounts.MUSIC > 0) parts.push(`${contentTypeCounts.MUSIC}곡의 음악`);
    if (contentTypeCounts.GAME > 0) parts.push(`${contentTypeCounts.GAME}개의 게임`);
  }

  const subtitle = parts.length > 0
    ? locale === 'en' ? parts.join(", ") : `감상한 ${parts.join(", ")}`
    : locale === 'en' ? "Cultural Archive" : "감상 기록";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #121212 0%, #050505 100%)",
          fontFamily: "Noto Sans KR",
          position: "relative",
        }}
      >
        {/* 골드 보더 */}
        <div
          style={{
            position: "absolute",
            top: 32,
            left: 32,
            right: 32,
            bottom: 32,
            border: "1px solid rgba(212, 175, 55, 0.3)",
            display: "flex",
          }}
        />

        {/* 직군 라벨 */}
        <div
          style={{
            fontSize: 24,
            color: "#d4af37",
            letterSpacing: "0.3em",
            marginBottom: 16,
          }}
        >
          {professionLabel.toUpperCase()}
        </div>

        {/* 셀럽 이름 */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: "#f8f4ed",
            letterSpacing: "0.02em",
            marginBottom: 20,
          }}
        >
          {nickname}
        </div>

        {/* 콘텐츠 요약 */}
        <div
          style={{
            fontSize: 28,
            color: "#a0a0a0",
            marginBottom: 40,
          }}
        >
          {subtitle}
        </div>

        {/* Feel&Note 브랜딩 */}
        <div
          style={{
            position: "absolute",
            bottom: 48,
            fontSize: 20,
            color: "rgba(212, 175, 55, 0.5)",
            letterSpacing: "0.2em",
          }}
        >
          FEEL & NOTE
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fontData
        ? [
            {
              name: "Noto Sans KR",
              data: fontData,
              style: "normal" as const,
              weight: 700 as const,
            },
          ]
        : undefined,
    },
  );
}
