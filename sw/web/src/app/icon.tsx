/*
  파일명: /app/icon.tsx
  기능: 사이트 아이콘 동적 생성 (PNG, 192×192)
  책임: Google 검색 결과에 표시되는 파비콘을 생성한다.
  참고: Google은 48px 배수 크기만 인정한다 (48, 96, 144, 192 등).
         favicon.ico(256×256)는 48px 배수가 아니므로 192×192 PNG로 변환하여 서빙한다.
*/ // ------------------------------

import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export default function Icon() {
  // favicon.ico = ICO header(22B) + PNG payload(256×256)
  const ico = readFileSync(join(process.cwd(), "src/app/favicon.ico"));
  const pngPayload = ico.slice(22);
  const src = `data:image/png;base64,${Buffer.from(pngPayload).toString("base64")}`;

  return new ImageResponse(
    <img src={src} width={192} height={192} />,
    { ...size },
  );
}
