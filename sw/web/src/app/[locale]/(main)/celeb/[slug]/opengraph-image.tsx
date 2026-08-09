/*
  파일명: /celeb/[slug]/opengraph-image.tsx
  기능: 셀럽별 동적 OG 이미지 생성
  책임: SNS 공유 시 셀럽 이름·직군·콘텐츠 수가 포함된 1200x630 미리보기 이미지를 생성한다.
*/ // ------------------------------

import { ImageResponse } from "next/og";
import { getCelebBySlug } from "@/actions/user/getCelebBySlug";
import { loadPretendardBold } from "@/lib/og-font";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const OG_COPY = {
  ko: {
    alt: "Feel&Note 인물 프로필",
    book: (count: number) => `책 ${count}권`,
    video: (count: number) => `영상 ${count}편`,
    music: (count: number) => `음악 ${count}곡`,
    game: (count: number) => `게임 ${count}개`,
    prefix: "감상한 ",
    empty: "감상 기록",
  },
  en: {
    alt: "Feel&Note figure profile",
    book: (count: number) => `${count} books`,
    video: (count: number) => `${count} films`,
    music: (count: number) => `${count} songs`,
    game: (count: number) => `${count} games`,
    prefix: "",
    empty: "Cultural Archive",
  },
} as const;

function getOgCopy(locale: string) {
  return locale === "en" ? OG_COPY.en : OG_COPY.ko;
}

export function generateImageMetadata({
  params,
}: {
  params: { locale: string; slug: string };
}) {
  const copy = getOgCopy(params.locale);
  return [{
    id: "profile",
    alt: copy.alt,
    size,
    contentType,
  }];
}

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
  id: Promise<string>;
}) {
  const { locale, slug } = await params;
  const result = await getCelebBySlug(slug, locale);
  const fontData = await loadPretendardBold();

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
            fontFamily: "Pretendard",
          }}
        >
          Feel&Note
        </div>
      ),
      {
        ...size,
        fonts: fontData
          ? [{ name: "Pretendard", data: fontData, style: "normal", weight: 700 }]
          : undefined,
      },
    );
  }

  const { nickname, title, contentTypeCounts } = result.data;
  const celebTitle = title ?? '';
  const copy = getOgCopy(locale);

  const parts: string[] = [];
  if (contentTypeCounts.BOOK > 0) parts.push(copy.book(contentTypeCounts.BOOK));
  if (contentTypeCounts.VIDEO > 0) parts.push(copy.video(contentTypeCounts.VIDEO));
  if (contentTypeCounts.MUSIC > 0) parts.push(copy.music(contentTypeCounts.MUSIC));
  if (contentTypeCounts.GAME > 0) parts.push(copy.game(contentTypeCounts.GAME));

  const subtitle = parts.length > 0
    ? `${copy.prefix}${parts.join(", ")}`
    : copy.empty;

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
          fontFamily: "Pretendard",
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

        {/* 수식어/대표작 */}
        <div
          style={{
            fontSize: 24,
            color: "#d4af37",
            letterSpacing: "0.15em",
            marginBottom: 16,
          }}
        >
          {celebTitle}
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
              name: "Pretendard",
              data: fontData,
              style: "normal" as const,
              weight: 700 as const,
            },
          ]
        : undefined,
    },
  );
}
