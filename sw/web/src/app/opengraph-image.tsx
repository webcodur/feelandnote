/*
  파일명: /app/opengraph-image.tsx
  기능: OG 이미지 동적 생성
  책임: 카카오톡·SNS 링크 공유 시 미리보기 이미지를 생성한다.
*/ // ------------------------------

import { ImageResponse } from "next/og";

export const alt = "Feel&Note";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function loadFont() {
  // Google Fonts CSS에서 실제 폰트 URL 추출
  const css = await fetch(
    "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600",
    { headers: { "User-Agent": "Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1" } }
  ).then((res) => res.text());

  const url = css.match(/src: url\((.+?)\)/)?.[1];
  if (!url) return null;

  return fetch(url).then((res) => res.arrayBuffer());
}

export default async function Image() {
  const fontData = await loadFont();

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
          background: "linear-gradient(135deg, #121212 0%, #050505 100%)",
          fontFamily: "Cormorant Garamond",
          position: "relative",
        }}
      >
        {/* 이중 보더 장식 */}
        <div
          style={{
            position: "absolute",
            top: 40,
            left: 40,
            right: 40,
            bottom: 40,
            border: "1px solid rgba(138, 115, 42, 0.3)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 48,
            left: 48,
            right: 48,
            bottom: 48,
            border: "1px solid rgba(138, 115, 42, 0.1)",
          }}
        />

        {/* 로고 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 96,
            fontWeight: 600,
            letterSpacing: "0.05em",
          }}
        >
          <span style={{ color: "#f8f4ed" }}>FEEL</span>
          <span style={{ color: "#d4a828", margin: "0 24px" }}>&</span>
          <span style={{ color: "#f8f4ed" }}>NOTE</span>
        </div>

        {/* 서브타이틀 */}
        <div
          style={{
            marginTop: 24,
            fontSize: 24,
            color: "#a0a0a0",
            letterSpacing: "0.3em",
          }}
        >
          CULTURAL ARCHIVE
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fontData
        ? [
            {
              name: "Cormorant Garamond",
              data: fontData,
              style: "normal" as const,
              weight: 600 as const,
            },
          ]
        : undefined,
    }
  );
}
