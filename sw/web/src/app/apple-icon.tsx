/*
  파일명: /app/apple-icon.tsx
  기능: Apple Touch Icon 동적 생성 (PNG, 180×180)
  책임: iOS 홈 화면 추가 시 표시되는 아이콘을 생성한다.
*/ // ------------------------------

import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  const ico = readFileSync(join(process.cwd(), "src/app/favicon.ico"));
  const pngPayload = ico.slice(22);
  const src = `data:image/png;base64,${Buffer.from(pngPayload).toString("base64")}`;

  return new ImageResponse(
    <img src={src} width={180} height={180} />,
    { ...size },
  );
}
