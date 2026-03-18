/*
  파일명: /app/icon.tsx
  기능: 사이트 아이콘 동적 생성 (PNG, 192×192)
  책임: Google 검색 결과에 표시되는 파비콘을 생성한다.
  참고: Google은 48px 배수 크기만 인정한다 (48, 96, 144, 192 등).
*/ // ------------------------------

import { ImageResponse } from "next/og";

export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)",
          borderRadius: 36,
        }}
      >
        <span
          style={{
            fontSize: 110,
            fontWeight: 700,
            color: "#d4a828",
            letterSpacing: "-0.02em",
          }}
        >
          F
        </span>
      </div>
    ),
    { ...size }
  );
}
