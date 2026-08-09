/*
  파일명: /app/opengraph-image.tsx
  기능: OG 이미지 동적 생성
  책임: 카카오톡·SNS 링크 공유 시 미리보기 이미지를 생성한다.
*/ // ------------------------------

import { ImageResponse } from "next/og";
import { loadPretendardBold } from "@/lib/og-font";

export const alt = "Feel&Note";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const fontData = await loadPretendardBold();

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
          fontFamily: "Pretendard",
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
              name: "Pretendard",
              data: fontData,
              style: "normal" as const,
              weight: 700 as const,
            },
          ]
        : undefined,
    }
  );
}
