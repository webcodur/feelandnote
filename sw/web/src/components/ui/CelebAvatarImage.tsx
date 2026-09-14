"use client";

import { useState, type CSSProperties } from "react";
import { useCelebAvatarSrc } from "@/hooks/useCelebAvatarSrc";

interface CelebAvatarImageProps {
  src: string;
  alt: string;
  // 실제 배치 크기. 생략하면 부모 칸을 채운다. 소스 해상도는 DOM에서 측정한다.
  boxPx?: number;
  className?: string;
  blurDataURL?: string;
}

const fillStyle: CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%" };

export default function CelebAvatarImage({ src, alt, boxPx, className = "object-cover", blurDataURL }: CelebAvatarImageProps) {
  const { ref, src: shownSrc, onError } = useCelebAvatarSrc(src);
  const [loadedSource, setLoadedSource] = useState<string | undefined>(undefined);
  const placeholder = blurDataURL && (!shownSrc || loadedSource !== shownSrc)
    ? { backgroundImage: 'url("' + blurDataURL + '")', backgroundSize: "cover", backgroundPosition: "center" }
    : undefined;

  // Next Image는 측정 전 src 생략을 허용하지 않으므로 여기서는 img를 직접 쓴다.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={shownSrc}
      alt={alt}
      width={boxPx}
      height={boxPx}
      className={className}
      style={{ ...(!boxPx ? fillStyle : undefined), ...placeholder }}
      loading="lazy"
      decoding="async"
      onLoad={() => setLoadedSource(shownSrc)}
      onError={onError}
    />
  );
}
