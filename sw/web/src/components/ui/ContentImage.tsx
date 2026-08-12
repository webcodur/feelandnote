/*
  파일명: /components/ui/ContentImage.tsx
  기능: 콘텐츠(도서·영상·게임·음악) 표지 공통 컴포넌트
  책임: 표지 이미지를 부모 영역에 꽉 채워 그린다. 두 가지를 한 자리에서 보장한다.
        1) src가 바뀌면 즉시 이전 표지를 걷어낸다 — 새 표지가 도착할 때까지 옛 표지가 남지 않는다.
        2) 도착하는 순간 블러 디졸브(BlurDissolve)로 또렷해지며 나타난다.
        부모는 relative + overflow-hidden 컨테이너만 두면 된다(기존 fill 이미지와 같은 전제).
*/ // ------------------------------

"use client";

import { useState } from "react";
import Image from "next/image";
import BlurDissolve from "./BlurDissolve";

interface ContentImageProps {
  src?: string | null;
  alt: string;
  /** next/image sizes 힌트 */
  sizes?: string;
  /** <img>에 얹을 클래스 — object-cover 등. 기본 object-cover */
  className?: string;
  priority?: boolean;
  loading?: "lazy" | "eager";
  /** 블러 디졸브 등장 효과. 기본 켜짐 — 끌 곳에서만 false */
  dissolve?: boolean;
  onError?: () => void;
  onLoad?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
}

export default function ContentImage({
  src,
  alt,
  sizes = "300px",
  className = "object-cover",
  priority = false,
  loading = "lazy",
  dissolve = true,
  onError,
  onLoad,
}: ContentImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!src) return null;

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    onLoad?.(e);
  };

  // 실패한 주소는 감춘다 — 깨진 이미지 표시 대신 부모가 깔아 둔 배경·대체 화면이 보이게
  const handleError = () => {
    setFailedSrc(src);
    onError?.();
  };

  if (failedSrc === src) return null;

  const img = (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      className={className}
      onLoad={handleLoad}
      onError={handleError}
      unoptimized
      priority={priority}
      loading={priority ? undefined : loading}
    />
  );

  // key: 주소가 바뀌면 이미지 요소를 새로 만든다 — 옛 표지가 남지 않고 디졸브도 다시 걸린다.
  return dissolve ? (
    <BlurDissolve key={src} className="absolute inset-0">
      {img}
    </BlurDissolve>
  ) : (
    <div key={src} className="absolute inset-0">
      {img}
    </div>
  );
}
