/*
  파일명: components/features/game/myth/troy/scene/portraitData.ts
  기능: 아바타를 같은 출처 data URL로 바꾸기(서버 전용)
  책임: 아바타 저장소(assets.feelandnote.com)는 CORS 머리글이 없어 WebGL 텍스처로 바로 못 쓰고, 이 앱은 images.unoptimized라
        /_next/image 경로도 없다. 그래서 서버 컴포넌트(page.tsx)에서 받아 128px로 줄인 webp data URL을 만들어 넘긴다.
        클라이언트 파일에서 가져오면 sharp가 번들에 끼므로 서버 컴포넌트에서만 부른다. 실패하면 원래 주소를 그대로 둔다.
*/ // ------------------------------
import sharp from "sharp";

const SIZE = 128;

async function toDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { cache: "force-cache", signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const input = Buffer.from(await res.arrayBuffer());
    const out = await sharp(input).resize(SIZE, SIZE, { fit: "cover", position: "centre" }).webp({ quality: 80 }).toBuffer();
    return `data:image/webp;base64,${out.toString("base64")}`;
  } catch {
    return null;
  }
}

// 주소 → data URL. 바꾸지 못한 주소는 원래 주소로 남긴다(뷰는 그때 첫 글자 메달을 그린다)
export async function portraitDataUrls(urls: (string | null)[]): Promise<Map<string, string>> {
  const unique = [...new Set(urls.filter((u): u is string => !!u))];
  const pairs = await Promise.all(unique.map(async (u) => [u, (await toDataUrl(u)) ?? u] as const));
  return new Map(pairs);
}
